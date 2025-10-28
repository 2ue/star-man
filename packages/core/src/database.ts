import { PrismaClient } from '@prisma/client';
import { DatabaseConfig } from './types';
import { execSync } from 'child_process';
import { join } from 'path';

export class Database {
  private prisma: PrismaClient;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
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

      // 检查数据库表是否存在
      const needsInit = await this.checkIfNeedsInitialization();

      if (needsInit) {
        console.log('📦 检测到数据库未初始化，正在自动创建表...');
        await this.initializeSchema();
        console.log('✅ 数据库初始化完成');
      }
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error}`);
    }
  }

  /**
   * 检查数据库是否需要初始化
   * 通过尝试查询主表来判断
   */
  private async checkIfNeedsInitialization(): Promise<boolean> {
    try {
      // 尝试查询 starred_repos 表
      await this.prisma.starredRepo.findFirst();
      return false; // 表存在，不需要初始化
    } catch (error) {
      // 表不存在或查询失败，需要初始化
      return true;
    }
  }

  /**
   * 初始化数据库Schema
   * 使用 prisma db push 自动创建表
   */
  private async initializeSchema(): Promise<void> {
    try {
      const schemaPath = join(__dirname, '../prisma/schema.prisma');

      // 运行 prisma db push
      execSync(`npx prisma db push --schema="${schemaPath}" --skip-generate`, {
        env: {
          ...process.env,
          DATABASE_URL: this.config.url
        },
        stdio: 'pipe' // 静默执行，只在出错时显示
      });
    } catch (error) {
      throw new Error(`Failed to initialize database schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }

  getPrisma(): PrismaClient {
    return this.prisma;
  }
}