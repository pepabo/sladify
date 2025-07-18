import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  SLACK_BOT_TOKEN: z.string().startsWith('xoxb-'),
  SLACK_APP_TOKEN: z.string().startsWith('xapp-'),
  DATABASE_URL: z.string().default('file:./sladify.db'),
});

const env = envSchema.parse(process.env);

export const slackConfig = {
  botToken: env.SLACK_BOT_TOKEN,
  appToken: env.SLACK_APP_TOKEN,
};

export const dbConfig = {
  url: env.DATABASE_URL,
};