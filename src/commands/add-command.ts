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

        // ファイルフィールドのチェック
        for (const tool of tools) {
          if (this.hasFileField(tool)) {
            // エラーの場合はサーバーを削除
            await this.prisma.mCPServer.delete({
              where: { id: server.id }
            });
            
            throw new CommandError(
              `ツール「${tool.name}」にファイルフィールドが含まれています。\n` +
              `DifyのMCPサーバーはファイルアップロードに対応していません。`
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

        await this.reply(`MCPサーバー「${name}」を登録しました。\nツール数: ${tools.length}`);
      } catch (error) {
        // エラーが発生した場合はサーバーを削除
        await this.prisma.mCPServer.delete({
          where: { id: server.id }
        }).catch(() => {}); // 削除エラーは無視
        
        if (error instanceof CommandError) {
          throw error;
        }
        throw new CommandError(`ツール情報の取得に失敗しました。`);
      }
    });
  }
}