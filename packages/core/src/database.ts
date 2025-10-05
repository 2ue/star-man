import { PrismaClient } from '@prisma/client';
import { DatabaseConfig } from './types';

export class Database {
  private prisma: PrismaClient;

  constructor(config: DatabaseConfig) {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: config.url,
        },
      },
    });
  }

  async initialize(): Promise<void> {
    try {
      await this.prisma.$connect();
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error}`);
    }
  }

  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }

  getPrisma(): PrismaClient {
    return this.prisma;
  }
}