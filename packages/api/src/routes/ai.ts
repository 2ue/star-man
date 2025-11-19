import type { Router, Request, Response } from 'express';
import { Router as ExpressRouter } from 'express';
import { body, validationResult } from 'express-validator';
import {
  StarManager,
  AIRepoSearchService,
  AIRepoAnalyzerService,
} from '@star-man/core';

export function createAIRouter(starManager: StarManager, githubToken?: string): Router {
  const router = ExpressRouter();
  const searchService = new AIRepoSearchService(starManager, githubToken);
  const analyzerService = new AIRepoAnalyzerService(starManager);

  /**
   * POST /api/ai/search
   * 语义搜索仓库（支持 scope: starred/github/both）
   */
  router.post('/search', async (req: Request, res: Response) => {
    try {
      const { query, scope, limit } = req.body || {};

      if (!query || typeof query !== 'string' || !query.trim()) {
        return res.status(400).json({
          success: false,
          error: 'query 必须是非空字符串',
        });
      }

      const result = await searchService.search({
        query: query.trim(),
        scope,
        limit,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('AI 搜索失败:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/ai/classify
   * 对单个仓库进行 AI 分类与总结（不持久化）
   */
  router.post(
    '/classify',
    [body('repoId').isInt().withMessage('repoId 必须是整数')],
    async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      try {
        const repoId = Number(req.body.repoId);
        const result = await analyzerService.analyzeRepoById(repoId);

        res.json({
          success: true,
          data: result,
        });
      } catch (error) {
        console.error('AI 仓库分析失败:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  return router;
}

