import { BaseCommandHandler } from '../services/command-handler.js';

export class ListCommand extends BaseCommandHandler {
  async execute(): Promise<void> {
    await this.withErrorHandling(async () => {
      const servers = await this.prisma.mCPServer.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          tools: true
        }
      });

      if (servers.length === 0) {
        await this.reply(':thinking_face: まだMCPサーバーが登録されていないみたい！\n:point_right: `@sladify add [名前] [URL]` で追加してみてね！');
        return;
      }

      const serverList = servers.map(s => {
        // ツールの説明文を集める（重複を除去）
        const descriptions = s.tools
          .map(t => t.description)
          .filter((desc): desc is string => desc !== null && desc !== undefined && desc.trim() !== '')
          .filter((desc, index, self) => self.indexOf(desc) === index);
        
        let serverInfo = `:package: *${s.name}*`;
        
        if (descriptions.length > 0) {
          // 説明文が長い場合は最初の1つだけ表示
          const desc = descriptions[0];
          const truncatedDesc = desc.length > 60 ? desc.substring(0, 60) + '...' : desc;
          serverInfo += ` - ${truncatedDesc}`;
        }
        
        return serverInfo;
      }).join('\n');
      await this.reply(`:sparkles: *登録済みのMCPサーバー* (${servers.length}個)\n\n${serverList}\n\n:bulb: 実行するには \`@sladify [名前]\` と入力してね！`);
    });
  }
}