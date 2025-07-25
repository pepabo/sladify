import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getPrisma, closePrisma, isReservedCommand, RESERVED_COMMANDS } from '../../src/services/command-handler.js';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    $disconnect: vi.fn(),
  })),
}));

describe('command-handler utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Reset the prisma instance
    await closePrisma();
  });

  describe('getPrisma', () => {
    it('should create a new PrismaClient instance on first call', () => {
      const prisma = getPrisma();
      expect(PrismaClient).toHaveBeenCalledTimes(1);
      expect(prisma).toBeDefined();
    });

    it('should return the same instance on subsequent calls', () => {
      const prisma1 = getPrisma();
      const prisma2 = getPrisma();
      expect(PrismaClient).toHaveBeenCalledTimes(1);
      expect(prisma1).toBe(prisma2);
    });
  });

  describe('closePrisma', () => {
    it('should disconnect and reset prisma instance', async () => {
      const prisma = getPrisma();
      await closePrisma();
      
      expect(prisma.$disconnect).toHaveBeenCalledTimes(1);
      
      // Getting prisma again should create a new instance
      getPrisma();
      expect(PrismaClient).toHaveBeenCalledTimes(2);
    });

    it('should handle closing when no prisma instance exists', async () => {
      // Should not throw error
      await expect(closePrisma()).resolves.not.toThrow();
    });
  });

  describe('isReservedCommand', () => {
    it('should return true for reserved commands', () => {
      RESERVED_COMMANDS.forEach(cmd => {
        expect(isReservedCommand(cmd)).toBe(true);
      });
    });

    it('should be case insensitive', () => {
      expect(isReservedCommand('ADD')).toBe(true);
      expect(isReservedCommand('List')).toBe(true);
      expect(isReservedCommand('HELP')).toBe(true);
    });

    it('should return false for non-reserved commands', () => {
      expect(isReservedCommand('custom')).toBe(false);
      expect(isReservedCommand('workflow')).toBe(false);
      expect(isReservedCommand('mycommand')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isReservedCommand('')).toBe(false);
      expect(isReservedCommand(' add ')).toBe(false); // with spaces
      expect(isReservedCommand('add-command')).toBe(false);
    });
  });

  describe('RESERVED_COMMANDS', () => {
    it('should contain all expected reserved commands', () => {
      const expected = ['add', 'list', 'tool', 'update', 'delete', 'help'];
      expect(RESERVED_COMMANDS).toEqual(expected);
    });
  });
});