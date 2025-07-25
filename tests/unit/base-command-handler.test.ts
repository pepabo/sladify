import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseCommandHandler } from '../../src/services/command-handler.js';
import { CommandContext, CommandError } from '../../src/types/index.js';

// Mock PrismaClient
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    mCPServer: {
      findUnique: vi.fn(),
    },
    $disconnect: vi.fn(),
  })),
}));

// Mock MCPClient
vi.mock('../../src/services/mcp-client.js', () => ({
  MCPClient: vi.fn((config) => ({ config })),
}));

// Create a concrete implementation for testing
class TestCommandHandler extends BaseCommandHandler {
  async execute(): Promise<void> {
    // Implementation for testing
  }

  // Expose protected methods for testing
  async testReply(text: string): Promise<void> {
    return this.reply(text);
  }

  async testGetServer(name: string) {
    return this.getServer(name);
  }

  testCreateMCPClient(endpoint: string) {
    return this.createMCPClient(endpoint);
  }

  async testWithErrorHandling(operation: () => Promise<void>): Promise<void> {
    return this.withErrorHandling(operation);
  }
}

describe('BaseCommandHandler', () => {
  let context: CommandContext;
  let handler: TestCommandHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    
    context = {
      event: {
        type: 'app_mention',
        user: 'U123456',
        text: 'test',
        ts: '1234567890.123456',
        channel: 'C123456',
        event_ts: '1234567890.123456',
      },
      say: vi.fn(),
      parsed: {
        command: 'execute',
        args: [],
      },
    };

    handler = new TestCommandHandler(context);
  });

  describe('reply', () => {
    it('should send a threaded reply', async () => {
      await handler.testReply('Hello, world!');

      expect(context.say).toHaveBeenCalledWith({
        text: 'Hello, world!',
        thread_ts: '1234567890.123456',
      });
    });
  });

  describe('getServer', () => {
    it('should return server when found', async () => {
      const mockServer = {
        id: '1',
        name: 'test-server',
        endpoint: 'https://example.com',
        tools: [],
      };

      handler.prisma.mCPServer.findUnique = vi.fn().mockResolvedValue(mockServer);

      const server = await handler.testGetServer('test-server');

      expect(handler.prisma.mCPServer.findUnique).toHaveBeenCalledWith({
        where: { name: 'test-server' },
        include: { tools: true },
      });
      expect(server).toEqual(mockServer);
    });

    it('should throw CommandError when server not found', async () => {
      handler.prisma.mCPServer.findUnique = vi.fn().mockResolvedValue(null);

      await expect(handler.testGetServer('nonexistent')).rejects.toThrow(CommandError);
      await expect(handler.testGetServer('nonexistent')).rejects.toThrow(
        /MCPサーバー「nonexistent」が見つからないよ/
      );
    });
  });

  describe('createMCPClient', () => {
    it('should create MCP client with user ID from event', () => {
      const client = handler.testCreateMCPClient('https://example.com');

      expect(client).toBeDefined();
      expect(client.config).toEqual({
        endpoint: 'https://example.com',
        userId: 'U123456',
      });
    });

    it('should use "unknown" when user ID is not available', () => {
      context.event.user = undefined as any;
      const handler2 = new TestCommandHandler(context);
      const client = handler2.testCreateMCPClient('https://example.com');

      expect(client.config.userId).toBe('unknown');
    });
  });

  describe('withErrorHandling', () => {
    it('should execute operation successfully', async () => {
      const operation = vi.fn().mockResolvedValue(undefined);
      await handler.testWithErrorHandling(operation);

      expect(operation).toHaveBeenCalledTimes(1);
      expect(context.say).not.toHaveBeenCalled();
    });

    it('should handle CommandError with custom message', async () => {
      const operation = vi.fn().mockRejectedValue(new CommandError('Custom error message'));
      await handler.testWithErrorHandling(operation);

      expect(context.say).toHaveBeenCalledWith({
        text: 'Custom error message',
        thread_ts: '1234567890.123456',
      });
    });

    it('should handle generic Error with default message', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Generic error'));
      await handler.testWithErrorHandling(operation);

      expect(context.say).toHaveBeenCalledWith({
        text: ':dizzy_face: あらら、何か問題が発生しちゃった: Generic error\n:wrench: もう一度試してみてね！',
        thread_ts: '1234567890.123456',
      });
    });

    it('should handle non-Error objects', async () => {
      const operation = vi.fn().mockRejectedValue('String error');
      await handler.testWithErrorHandling(operation);

      expect(context.say).toHaveBeenCalledWith({
        text: ':dizzy_face: あらら、何か問題が発生しちゃった: Unknown error\n:wrench: もう一度試してみてね！',
        thread_ts: '1234567890.123456',
      });
    });
  });
});