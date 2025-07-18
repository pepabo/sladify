import pkg from '@slack/bolt';
const { App, SocketModeReceiver } = pkg;

import { CommandContext } from './types/index.js';
import { parseCommand } from './services/command-parser.js';
import { slackConfig } from './config.js';

// コマンドハンドラーのインポート
import { AddCommand } from './commands/add-command.js';
import { ListCommand } from './commands/list-command.js';
import { ToolCommand } from './commands/tool-command.js';
import { UpdateCommand } from './commands/update-command.js';
import { DeleteCommand } from './commands/delete-command.js';
import { ExecuteCommand } from './commands/execute-command.js';

const HELP_TEXT = `使い方:
• \`@sladify add [名前] [URL]\` - MCPサーバーを登録
• \`@sladify list\` - 登録済みサーバー一覧
• \`@sladify tool [名前]\` - ツール情報を表示
• \`@sladify update [名前]\` - ツール情報を更新
• \`@sladify delete [名前]\` - MCPサーバーを削除
• \`@sladify [名前] [引数...]\` - MCPツールを実行
• \`@sladify help\` - このヘルプを表示`;

export const app = new App({
  token: slackConfig.botToken,
  receiver: new SocketModeReceiver({
    appToken: slackConfig.appToken,
  }),
});

app.event('app_mention', async ({ event, say }) => {
  const text = event.text.replace(/<@[^>]+>/g, '').trim();
  const parsed = parseCommand(text);

  if (!parsed) {
    await say({ text: HELP_TEXT, thread_ts: event.ts });
    return;
  }

  const context: CommandContext = { event, say, parsed };

  const handlers = {
    add: AddCommand,
    list: ListCommand,
    tool: ToolCommand,
    update: UpdateCommand,
    delete: DeleteCommand,
    execute: ExecuteCommand,
    help: null,
  };

  const HandlerClass = handlers[parsed.command];
  
  if (parsed.command === 'help' || !HandlerClass) {
    await say({ text: HELP_TEXT, thread_ts: event.ts });
    return;
  }

  const handler = new HandlerClass(context);
  await handler.execute();
});

app.error(async () => {
  // エラーはコマンドハンドラー内で処理
});