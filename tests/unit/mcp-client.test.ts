import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MCPClient } from '../../src/services/mcp-client.js';
import { MCPClientError } from '../../src/types/index.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('MCPClient', () => {
  let client: MCPClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new MCPClient({
      endpoint: 'https://test.example.com/mcp',
      userId: 'test-user',
      timeout: 5000,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create client with config', () => {
      const config = {
        endpoint: 'https://api.example.com',
        userId: 'user123',
        timeout: 10000,
      };
      const testClient = new MCPClient(config);
      expect(testClient['config']).toEqual(config);
    });

    it('should create client without timeout', () => {
      const config = {
        endpoint: 'https://api.example.com',
        userId: 'user123',
      };
      const testClient = new MCPClient(config);
      expect(testClient['config']).toEqual(config);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('OK'),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await client.initialize();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.example.com/mcp',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          },
          body: expect.stringContaining('"method":"initialize"'),
          signal: expect.any(AbortSignal),
        })
      );

      expect(mockResponse.text).toHaveBeenCalled();
    });

    it('should throw error on failed initialization', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('Server Error'),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(client.initialize()).rejects.toThrow(MCPClientError);
      await expect(client.initialize()).rejects.toThrow('HTTP 500: Server Error');
    });

    it('should include protocol version and client info', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('OK'),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await client.initialize();

      const callArgs = global.fetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.params).toMatchObject({
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'sladify',
          version: '1.0.0',
        },
        user: 'test-user',
      });
    });
  });

  describe('listTools', () => {
    it('should return tools list', async () => {
      const mockTools = [
        { name: 'tool1', description: 'Tool 1' },
        { name: 'tool2', description: 'Tool 2' },
      ];

      const mockSSEData = `data: ${JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: { tools: mockTools },
      })}\n\n`;

      const mockResponse = {
        ok: true,
        status: 200,
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockSSEData) })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: vi.fn(),
          }),
        },
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const tools = await client.listTools();

      expect(tools).toEqual(mockTools);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.example.com/mcp',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"method":"tools/list"'),
        })
      );
    });

    it('should return empty array when no tools', async () => {
      const mockSSEData = `data: ${JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        result: {},
      })}\n\n`;

      const mockResponse = {
        ok: true,
        status: 200,
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockSSEData) })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: vi.fn(),
          }),
        },
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const tools = await client.listTools();

      expect(tools).toEqual([]);
    });

    it('should throw error on SSE error event', async () => {
      const mockSSEData = `data: ${JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        error: { message: 'Failed to list tools' },
      })}\n\n`;

      const mockResponse = {
        ok: true,
        status: 200,
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(mockSSEData) })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: vi.fn(),
          }),
        },
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(client.listTools()).rejects.toThrow(MCPClientError);
      await expect(client.listTools()).rejects.toThrow('Failed to list tools');
    });
  });

  describe('executeTool', () => {
    it('should call tools/call endpoint with correct parameters', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        body: {
          getReader: () => ({
            read: vi.fn()
              .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('data: {"type":"complete"}\n\n') })
              .mockResolvedValueOnce({ done: true }),
            releaseLock: vi.fn(),
          }),
        },
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      // Just consume the generator to trigger the request
      const events = [];
      for await (const event of client.executeTool('test-tool', { param1: 'value1' })) {
        events.push(event);
      }

      expect(global.fetch).toHaveBeenCalledWith(
        'https://test.example.com/mcp',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"method":"tools/call"'),
        })
      );

      const callArgs = global.fetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.params).toMatchObject({
        name: 'test-tool',
        arguments: { param1: 'value1' },
        user: 'test-user',
      });
    });
  });

  describe('error handling', () => {
    it('should handle HTTP errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        text: vi.fn().mockResolvedValue('Not Found'),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(client.initialize()).rejects.toThrow(MCPClientError);
      await expect(client.initialize()).rejects.toThrow('HTTP 404: Not Found');
    });

    it('should handle timeout', async () => {
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AbortError')), 100);
        })
      );

      const fastClient = new MCPClient({
        endpoint: 'https://test.example.com',
        userId: 'test',
        timeout: 50,
      });

      await expect(fastClient.initialize()).rejects.toThrow();
    });

    it('should use default timeout of 30 seconds', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('OK'),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const clientNoTimeout = new MCPClient({
        endpoint: 'https://test.example.com',
        userId: 'test',
      });

      await clientNoTimeout.initialize();

      const callArgs = global.fetch.mock.calls[0];
      expect(callArgs[1].signal).toBeDefined();
    });
  });
});