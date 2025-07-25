import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('config', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should parse valid environment variables', async () => {
    // Mock environment variables
    vi.stubEnv('SLACK_BOT_TOKEN', 'xoxb-test-token');
    vi.stubEnv('SLACK_APP_TOKEN', 'xapp-test-token');
    vi.stubEnv('DATABASE_URL', 'file:./test.db');

    // Dynamically import to apply mocked env
    const { slackConfig, dbConfig } = await import('../../src/config.js');

    expect(slackConfig.botToken).toBe('xoxb-test-token');
    expect(slackConfig.appToken).toBe('xapp-test-token');
    expect(dbConfig.url).toBe('file:./test.db');
  });

  it('should use default DATABASE_URL when not provided', async () => {
    vi.stubEnv('SLACK_BOT_TOKEN', 'xoxb-test-token');
    vi.stubEnv('SLACK_APP_TOKEN', 'xapp-test-token');
    vi.unstubAllEnvs();
    vi.stubEnv('SLACK_BOT_TOKEN', 'xoxb-test-token');
    vi.stubEnv('SLACK_APP_TOKEN', 'xapp-test-token');
    // Not setting DATABASE_URL

    const { dbConfig } = await import('../../src/config.js');
    expect(dbConfig.url).toBe('file:./sladify.db');
  });

  it('should throw error for invalid SLACK_BOT_TOKEN', async () => {
    vi.stubEnv('SLACK_BOT_TOKEN', 'invalid-token');
    vi.stubEnv('SLACK_APP_TOKEN', 'xapp-test-token');

    await expect(import('../../src/config.js')).rejects.toThrow();
  });

  it('should throw error for invalid SLACK_APP_TOKEN', async () => {
    vi.stubEnv('SLACK_BOT_TOKEN', 'xoxb-test-token');
    vi.stubEnv('SLACK_APP_TOKEN', 'invalid-token');

    await expect(import('../../src/config.js')).rejects.toThrow();
  });

  it('should throw error when required env vars are missing', async () => {
    vi.unstubAllEnvs();
    
    await expect(import('../../src/config.js')).rejects.toThrow();
  });
});