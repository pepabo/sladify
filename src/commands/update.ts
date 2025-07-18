import type { SayFn } from '@slack/bolt';
import type { AppMentionEvent } from '@slack/types';
import type { ParsedCommand } from '../utils/parser.js';
import { getPrismaClient } from '../lib/db/client.js';
import { MCPClient } from '../lib/mcp/client.js';

export async function handleUpdateCommand(
  parsed: ParsedCommand,
  event: AppMentionEvent,
  say: SayFn
) {
  if (!parsed.name) {
    await say({
      text: '使い方: `@sladify update [MCPサーバー名]`',
      thread_ts: event.ts,
    });
    return;
  }

  const prisma = getPrismaClient();

  try {
    const server = await prisma.mCPServer.findUnique({
      where: { name: parsed.name },
      include: { tools: true },
    });

    if (!server) {
      await say({
        text: `MCPサーバー「${parsed.name}」が見つかりません。`,
        thread_ts: event.ts,
      });
      return;
    }

    // 更新開始メッセージ
    await say({
      text: `MCPサーバー「${parsed.name}」のツール情報を更新中...`,
      thread_ts: event.ts,
    });

    try {
      // MCPクライアントを作成
      const client = new MCPClient({
        endpoint: server.endpoint,
        timeout: 30000,
        userId: event.user,
      });

      // MCPサーバーを初期化
      await client.initialize();

      // 新しいツール情報を取得
      const newTools = await client.listTools();

      // 既存のツールを削除
      await prisma.mCPTool.deleteMany({
        where: { serverId: server.id },
      });

      // 新しいツール情報を保存
      if (newTools.length > 0) {
        await prisma.mCPTool.createMany({
          data: newTools.map(tool => ({
            serverId: server.id,
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema ? JSON.stringify(tool.inputSchema) : null,
          })),
        });
      }

      // 更新前後の変化を報告
      const oldToolNames = server.tools.map(t => t.name).sort();
      const newToolNames = newTools.map(t => t.name).sort();
      
      const added = newToolNames.filter(name => !oldToolNames.includes(name));
      const removed = oldToolNames.filter(name => !newToolNames.includes(name));
      
      let changeMessage = `MCPサーバー「${parsed.name}」のツール情報を更新しました。\n`;
      changeMessage += `ツール数: ${server.tools.length} → ${newTools.length}\n`;
      
      if (added.length > 0) {
        changeMessage += `\n追加されたツール:\n${added.map(name => `• ${name}`).join('\n')}`;
      }
      if (removed.length > 0) {
        changeMessage += `\n削除されたツール:\n${removed.map(name => `• ${name}`).join('\n')}`;
      }
      if (added.length === 0 && removed.length === 0 && server.tools.length === newTools.length) {
        changeMessage += '\n変更はありませんでした。';
      }

      await say({
        text: changeMessage,
        thread_ts: event.ts,
      });
    } catch (updateError) {
      await say({
        text: `ツール情報の更新に失敗しました: ${updateError instanceof Error ? updateError.message : 'Unknown error'}`,
        thread_ts: event.ts,
      });
    }
  } catch (error) {
    await say({
      text: `更新処理に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      thread_ts: event.ts,
    });
  }
}