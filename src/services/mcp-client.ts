import { MCPTool, MCPResponse, MCPEvent, MCPClientError } from '../types/index.js';

interface MCPClientConfig {
  endpoint: string;
  userId: string;
  timeout?: number;
}

export class MCPClient {
  constructor(private config: MCPClientConfig) {}

  async initialize(): Promise<void> {
    const response = await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'sladify',
        version: '1.0.0',
      },
    });

    if (!response.ok) {
      throw new MCPClientError(`Failed to initialize: ${response.status}`);
    }

    // レスポンスを消費して接続を閉じる
    await response.text();
  }

  async listTools(): Promise<MCPTool[]> {
    const response = await this.request('tools/list', {});
    const events = await this.parseSSEResponse<{ tools: MCPTool[] }>(response);
    
    for (const event of events) {
      if (event.error) {
        throw new MCPClientError(event.error.message || 'Unknown error');
      }
      if (event.result?.tools) {
        return event.result.tools;
      }
    }
    
    return [];
  }

  async *executeTool(name: string, args: Record<string, any>): AsyncGenerator<MCPEvent> {
    const response = await this.request('tools/call', {
      name,
      arguments: args,
    });

    yield* this.streamSSEResponse(response);
  }

  private async request(method: string, params: any): Promise<Response> {
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: Date.now(),
      }),
      signal: AbortSignal.timeout(this.config.timeout || 30000),
    });

    if (!response.ok && response.status !== 200) {
      const text = await response.text();
      throw new MCPClientError(`HTTP ${response.status}: ${text}`);
    }

    return response;
  }

  private async parseSSEResponse<T>(response: Response): Promise<MCPResponse<T>[]> {
    const events: MCPResponse<T>[] = [];
    const reader = response.body?.getReader();
    if (!reader) throw new MCPClientError('Response body not readable');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              events.push(data);
            } catch {
              // 無効なJSONは無視
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return events;
  }

  private async *streamSSEResponse(response: Response): AsyncGenerator<MCPEvent> {
    const reader = response.body?.getReader();
    if (!reader) throw new MCPClientError('Response body not readable');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      yield { type: 'chunk', data: '' }; // 開始シグナル

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) {
                yield { type: 'error', error: data.error.message };
                return;
              }

              // Difyのレスポンス形式に基づいて処理
              if (data.event === 'workflow_finished') {
                yield { type: 'complete' };
              } else if (data.answer) {
                yield { type: 'chunk', data: data.answer };
              }
            } catch {
              // 無効なJSONは無視
            }
          }
        }
      }

      yield { type: 'complete' };
    } catch (error) {
      yield { 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    } finally {
      reader.releaseLock();
    }
  }
}