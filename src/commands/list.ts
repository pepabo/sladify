import type { SayFn } from '@slack/bolt';
import type { AppMentionEvent } from '@slack/types';
import { getPrismaClient } from '../lib/db/client.js';

export async function handleListCommand(
  event: AppMentionEvent,
  say: SayFn
) {
  const prisma = getPrismaClient();

  try {
    const servers = await prisma.mCPServer.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (servers.length === 0) {
      await say({
        text: 'MCPサーバーは登録されていません。',
        thread_ts: event.ts,
      });
      return;
    }

    const serverList = servers
      .map((server) => `• ${server.name}`)
      .join('\n');

    await say({
      text: `登録済みMCPサーバー:\n${serverList}`,
      thread_ts: event.ts,
    });
  } catch (error) {
    await say({
      text: `一覧の取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      thread_ts: event.ts,
    });
  }
}