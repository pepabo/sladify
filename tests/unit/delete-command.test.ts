import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteCommand } from '../../src/commands/delete-command.js';
import { CommandContext, CommandError } from '../../src/types/index.js';

// Mock dependencies
vi.mock('../../src/services/command-handler.js', () => ({
  BaseCommandHandler: vi.fn().mockImplementation(function(context) {
    this.context = context;
    this.prisma = {
      mCPServer: {
        findUnique: vi.fn(),
        delete: vi.fn(),
      },
    };
    this.reply = vi.fn();
    this.getServer = vi.fn();
    this.withErrorHandling = async (operation) => {
      try {
        await operation();
      } catch (error) {
        if (error instanceof CommandError) {
          await this.reply(error.message);
        } else {
          throw error;
        }
      }
    };
  }),
}));

describe('DeleteCommand', () => {
  let context: CommandContext;
  let command: DeleteCommand;

  beforeEach(() => {
    vi.clearAllMocks();
    
    context = {
      event: {
        type: 'app_mention',
        user: 'U123456',
        text: '@sladify delete my-server',
        ts: '1234567890.123456',
        channel: 'C123456',
        event_ts: '1234567890.123456',
      },
      say: vi.fn(),
      parsed: {
        command: 'delete',
        args: ['my-server'],
        name: 'my-server',
      },
    };

    command = new DeleteCommand(context);
  });

  describe('execute', () => {
    it('should delete server successfully', async () => {
      const mockServer = {
        id: 'server-123',
        name: 'my-server',
        endpoint: 'https://example.com',
      };

      command.getServer = vi.fn().mockResolvedValue(mockServer);

      await command.execute();

      expect(command.getServer).toHaveBeenCalledWith('my-server');
      expect(command.prisma.mCPServer.delete).toHaveBeenCalledWith({
        where: { id: 'server-123' },
      });
      expect(command.reply).toHaveBeenCalledWith(
        ':wave: MCPサーバー「my-server」とはお別れしたよ！\n:sparkles: また新しいサーバーを登録したい時は `@sladify add` で追加できるよ！'
      );
    });

    it('should show usage when name is missing', async () => {
      context.parsed.name = undefined;
      command = new DeleteCommand(context);

      await command.execute();

      expect(command.reply).toHaveBeenCalledWith(
        ':wave: 使い方: `@sladify delete [MCPサーバー名]`\n例: `@sladify delete my-tool`'
      );
      expect(command.getServer).not.toHaveBeenCalled();
      expect(command.prisma.mCPServer.delete).not.toHaveBeenCalled();
    });

    it('should handle server not found error', async () => {
      command.getServer = vi.fn().mockRejectedValue(
        new CommandError(':mag: MCPサーバー「my-server」が見つからないよ！')
      );

      await command.execute();

      expect(command.reply).toHaveBeenCalledWith(
        ':mag: MCPサーバー「my-server」が見つからないよ！'
      );
      expect(command.prisma.mCPServer.delete).not.toHaveBeenCalled();
    });

    it('should handle database error', async () => {
      const mockServer = {
        id: 'server-123',
        name: 'my-server',
        endpoint: 'https://example.com',
      };

      command.getServer = vi.fn().mockResolvedValue(mockServer);
      command.prisma.mCPServer.delete = vi.fn().mockRejectedValue(new Error('Database error'));

      await expect(command.execute()).rejects.toThrow('Database error');
    });
  });
});