import { PrismaClient } from '@prisma/client';
import { DatabaseConfig } from './types';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { ensureDirSync } from 'fs-extra';
import { existsSync } from 'fs';

export class Database {
  private static syncedDatabases = new Set<string>();
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
      // ✅ 修复：在连接数据库前，确保 SQLite 文件的父目录存在
      this.ensureDatabaseDirectoryExists();

      // 总是确保 schema 已同步（每个数据库 URL 只运行一次）
      if (!Database.syncedDatabases.has(this.config.url)) {
        console.log('📦 正在同步数据库 schema...');
        this.syncSchema();
        Database.syncedDatabases.add(this.config.url);
        console.log('✅ 数据库 schema 已同步');
      }

      await this.prisma.$connect();
    } catch (error) {
      throw new Error(`Failed to connect to database: ${error}`);
    }
  }

  /**
   * 确保 SQLite 数据库文件的父目录存在
   * 只处理 file: URL，其他数据库类型跳过
   */
  private ensureDatabaseDirectoryExists(): void {
    const url = this.config.url;

    // 只处理 SQLite (file: URL)
    if (!url.startsWith('file:')) {
      return;
    }

    // 提取文件路径（移除 file: 前缀）
    const filePath = url.substring(5);

    // 获取父目录并确保存在
    const dir = dirname(filePath);
    ensureDirSync(dir);
  }

  /**
   * 使用本地 Prisma CLI 同步数据库 Schema
   */
  private syncSchema(): void {
    try {
      const schemaPath = join(__dirname, '../prisma/schema.prisma');
      const prismaBinary = this.resolvePrismaBinary();

      execSync(`"${prismaBinary}" db push --schema="${schemaPath}" --skip-generate`, {
        env: {
          ...process.env,
          DATABASE_URL: this.config.url
        },
        stdio: 'inherit'
      });
    } catch (error) {
      throw new Error(`Failed to initialize database schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 定位 Prisma CLI 的路径，避免依赖全局 npx
   */
  private resolvePrismaBinary(): string {
    const binaryName = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
    const localBinary = join(__dirname, '../node_modules/.bin', binaryName);
    if (existsSync(localBinary)) {
      return localBinary;
    }

    const workspaceBinary = join(process.cwd(), 'node_modules/.bin', binaryName);
    if (existsSync(workspaceBinary)) {
      return workspaceBinary;
    }

    throw new Error('Prisma CLI binary not found. Please install the "prisma" package.');
  }

  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }

  getPrisma(): PrismaClient {
    return this.prisma;
  }
}
