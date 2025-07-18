// Slack関連の型定義
import type { AppMentionEvent } from '@slack/types';
import type { SayFn } from '@slack/bolt';

export type { AppMentionEvent, SayFn };

// コマンド関連の型定義
export type CommandName = 'add' | 'list' | 'tool' | 'update' | 'delete' | 'execute' | 'help';

export interface ParsedCommand {
  command: CommandName;
  args: string[];
  name?: string;
  url?: string;
}

export interface CommandContext {
  event: AppMentionEvent;
  say: SayFn;
  parsed: ParsedCommand;
}

// MCP関連の型定義
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface MCPError {
  code: number;
  message: string;
  data?: any;
}

export interface MCPResponse<T = any> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: MCPError;
  // SSEイベントのデータ
  event?: string;
  data?: any;
}

export interface MCPEvent {
  type: 'chunk' | 'error' | 'complete';
  data?: string;
  error?: string;
}

// エラー型定義
export class MCPClientError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'MCPClientError';
  }
}

export class CommandError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'CommandError';
  }
}