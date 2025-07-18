export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: Record<string, any>;
}

export interface MCPToolsListResponse {
  tools: MCPTool[];
}

export interface MCPToolCallRequest {
  name: string;
  arguments: Record<string, any>;
}

export interface MCPToolCallResponse {
  type: 'progress' | 'result' | 'error' | 'chunk';
  data: any;
  timestamp?: string;
}

export interface SSEEvent {
  id?: string;
  event?: string;
  data: string;
  retry?: number;
}

export interface ExecutionEvent {
  type: 'start' | 'progress' | 'chunk' | 'complete' | 'error';
  data?: any;
  error?: string;
  timestamp: Date;
}

export interface MCPConnectionConfig {
  endpoint: string;
  timeout?: number;
  userId?: string;
}