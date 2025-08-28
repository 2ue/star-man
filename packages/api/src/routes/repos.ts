import { Router, Request, Response } from 'express';
import { query, param, body, validationResult } from 'express-validator';
import { StarManager } from '@star-man/core';

export function createReposRouter(starManager: StarManager): Router {
  const router = Router();

  // 获取仓库列表
  router.get('/', [
    query('category').optional().isString(),
    query('language').optional().isString(),
    query('tags').optional().isString(),
    query('search').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    // 新增参数验证
    query('minStars').optional().isInt({ min: 0 }).toInt(),
    query('maxStars').optional().isInt({ min: 0 }).toInt(),
    query('pushedAfter').optional().isISO8601(),
    query('pushedBefore').optional().isISO8601(),
    query('updatedAfter').optional().isISO8601(),
    query('updatedBefore').optional().isISO8601(),
    query('sort').optional().isIn(['relevance', 'stars', 'forks', 'pushed', 'updated', 'created']),
    query('order').optional().isIn(['asc', 'desc']),
  ], async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const options = {
        category: req.query.category as string,
        language: req.query.language as string,
        tags: req.query.tags ? (req.query.tags as string).split(',').map(t => t.trim()) : undefined,
        search: req.query.search as string,
        limit: parseInt(req.query.limit as string) || 20,
        offset: parseInt(req.query.offset as string) || 0,
        // 新增参数
        minStars: req.query.minStars ? parseInt(req.query.minStars as string) : undefined,
        maxStars: req.query.maxStars ? parseInt(req.query.maxStars as string) : undefined,
        pushedAfter: req.query.pushedAfter as string,
        pushedBefore: req.query.pushedBefore as string,
        updatedAfter: req.query.updatedAfter as string,
        updatedBefore: req.query.updatedBefore as string,
        sort: (req.query.sort as any) || 'relevance',
        order: (req.query.order as any) || 'desc',
      };

      const result = await starManager.getStarredRepos(options);
      res.json({
        success: true,
        data: result.repos,
        total: result.total,
        pagination: {
          limit: options.limit,
          offset: options.offset,
          hasMore: result.total > options.offset + options.limit,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // 更新仓库标签
  router.put('/:id/tags', [
    param('id').isInt().toInt(),
    body('tags').isArray(),
    body('tags.*').isString(),
  ], async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const repoId = req.params.id as unknown as number;
      const tags = req.body.tags as string[];

      await starManager.updateRepoTags(repoId, tags);
      res.json({
        success: true,
        message: 'Tags updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // 更新仓库分类
  router.put('/:id/category', [
    param('id').isInt().toInt(),
    body('category').isString(),
  ], async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const repoId = req.params.id as unknown as number;
      const category = req.body.category as string;

      await starManager.updateRepoCategory(repoId, category);
      res.json({
        success: true,
        message: 'Category updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // 设置 GitHub 仓库 topics
  router.put('/:id/github-topics', [
    param('id').isInt().toInt(),
    body('topics').isArray(),
    body('topics.*').isString(),
  ], async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const repoId = req.params.id as unknown as number;
      const topics = req.body.topics as string[];

      await starManager.setGitHubRepoTopics(repoId, topics);
      res.json({
        success: true,
        message: 'GitHub topics updated successfully',
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