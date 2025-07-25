import { describe, it, expect } from 'vitest';
import { MCPClientError, CommandError } from '../../src/types/index.js';

describe('Custom Error Classes', () => {
  describe('MCPClientError', () => {
    it('should create error with message only', () => {
      const error = new MCPClientError('Test error message');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(MCPClientError);
      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('MCPClientError');
      expect(error.code).toBeUndefined();
    });

    it('should create error with message and code', () => {
      const error = new MCPClientError('Test error message', 'ERR_001');
      expect(error.message).toBe('Test error message');
      expect(error.code).toBe('ERR_001');
    });

    it('should have proper stack trace', () => {
      const error = new MCPClientError('Stack trace test');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('MCPClientError');
    });
  });

  describe('CommandError', () => {
    it('should create error with message only', () => {
      const error = new CommandError('Command failed');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CommandError);
      expect(error.message).toBe('Command failed');
      expect(error.name).toBe('CommandError');
      expect(error.code).toBeUndefined();
    });

    it('should create error with message and code', () => {
      const error = new CommandError('Command failed', 'CMD_NOT_FOUND');
      expect(error.message).toBe('Command failed');
      expect(error.code).toBe('CMD_NOT_FOUND');
    });

    it('should have proper stack trace', () => {
      const error = new CommandError('Stack trace test');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('CommandError');
    });
  });

  describe('Error inheritance', () => {
    it('MCPClientError should be instanceof Error', () => {
      const error = new MCPClientError('Test');
      expect(error instanceof Error).toBe(true);
    });

    it('CommandError should be instanceof Error', () => {
      const error = new CommandError('Test');
      expect(error instanceof Error).toBe(true);
    });

    it('errors should be distinguishable', () => {
      const mcpError = new MCPClientError('MCP Error');
      const cmdError = new CommandError('Command Error');

      expect(mcpError instanceof MCPClientError).toBe(true);
      expect(mcpError instanceof CommandError).toBe(false);
      expect(cmdError instanceof CommandError).toBe(true);
      expect(cmdError instanceof MCPClientError).toBe(false);
    });
  });
});