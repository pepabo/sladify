import { BaseCommandHandler } from '../services/command-handler.js';
import { CommandError } from '../types/index.js';

export class ToolCommand extends BaseCommandHandler {
  async execute(): Promise<void> {
    await this.withErrorHandling(async () => {
      const { name } = this.context.parsed;
      
      if (!name) {
        throw new CommandError('使い方: `@sladify tool [MCPサーバー名]`');
      }

      const server = await this.getServer(name);
      const client = this.createMCPClient(server.endpoint);
      
      await client.initialize();
      const tools = await client.listTools();

      if (tools.length === 0) {
        await this.reply(`MCPサーバー「${name}」にはツールがありません。`);
        return;
      }

      const toolList = tools.map(tool => {
        const schema = tool.inputSchema;
        const params = schema?.properties
          ? Object.entries(schema.properties)
              .map(([key, prop]: [string, any]) => {
                const required = schema.required?.includes(key) ? '必須' : '任意';
                const type = prop.type || 'any';
                return `  - ${key} (${type}, ${required}): ${prop.description || ''}`;
              })
              .join('\n')
          : '  パラメータなし';

        return `*${tool.name}*\n${tool.description || '説明なし'}\nパラメータ:\n${params}`;
      }).join('\n\n');

      await this.reply(`MCPサーバー「${name}」のツール:\n\n${toolList}`);
    });
  }
}