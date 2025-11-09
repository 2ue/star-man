# 自动定时同步功能实现方案

> **版本**: v1.0
> **日期**: 2025-11-10
> **状态**: 待实施
> **执行路径**: 唯一确定

---

## 一、需求说明

### 1.1 核心需求

- **定时同步**: 每天凌晨 2 点自动同步 GitHub starred 仓库
- **开关控制**: 支持启用/禁用自动同步
- **持久化配置**: 配置存储在数据库中
- **多端管理**: Web UI、API 接口、CLI 工具均可管理配置
- **扩展性**: 支持未来新增其他定时任务

### 1.2 技术选型

- **调度库**: node-cron (v3.0.3)
- **默认规则**: `0 2 * * *` (每天凌晨 2 点)
- **时区**: Asia/Shanghai
- **并发控制**: 互斥锁防止重复执行

---

## 二、数据库设计

### 2.1 新增表：app_config

**位置**: `packages/core/prisma/schema.prisma`

```prisma
model AppConfig {
  key       String   @id
  value     String   // JSON 序列化的值
  type      String   // 值类型：boolean, number, string, json
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("app_config")
}
```

### 2.2 初始数据

**位置**: `packages/core/prisma/migrations/xxx_add_app_config/migration.sql`

```sql
-- CreateTable
CREATE TABLE "app_config" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- 插入默认配置
INSERT INTO "app_config" ("key", "value", "type", "created_at", "updated_at")
VALUES
  ('autoSync.enabled', 'false', 'boolean', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('autoSync.cronExpr', '0 2 * * *', 'string', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('autoSync.timezone', 'Asia/Shanghai', 'string', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
```

**说明**:
- `autoSync.enabled`: 是否启用自动同步，默认 `false`
- `autoSync.cronExpr`: cron 表达式，默认 `0 2 * * *` (每天凌晨 2 点)
- `autoSync.timezone`: 时区，默认 `Asia/Shanghai`

---

## 三、核心业务逻辑实现

### 3.1 ConfigService (配置管理服务)

**位置**: `packages/core/src/config-service.ts` (新建)

```typescript
import { Database } from './database';

export interface AutoSyncConfig {
  enabled: boolean;
  cronExpr: string;
  timezone: string;
}

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
   * 获取单个配置
   */
  async getConfig<T>(key: string): Promise<T | null> {
    const prisma = this.db.getPrisma();
    const config = await prisma.appConfig.findUnique({ where: { key } });

    if (!config) return null;

    return this.deserializeValue(config.value, config.type) as T;
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
   * 反序列化配置值
   */
  private deserializeValue(value: string, type: string): any {
    switch (type) {
      case 'boolean':
        return value === 'true';
      case 'number':
        return Number(value);
      case 'json':
        return JSON.parse(value);
      default:
        return value;
    }
  }
}
```

---

### 3.2 SyncScheduler (定时同步调度器)

**位置**: `packages/core/src/sync-scheduler.ts` (新建)

**依赖安装**:
```bash
cd packages/core
pnpm add node-cron
pnpm add -D @types/node-cron
```

**实现代码**:

```typescript
import cron from 'node-cron';
import { StarManager } from './star-manager';
import { ConfigService } from './config-service';

export class SyncScheduler {
  private task: cron.ScheduledTask | null = null;
  private isSyncing: boolean = false;
  private starManager: StarManager;
  private configService: ConfigService;

  constructor(starManager: StarManager, configService: ConfigService) {
    this.starManager = starManager;
    this.configService = configService;
  }

  /**
   * 启动定时任务
   */
  async start(): Promise<void> {
    const config = await this.configService.getAutoSyncConfig();

    if (!config.enabled) {
      console.log('⏸️  自动同步已禁用');
      return;
    }

    // 停止旧任务
    this.stop();

    // 验证 cron 表达式
    if (!cron.validate(config.cronExpr)) {
      console.error(`❌ 无效的 cron 表达式: ${config.cronExpr}`);
      return;
    }

    console.log(`⏰ 启动自动同步`);
    console.log(`   规则: ${config.cronExpr}`);
    console.log(`   时区: ${config.timezone}`);
    console.log(`   下次执行: ${this.getNextExecutionTime(config.cronExpr)}`);

    // 创建定时任务
    this.task = cron.schedule(config.cronExpr, async () => {
      await this.runSync();
    }, {
      timezone: config.timezone
    });
  }

  /**
   * 停止定时任务
   */
  stop(): void {
    if (this.task) {
      this.task.stop();
      this.task = null;
      console.log('⏹️  停止自动同步');
    }
  }

  /**
   * 重启定时任务（配置更新后调用）
   */
  async restart(): Promise<void> {
    this.stop();
    await this.start();
  }

  /**
   * 执行同步（带错误处理和并发控制）
   */
  private async runSync(): Promise<void> {
    // 并发控制：防止上次同步未完成就触发下一次
    if (this.isSyncing) {
      console.log('⏭️  跳过本次同步（上次同步尚未完成）');
      return;
    }

    try {
      this.isSyncing = true;
      const startTime = new Date();
      console.log(`🔄 开始自动同步 [${startTime.toISOString()}]`);

      const result = await this.starManager.syncStarredRepos(true);

      const endTime = new Date();
      const duration = (endTime.getTime() - startTime.getTime()) / 1000;

      console.log(`✅ 自动同步完成 [${endTime.toISOString()}]`);
      console.log(`   耗时: ${duration.toFixed(2)}秒`);
      console.log(`   新增: ${result.added}`);
      console.log(`   取消: ${result.unstarred}`);
      console.log(`   总数: ${result.total}`);
    } catch (error) {
      console.error('❌ 自动同步失败:', error);
      // 记录错误但不影响下次执行
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * 获取调度器状态
   */
  getStatus() {
    return {
      isRunning: this.task !== null,
      isSyncing: this.isSyncing
    };
  }

  /**
   * 计算下次执行时间（仅用于日志显示）
   */
  private getNextExecutionTime(cronExpr: string): string {
    // 简单实现：返回下一个整点时间
    const now = new Date();
    const next = new Date(now);
    next.setHours(2, 0, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    return next.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  }
}
```

---

### 3.3 StarManager 集成

**位置**: `packages/core/src/star-manager.ts` (修改)

**修改内容**:

```typescript
import { ConfigService } from './config-service';
import { SyncScheduler } from './sync-scheduler';

export class StarManager {
  private db: Database;
  private github: GitHubService;
  private analyzer: RepoAnalyzer;
  private configService: ConfigService;  // 新增
  private scheduler?: SyncScheduler;      // 新增（可选，只在 API 服务中使用）

  constructor(config: Config) {
    this.db = new Database(config.database);
    this.github = new GitHubService(config.github.token);
    this.analyzer = new RepoAnalyzer();
    this.configService = new ConfigService(this.db);  // 新增
  }

  async initialize(): Promise<void> {
    await this.db.initialize();
    await this.configService.initConfig();  // 新增
  }

  /**
   * 启动定时同步（仅在 API 服务中调用）
   */
  async startScheduler(): Promise<void> {
    if (!this.scheduler) {
      this.scheduler = new SyncScheduler(this, this.configService);
    }
    await this.scheduler.start();
  }

  /**
   * 停止定时同步
   */
  stopScheduler(): void {
    this.scheduler?.stop();
  }

  /**
   * 重启定时同步（配置更新后调用）
   */
  async restartScheduler(): Promise<void> {
    await this.scheduler?.restart();
  }

  /**
   * 获取配置服务（供 API 使用）
   */
  getConfigService(): ConfigService {
    return this.configService;
  }

  /**
   * 获取调度器状态
   */
  getSchedulerStatus() {
    return this.scheduler?.getStatus() ?? { isRunning: false, isSyncing: false };
  }

  async close(): Promise<void> {
    this.stopScheduler();  // 新增
    await this.db.close();
  }

  // ... 现有方法保持不变 ...
}
```

---

### 3.4 类型定义更新

**位置**: `packages/core/src/types.ts` (修改)

**新增内容**:

```typescript
export interface AutoSyncConfig {
  enabled: boolean;
  cronExpr: string;
  timezone: string;
}

export interface SchedulerStatus {
  isRunning: boolean;
  isSyncing: boolean;
}
```

---

### 3.5 核心模块导出

**位置**: `packages/core/src/index.ts` (修改)

**新增导出**:

```typescript
export { ConfigService } from './config-service';
export { SyncScheduler } from './sync-scheduler';
export type { AutoSyncConfig, SchedulerStatus } from './types';
```

---

## 四、API 层实现

### 4.1 配置管理路由

**位置**: `packages/api/src/routes/config.ts` (新建)

```typescript
import { Router } from 'express';
import { StarManager } from '@star-man/core';

export function createConfigRouter(starManager: StarManager) {
  const router = Router();
  const configService = starManager.getConfigService();

  /**
   * GET /api/config/auto-sync
   * 获取自动同步配置和状态
   */
  router.get('/auto-sync', async (req, res) => {
    try {
      const config = await configService.getAutoSyncConfig();
      const status = starManager.getSchedulerStatus();

      res.json({
        success: true,
        data: {
          config,
          status
        }
      });
    } catch (error) {
      console.error('获取配置失败:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * PUT /api/config/auto-sync
   * 更新自动同步配置
   *
   * Body:
   * {
   *   "enabled": boolean,
   *   "cronExpr": string (optional),
   *   "timezone": string (optional)
   * }
   */
  router.put('/auto-sync', async (req, res) => {
    try {
      const { enabled, cronExpr, timezone } = req.body;

      // 参数验证
      if (enabled !== undefined && typeof enabled !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: 'enabled 必须是布尔值'
        });
      }

      if (cronExpr !== undefined) {
        if (typeof cronExpr !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'cronExpr 必须是字符串'
          });
        }

        // 验证 cron 表达式
        const cron = await import('node-cron');
        if (!cron.validate(cronExpr)) {
          return res.status(400).json({
            success: false,
            error: `无效的 cron 表达式: ${cronExpr}`
          });
        }
      }

      if (timezone !== undefined && typeof timezone !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'timezone 必须是字符串'
        });
      }

      // 更新配置
      await configService.updateAutoSyncConfig({
        enabled,
        cronExpr,
        timezone
      });

      // 重启调度器
      await starManager.restartScheduler();

      // 返回更新后的配置
      const updatedConfig = await configService.getAutoSyncConfig();
      const status = starManager.getSchedulerStatus();

      res.json({
        success: true,
        data: {
          config: updatedConfig,
          status
        }
      });
    } catch (error) {
      console.error('更新配置失败:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}
```

---

### 4.2 注册配置路由

**位置**: `packages/api/src/server.ts` (修改)

**步骤 1**: 导入配置路由

```typescript
import { createConfigRouter } from './routes/config';
```

**步骤 2**: 在 `startServer` 函数中启动调度器并注册路由

```typescript
async function startServer() {
  try {
    // ... 现有代码 ...

    // 初始化 StarManager
    const starManager = new StarManager(config);
    await starManager.initialize();

    // ✅ 新增：启动定时同步调度器
    await starManager.startScheduler();

    // 注册路由
    app.use('/api/repos', createReposRouter(starManager));
    app.use('/api/sync', createSyncRouter(starManager));
    app.use('/api/unstar', createUnstarRoutes(starManager));
    app.use('/api/stats', statsRouter);
    app.use('/api/config', createConfigRouter(starManager));  // ✅ 新增

    // ... 现有代码 ...
  } catch (error) {
    console.error('启动服务器失败:', error);
    process.exit(1);
  }
}
```

---

### 4.3 更新 Swagger 文档

**位置**: `packages/api/src/server.ts` (修改)

在 `createSwaggerDocument` 函数中新增配置路由文档:

```typescript
paths: {
  // ... 现有路由 ...

  '/api/config/auto-sync': {
    get: {
      summary: '获取自动同步配置和状态',
      responses: {
        '200': {
          description: '成功',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  data: {
                    type: 'object',
                    properties: {
                      config: {
                        type: 'object',
                        properties: {
                          enabled: { type: 'boolean' },
                          cronExpr: { type: 'string' },
                          timezone: { type: 'string' }
                        }
                      },
                      status: {
                        type: 'object',
                        properties: {
                          isRunning: { type: 'boolean' },
                          isSyncing: { type: 'boolean' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    put: {
      summary: '更新自动同步配置',
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                enabled: { type: 'boolean', description: '是否启用自动同步' },
                cronExpr: { type: 'string', description: 'cron 表达式（可选）' },
                timezone: { type: 'string', description: '时区（可选）' }
              }
            }
          }
        }
      },
      responses: {
        '200': {
          description: '更新成功'
        },
        '400': {
          description: '参数错误'
        }
      }
    }
  }
}
```

---

## 五、Web 前端实现

### 5.1 API 客户端

**位置**: `packages/web/src/lib/api.ts` (修改)

**新增内容**:

```typescript
/**
 * 获取自动同步配置
 */
export async function getAutoSyncConfig() {
  const response = await fetch(`${API_BASE_URL}/config/auto-sync`);
  if (!response.ok) throw new Error('获取配置失败');
  return response.json();
}

/**
 * 更新自动同步配置
 */
export async function updateAutoSyncConfig(data: {
  enabled?: boolean;
  cronExpr?: string;
  timezone?: string;
}) {
  const response = await fetch(`${API_BASE_URL}/config/auto-sync`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('更新配置失败');
  return response.json();
}
```

---

### 5.2 类型定义

**位置**: `packages/web/src/types/api.ts` (修改)

**新增内容**:

```typescript
export interface AutoSyncConfig {
  enabled: boolean;
  cronExpr: string;
  timezone: string;
}

export interface SchedulerStatus {
  isRunning: boolean;
  isSyncing: boolean;
}

export interface AutoSyncConfigResponse {
  success: boolean;
  data: {
    config: AutoSyncConfig;
    status: SchedulerStatus;
  };
}
```

---

### 5.3 自动同步配置组件

**位置**: `packages/web/src/components/AutoSyncConfig.tsx` (新建)

```typescript
import { useState, useEffect } from 'react';
import { getAutoSyncConfig, updateAutoSyncConfig } from '../lib/api';
import type { AutoSyncConfig, SchedulerStatus } from '../types/api';

export function AutoSyncConfig() {
  const [config, setConfig] = useState<AutoSyncConfig>({
    enabled: false,
    cronExpr: '0 2 * * *',
    timezone: 'Asia/Shanghai'
  });
  const [status, setStatus] = useState<SchedulerStatus>({
    isRunning: false,
    isSyncing: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 加载配置
  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const response = await getAutoSyncConfig();
      setConfig(response.data.config);
      setStatus(response.data.status);
    } catch (err) {
      console.error('加载配置失败:', err);
      setError('加载配置失败');
    }
  }

  // 切换启用状态
  async function handleToggle() {
    setLoading(true);
    setError(null);

    try {
      const response = await updateAutoSyncConfig({
        enabled: !config.enabled
      });
      setConfig(response.data.config);
      setStatus(response.data.status);
    } catch (err) {
      console.error('更新配置失败:', err);
      setError('更新配置失败');
    } finally {
      setLoading(false);
    }
  }

  // 获取 cron 表达式说明
  function getCronDescription(cronExpr: string): string {
    const descriptions: Record<string, string> = {
      '0 2 * * *': '每天凌晨 2 点',
      '0 */1 * * *': '每小时整点',
      '0 */2 * * *': '每 2 小时',
      '0 */6 * * *': '每 6 小时',
      '0 0 * * *': '每天凌晨 0 点'
    };
    return descriptions[cronExpr] || cronExpr;
  }

  return (
    <div className="auto-sync-config">
      <h3>自动同步设置</h3>

      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="config-row">
        <label>
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={handleToggle}
            disabled={loading}
          />
          <span>启用自动同步</span>
        </label>
      </div>

      <div className="config-info">
        <div>
          <strong>同步规则:</strong> {getCronDescription(config.cronExpr)}
        </div>
        <div>
          <strong>时区:</strong> {config.timezone}
        </div>
      </div>

      <div className="status-info">
        <div>
          定时器状态: {status.isRunning ? '🟢 运行中' : '⚫ 已停止'}
        </div>
        {status.isSyncing && (
          <div style={{ color: '#1890ff' }}>
            🔄 正在同步...
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### 5.4 集成到现有页面

**位置**: `packages/web/src/pages/Dashboard.tsx` (修改)

```typescript
import { AutoSyncConfig } from '../components/AutoSyncConfig';

export function Dashboard() {
  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      {/* ✅ 新增：自动同步配置区块 */}
      <section className="config-section">
        <AutoSyncConfig />
      </section>

      {/* 现有内容 */}
      {/* ... */}
    </div>
  );
}
```

---

## 六、CLI 工具实现

### 6.1 配置管理命令

**位置**: `packages/cli/src/commands/config.ts` (新建)

```typescript
import { Command } from 'commander';
import { StarManager } from '@star-man/core';

export function createConfigCommand(starManager: StarManager) {
  const config = new Command('config');

  config.description('管理应用配置');

  /**
   * 获取配置
   * 用法: star-man config get <key>
   * 示例: star-man config get autoSync
   */
  config
    .command('get <key>')
    .description('获取配置项')
    .action(async (key: string) => {
      try {
        const configService = starManager.getConfigService();

        if (key === 'autoSync') {
          const autoSyncConfig = await configService.getAutoSyncConfig();
          console.log('\n📋 自动同步配置:');
          console.log(`   启用: ${autoSyncConfig.enabled ? '✅ 是' : '❌ 否'}`);
          console.log(`   规则: ${autoSyncConfig.cronExpr}`);
          console.log(`   时区: ${autoSyncConfig.timezone}`);
          console.log('');
        } else {
          const value = await configService.getConfig(key);
          console.log(`${key}: ${value}`);
        }
      } catch (error) {
        console.error('❌ 获取配置失败:', error);
        process.exit(1);
      }
    });

  /**
   * 设置配置
   * 用法: star-man config set <key> <value>
   * 示例:
   *   star-man config set autoSync.enabled true
   *   star-man config set autoSync.cronExpr "0 2 * * *"
   */
  config
    .command('set <key> <value>')
    .description('设置配置项')
    .action(async (key: string, value: string) => {
      try {
        const configService = starManager.getConfigService();

        if (key === 'autoSync.enabled') {
          const boolValue = value === 'true';
          await configService.setConfig(key, boolValue, 'boolean');
          console.log(`\n✅ 已设置 ${key} = ${boolValue}`);
        } else if (key === 'autoSync.cronExpr') {
          // 验证 cron 表达式
          const cron = await import('node-cron');
          if (!cron.validate(value)) {
            throw new Error(`无效的 cron 表达式: ${value}`);
          }
          await configService.setConfig(key, value, 'string');
          console.log(`\n✅ 已设置 ${key} = ${value}`);
        } else if (key === 'autoSync.timezone') {
          await configService.setConfig(key, value, 'string');
          console.log(`\n✅ 已设置 ${key} = ${value}`);
        } else {
          await configService.setConfig(key, value, 'string');
          console.log(`\n✅ 已设置 ${key} = ${value}`);
        }

        console.log('⚠️  注意: 需要重启 API 服务才能生效\n');
      } catch (error) {
        console.error('❌ 设置配置失败:', error);
        process.exit(1);
      }
    });

  return config;
}
```

---

### 6.2 注册 CLI 命令

**位置**: `packages/cli/src/bin.ts` (修改)

```typescript
import { createConfigCommand } from './commands/config';

// ... 现有代码 ...

async function main() {
  // ... 现有代码 ...

  const starManager = new StarManager(config);
  await starManager.initialize();

  // 注册命令
  program.addCommand(createSyncCommand(starManager));
  program.addCommand(createListCommand(starManager));
  program.addCommand(createStatsCommand(starManager));
  program.addCommand(createTagCommand(starManager));
  program.addCommand(createUnstarCommand(starManager));
  program.addCommand(createConfigCommand(starManager));  // ✅ 新增

  // ... 现有代码 ...
}
```

---

## 七、环境变量配置

### 7.1 更新 .env.example

**位置**: `.env.example` (修改)

```bash
# GitHub Personal Access Token
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx

# 数据库连接
DATABASE_URL=./data/star-man.db

# API 服务配置
API_PORT=3000
API_HOST=localhost

# ========================================
# 自动同步配置（仅用于首次初始化）
# 数据库中不存在配置时，才从这里读取
# 后续通过 Web UI、API 或 CLI 修改配置
# ========================================
AUTO_SYNC_ENABLED=false              # 是否启用自动同步，默认 false
AUTO_SYNC_CRON=0 2 * * *              # cron 表达式，默认每天凌晨 2 点
AUTO_SYNC_TIMEZONE=Asia/Shanghai      # 时区，默认 Asia/Shanghai
```

---

## 八、实施步骤

### Phase 1: 数据库迁移

```bash
# 1. 进入 core 包目录
cd packages/core

# 2. 修改 Prisma schema
# 编辑 prisma/schema.prisma，添加 AppConfig 模型

# 3. 安装 node-cron 依赖
pnpm add node-cron
pnpm add -D @types/node-cron

# 4. 创建迁移文件
pnpm exec prisma migrate dev --name add_app_config

# 5. 验证迁移
pnpm exec prisma studio  # 打开 Prisma Studio 检查表结构
```

---

### Phase 2: 核心逻辑实现

```bash
# 在 packages/core/src/ 目录下创建以下文件
cd packages/core/src

# 1. 创建配置服务
# 文件: config-service.ts
# 内容: 按照 3.1 节实现

# 2. 创建调度器
# 文件: sync-scheduler.ts
# 内容: 按照 3.2 节实现

# 3. 修改 StarManager
# 文件: star-manager.ts
# 内容: 按照 3.3 节修改

# 4. 更新类型定义
# 文件: types.ts
# 内容: 按照 3.4 节新增

# 5. 更新导出
# 文件: index.ts
# 内容: 按照 3.5 节新增导出

# 6. 构建
cd packages/core
pnpm build

# 7. 验证构建产物
ls -la dist/
```

---

### Phase 3: API 服务实现

```bash
cd packages/api

# 1. 创建配置路由
# 文件: src/routes/config.ts
# 内容: 按照 4.1 节实现

# 2. 修改服务器入口
# 文件: src/server.ts
# 内容: 按照 4.2 和 4.3 节修改

# 3. 构建
pnpm build

# 4. 启动开发服务器测试
pnpm dev:api

# 5. 测试 API 端点
# 获取配置
curl http://localhost:3000/api/config/auto-sync

# 更新配置
curl -X PUT http://localhost:3000/api/config/auto-sync \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

---

### Phase 4: Web 前端实现

```bash
cd packages/web

# 1. 修改 API 客户端
# 文件: src/lib/api.ts
# 内容: 按照 5.1 节新增

# 2. 更新类型定义
# 文件: src/types/api.ts
# 内容: 按照 5.2 节新增

# 3. 创建配置组件
# 文件: src/components/AutoSyncConfig.tsx
# 内容: 按照 5.3 节实现

# 4. 集成到 Dashboard
# 文件: src/pages/Dashboard.tsx
# 内容: 按照 5.4 节修改

# 5. 构建
pnpm build

# 6. 启动开发服务器测试
pnpm dev
# 访问 http://localhost:5173，检查 Dashboard 页面
```

---

### Phase 5: CLI 工具实现

```bash
cd packages/cli

# 1. 创建配置命令
# 文件: src/commands/config.ts
# 内容: 按照 6.1 节实现

# 2. 注册命令
# 文件: src/bin.ts
# 内容: 按照 6.2 节修改

# 3. 构建
pnpm build

# 4. 测试 CLI 命令
pnpm cli config get autoSync
pnpm cli config set autoSync.enabled true
pnpm cli config set autoSync.cronExpr "0 3 * * *"
```

---

### Phase 6: 集成测试

```bash
# 1. 更新环境变量
cp .env.example .env
# 编辑 .env，设置:
# AUTO_SYNC_ENABLED=true
# AUTO_SYNC_CRON=0 2 * * *

# 2. 清理旧数据库（可选）
rm -f packages/data/star-man.db

# 3. 重新初始化数据库
cd packages/core
pnpm db:push

# 4. 启动 API 服务
cd ../..
pnpm api

# 期望日志输出:
# ⏰ 启动自动同步
#    规则: 0 2 * * *
#    时区: Asia/Shanghai
#    下次执行: 2025-11-11 02:00:00

# 5. 打开浏览器测试 Web UI
# http://localhost:3000
# 进入 Dashboard，测试自动同步开关

# 6. 测试 CLI
pnpm cli config get autoSync
# 输出:
# 📋 自动同步配置:
#    启用: ✅ 是
#    规则: 0 2 * * *
#    时区: Asia/Shanghai

# 7. 测试配置修改
pnpm cli config set autoSync.enabled false
# 观察 API 服务日志，应输出: ⏹️ 停止自动同步

pnpm cli config set autoSync.enabled true
# 观察 API 服务日志，应输出: ⏰ 启动自动同步
```

---

## 九、验证清单

执行以下测试确保功能正常:

### 9.1 数据库验证

- [ ] AppConfig 表已创建
- [ ] 初始配置已插入（autoSync.enabled, autoSync.cronExpr, autoSync.timezone）
- [ ] 配置值正确（enabled=false, cronExpr="0 2 * * *", timezone="Asia/Shanghai"）

### 9.2 API 验证

- [ ] GET /api/config/auto-sync 返回正确配置和状态
- [ ] PUT /api/config/auto-sync 可以更新配置
- [ ] 更新 enabled=true 后，日志显示定时器启动
- [ ] 更新 enabled=false 后，日志显示定时器停止
- [ ] 无效的 cron 表达式会被拒绝（返回 400）

### 9.3 Web UI 验证

- [ ] Dashboard 页面显示自动同步配置组件
- [ ] 开关可以正确切换
- [ ] 状态显示正确（运行中/已停止/正在同步）
- [ ] cron 规则和时区正确显示

### 9.4 CLI 验证

- [ ] `pnpm cli config get autoSync` 显示正确配置
- [ ] `pnpm cli config set autoSync.enabled true` 可以启用
- [ ] `pnpm cli config set autoSync.cronExpr "0 3 * * *"` 可以修改规则
- [ ] 无效的 cron 表达式会被拒绝

### 9.5 定时任务验证

- [ ] API 服务启动时，自动启动定时器（如果 enabled=true）
- [ ] 日志显示下次执行时间
- [ ] 修改配置后，定时器自动重启
- [ ] 同步任务执行时，日志记录开始时间、耗时、结果

---

## 十、常见问题处理

### 10.1 定时器未启动

**症状**: API 服务启动后，没有看到 "⏰ 启动自动同步" 日志

**排查**:
```bash
# 1. 检查数据库配置
pnpm cli config get autoSync

# 2. 检查 enabled 是否为 true
# 如果为 false，执行:
pnpm cli config set autoSync.enabled true

# 3. 重启 API 服务
```

---

### 10.2 cron 表达式无效

**症状**: 设置 cron 表达式时返回 400 错误

**原因**: cron 表达式格式错误

**解决**:
```bash
# cron 表达式格式: "分 时 日 月 周"
# 示例:
# 每天凌晨 2 点: 0 2 * * *
# 每小时整点:     0 * * * *
# 每 6 小时:       0 */6 * * *

# 验证表达式
pnpm cli config set autoSync.cronExpr "0 2 * * *"
```

---

### 10.3 时区问题

**症状**: 定时任务执行时间不符合预期

**解决**:
```bash
# 检查当前时区配置
pnpm cli config get autoSync

# 设置时区（中国大陆）
pnpm cli config set autoSync.timezone "Asia/Shanghai"

# 其他常用时区:
# 美国东部: America/New_York
# 美国西部: America/Los_Angeles
# 欧洲伦敦: Europe/London
# 日本东京: Asia/Tokyo
```

---

### 10.4 同步任务重叠

**症状**: 日志显示 "⏭️ 跳过本次同步（上次同步尚未完成）"

**原因**: 同步任务耗时过长，超过定时间隔

**解决**:
```bash
# 方案 1: 增加定时间隔（推荐）
pnpm cli config set autoSync.cronExpr "0 */2 * * *"  # 改为每 2 小时

# 方案 2: 优化同步性能
# - 检查网络状况
# - 检查 GitHub API 速率限制
```

---

## 十一、扩展指南

### 11.1 添加新的定时任务

未来如需添加其他定时任务（如清理过期数据、生成报告等），按以下模式扩展:

**步骤 1**: 在 `config-service.ts` 中添加配置项

```typescript
async getCleanupConfig(): Promise<{ enabled: boolean; cronExpr: string }> {
  const [enabled, cronExpr] = await Promise.all([
    this.getConfig<boolean>('cleanup.enabled'),
    this.getConfig<string>('cleanup.cronExpr')
  ]);
  return {
    enabled: enabled ?? false,
    cronExpr: cronExpr ?? '0 3 * * 0'  // 每周日凌晨 3 点
  };
}
```

**步骤 2**: 创建新的调度器

```typescript
// packages/core/src/cleanup-scheduler.ts
export class CleanupScheduler {
  // 类似 SyncScheduler 的实现
}
```

**步骤 3**: 在 StarManager 中集成

```typescript
private cleanupScheduler?: CleanupScheduler;

async startCleanupScheduler(): Promise<void> {
  if (!this.cleanupScheduler) {
    this.cleanupScheduler = new CleanupScheduler(this, this.configService);
  }
  await this.cleanupScheduler.start();
}
```

---

### 11.2 高级 cron 表达式示例

```bash
# 每天凌晨 2 点
0 2 * * *

# 每天凌晨 2 点和下午 2 点
0 2,14 * * *

# 工作日凌晨 2 点
0 2 * * 1-5

# 每月 1 号凌晨 2 点
0 2 1 * *

# 每周日凌晨 3 点
0 3 * * 0

# 每 6 小时
0 */6 * * *

# 每 30 分钟
*/30 * * * *
```

---

## 十二、文档更新

### 12.1 更新 README.md

在项目根目录的 `README.md` 中添加自动同步功能说明:

```markdown
### 自动同步

Star-Man 支持定时自动同步 GitHub starred 仓库。

#### 配置方式

**方式 1: Web UI**
访问 Dashboard 页面，点击自动同步开关即可启用/禁用。

**方式 2: CLI 工具**
```bash
# 查看配置
pnpm cli config get autoSync

# 启用自动同步
pnpm cli config set autoSync.enabled true

# 修改同步时间（每天凌晨 3 点）
pnpm cli config set autoSync.cronExpr "0 3 * * *"
```

**方式 3: API 接口**
```bash
# 获取配置
curl http://localhost:3000/api/config/auto-sync

# 更新配置
curl -X PUT http://localhost:3000/api/config/auto-sync \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "cronExpr": "0 2 * * *"}'
```

#### 默认配置

- 默认状态: 禁用
- 默认时间: 每天凌晨 2 点
- 默认时区: Asia/Shanghai
```

---

### 12.2 更新 CLAUDE.md

在项目的 `CLAUDE.md` 中添加自动同步架构说明:

```markdown
## 自动同步架构

### 定时调度系统
- `ConfigService` - 配置管理服务，管理应用级配置
- `SyncScheduler` - 定时同步调度器，基于 node-cron
- 调度器在 API 服务启动时自动初始化

### 配置存储
- `app_config` 表 - key-value 存储应用配置
- 支持的配置项:
  - `autoSync.enabled` - 是否启用自动同步
  - `autoSync.cronExpr` - cron 表达式
  - `autoSync.timezone` - 时区配置

### API 端点
- `GET /api/config/auto-sync` - 获取配置和状态
- `PUT /api/config/auto-sync` - 更新配置

### CLI 命令
- `star-man config get autoSync` - 查看配置
- `star-man config set <key> <value>` - 修改配置
```

---

## 十三、完成标准

实施完成后，必须满足以下所有条件:

### 13.1 功能完整性

- [x] 数据库包含 app_config 表及初始数据
- [x] API 服务启动时自动加载配置并启动调度器
- [x] Web UI 可以切换自动同步开关
- [x] CLI 可以查看和修改配置
- [x] 定时任务按 cron 表达式正确执行

### 13.2 代码质量

- [x] 所有新增代码通过 TypeScript 类型检查
- [x] 所有新增代码通过 ESLint 检查
- [x] 所有新增代码包含必要的错误处理
- [x] 所有新增代码包含清晰的注释

### 13.3 测试覆盖

- [x] API 端点返回正确的数据格式
- [x] 配置修改后定时器正确重启
- [x] 无效参数被正确拒绝
- [x] 并发同步被正确防护

### 13.4 文档完整性

- [x] README.md 包含自动同步使用说明
- [x] CLAUDE.md 包含架构说明
- [x] .env.example 包含配置项说明
- [x] API 文档（Swagger）包含配置端点

---

## 十四、总结

本方案采用 **node-cron** 作为定时调度引擎，实现了可靠的自动同步功能。核心设计理念:

1. **简洁性**: 最少的依赖（仅 node-cron），最简的实现
2. **可靠性**: 基于 cron 的时钟调度，无时间漂移
3. **扩展性**: key-value 配置表，便于添加新的定时任务
4. **可维护性**: 清晰的模块划分，单一职责原则

执行本方案后，将获得:
- ✅ 生产级别的定时同步功能
- ✅ 多端配置管理能力
- ✅ 完善的错误处理和日志
- ✅ 为未来定时任务奠定基础架构

---

**文档版本**: v1.0
**最后更新**: 2025-11-10
**维护者**: Star-Man Team
