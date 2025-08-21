import { Router } from 'express';
import { StarManager } from '@star-man/core';

export function createUnstarRoutes(starManager: StarManager): Router {
  const router = Router();

  // 根据仓库 ID 取消单个仓库的 star
  router.delete('/repo/:id', async (req, res) => {
    try {
      const repoId = parseInt(req.params.id);
      
      if (isNaN(repoId)) {
        return res.status(400).json({
          success: false,
          message: '无效的仓库 ID'
        });
      }
      
      await starManager.unstarRepo(repoId);
      
      res.json({
        success: true,
        message: `成功取消 star 仓库 ID: ${repoId}`
      });
    } catch (error) {
      console.error('取消 star 失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  });

  // 根据仓库全名取消单个仓库的 star
  router.delete('/repo/:owner/:name', async (req, res) => {
    try {
      const { owner, name } = req.params;
      const fullName = `${owner}/${name}`;
      
      await starManager.unstarRepoByFullName(fullName);
      
      res.json({
        success: true,
        message: `成功取消 star: ${fullName}`
      });
    } catch (error) {
      console.error('取消 star 失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  });

  // 批量取消 star (通过仓库 ID)
  router.delete('/repos', async (req, res) => {
    try {
      const { repoIds } = req.body;
      
      if (!Array.isArray(repoIds) || repoIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: '请提供要取消 star 的仓库 ID 列表'
        });
      }

      // 验证仓库 ID 格式
      const invalidIds = repoIds.filter((id: any) => 
        typeof id !== 'number' || isNaN(id)
      );
      
      if (invalidIds.length > 0) {
        return res.status(400).json({
          success: false,
          message: '仓库 ID 格式错误，应为数字',
          invalidIds
        });
      }

      const results = await starManager.unstarRepos(repoIds);
      
      res.json({
        success: true,
        message: `批量取消 star 完成: 成功 ${results.success} 个，失败 ${results.failed.length} 个`,
        data: results
      });
    } catch (error) {
      console.error('批量取消 star 失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  });

  // 根据分类取消 star
  router.delete('/by-category/:category', async (req, res) => {
    try {
      const { category } = req.params;
      
      // 获取具有指定分类的仓库
      const reposResult = await starManager.getStarredRepos({ category });
      
      if (reposResult.repos.length === 0) {
        return res.json({
          success: true,
          message: `没有找到分类为 "${category}" 的仓库`,
          data: { total: 0, success: 0, failure: 0, results: [] }
        });
      }

      const repoIds = reposResult.repos.map((repo: any) => repo.id);
      const results = await starManager.unstarRepos(repoIds);
      
      res.json({
        success: true,
        message: `根据分类 "${category}" 取消 star 完成: 成功 ${results.success} 个，失败 ${results.failed.length} 个`,
        data: results
      });
    } catch (error) {
      console.error('根据分类取消 star 失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: error instanceof Error ? error.message : '未知错误'
      });
    }
  });

  return router;
}
