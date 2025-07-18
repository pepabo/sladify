import type { SayFn } from '@slack/bolt';
import type { AppMentionEvent } from '@slack/types';
import type { ParsedCommand } from '../utils/parser.js';
import { getPrismaClient } from '../lib/db/client.js';
import { MCPClient } from '../lib/mcp/client.js';
import { isReservedCommand } from '../utils/reserved.js';
import { z } from 'zod';

// シンプルにhttpまたはhttpsで始まることだけチェック
const urlSchema = z.string().regex(
  /^https?:\/\//,
  'HTTPまたはHTTPSで始まる有効なURLを指定してください。'
);

export async function handleAddCommand(
  parsed: ParsedCommand,
  event: AppMentionEvent,
  say: SayFn
) {
  if (!parsed.name || !parsed.url) {
    await say({
      text: '使い方: `@sladify add [名前] [URL]`',
      thread_ts: event.ts,
    });
    return;
  }

  // 予約語チェック
  if (isReservedCommand(parsed.name)) {
    await say({
      text: `「${parsed.name}」は予約されたコマンド名です。別の名前を指定してください。`,
      thread_ts: event.ts,
    });
    return;
  }

  try {
    urlSchema.parse(parsed.url);
  } catch (error) {
    await say({
      text: '無効なURLです。HTTPまたはHTTPSで始まる有効なURLを指定してください。',
      thread_ts: event.ts,
    });
    return;
  }

  const prisma = getPrismaClient();

  try {
    const existing = await prisma.mCPServer.findUnique({
      where: { name: parsed.name },
    });

    if (existing) {
      await say({
        text: `MCPサーバー「${parsed.name}」は既に登録されています。`,
        thread_ts: event.ts,
      });
      return;
    }

    // MCPサーバーを作成
    const server = await prisma.mCPServer.create({
      data: {
        name: parsed.name,
        endpoint: parsed.url,
      },
    });

    // ツール情報を取得
    try {
      const client = new MCPClient({
        endpoint: parsed.url,
        timeout: 30000,
        userId: event.user,
      });
      
      // MCPサーバーを初期化
      await client.initialize();
      
      const tools = await client.listTools();
      
      // ツール情報をDBに保存
      if (tools.length > 0) {
        await prisma.mCPTool.createMany({
          data: tools.map(tool => ({
            serverId: server.id,
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema ? JSON.stringify(tool.inputSchema) : null,
          })),
        });
      }
      
      await say({
        text: `MCPサーバー「${parsed.name}」を登録しました。\nツール数: ${tools.length}`,
        thread_ts: event.ts,
      });
    } catch (toolError) {
      // ツール取得に失敗してもサーバー登録は成功
      await say({
        text: `MCPサーバー「${parsed.name}」を登録しました。\n⚠️ ツール情報の取得に失敗しました`,
        thread_ts: event.ts,
      });
    }
  } catch (error) {
    await say({
      text: `登録に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      thread_ts: event.ts,
    });
  }
}