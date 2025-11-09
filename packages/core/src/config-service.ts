import { Database } from './database';
import type { AutoSyncConfig } from './types';

export class ConfigService {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * 初始化配置（从环境变量加载，仅当数据库不存在时）
   */
  async initConfig(): Promise<void> {
    const prisma = this.db.getPrisma();

    const existing = await prisma.appConfig.findUnique({
      where: { key: 'autoSync.enabled' }
    });

    if (!existing) {
      // 从环境变量读取初始值
      const enabled = process.env.AUTO_SYNC_ENABLED === 'true';
      const cronExpr = process.env.AUTO_SYNC_CRON || '0 2 * * *';
      const timezone = process.env.AUTO_SYNC_TIMEZONE || 'Asia/Shanghai';

      await prisma.appConfig.createMany({
        data: [
          { key: 'autoSync.enabled', value: String(enabled), type: 'boolean' },
          { key: 'autoSync.cronExpr', value: cronExpr, type: 'string' },
          { key: 'autoSync.timezone', value: timezone, type: 'string' }
        ]
      });
    }
  }

  /**
   * 获取单个配置（类型安全版本）
   */
  async getConfig<T>(key: string): Promise<T | null> {
    const prisma = this.db.getPrisma();
    const config = await prisma.appConfig.findUnique({ where: { key } });

    if (!config) return null;

    try {
      return this.deserializeValue(config.value, config.type) as T;
    } catch (error) {
      console.error(`配置反序列化失败 [${key}]:`, error);
      return null;
    }
  }

  /**
   * 设置单个配置
   */
  async setConfig<T>(key: string, value: T, type: string): Promise<void> {
    const prisma = this.db.getPrisma();
    await prisma.appConfig.upsert({
      where: { key },
      create: { key, value: String(value), type },
      update: { value: String(value), updatedAt: new Date() }
    });
  }

  /**
   * 获取自动同步配置
   */
  async getAutoSyncConfig(): Promise<AutoSyncConfig> {
    const [enabled, cronExpr, timezone] = await Promise.all([
      this.getConfig<boolean>('autoSync.enabled'),
      this.getConfig<string>('autoSync.cronExpr'),
      this.getConfig<string>('autoSync.timezone')
    ]);

    return {
      enabled: enabled ?? false,
      cronExpr: cronExpr ?? '0 2 * * *',
      timezone: timezone ?? 'Asia/Shanghai'
    };
  }

  /**
   * 更新自动同步配置
   */
  async updateAutoSyncConfig(config: Partial<AutoSyncConfig>): Promise<void> {
    const updates: Promise<void>[] = [];

    if (config.enabled !== undefined) {
      updates.push(this.setConfig('autoSync.enabled', config.enabled, 'boolean'));
    }
    if (config.cronExpr !== undefined) {
      updates.push(this.setConfig('autoSync.cronExpr', config.cronExpr, 'string'));
    }
    if (config.timezone !== undefined) {
      updates.push(this.setConfig('autoSync.timezone', config.timezone, 'string'));
    }

    await Promise.all(updates);
  }

  /**
   * 反序列化配置值（带错误处理）
   */
  private deserializeValue(value: string, type: string): string | number | boolean | object {
    switch (type) {
      case 'boolean':
        if (value !== 'true' && value !== 'false') {
          throw new Error(`Invalid boolean value: ${value}`);
        }
        return value === 'true';

      case 'number': {
        const num = Number(value);
        if (isNaN(num)) {
          throw new Error(`Invalid number value: ${value}`);
        }
        return num;
      }

      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          throw new Error(`Invalid JSON value: ${value}`);
        }

      default:
        return value;
    }
  }
}
