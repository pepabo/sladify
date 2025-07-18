import { BaseCommandHandler } from '../services/command-handler.js';
import { CommandError } from '../types/index.js';

export class UpdateCommand extends BaseCommandHandler {
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
      const { name } = this.context.parsed;
      
      if (!name) {
        throw new CommandError('使い方: `@sladify update [MCPサーバー名]`');
      }

      const server = await this.getServer(name);
      
      await this.reply(`MCPサーバー「${name}」のツール情報を更新中...`);

      const client = this.createMCPClient(server.endpoint);
      await client.initialize();
      const newTools = await client.listTools();

      // ファイルフィールドのチェック
      for (const tool of newTools) {
        if (this.hasFileField(tool)) {
          throw new CommandError(
            `ツール「${tool.name}」にファイルフィールドが含まれています。\n` +
            `DifyのMCPサーバーはファイルアップロードに対応していません。`
          );
        }
      }

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