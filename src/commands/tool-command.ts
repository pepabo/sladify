import { BaseCommandHandler } from '../services/command-handler.js';
import { CommandError } from '../types/index.js';

export class ToolCommand extends BaseCommandHandler {
  async execute(): Promise<void> {
    await this.withErrorHandling(async () => {
      const { name } = this.context.parsed;
      
      if (!name) {
        throw new CommandError(':wave: 使い方: `@sladify tool [MCPサーバー名]`\n例: `@sladify tool my-tool`');
      }

      const server = await this.getServer(name);
      const client = this.createMCPClient(server.endpoint);
      
      await client.initialize();
      const tools = await client.listTools();

      if (tools.length === 0) {
        await this.reply(`:package: MCPサーバー「${name}」にはツールがないみたい。\n:bulb: サーバーを更新してみる？ \`@sladify update ${name}\``);
        return;
      }

      const toolList = tools.map(tool => {
        const schema = tool.inputSchema;
        const params = schema?.properties
          ? Object.entries(schema.properties)
              .map(([key, prop]: [string, any]) => {
                const required = schema.required?.includes(key) ? ':exclamation: 必須' : ':white_circle: 任意';
                const type = prop.type || 'any';
                return `  • ${key} (${type}, ${required}): ${prop.description || ''}`;
              })
              .join('\n')
          : '  :zero: パラメータなし';

        return `:toolbox: *${tool.name}*\n_${tool.description || '説明なし'}_\n\n:gear: パラメータ:\n${params}`;
      }).join('\n\n');

      await this.reply(`:sparkles: *MCPサーバー「${name}」のツール一覧*\n\n${toolList}\n\n:rocket: 実行するには \`@sladify ${name}\` と入力してね！`);
    });
  }
}