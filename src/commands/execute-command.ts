import { BaseCommandHandler } from '../services/command-handler.js';
import { CommandError } from '../types/index.js';

export class ExecuteCommand extends BaseCommandHandler {
  async execute(): Promise<void> {
    await this.withErrorHandling(async () => {
      const { name, args } = this.context.parsed;
      
      if (!name) {
        throw new CommandError('MCPサーバー名を指定してください。');
      }

      const server = await this.getServer(name);
      const client = this.createMCPClient(server.endpoint);
      
      await client.initialize();

      // 引数をパース
      const parsedArgs = this.parseArguments(args, server.tools[0]);

      await this.reply(`MCPサーバー「${name}」でツールを実行中...`);

      let result = '';
      let hasError = false;

      // ストリーミング実行
      for await (const event of client.executeTool(server.tools[0]?.name || name, parsedArgs)) {
        switch (event.type) {
          case 'chunk':
            if (event.data) result += event.data;
            break;
          case 'error':
            hasError = true;
            result = event.error || 'Unknown error';
            break;
        }
      }

      if (hasError) {
        await this.reply(`実行エラー:\n${result}`);
      } else if (result) {
        await this.reply(result);
      } else {
        await this.reply('実行完了しましたが、結果が空です。');
      }
    });
  }

  private parseArguments(args: string[], tool?: any): Record<string, any> {
    const result: Record<string, any> = {};
    const plainArgs: string[] = [];

    // key=value形式の引数をパース
    for (const arg of args) {
      const match = arg.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        try {
          // JSON形式の値を試行
          result[key] = JSON.parse(value);
        } catch {
          // 通常の文字列として扱う
          result[key] = value;
        }
      } else {
        plainArgs.push(arg);
      }
    }

    // ツールスキーマがある場合の処理
    if (tool?.inputSchema && plainArgs.length > 0) {
      try {
        const schema = JSON.parse(tool.inputSchema);
        const properties = schema.properties || {};
        
        // デフォルトの文字列パラメータに設定
        for (const [propName, propSchema] of Object.entries(properties)) {
          const s = propSchema as any;
          if (s.type === 'string' && !(propName in result)) {
            result[propName] = plainArgs.join(' ');
            break;
          }
        }
      } catch {
        // スキーマ解析エラーは無視
      }
    }

    // スキーマがない場合のフォールバック
    if (!tool?.inputSchema && plainArgs.length > 0) {
      result.inputs = plainArgs.join(' ');
    }

    return result;
  }
}