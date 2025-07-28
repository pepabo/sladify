import { App } from '@slack/bolt';
import { BaseCommandHandler } from '../services/command-handler.js';
import { CommandError } from '../types/index.js';
import { markdownToSlack } from '../utils/markdown-to-slack.js';

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
        throw new CommandError(':thinking_face: ワークフロー名を教えてね！\n例: `@sladify my-workflow`');
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
            `:sparkles: このワークフローには${paramCount}個のパラメータがあるよ！\n` +
            `:point_right: パラメータが複数ある場合は、引数なしで実行してフォームを使ってね！\n` +
            `使い方: \`@sladify ${name}\``
          );
          await this.showInlineForm(server);
        } else {
          // key=value形式で実行を試みる
          await this.executeWithArgs(server, args);
        }
      } else {
        // 引数がない場合
        if (paramCount === 0) {
          // パラメータがないツールは直接実行
          await this.executeNoParams(server, tool);
        } else {
          // パラメータがある場合はインラインフォームを表示
          await this.showInlineForm(server);
        }
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
            text: `:rocket: *${server.name}を実行中...* がんばってるからちょっと待ってね！`
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
              text: `:dizzy_face: *あらら、エラーが発生しちゃった...*\n\`\`\`${result}\`\`\`\n:bulb: もう一度試してみてね！`
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
              text: `:tada: *実行完了！結果はこちら:*`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: markdownToSlack(result)
            }
          }
        ] : [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:sparkles: *実行完了したよ！*`
            }
          }
        ]
      });
    }
  }

  /**
   * パラメータなしで実行
   */
  private async executeNoParams(server: any, tool: any): Promise<void> {
    await this.context.say({
      text: `${server.name}を実行中...`,
      thread_ts: this.context.event.ts,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:rocket: *${server.name}を実行中...* がんばってるからちょっと待ってね！`
          }
        }
      ]
    });
    
    // MCP実行処理
    const client = this.createMCPClient(server.endpoint);
    await client.initialize();
    
    let result = '';
    let hasError = false;
    
    for await (const event of client.executeTool(tool.name, {})) {
      switch (event.type) {
        case 'chunk':
          if (event.data) {
            result += event.data;
          }
          break;
        case 'error':
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
              text: `:dizzy_face: *あらら、エラーが発生しちゃった...*\n\`\`\`${result}\`\`\`\n:bulb: もう一度試してみてね！`
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
              text: `:tada: *実行完了！結果はこちら:*`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: markdownToSlack(result)
            }
          }
        ] : [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:sparkles: *実行完了したよ！*`
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

    // よりポップでフレンドリーなヘッダーデザイン
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:star2: *${server.name}* :star2:`
      }
    });
    
    // 説明を表示
    if (tool?.description) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:memo: _${tool.description}_`  // イタリック体で表示
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
                  text: '選んでね！ :point_down:'
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
                text: ':rocket: 実行する！',
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
            text: ':thinking_face: フォームの生成がうまくいかなかったみたい... もう一度試してみて！'
          }
        });
      }
    }

    // スレッド内でコマンドが実行された場合は、スレッド内にフォームを表示
    const sayOptions: any = {
      text: `${server.name} 実行フォーム`,
      blocks
    };
    
    // thread_tsが存在する場合は、同じスレッド内に返信
    if (this.context.event.thread_ts) {
      sayOptions.thread_ts = this.context.event.thread_ts;
    }
    
    await this.context.say(sayOptions);
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
            text: `:rocket: *${server.name}を実行中...* がんばってるからちょっと待ってね！`
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
              text: `:dizzy_face: *あらら、エラーが発生しちゃった...*\n\`\`\`${result}\`\`\`\n:bulb: もう一度試してみてね！`
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
              text: `:tada: *実行完了！結果はこちら:*`
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: markdownToSlack(result)
            }
          }
        ] : [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:sparkles: *実行完了したよ！*`
            }
          }
        ]
      });
    }
  }
}