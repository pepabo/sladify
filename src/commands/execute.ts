import type { SayFn } from '@slack/bolt';
import type { AppMentionEvent } from '@slack/types';
import type { ParsedCommand } from '../utils/parser.js';
import { getPrismaClient } from '../lib/db/client.js';
import { MCPClient } from '../lib/mcp/client.js';

export async function handleExecuteCommand(
  parsed: ParsedCommand,
  event: AppMentionEvent,
  say: SayFn
) {
  if (!parsed.name) {
    await say({
      text: '使い方: `@sladify [MCPサーバー名] [引数...]`',
      thread_ts: event.ts,
    });
    return;
  }

  const prisma = getPrismaClient();

  try {
    const server = await prisma.mCPServer.findUnique({
      where: { name: parsed.name },
      include: {
        tools: true,
      },
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
      timeout: 300000, // 5分
      userId: event.user,
    });

    // MCPサーバーを初期化
    await client.initialize();

    // ツール情報を取得（通常は1つのツールのみ）
    const executeTool = server.tools[0];
    if (!executeTool) {
      // ツール情報がない場合はデフォルト設定を使用
    }

    // 引数をパース
    const args: Record<string, any> = {};
    
    // スキーマがある場合はそれに基づいてパラメータを構築
    if (executeTool?.inputSchema) {
      try {
        const schema = JSON.parse(executeTool.inputSchema);
        const properties = schema.properties || {};
        
        // まず、key=value形式の引数を処理
        const keyValueArgs: Record<string, any> = {};
        const plainArgs: string[] = [];
        
        for (const arg of parsed.args) {
          const eqIndex = arg.indexOf('=');
          if (eqIndex !== -1) {
            const key = arg.substring(0, eqIndex);
            const value = arg.substring(eqIndex + 1);
            
            // スキーマに定義されているキーの場合のみ処理
            if (properties[key]) {
              if (value === '') {
                // 空の値の場合
                keyValueArgs[key] = '';
              } else {
                try {
                  // JSON形式の値をパース
                  keyValueArgs[key] = JSON.parse(value);
                } catch {
                  // JSONでない場合は文字列として扱う
                  keyValueArgs[key] = value;
                }
              }
            }
          } else {
            // key=value形式でない引数は後で処理
            plainArgs.push(arg);
          }
        }
        
        // key=value形式で指定された引数を設定
        Object.assign(args, keyValueArgs);
        
        // plainArgsが残っていて、まだ設定されていない文字列型パラメータがある場合
        if (plainArgs.length > 0) {
          // 最初の未設定の文字列型パラメータを探す
          for (const [propName, propSchema] of Object.entries(properties)) {
            const schema = propSchema as any;
            if (schema.type === 'string' && !(propName in args)) {
              args[propName] = plainArgs.join(' ');
              break;
            }
          }
        }
        
        // 必須パラメータのチェック
        const required = schema.required || [];
        const missing = required.filter((key: string) => !(key in args));
        if (missing.length > 0) {
          // 必須パラメータが不足している場合の処理
        }
      } catch (e) {
        // スキーマのパースエラーは無視
      }
    }
    
    // スキーマがない場合のフォールバック
    if (!executeTool?.inputSchema && parsed.args.length > 0) {
      // スキーマがない場合は、すべての引数を連結してinputsまたはqueryという名前で送る
      // （Difyのワークフローでよく使われるパラメータ名）
      args.inputs = parsed.args.join(' ');
    }

    // 実行開始メッセージ
    await say({
      text: `MCPサーバー「${server.name}」でツールを実行中...`,
      thread_ts: event.ts,
    });

    let result = '';
    let hasError = false;

    // ストリーミング実行
    for await (const executionEvent of client.executeToolStream({
      name: executeTool?.name || parsed.name, // 登録されたツール名を使用、なければMCPサーバー名
      arguments: args,
    })) {
      switch (executionEvent.type) {
        case 'chunk':
          if (executionEvent.data) {
            result += executionEvent.data;
          }
          break;
        case 'error':
          hasError = true;
          result = executionEvent.error || 'Unknown error';
          break;
      }
    }

    // 結果を表示
    if (hasError) {
      await say({
        text: `実行エラー:\n${result}`,
        thread_ts: event.ts,
      });
    } else {
      await say({
        text: result || '実行完了しましたが、結果が空です。',
        thread_ts: event.ts,
      });
    }
  } catch (error) {
    await say({
      text: `実行に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      thread_ts: event.ts,
    });
  }
}