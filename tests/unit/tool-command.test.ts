import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToolCommand } from '../../src/commands/tool-command.js';
import { CommandContext, CommandError } from '../../src/types/index.js';

// Mock MCPClient
vi.mock('../../src/services/mcp-client.js', () => ({
  MCPClient: vi.fn(() => ({
    initialize: vi.fn(),
    listTools: vi.fn(),
  })),
}));

// Mock dependencies
vi.mock('../../src/services/command-handler.js', () => ({
  BaseCommandHandler: vi.fn().mockImplementation(function(context) {
    this.context = context;
    this.reply = vi.fn();
    this.getServer = vi.fn();
    this.createMCPClient = vi.fn(() => ({
      initialize: vi.fn(),
      listTools: vi.fn(),
    }));
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

describe('ToolCommand', () => {
  let context: CommandContext;
  let command: ToolCommand;

  beforeEach(() => {
    vi.clearAllMocks();
    
    context = {
      event: {
        type: 'app_mention',
        user: 'U123456',
        text: '@sladify tool my-server',
        ts: '1234567890.123456',
        channel: 'C123456',
        event_ts: '1234567890.123456',
      },
      say: vi.fn(),
      parsed: {
        command: 'tool',
        args: ['my-server'],
        name: 'my-server',
      },
    };

    command = new ToolCommand(context);
  });

  describe('execute', () => {
    it('should list tools successfully', async () => {
      const mockServer = {
        id: 'server-123',
        name: 'my-server',
        endpoint: 'https://example.com',
      };

      const mockTools = [
        {
          name: 'search',
          description: 'Search for information',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              limit: { type: 'number', description: 'Result limit' },
            },
            required: ['query'],
          },
        },
        {
          name: 'calculate',
          description: 'Perform calculations',
          inputSchema: {
            type: 'object',
            properties: {
              expression: { type: 'string', description: 'Math expression' },
            },
            required: ['expression'],
          },
        },
      ];

      command.getServer = vi.fn().mockResolvedValue(mockServer);
      const mockClient = {
        initialize: vi.fn(),
        listTools: vi.fn().mockResolvedValue(mockTools),
      };
      command.createMCPClient = vi.fn().mockReturnValue(mockClient);

      await command.execute();

      expect(command.getServer).toHaveBeenCalledWith('my-server');
      expect(command.createMCPClient).toHaveBeenCalledWith('https://example.com');
      expect(mockClient.initialize).toHaveBeenCalled();
      expect(mockClient.listTools).toHaveBeenCalled();
      
      const replyCall = command.reply.mock.calls[0][0];
      expect(replyCall).toContain('MCPサーバー「my-server」のツール一覧');
      expect(replyCall).toContain(':toolbox: *search*');
      expect(replyCall).toContain(':toolbox: *calculate*');
      expect(replyCall).toContain('query (string, :exclamation: 必須)');
      expect(replyCall).toContain('limit (number, :white_circle: 任意)');
    });

    it('should handle tools without description', async () => {
      const mockServer = {
        id: 'server-123',
        name: 'my-server',
        endpoint: 'https://example.com',
      };

      const mockTools = [
        {
          name: 'simple-tool',
          // No description
        },
      ];

      command.getServer = vi.fn().mockResolvedValue(mockServer);
      const mockClient = {
        initialize: vi.fn(),
        listTools: vi.fn().mockResolvedValue(mockTools),
      };
      command.createMCPClient = vi.fn().mockReturnValue(mockClient);

      await command.execute();

      const replyCall = command.reply.mock.calls[0][0];
      expect(replyCall).toContain(':toolbox: *simple-tool*');
      expect(replyCall).toContain('_説明なし_');
      expect(replyCall).toContain(':zero: パラメータなし');
    });

    it('should show usage when name is missing', async () => {
      context.parsed.name = undefined;
      command = new ToolCommand(context);

      await command.execute();

      expect(command.reply).toHaveBeenCalledWith(
        ':wave: 使い方: `@sladify tool [MCPサーバー名]`\n例: `@sladify tool my-tool`'
      );
      expect(command.getServer).not.toHaveBeenCalled();
    });

    it('should handle empty tools list', async () => {
      const mockServer = {
        id: 'server-123',
        name: 'my-server',
        endpoint: 'https://example.com',
      };

      command.getServer = vi.fn().mockResolvedValue(mockServer);
      const mockClient = {
        initialize: vi.fn(),
        listTools: vi.fn().mockResolvedValue([]),
      };
      command.createMCPClient = vi.fn().mockReturnValue(mockClient);

      await command.execute();

      expect(command.reply).toHaveBeenCalledWith(
        ':package: MCPサーバー「my-server」にはツールがないみたい。\n:bulb: サーバーを更新してみる？ `@sladify update my-server`'
      );
    });

    it('should handle server not found error', async () => {
      command.getServer = vi.fn().mockRejectedValue(
        new CommandError(':mag: MCPサーバー「my-server」が見つからないよ！')
      );

      await command.execute();

      expect(command.reply).toHaveBeenCalledWith(
        ':mag: MCPサーバー「my-server」が見つからないよ！'
      );
    });
  });
});