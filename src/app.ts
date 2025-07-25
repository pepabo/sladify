import pkg from '@slack/bolt';
const { App, SocketModeReceiver } = pkg;

import { CommandContext } from './types/index.js';
import { parseCommand } from './services/command-parser.js';
import { slackConfig } from './config.js';
import { SlackInteractionHandler } from './services/slack-interaction-handler.js';

// コマンドハンドラーのインポート
import { AddCommand } from './commands/add-command.js';
import { ListCommand } from './commands/list-command.js';
import { ToolCommand } from './commands/tool-command.js';
import { UpdateCommand } from './commands/update-command.js';
import { DeleteCommand } from './commands/delete-command.js';
import { InlineFormCommand } from './commands/inline-form-command.js';

const HELP_TEXT = `*:wave: こんにちは！Sladifyです！* :sparkles:

:rocket: *できること:*
• \`@sladify add [名前] [URL]\` - 新しいMCPサーバーを追加するよ！
• \`@sladify list\` - 登録済みのサーバーを見てみよう！
• \`@sladify tool [名前]\` - ツールの詳細をチェック！
• \`@sladify update [名前]\` - ツール情報を最新にアップデート！
• \`@sladify delete [名前]\` - サーバーとお別れする時は...
• \`@sladify [名前]\` - ワークフローを実行！（フォームが出るよ）
• \`@sladify [名前] [値]\` - シンプルなワークフローは直接実行OK！
• \`@sladify help\` - 困ったらまた呼んでね！

:bulb: *ワンポイント:*
パラメータが1つだけのワークフローは引数で直接実行できちゃいます！
複数ある場合は、わかりやすいフォームを使ってね :clipboard:

:books: もっと詳しく知りたい？ https://github.com/pepabo/sladify/blob/main/docs/USER_GUIDE.md`;

export const app = new App({
  token: slackConfig.botToken,
  receiver: new SocketModeReceiver({
    appToken: slackConfig.appToken,
  }),
});

// インタラクションハンドラーの初期化
console.log('Initializing SlackInteractionHandler...');
const interactionHandler = new SlackInteractionHandler(app);
console.log('SlackInteractionHandler initialized');

app.event('app_mention', async ({ event, say }) => {
  const text = event.text.replace(/<@[^>]+>/g, '').trim();
  const parsed = parseCommand(text);

  if (!parsed) {
    await say({ text: HELP_TEXT, thread_ts: event.ts });
    return;
  }

  const context: CommandContext = { 
    event, 
    say, 
    parsed,
    client: app.client,
    channel: event.channel,
    user: event.user,
    ts: event.ts
  };

  const handlers: Record<string, any> = {
    add: AddCommand,
    list: ListCommand,
    tool: ToolCommand,
    update: UpdateCommand,
    delete: DeleteCommand,
    execute: null, // Special handling below
    help: null,
  };

  const HandlerClass = handlers[parsed.command];
  
  if (parsed.command === 'help') {
    await say({ text: HELP_TEXT, thread_ts: event.ts });
    return;
  }

  // executeコマンドはインラインフォームを使用
  if (parsed.command === 'execute') {
    const handler = new InlineFormCommand(context, app);
    await handler.execute();
  } else if (HandlerClass) {
    const handler = new HandlerClass(context);
    await handler.execute();
  } else {
    await say({ text: HELP_TEXT, thread_ts: event.ts });
  }
});

app.error(async () => {
  // エラーはコマンドハンドラー内で処理
});