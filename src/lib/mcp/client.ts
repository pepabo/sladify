import type { 
  MCPTool, 
  MCPToolCallRequest,
  MCPConnectionConfig,
  SSEEvent,
  ExecutionEvent,
} from './types.js';

export class MCPClient {
  private config: MCPConnectionConfig;

  constructor(config: MCPConnectionConfig) {
    this.config = config;
  }

  async initialize(clientName = 'sladify', clientVersion = '1.0.0'): Promise<void> {
    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {}, // 必須！
            clientInfo: {
              name: clientName,
              version: clientVersion,
            },
          },
          id: Date.now(),
        }),
        signal: AbortSignal.timeout(this.config.timeout || 30000),
      });

      if (!response.ok) {
        throw new Error(`Failed to initialize: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      
      // SSE形式のレスポンスを処理
      if (contentType?.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body is not readable');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            const events = this.parseSSEBuffer(buffer);
            
            for (const event of events.parsed) {
              if (event.data) {
                try {
                  const data = JSON.parse(event.data);
                  if (data.error) {
                    throw new Error(`MCP error: ${data.error.message || JSON.stringify(data.error)}`);
                  }
                  if (data.result) {
                    return;
                  }
                } catch (e) {
                  if (e instanceof Error && e.message.includes('MCP error')) {
                    throw e;
                  }
                }
              }
            }
            
            buffer = events.remaining;
          }
        } finally {
          reader.releaseLock();
        }
      } else {
        // 通常のJSONレスポンス
        const responseText = await response.text();
        let data: any;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          throw new Error('MCPサーバーから無効なレスポンスが返されました');
        }
        
        if (data.error) {
          throw new Error(`MCP error: ${data.error.message || JSON.stringify(data.error)}`);
        }

        // 初期化成功
      }
    } catch (error) {
      throw error;
    }
  }

  async listTools(): Promise<MCPTool[]> {
    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          params: {},
          id: Date.now(),
        }),
        signal: AbortSignal.timeout(this.config.timeout || 30000),
      });

      if (!response.ok) {
        throw new Error(`Failed to list tools: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      
      // SSE形式のレスポンスを処理
      if (contentType?.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body is not readable');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let tools: MCPTool[] = [];

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;
            
            const events = this.parseSSEBuffer(buffer);
            
            for (const event of events.parsed) {
              if (event.data) {
                try {
                  const data = JSON.parse(event.data);
                  if (data.error) {
                    if (data.error.message === 'User not found') {
                      throw new Error('User not found. Please call initialize() first.');
                    }
                    throw new Error(`MCP error: ${data.error.message || JSON.stringify(data.error)}`);
                  }
                  if (data.result?.tools) {
                    tools = data.result.tools;
                  }
                } catch (e) {
                  if (e instanceof Error && e.message.includes('MCP error')) {
                    throw e;
                  }
                  // SSEイベントの解析エラーは無視
                }
              }
            }
            
            buffer = events.remaining;
          }
        } finally {
          reader.releaseLock();
        }

        return tools;
      } else {
        // 通常のJSONレスポンス
        const responseText = await response.text();
        let data: any;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          throw new Error('MCPサーバーから無効なレスポンスが返されました');
        }
        
        if (data.error) {
          if (data.error.message === 'User not found') {
            throw new Error('User not found. Please call initialize() first.');
          }
          throw new Error(`MCP error: ${data.error.message || JSON.stringify(data.error)}`);
        }

        return data.result?.tools || [];
      }
    } catch (error) {
      throw error;
    }
  }

  async *executeToolStream(
    request: MCPToolCallRequest,
  ): AsyncGenerator<ExecutionEvent> {
    try {
      yield {
        type: 'start',
        timestamp: new Date(),
      };

      const requestBody = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: request.name,
          arguments: request.arguments,
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
        signal: AbortSignal.timeout(this.config.timeout || 300000),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Tool execution failed: ${response.status} ${response.statusText} - ${errorBody}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          const events = this.parseSSEBuffer(buffer);
          
          for (const event of events.parsed) {
            const executionEvent = this.sseToExecutionEvent(event);
            if (executionEvent) {
              yield executionEvent;
            }
          }
          
          buffer = events.remaining;
        }

        yield {
          type: 'complete',
          timestamp: new Date(),
        };
      } catch (error) {
        yield {
          type: 'error',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
        };
        throw error;
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      throw error;
    }
  }

  private parseSSEBuffer(buffer: string): {
    parsed: SSEEvent[];
    remaining: string;
  } {
    const events: SSEEvent[] = [];
    const lines = buffer.split('\n');
    let remaining = '';
    let currentEvent: Partial<SSEEvent> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line === '') {
        if (currentEvent.data) {
          events.push(currentEvent as SSEEvent);
          currentEvent = {};
        }
      } else if (line.startsWith(':')) {
        continue;
      } else {
        const colonIndex = line.indexOf(':');
        if (colonIndex === -1) {
          remaining = lines.slice(i).join('\n');
          break;
        }

        const field = line.substring(0, colonIndex);
        const value = line.substring(colonIndex + 1).trim();

        switch (field) {
          case 'id':
            currentEvent.id = value;
            break;
          case 'event':
            currentEvent.event = value;
            break;
          case 'data':
            currentEvent.data = (currentEvent.data || '') + value;
            break;
          case 'retry':
            currentEvent.retry = parseInt(value, 10);
            break;
        }
      }
    }

    return { parsed: events, remaining };
  }

  private sseToExecutionEvent(sseEvent: SSEEvent): ExecutionEvent | null {
    try {
      const data = JSON.parse(sseEvent.data);
      
      if (data.error) {
        return {
          type: 'error',
          error: data.error.message || JSON.stringify(data.error),
          timestamp: new Date(),
        };
      }
      
      if (data.result) {
        const result = data.result;
        if (result.content && Array.isArray(result.content)) {
          const textContent = result.content
            .filter((item: any) => item.type === 'text')
            .map((item: any) => {
              try {
                const parsed = JSON.parse(item.text);
                return parsed.text || item.text;
              } catch {
                return item.text;
              }
            })
            .join('\n');
          
          return {
            type: 'chunk',
            data: textContent,
            timestamp: new Date(),
          };
        }
      }
      
      if (data.event === 'message' || data.event === 'agent_message') {
        return {
          type: 'chunk',
          data: data.answer || data.message || data.data || '',
          timestamp: new Date(),
        };
      } else if (data.event === 'error') {
        return {
          type: 'error',
          error: data.message || data.error || 'Unknown error',
          timestamp: new Date(),
        };
      } else if (data.event === 'message_end' || data.event === 'workflow_finished') {
        return {
          type: 'complete',
          data: data,
          timestamp: new Date(),
        };
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }
}