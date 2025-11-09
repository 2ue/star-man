import type { Router } from 'express';
import { Router as ExpressRouter } from 'express';
import { StarManager } from '@star-man/core';
import * as cron from 'node-cron';

export function createConfigRouter(starManager: StarManager): Router {
  const router = ExpressRouter();
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
