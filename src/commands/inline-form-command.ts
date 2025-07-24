import { App } from '@slack/bolt';
import { BaseCommandHandler } from '../services/command-handler.js';
import { CommandError } from '../types/index.js';

/**
 * メッセージ内で動作するインラインフォームコマンド
 */
export class InlineFormCommand extends BaseCommandHandler {
  constructor(context: any, private app: App) {
    super(context);
  }

  async execute(): Promise<void> {
    await this.withErrorHandling(async () => {
      const { name, args } = this.context.parsed;
      
      if (!name) {
        throw new CommandError('ワークフロー名を指定してください。');
      }

      const server = await this.getServer(name);
      const tool = server.tools[0];
      
      // パラメータ数を確認
      let paramCount = 0;
      let singleParamName: string | null = null;
      
      if (tool?.inputSchema) {
        try {
          const schema = JSON.parse(tool.inputSchema);
          const properties = schema.properties || {};
          const paramNames = Object.keys(properties);
          paramCount = paramNames.length;
          if (paramCount === 1) {
            singleParamName = paramNames[0];
          }
        } catch {
          // スキーマ解析エラー
        }
      }
      
      // 引数がある場合
      if (args.length > 0) {
        if (paramCount === 1 && singleParamName) {
          // パラメータが1つの場合は直接実行
          const value = args.join(' '); // 複数の引数をスペースで結合
          await this.executeSingleParam(server, tool, singleParamName, value);
        } else if (paramCount > 1) {
          // パラメータが複数の場合はエラーメッセージとフォーム表示
          await this.reply(
            `:warning: このワークフローには${paramCount}個のパラメータがあります。\n` +
            `パラメータが複数ある場合は、引数なしで実行してフォームを使用してください。\n` +
            `使い方: \`@sladify ${name}\``
          );
          await this.showInlineForm(server);
        } else {
          // key=value形式で実行を試みる
          await this.executeWithArgs(server, args);
        }
      } else {
        // 引数がない場合はインラインフォームを表示
        await this.showInlineForm(server);
      }
    });
  }

  /**
   * 単一パラメータで実行
   */
  private async executeSingleParam(server: any, tool: any, paramName: string, value: string): Promise<void> {
    const params = { [paramName]: value };
    
    await this.context.say({
      text: `${server.name}を実行中...`,
      thread_ts: this.context.event.ts,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:hourglass_flowing_sand: *${server.name}を実行中...*`
          }
        }
      ]
    });
    
    // MCP実行処理
    const client = this.createMCPClient(server.endpoint);
    await client.initialize();
    
    let result = '';
    let hasError = false;
    
    for await (const event of client.executeTool(tool.name, params)) {
      if (event.type === 'chunk' && event.data) {
        result += event.data;
      } else if (event.type === 'error') {
        hasError = true;
        result = event.error || 'Unknown error';
        break;
      }
    }
    
    // 結果を表示
    if (hasError) {
      await this.context.say({
        text: 'エラーが発生しました',
        thread_ts: this.context.event.ts,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:x: *エラーが発生しました*\n\`\`\`${result}\`\`\``
            }
          }
        ]
      });
    } else {
      await this.context.say({
        text: result || '実行完了',
        thread_ts: this.context.event.ts,
        blocks: result ? [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:white_check_mark: *実行結果*`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: result
            }
          }
        ] : [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:white_check_mark: *実行完了*`
            }
          }
        ]
      });
    }
  }

  /**
   * インラインフォームを表示
   */
  private async showInlineForm(server: any): Promise<void> {
    const tool = server.tools[0];
    const blocks: any[] = [];

    // よりモダンなヘッダーデザイン
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${server.name}*`
      }
    });
    
    // 説明を表示
    if (tool?.description) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `_${tool.description}_`  // イタリック体で表示
        }
      });
    }
    
    // 区切り線
    blocks.push({ type: 'divider' });

    if (tool?.inputSchema) {
      try {
        const schema = JSON.parse(tool.inputSchema);
        const properties = schema.properties || {};
        
        // 各プロパティに対応するインタラクティブ要素を作成
        for (const [key, prop] of Object.entries(properties)) {
          const p = prop as any;
          const isRequired = schema.required?.includes(key);
          
          if (p.enum) {
            // 選択フィールド
            blocks.push({
              type: 'section',
              block_id: `field_${key}`,
              text: {
                type: 'mrkdwn',
                text: `*${key}*${isRequired ? ' *' : ''}`
              },
              accessory: {
                type: 'static_select',
                action_id: `select_${key}`,
                placeholder: {
                  type: 'plain_text',
                  text: '選択してください'
                },
                options: p.enum.map((value: string) => ({
                  text: {
                    type: 'plain_text',
                    text: value
                  },
                  value: value
                }))
              }
            });
          } else if (p.type === 'string') {
            // テキスト入力（複数行対応）
            blocks.push({
              type: 'input',
              block_id: `input_field_${key}`,
              label: {
                type: 'plain_text',
                text: `${key}${isRequired ? ' *' : ''}`,
                emoji: true
              },
              element: {
                type: 'plain_text_input',
                action_id: `input_${key}`,
                multiline: true,  // 複数行入力を有効化
                placeholder: {
                  type: 'plain_text',
                  text: (p.description || `${key}を入力`).replace(/\n/g, ' ')  // 改行を削除
                }
              },
              hint: {
                type: 'plain_text',
                text: 'Shift+Enterで改行できます'
              },
              optional: !isRequired
            });
          } else if (p.type === 'number' || p.type === 'float' || p.type === 'integer') {
            // 数値入力
            blocks.push({
              type: 'input',
              block_id: `input_field_${key}`,
              label: {
                type: 'plain_text',
                text: `${key}${isRequired ? ' *' : ''}`,
                emoji: true
              },
              element: {
                type: 'plain_text_input',
                action_id: `input_${key}`,
                placeholder: {
                  type: 'plain_text',
                  text: (p.description || `数値を入力`).replace(/\n/g, ' ')  // 改行を削除
                }
              },
              optional: !isRequired
            });
          }
          // ファイルフィールドはスキップ（Dify MCPはファイル非対応）
        }

        // ボタンの前に少しスペースを追加
        blocks.push({ type: 'section', text: { type: 'mrkdwn', text: ' ' } });
        
        // 実行ボタン
        blocks.push({
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '実行',
                emoji: true
              },
              style: 'primary',
              action_id: `execute_${server.id}`,
              value: JSON.stringify({
                serverId: server.id,
                toolName: tool.name
              })
            }
          ]
        });
      } catch (error) {
        console.error('Schema parse error:', error);
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'フォームの生成に失敗しました。'
          }
        });
      }
    }

    await this.context.say({
      text: `${server.name} 実行フォーム`,
      blocks
    });
  }

  /**
   * 引数付きで実行
   */
  private async executeWithArgs(server: any, args: string[]): Promise<void> {
    const tool = server.tools[0];
    const parsedArgs: Record<string, any> = {};

    // key=value形式をパース
    for (const arg of args) {
      const match = arg.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        try {
          parsedArgs[key] = JSON.parse(value);
        } catch {
          parsedArgs[key] = value;
        }
      }
    }

    await this.context.say({
      text: `${server.name}を実行中...`,
      thread_ts: this.context.event.ts,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:hourglass_flowing_sand: *${server.name}を実行中...*`
          }
        }
      ]
    });
    
    // ここで実際のMCP実行処理を行う
    const client = this.createMCPClient(server.endpoint);
    await client.initialize();
    
    let result = '';
    let hasError = false;
    
    for await (const event of client.executeTool(tool.name, parsedArgs)) {
      if (event.type === 'chunk' && event.data) {
        result += event.data;
      } else if (event.type === 'error') {
        hasError = true;
        result = event.error || 'Unknown error';
        break;
      }
    }

    // 結果を表示（統一されたデザイン）
    if (hasError) {
      await this.context.say({
        text: 'エラーが発生しました',
        thread_ts: this.context.event.ts,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:x: *エラーが発生しました*\n\`\`\`${result}\`\`\``
            }
          }
        ]
      });
    } else {
      await this.context.say({
        text: result || '実行完了',
        thread_ts: this.context.event.ts,
        blocks: result ? [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:white_check_mark: *実行結果*`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: result
            }
          }
        ] : [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:white_check_mark: *実行完了*`
            }
          }
        ]
      });
    }
  }
}