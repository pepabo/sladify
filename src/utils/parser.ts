export interface ParsedCommand {
  command: 'add' | 'list' | 'tool' | 'execute' | 'help' | 'update' | 'delete';
  args: string[];
  name?: string;
  url?: string;
}

export function parseCommand(text: string): ParsedCommand | null {
  const parts = text.split(/\s+/);
  if (parts.length === 0) return null;

  const [firstArg, ...restArgs] = parts;

  switch (firstArg.toLowerCase()) {
    case 'add':
      if (restArgs.length < 2) return null;
      // SlackのURL自動フォーマット（<URL>形式）を除去
      const url = restArgs[1].replace(/^<(.+)>$/, '$1');
      return {
        command: 'add',
        args: restArgs,
        name: restArgs[0],
        url: url,
      };

    case 'list':
      return {
        command: 'list',
        args: [],
      };

    case 'tool':
      if (restArgs.length < 1) return null;
      return {
        command: 'tool',
        args: restArgs,
        name: restArgs[0],
      };

    case 'help':
      return {
        command: 'help',
        args: [],
      };

    case 'update':
      if (restArgs.length < 1) return null;
      return {
        command: 'update',
        args: restArgs,
        name: restArgs[0],
      };

    case 'delete':
      if (restArgs.length < 1) return null;
      return {
        command: 'delete',
        args: restArgs,
        name: restArgs[0],
      };

    default:
      // MCPサーバー名での実行
      return {
        command: 'execute',
        args: restArgs,
        name: firstArg,
      };
  }
}