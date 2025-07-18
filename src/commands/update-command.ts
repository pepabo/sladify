import { BaseCommandHandler } from '../services/command-handler.js';
import { CommandError } from '../types/index.js';

export class UpdateCommand extends BaseCommandHandler {
  async execute(): Promise<void> {
    await this.withErrorHandling(async () => {
      const { name } = this.context.parsed;
      
      if (!name) {
        throw new CommandError('使い方: `@sladify update [MCPサーバー名]`');
      }

      const server = await this.getServer(name);
      
      await this.reply(`MCPサーバー「${name}」のツール情報を更新中...`);

      const client = this.createMCPClient(server.endpoint);
      await client.initialize();
      const newTools = await client.listTools();

      // 既存のツールを削除して新規作成
      await this.prisma.mCPTool.deleteMany({
        where: { serverId: server.id },
      });

      if (newTools.length > 0) {
        await this.prisma.mCPTool.createMany({
          data: newTools.map(tool => ({
            serverId: server.id,
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema ? JSON.stringify(tool.inputSchema) : null,
          })),
        });
      }

      // 変更内容を報告
      const oldToolNames = server.tools.map(t => t.name).sort();
      const newToolNames = newTools.map(t => t.name).sort();
      
      const added = newToolNames.filter(n => !oldToolNames.includes(n));
      const removed = oldToolNames.filter(n => !newToolNames.includes(n));
      
      let message = `MCPサーバー「${name}」のツール情報を更新しました。\n`;
      message += `ツール数: ${oldToolNames.length} → ${newToolNames.length}`;
      
      if (added.length > 0) {
        message += `\n\n追加: ${added.join(', ')}`;
      }
      if (removed.length > 0) {
        message += `\n削除: ${removed.join(', ')}`;
      }
      if (added.length === 0 && removed.length === 0 && oldToolNames.length === newToolNames.length) {
        message += '\n\n変更はありませんでした。';
      }

      await this.reply(message);
    });
  }
}