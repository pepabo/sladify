import { ParsedCommand, CommandName } from '../types/index.js';

const COMMAND_PATTERNS: Record<CommandName, number> = {
  add: 2,      // name url
  list: 0,     // no args
  tool: 1,     // name
  update: 1,   // name
  delete: 1,   // name
  execute: -1, // any args
  help: 0,     // no args
};

export function parseCommand(text: string): ParsedCommand | null {
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;

  const [firstArg, ...restArgs] = parts;
  const command = firstArg.toLowerCase();

  // 既知のコマンドかチェック
  if (command in COMMAND_PATTERNS) {
    const expectedArgs = COMMAND_PATTERNS[command as CommandName];
    
    // 引数の数が不足している場合
    if (expectedArgs > 0 && restArgs.length < expectedArgs) {
      return null;
    }

    // addコマンドの特殊処理（SlackのURL自動フォーマット除去）
    if (command === 'add' && restArgs.length >= 2) {
      restArgs[1] = restArgs[1].replace(/^<(.+)>$/, '$1');
    }

    return {
      command: command as CommandName,
      args: restArgs,
      name: restArgs[0],
      url: command === 'add' ? restArgs[1] : undefined,
    };
  }

  // 未知のコマンドはexecuteとして扱う
  return {
    command: 'execute',
    args: restArgs,
    name: firstArg,
  };
}