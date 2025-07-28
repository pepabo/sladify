import { App, BlockAction } from '@slack/bolt';
import { getPrisma } from './command-handler.js';
import { MCPClient } from './mcp-client.js';
import { markdownToSlack } from '../utils/markdown-to-slack.js';
import { createTextBlocks } from '../utils/slack-text-splitter.js';

const prisma = getPrisma();

export class SlackInteractionHandler {
  constructor(private app: App) {
    this.setupHandlers();
  }

  private setupHandlers(): void {
    console.log('Setting up interaction handlers...');
    
    // 実行ボタンのハンドラー
    this.app.action(/^execute_.*$/, async ({ ack, body, client }) => {
      await ack();
      console.log('Execute button clicked');
      
      const blockAction = body as BlockAction;
      const action = blockAction.actions[0];
      if (!('value' in action) || !action.value) return;
      
      try {
        const { serverId, toolName } = JSON.parse(action.value);
        
        // サーバー情報を取得
        const server = await prisma.mCPServer.findUnique({
          where: { id: serverId },
          include: { tools: true }
        });
        
        if (!server) {
          await client.chat.postMessage({
            channel: blockAction.channel?.id || '',
            thread_ts: blockAction.message?.ts,
            text: ':mag: サーバーが見つからなかったみたい... もう一度試してみて！'
          });
          return;
        }
        
        // フォームの値を取得
        const values: Record<string, any> = {};
        const state = blockAction.state?.values || {};
        
        // ツールのスキーマを取得して型情報を参照
        const tool = server.tools[0];
        let schema: any = {};
        try {
          schema = tool?.inputSchema ? JSON.parse(tool.inputSchema) : {};
        } catch {
          // スキーマ解析エラー
        }
        const properties = schema.properties || {};
        
        for (const blockId in state) {
          const block = state[blockId];
          for (const actionId in block) {
            const element = block[actionId];
            
            // actionIdからフィールド名を抽出
            if (actionId.startsWith('input_') || actionId.startsWith('select_')) {
              const fieldName = actionId.replace(/^(input_|select_)/, '');
              const fieldSchema = properties[fieldName] || {};
              
              if (element.type === 'plain_text_input' && element.value) {
                const value = element.value;
                // 数値型の場合は変換
                if (fieldSchema.type === 'number' || fieldSchema.type === 'float' || fieldSchema.type === 'integer') {
                  const numValue = parseFloat(value);
                  values[fieldName] = isNaN(numValue) ? value : numValue;
                } else {
                  values[fieldName] = value;
                }
              } else if (element.type === 'static_select' && element.selected_option?.value) {
                values[fieldName] = element.selected_option.value;
              }
            }
          }
        }
        
        // ファイル関連の処理を削除（Dify MCPはファイル非対応）
        
        // 実行中メッセージ（よりポップでフレンドリーなデザイン）
        await client.chat.postMessage({
          channel: blockAction.channel?.id || '',
          thread_ts: blockAction.message?.ts,
          text: `${server.name}を実行中...`,
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
        const mcpClient = new MCPClient({
          endpoint: server.endpoint,
          userId: blockAction.user.id,
          timeout: process.env.MCP_TIMEOUT ? parseInt(process.env.MCP_TIMEOUT) : undefined
        });
        
        await mcpClient.initialize();
        
        let result = '';
        let hasError = false;
        
        for await (const event of mcpClient.executeTool(toolName, values)) {
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
        
        // 結果を表示（よりポップでフレンドリーなデザイン）
        if (hasError) {
          await client.chat.postMessage({
            channel: blockAction.channel?.id || '',
            thread_ts: blockAction.message?.ts,
            text: 'エラーが発生しました',
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
          if (result) {
            const convertedResult = markdownToSlack(result);
            const blocks = createTextBlocks(convertedResult, ':tada: *実行完了！結果はこちら:*');
            
            await client.chat.postMessage({
              channel: blockAction.channel?.id || '',
              thread_ts: blockAction.message?.ts,
              text: '実行完了',
              blocks: blocks
            });
          } else {
            await client.chat.postMessage({
              channel: blockAction.channel?.id || '',
              thread_ts: blockAction.message?.ts,
              text: '実行完了',
              blocks: [
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
        
      } catch (error) {
        console.error('Execute error:', error);
        await client.chat.postMessage({
          channel: blockAction.channel?.id || '',
          thread_ts: blockAction.message?.ts,
          text: `:dizzy_face: あらら、何か問題が発生しちゃった: ${error instanceof Error ? error.message : 'Unknown error'}\n:wrench: もう一度試してみてね！`
        });
      }
    });
    
    // 選択フィールドの変更ハンドラー
    this.app.action(/^select_.*$/, async ({ ack }) => {
      await ack();
      // 値の変更を記憶（必要に応じて）
    });
    
    // ファイル関連のハンドラーを削除（Dify MCPはファイル非対応）
    

  }
}