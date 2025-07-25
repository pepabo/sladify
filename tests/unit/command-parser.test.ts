import { describe, it, expect } from 'vitest';
import { parseCommand } from '../../src/services/command-parser.js';

describe('parseCommand', () => {
  describe('add command', () => {
    it('should parse add command with name and URL', () => {
      const result = parseCommand('add myproject https://example.com');
      expect(result).toEqual({
        command: 'add',
        args: ['myproject', 'https://example.com'],
        name: 'myproject',
        url: 'https://example.com',
      });
    });

    it('should handle Slack-formatted URLs', () => {
      const result = parseCommand('add myproject <https://example.com>');
      expect(result).toEqual({
        command: 'add',
        args: ['myproject', 'https://example.com'],
        name: 'myproject',
        url: 'https://example.com',
      });
    });

    it('should return null when URL is missing', () => {
      const result = parseCommand('add myproject');
      expect(result).toBeNull();
    });

    it('should return null when both name and URL are missing', () => {
      const result = parseCommand('add');
      expect(result).toBeNull();
    });
  });

  describe('list command', () => {
    it('should parse list command without arguments', () => {
      const result = parseCommand('list');
      expect(result).toEqual({
        command: 'list',
        args: [],
        name: undefined,
        url: undefined,
      });
    });

    it('should parse list command with extra arguments', () => {
      const result = parseCommand('list extra args');
      expect(result).toEqual({
        command: 'list',
        args: ['extra', 'args'],
        name: 'extra',
        url: undefined,
      });
    });
  });

  describe('tool command', () => {
    it('should parse tool command with name', () => {
      const result = parseCommand('tool mytool');
      expect(result).toEqual({
        command: 'tool',
        args: ['mytool'],
        name: 'mytool',
        url: undefined,
      });
    });

    it('should return null when name is missing', () => {
      const result = parseCommand('tool');
      expect(result).toBeNull();
    });
  });

  describe('update command', () => {
    it('should parse update command with name', () => {
      const result = parseCommand('update myproject');
      expect(result).toEqual({
        command: 'update',
        args: ['myproject'],
        name: 'myproject',
        url: undefined,
      });
    });

    it('should return null when name is missing', () => {
      const result = parseCommand('update');
      expect(result).toBeNull();
    });
  });

  describe('delete command', () => {
    it('should parse delete command with name', () => {
      const result = parseCommand('delete myproject');
      expect(result).toEqual({
        command: 'delete',
        args: ['myproject'],
        name: 'myproject',
        url: undefined,
      });
    });

    it('should return null when name is missing', () => {
      const result = parseCommand('delete');
      expect(result).toBeNull();
    });
  });

  describe('help command', () => {
    it('should parse help command without arguments', () => {
      const result = parseCommand('help');
      expect(result).toEqual({
        command: 'help',
        args: [],
        name: undefined,
        url: undefined,
      });
    });
  });

  describe('execute command', () => {
    it('should parse execute command with arguments', () => {
      const result = parseCommand('execute myworkflow arg1 arg2');
      expect(result).toEqual({
        command: 'execute',
        args: ['myworkflow', 'arg1', 'arg2'],
        name: 'myworkflow',
        url: undefined,
      });
    });

    it('should parse execute command without arguments', () => {
      const result = parseCommand('execute');
      expect(result).toEqual({
        command: 'execute',
        args: [],
        name: undefined,
        url: undefined,
      });
    });
  });

  describe('unknown commands', () => {
    it('should treat unknown commands as execute', () => {
      const result = parseCommand('unknowncommand arg1 arg2');
      expect(result).toEqual({
        command: 'execute',
        args: ['arg1', 'arg2'],
        name: 'unknowncommand',
        url: undefined,
      });
    });
  });

  describe('edge cases', () => {
    it('should return null for empty string', () => {
      const result = parseCommand('');
      expect(result).toBeNull();
    });

    it('should return null for whitespace only', () => {
      const result = parseCommand('   ');
      expect(result).toBeNull();
    });

    it('should handle multiple spaces between arguments', () => {
      const result = parseCommand('add   myproject    https://example.com');
      expect(result).toEqual({
        command: 'add',
        args: ['myproject', 'https://example.com'],
        name: 'myproject',
        url: 'https://example.com',
      });
    });

    it('should handle case insensitive commands', () => {
      const result = parseCommand('ADD myproject https://example.com');
      expect(result).toEqual({
        command: 'add',
        args: ['myproject', 'https://example.com'],
        name: 'myproject',
        url: 'https://example.com',
      });
    });
  });
});