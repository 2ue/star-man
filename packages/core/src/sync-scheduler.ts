import * as cron from 'node-cron';
import { ConfigService } from './config-service';
import type { SyncResult } from './types';

/**
 * 同步执行器接口 - 消除与 StarManager 的循环依赖
 */
export interface SyncExecutor {
  syncStarredRepos(incremental: boolean, onProgress?: (progress: { current: number; total: number; repo: string; action: string }) => void): Promise<SyncResult>;
}

export class SyncScheduler {
  private task: cron.ScheduledTask | null = null;
  private syncPromise: Promise<void> | null = null;
  private executor: SyncExecutor;
  private configService: ConfigService;

  constructor(executor: SyncExecutor, configService: ConfigService) {
    this.executor = executor;
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
    // 并发控制：复用正在执行的 Promise
    if (this.syncPromise) {
      console.log('⏭️  跳过本次同步（上次同步尚未完成）');
      return this.syncPromise;
    }

    this.syncPromise = (async () => {
      try {
        const startTime = new Date();
        console.log(`🔄 开始自动同步 [${startTime.toISOString()}]`);

        const result = await this.executor.syncStarredRepos(true);

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
        this.syncPromise = null;
      }
    })();

    return this.syncPromise;
  }

  /**
   * 获取调度器状态
   */
  getStatus() {
    return {
      isRunning: this.task !== null,
      isSyncing: this.syncPromise !== null
    };
  }
}
