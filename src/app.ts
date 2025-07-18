import pkg from '@slack/bolt';
const { App, SocketModeReceiver } = pkg;
import { handleAddCommand } from './commands/add.js';
import { handleListCommand } from './commands/list.js';
import { handleToolCommand } from './commands/tool.js';
import { handleExecuteCommand } from './commands/execute.js';
import { handleUpdateCommand } from './commands/update.js';
import { handleDeleteCommand } from './commands/delete.js';
import { parseCommand } from './utils/parser.js';
import { slackConfig } from './config.js';

const receiver = new SocketModeReceiver({
  appToken: slackConfig.appToken,
});

export const app = new App({
  token: slackConfig.botToken,
  receiver,
});

app.event('app_mention', async ({ event, say }) => {
  try {
    const text = event.text.replace(/<@[^>]+>/g, '').trim();
    const parsed = parseCommand(text);

    if (!parsed) {
      await say({
        text: '使い方:\n' +
              '• `@sladify add [名前] [URL]` - MCPサーバーを登録\n' +
              '• `@sladify list` - 登録済みサーバー一覧\n' +
              '• `@sladify tool [名前]` - ツール情報を表示\n' +
              '• `@sladify update [名前]` - ツール情報を更新\n' +
              '• `@sladify delete [名前]` - MCPサーバーを削除\n' +
              '• `@sladify [名前] [引数...]` - MCPツールを実行',
        thread_ts: event.ts,
      });
      return;
    }

    switch (parsed.command) {
      case 'add':
        await handleAddCommand(parsed, event, say);
        break;
      case 'list':
        await handleListCommand(event, say);
        break;
      case 'tool':
        await handleToolCommand(parsed, event, say);
        break;
      case 'update':
        await handleUpdateCommand(parsed, event, say);
        break;
      case 'delete':
        await handleDeleteCommand(parsed, event, say);
        break;
      case 'execute':
        await handleExecuteCommand(parsed, event, say);
        break;
      case 'help':
        await say({
          text: '使い方:\n' +
                '• `@sladify add [名前] [URL]` - MCPサーバーを登録\n' +
                '• `@sladify list` - 登録済みサーバー一覧\n' +
                '• `@sladify tool [名前]` - ツール情報を表示\n' +
                '• `@sladify update [名前]` - ツール情報を更新\n' +
                '• `@sladify delete [名前]` - MCPサーバーを削除\n' +
                '• `@sladify [名前] [引数...]` - MCPツールを実行\n' +
                '• `@sladify help` - このヘルプを表示',
          thread_ts: event.ts,
        });
        break;
    }
  } catch (error) {
    await say({
      text: `エラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      thread_ts: event.ts,
    });
  }
});

app.error(async () => {
  // Slack app error handler
});