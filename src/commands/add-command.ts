import { BaseCommandHandler, isReservedCommand } from '../services/command-handler.js';
import { CommandError } from '../types/index.js';

export class AddCommand extends BaseCommandHandler {
  /**
   * ツールにファイルフィールドが含まれているかチェック
   */
  private hasFileField(tool: any): boolean {
    if (!tool.inputSchema) return false;
    
    try {
      const schema = typeof tool.inputSchema === 'string' 
        ? JSON.parse(tool.inputSchema) 
        : tool.inputSchema;
      
      const properties = schema.properties || {};
      
      for (const [key, prop] of Object.entries(properties)) {
        const p = prop as any;
        // fileキー、fileタイプ、またはタイプが未定義の場合
        if (key === 'file' || p.type === 'file' || (!p.type && key.toLowerCase().includes('file'))) {
          return true;
        }
      }
    } catch {
      // パースエラーの場合はfalse
    }
    
    return false;
  }

  async execute(): Promise<void> {
    await this.withErrorHandling(async () => {
      const { name, url } = this.context.parsed;
      
      if (!name || !url) {
        throw new CommandError(':wave: おっと！使い方はこうだよ: `@sladify add [名前] [URL]`\n例: `@sladify add my-tool https://example.com/mcp`');
      }

      if (isReservedCommand(name)) {
        throw new CommandError(`:no_entry_sign: 「${name}」は特別な名前だから使えないんだ。別の名前にしてみて！`);
      }

      if (!url.match(/^https?:\/\//)) {
        throw new CommandError(':link: URLは http:// か https:// で始まる必要があるよ！');
      }

      const existing = await this.prisma.mCPServer.findUnique({
        where: { name },
      });

      if (existing) {
        throw new CommandError(`:warning: 「${name}」という名前はもう使われているみたい！\n別の名前を試してみてね :sparkles:`);
      }

      const server = await this.prisma.mCPServer.create({
        data: { name, endpoint: url },
      });

      // ツール情報を取得
      try {
        const client = this.createMCPClient(url);
        await client.initialize();
        const tools = await client.listTools();

        // ファイルフィールドのチェック
        for (const tool of tools) {
          if (this.hasFileField(tool)) {
            // エラーの場合はサーバーを削除
            await this.prisma.mCPServer.delete({
              where: { id: server.id }
            });
            
            throw new CommandError(
              `:file_folder: おっと！ツール「${tool.name}」にファイルフィールドがあるみたい。\n` +
              `:information_source: 残念ながらDifyのMCPサーバーはファイルアップロードに対応していないんだ。`
            );
          }
        }

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

        await this.reply(`:tada: やったね！MCPサーバー「${name}」を登録したよ！\n:toolbox: 使えるツール: ${tools.length}個\n\n:rocket: 実行するには \`@sladify ${name}\` と入力してね！`);
      } catch (error) {
        // エラーが発生した場合はサーバーを削除
        await this.prisma.mCPServer.delete({
          where: { id: server.id }
        }).catch(() => {}); // 削除エラーは無視
        
        if (error instanceof CommandError) {
          throw error;
        }
        throw new CommandError(`:x: ツール情報の取得がうまくいかなかったみたい...\nURLが正しいか確認してみてね！`);
      }
    });
  }
}