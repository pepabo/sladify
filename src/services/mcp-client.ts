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
    
    // MCPエンドポイントをそのまま使用（Dify MCPサーバーが適切なルーティングを行う）
    const response = await this.request('tools/call', {
      name,
      arguments: args,
    });

    yield* this.streamSSEResponse(response);
  }

  private async request(method: string, params: any): Promise<Response> {
    const requestBody = {
      jsonrpc: '2.0',
      method,
      params: {
        ...params,
        user: this.config.userId // Dify MCPサーバーにユーザーIDを含める
      },
      id: Date.now(),
    };
    
    
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(requestBody),
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
              } else if (data.event === 'message') {
                yield { type: 'chunk', data: data.answer || data.data || data.message };
              } else if (data.event === 'node_finished') {
                // ノード完了時の出力を取得
                if (data.data?.outputs?.output) {
                  yield { type: 'chunk', data: data.data.outputs.output };
                } else if (data.data?.outputs?.text) {
                  yield { type: 'chunk', data: data.data.outputs.text };
                } else if (data.data?.outputs) {
                  // outputs内の最初の値を取得
                  const outputValues = Object.values(data.data.outputs);
                  if (outputValues.length > 0) {
                    yield { type: 'chunk', data: String(outputValues[0]) };
                  }
                }
              } else if (data.event === 'text-chunk' && data.data?.text) {
                // テキストチャンクイベント
                yield { type: 'chunk', data: data.data.text };
              } else if (data.answer) {
                yield { type: 'chunk', data: data.answer };
              } else if (data.message) {
                yield { type: 'chunk', data: data.message };
              } else if (data.data?.text) {
                yield { type: 'chunk', data: data.data.text };
              } else if (data.result) {
                // MCPの標準的な結果形式
                if (data.result.content && Array.isArray(data.result.content)) {
                  // content配列からテキストを抽出
                  for (const item of data.result.content) {
                    if (item.type === 'text' && item.text) {
                      try {
                        // ネストされたJSONをパース
                        const parsed = JSON.parse(item.text);
                        if (parsed.text) {
                          yield { type: 'chunk', data: parsed.text };
                        } else {
                          yield { type: 'chunk', data: item.text };
                        }
                      } catch {
                        // JSONパースに失敗した場合はそのまま使用
                        yield { type: 'chunk', data: item.text };
                      }
                    }
                  }
                } else {
                  yield { type: 'chunk', data: JSON.stringify(data.result) };
                }
              }
              
              // エラーレスポンスを詳細にログ
              if (data.code && data.code !== 200) {
                console.error('Dify error response:', JSON.stringify(data, null, 2));
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