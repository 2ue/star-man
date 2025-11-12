import { Router, Request, Response } from 'express';
import { StarManager } from '@star-man/core';

export function createStatsRouter(starManager: StarManager): Router {
  const router = Router();

  // 获取统计概览
  router.get('/', async (req: Request, res: Response) => {
    try {
      const [stats, categories, languages] = await Promise.all([
        starManager.getStats(),
        starManager.getCategoryStats(),
        starManager.getLanguageStats()
      ]);

      res.json({
        ...stats,
        categories,
        languages,
        topTags: [] // 标签功能待实现
      });
    } catch (error) {
      console.error('获取统计信息失败:', error);
      res.status(500).json({
        error: '获取统计信息失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  });

  // 获取分类统计
  router.get('/categories', async (req: Request, res: Response) => {
    try {
      const categories = await starManager.getCategoryStats();
      res.json(categories);
    } catch (error) {
      console.error('获取分类统计失败:', error);
      res.status(500).json({
        error: '获取分类统计失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  });

  // 获取语言统计
  router.get('/languages', async (req: Request, res: Response) => {
    try {
      const languages = await starManager.getLanguageStats();
      res.json(languages);
    } catch (error) {
      console.error('获取语言统计失败:', error);
      res.status(500).json({
        error: '获取语言统计失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  });

  // 获取标签统计
  router.get('/tags', async (req: Request, res: Response) => {
    try {
      // 获取所有仓库并统计标签
      const result = await starManager.getStarredRepos({ limit: 1000 });
      const tagCount: Record<string, number> = {};

      result.repos.forEach(repo => {
        if (repo.tags) {
          repo.tags.forEach((tag: string) => {
            tagCount[tag] = (tagCount[tag] || 0) + 1;
          });
        }
      });

      const tags = Object.entries(tagCount)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);

      res.json(tags);
    } catch (error) {
      console.error('获取标签统计失败:', error);
      res.status(500).json({
        error: '获取标签统计失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  });

  // 获取同步历史
  router.get('/sync-history', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const history = await starManager.getSyncHistory(limit);
      res.json(history);
    } catch (error) {
      console.error('获取同步历史失败:', error);
      res.status(500).json({
        error: '获取同步历史失败',
        message: error instanceof Error ? error.message : '未知错误'
      });
    }
  });

  return router;
}