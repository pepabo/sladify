import { BaseCommandHandler } from '../services/command-handler.js';

export class ListCommand extends BaseCommandHandler {
  async execute(): Promise<void> {
    await this.withErrorHandling(async () => {
      const servers = await this.prisma.mCPServer.findMany({
        orderBy: { createdAt: 'desc' },
      });

      if (servers.length === 0) {
        await this.reply(':thinking_face: まだMCPサーバーが登録されていないみたい！\n:point_right: `@sladify add [名前] [URL]` で追加してみてね！');
        return;
      }

      const serverList = servers.map(s => `:package: ${s.name}`).join('\n');
      await this.reply(`:sparkles: *登録済みのMCPサーバー* (${servers.length}個)\n\n${serverList}\n\n:bulb: 実行するには \`@sladify [名前]\` と入力してね！`);
    });
  }
}