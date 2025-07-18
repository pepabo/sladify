import type { SayFn } from '@slack/bolt';
import type { AppMentionEvent } from '@slack/types';
import type { ParsedCommand } from '../utils/parser.js';
import { getPrismaClient } from '../lib/db/client.js';
import { MCPClient } from '../lib/mcp/client.js';

export async function handleToolCommand(
  parsed: ParsedCommand,
  event: AppMentionEvent,
  say: SayFn
) {
  if (!parsed.name) {
    await say({
      text: '使い方: `@sladify tool [MCPサーバー名]`',
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

    const client = new MCPClient({
      endpoint: server.endpoint,
      timeout: 30000,
      userId: event.user,
    });

    // MCPサーバーを初期化
    await client.initialize();

    const tools = await client.listTools();

    if (tools.length === 0) {
      await say({
        text: `MCPサーバー「${server.name}」にはツールがありません。`,
        thread_ts: event.ts,
      });
      return;
    }

    const toolList = tools.map(tool => {
      const params = tool.inputSchema?.properties 
        ? Object.entries(tool.inputSchema.properties)
            .map(([key, schema]: [string, any]) => {
              const required = tool.inputSchema.required?.includes(key) ? '必須' : '任意';
              const type = schema.type || 'any';
              return `  - ${key} (${type}, ${required}): ${schema.description || ''}`;
            })
            .join('\n')
        : '  パラメータなし';

      return `*${tool.name}*\n${tool.description || '説明なし'}\nパラメータ:\n${params}`;
    }).join('\n\n');

    await say({
      text: `MCPサーバー「${server.name}」のツール:\n\n${toolList}`,
      thread_ts: event.ts,
    });
  } catch (error) {
    await say({
      text: `ツール情報の取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      thread_ts: event.ts,
    });
  }
}