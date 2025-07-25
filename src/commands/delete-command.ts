import { BaseCommandHandler } from '../services/command-handler.js';
import { CommandError } from '../types/index.js';

export class DeleteCommand extends BaseCommandHandler {
  async execute(): Promise<void> {
    await this.withErrorHandling(async () => {
      const { name } = this.context.parsed;
      
      if (!name) {
        throw new CommandError(':wave: 使い方: `@sladify delete [MCPサーバー名]`\n例: `@sladify delete my-tool`');
      }

      const server = await this.getServer(name);
      
      await this.prisma.mCPServer.delete({
        where: { id: server.id },
      });

      await this.reply(`:wave: MCPサーバー「${name}」とはお別れしたよ！\n:sparkles: また新しいサーバーを登録したい時は \`@sladify add\` で追加できるよ！`);
    });
  }
}