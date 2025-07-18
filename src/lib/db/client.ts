import { PrismaClient } from '@prisma/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import { dbConfig } from '../../config.js';

let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    const databaseUrl = dbConfig.url;
    
    if (databaseUrl.startsWith('file:')) {
      prisma = new PrismaClient();
    } else {
      const libsql = createClient({
        url: databaseUrl,
        authToken: process.env.DATABASE_AUTH_TOKEN,
      });
      
      const adapter = new PrismaLibSQL(libsql);
      prisma = new PrismaClient({ adapter } as any);
    }
  }
  
  return prisma;
}

export async function disconnect() {
  if (prisma) {
    await prisma.$disconnect();
  }
}