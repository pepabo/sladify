import { config } from 'dotenv';
import { z } from 'zod';

// Load .env file
config();

// Environment variables schema
const envSchema = z.object({
  SLACK_BOT_TOKEN: z.string().startsWith('xoxb-'),
  SLACK_APP_TOKEN: z.string().startsWith('xapp-'),
  DATABASE_URL: z.string().default('file:./dev.db'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Validate environment variables
const envResult = envSchema.safeParse(process.env);

if (!envResult.success) {
  console.error('❌ Invalid environment variables:');
  console.error(envResult.error.format());
  console.error('\n💡 Make sure you have created a .env file with all required variables.');
  console.error('   You can copy .env.example to .env and fill in the values.');
  process.exit(1);
}

export const env = envResult.data;

// Export individual config values for convenience
export const slackConfig = {
  botToken: env.SLACK_BOT_TOKEN,
  appToken: env.SLACK_APP_TOKEN,
};

export const dbConfig = {
  url: env.DATABASE_URL,
};

export const appConfig = {
  env: env.NODE_ENV,
};