import { BaseCommandHandler } from '../services/command-handler.js';

export class ListCommand extends BaseCommandHandler {
  async execute(): Promise<void> {
    await this.withErrorHandling(async () => {
      const servers = await this.prisma.mCPServer.findMany({
        orderBy: { createdAt: 'desc' },
      });

      if (servers.length === 0) {
        await this.reply('MCPサーバーは登録されていません。');
        return;
      }

      const serverList = servers.map(s => `• ${s.name}`).join('\n');
      await this.reply(`登録済みMCPサーバー:\n${serverList}`);
    });
  }
}