import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { StarManager } from '@star-man/core';

export function createSyncRouter(starManager: StarManager): Router {
  const router = Router();

  // 同步 star 仓库
  router.post('/', [
    body('incremental').optional().isBoolean(),
  ], async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const incremental = req.body.incremental !== false; // 默认为增量同步
      const result = await starManager.syncStarredRepos(incremental);

      res.json({
        success: true,
        data: result,
        message: `同步完成: 新增 ${result.added}, 更新 ${result.updated}, 取消 star ${result.unstarred}`,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // 获取同步历史
  router.get('/history', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const history = await starManager.getSyncHistory(limit);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}