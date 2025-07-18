import type { SayFn } from '@slack/bolt';
import type { AppMentionEvent } from '@slack/types';
import type { ParsedCommand } from '../utils/parser.js';
import { getPrismaClient } from '../lib/db/client.js';

export async function handleDeleteCommand(
  parsed: ParsedCommand,
  event: AppMentionEvent,
  say: SayFn
) {
  if (!parsed.name) {
    await say({
      text: '使い方: `@sladify delete [MCPサーバー名]`',
      thread_ts: event.ts,
    });
    return;
  }

  const prisma = getPrismaClient();

  try {
    const server = await prisma.mCPServer.findUnique({
      where: { name: parsed.name },
    });

    if (!server) {
      await say({
        text: `MCPサーバー「${parsed.name}」が見つかりません。`,
        thread_ts: event.ts,
      });
      return;
    }

    // MCPサーバーを削除（関連するツール情報も自動的に削除される）
    await prisma.mCPServer.delete({
      where: { id: server.id },
    });

    await say({
      text: `MCPサーバー「${parsed.name}」を削除しました。`,
      thread_ts: event.ts,
    });
  } catch (error) {
    await say({
      text: `削除に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      thread_ts: event.ts,
    });
  }
}