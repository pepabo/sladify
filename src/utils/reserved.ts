// 予約されたコマンド名のリスト
export const RESERVED_COMMANDS = [
  'add',
  'list',
  'tool',
  'help',
  'execute',
  'delete',
  'remove',
  'update',
  'refresh',
  'sync',
  'status',
  'info',
  'version',
  'config',
  'settings',
] as const;

export function isReservedCommand(name: string): boolean {
  return RESERVED_COMMANDS.includes(name.toLowerCase() as any);
}