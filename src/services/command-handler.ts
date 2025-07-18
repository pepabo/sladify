import { CommandContext, CommandError } from '../types/index.js';
import { PrismaClient } from '@prisma/client';
import { MCPClient } from './mcp-client.js';

let prisma: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient();
  }
  return prisma;
}

export async function closePrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

export abstract class BaseCommandHandler {
  protected prisma: PrismaClient;

  constructor(protected context: CommandContext) {
    this.prisma = getPrisma();
  }

  abstract execute(): Promise<void>;

  protected async reply(text: string): Promise<void> {
    await this.context.say({
      text,
      thread_ts: this.context.event.ts,
    });
  }

  protected async getServer(name: string) {
    const server = await this.prisma.mCPServer.findUnique({
      where: { name },
      include: { tools: true },
    });

    if (!server) {
      throw new CommandError(`MCPサーバー「${name}」が見つかりません。`);
    }

    return server;
  }

  protected createMCPClient(endpoint: string): MCPClient {
    return new MCPClient({
      endpoint,
      userId: this.context.event.user || 'unknown',
    });
  }

  protected async withErrorHandling(operation: () => Promise<void>): Promise<void> {
    try {
      await operation();
    } catch (error) {
      if (error instanceof CommandError) {
        await this.reply(error.message);
      } else {
        await this.reply(
          `エラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }
}

// 予約コマンド名の定義
export const RESERVED_COMMANDS = [
  'add', 'list', 'tool', 'update', 'delete', 'help'
] as const;

export function isReservedCommand(name: string): boolean {
  return RESERVED_COMMANDS.includes(name.toLowerCase() as any);
}