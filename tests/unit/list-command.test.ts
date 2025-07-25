import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListCommand } from '../../src/commands/list-command.js';
import { CommandContext } from '../../src/types/index.js';

// Mock dependencies
vi.mock('../../src/services/command-handler.js', () => ({
  BaseCommandHandler: vi.fn().mockImplementation(function(context) {
    this.context = context;
    this.prisma = {
      mCPServer: {
        findMany: vi.fn(),
      },
    };
    this.reply = vi.fn();
    this.withErrorHandling = async (operation) => {
      try {
        await operation();
      } catch (error) {
        await this.reply(`:dizzy_face: エラー: ${error.message}`);
      }
    };
  }),
}));

describe('ListCommand', () => {
  let context: CommandContext;
  let command: ListCommand;

  beforeEach(() => {
    vi.clearAllMocks();
    
    context = {
      event: {
        type: 'app_mention',
        user: 'U123456',
        text: '@sladify list',
        ts: '1234567890.123456',
        channel: 'C123456',
        event_ts: '1234567890.123456',
      },
      say: vi.fn(),
      parsed: {
        command: 'list',
        args: [],
      },
    };

    command = new ListCommand(context);
  });

  describe('execute', () => {
    it('should list servers when servers exist', async () => {
      const mockServers = [
        { id: '1', name: 'server-one', endpoint: 'https://one.example.com', createdAt: new Date() },
        { id: '2', name: 'server-two', endpoint: 'https://two.example.com', createdAt: new Date() },
        { id: '3', name: 'server-three', endpoint: 'https://three.example.com', createdAt: new Date() },
      ];

      command.prisma.mCPServer.findMany = vi.fn().mockResolvedValue(mockServers);

      await command.execute();

      expect(command.prisma.mCPServer.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });

      expect(command.reply).toHaveBeenCalledWith(
        ':sparkles: *登録済みのMCPサーバー* (3個)\n\n' +
        ':package: server-one\n' +
        ':package: server-two\n' +
        ':package: server-three\n\n' +
        ':bulb: 実行するには `@sladify [名前]` と入力してね！'
      );
    });

    it('should show empty state when no servers exist', async () => {
      command.prisma.mCPServer.findMany = vi.fn().mockResolvedValue([]);

      await command.execute();

      expect(command.prisma.mCPServer.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });

      expect(command.reply).toHaveBeenCalledWith(
        ':thinking_face: まだMCPサーバーが登録されていないみたい！\n' +
        ':point_right: `@sladify add [名前] [URL]` で追加してみてね！'
      );
    });

    it('should handle single server correctly', async () => {
      const mockServers = [
        { id: '1', name: 'single-server', endpoint: 'https://single.example.com', createdAt: new Date() },
      ];

      command.prisma.mCPServer.findMany = vi.fn().mockResolvedValue(mockServers);

      await command.execute();

      expect(command.reply).toHaveBeenCalledWith(
        ':sparkles: *登録済みのMCPサーバー* (1個)\n\n' +
        ':package: single-server\n\n' +
        ':bulb: 実行するには `@sladify [名前]` と入力してね！'
      );
    });

    it('should handle database error', async () => {
      command.prisma.mCPServer.findMany = vi.fn().mockRejectedValue(new Error('Database connection failed'));

      await command.execute();

      expect(command.reply).toHaveBeenCalledWith(':dizzy_face: エラー: Database connection failed');
    });

    it('should order servers by creation date descending', async () => {
      await command.execute();

      expect(command.prisma.mCPServer.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});