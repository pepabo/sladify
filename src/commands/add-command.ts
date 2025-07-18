import { BaseCommandHandler, isReservedCommand } from '../services/command-handler.js';
import { CommandError } from '../types/index.js';

export class AddCommand extends BaseCommandHandler {
  async execute(): Promise<void> {
    await this.withErrorHandling(async () => {
      const { name, url } = this.context.parsed;
      
      if (!name || !url) {
        throw new CommandError('使い方: `@sladify add [名前] [URL]`');
      }

      if (isReservedCommand(name)) {
        throw new CommandError(`「${name}」は予約されたコマンド名です。`);
      }

      if (!url.match(/^https?:\/\//)) {
        throw new CommandError('HTTPまたはHTTPSで始まる有効なURLを指定してください。');
      }

      const existing = await this.prisma.mCPServer.findUnique({
        where: { name },
      });

      if (existing) {
        throw new CommandError(`MCPサーバー「${name}」は既に登録されています。`);
      }

      const server = await this.prisma.mCPServer.create({
        data: { name, endpoint: url },
      });

      // ツール情報を取得
      try {
        const client = this.createMCPClient(url);
        await client.initialize();
        const tools = await client.listTools();

        if (tools.length > 0) {
          await this.prisma.mCPTool.createMany({
            data: tools.map(tool => ({
              serverId: server.id,
              name: tool.name,
              description: tool.description,
              inputSchema: tool.inputSchema ? JSON.stringify(tool.inputSchema) : null,
            })),
          });
        }

        await this.reply(`MCPサーバー「${name}」を登録しました。\nツール数: ${tools.length}`);
      } catch {
        await this.reply(`MCPサーバー「${name}」を登録しました。\n⚠️ ツール情報の取得に失敗しました`);
      }
    });
  }
}