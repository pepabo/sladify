import { BaseCommandHandler } from '../services/command-handler.js';
import { CommandError } from '../types/index.js';

export class DeleteCommand extends BaseCommandHandler {
  async execute(): Promise<void> {
    await this.withErrorHandling(async () => {
      const { name } = this.context.parsed;
      
      if (!name) {
        throw new CommandError('使い方: `@sladify delete [MCPサーバー名]`');
      }

      const server = await this.getServer(name);
      
      await this.prisma.mCPServer.delete({
        where: { id: server.id },
      });

      await this.reply(`MCPサーバー「${name}」を削除しました。`);
    });
  }
}