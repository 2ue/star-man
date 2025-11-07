import { PrismaClient } from '@prisma/client';
import { RecommendationResult } from '../types';
import { EmbeddingService } from './embedding.service';

export class RecommendationService {
  private prisma: PrismaClient;
  private embeddingService: EmbeddingService;

  constructor(prisma: PrismaClient, embeddingService: EmbeddingService) {
    this.prisma = prisma;
    this.embeddingService = embeddingService;
  }

  /**
   * 基于内容的推荐（使用向量相似度）
   */
  async contentBasedRecommend(repoId: number, limit: number = 5): Promise<RecommendationResult[]> {
    try {
      // 使用 EmbeddingService 查找相似仓库
      const similarRepos = await this.embeddingService.findSimilar(repoId, limit);

      // 转换为推荐结果
      return similarRepos.map(result => ({
        repo: result.repo,
        score: result.similarity,
        reasons: [
          `与当前仓库功能相似`,
          `相似度: ${(result.similarity * 100).toFixed(1)}%`,
        ],
      }));
    } catch (error) {
      console.error('❌ 基于内容的推荐失败:', error);
      return [];
    }
  }

  /**
   * 基于热度的推荐
   */
  async trendingRecommend(limit: number = 10, filters?: any): Promise<RecommendationResult[]> {
    try {
      const where: any = {
        isStarred: true,
      };

      if (filters?.language) {
        where.language = filters.language;
      }

      if (filters?.category) {
        where.category = filters.category;
      }

      // 查询热门仓库
      const repos = await this.prisma.starredRepo.findMany({
        where,
        orderBy: {
          stargazersCount: 'desc',
        },
        take: limit,
      });

      return repos.map(repo => ({
        repo,
        score: repo.stargazersCount / 100000, // 归一化分数
        reasons: [
          `⭐ ${repo.stargazersCount.toLocaleString()} Stars`,
          `🔥 热门项目`,
        ],
      }));
    } catch (error) {
      console.error('❌ 热度推荐失败:', error);
      return [];
    }
  }

  /**
   * 基于最近活跃的推荐
   */
  async recentActiveRecommend(limit: number = 10, filters?: any): Promise<RecommendationResult[]> {
    try {
      const where: any = {
        isStarred: true,
        pushedAt: {
          not: null,
        },
      };

      if (filters?.language) {
        where.language = filters.language;
      }

      if (filters?.category) {
        where.category = filters.category;
      }

      // 查询最近活跃的仓库
      const repos = await this.prisma.starredRepo.findMany({
        where,
        orderBy: {
          pushedAt: 'desc',
        },
        take: limit,
      });

      return repos.map(repo => ({
        repo,
        score: 0.8, // 固定分数
        reasons: [
          `📅 最近更新`,
          repo.pushedAt ? `更新于 ${new Date(repo.pushedAt).toLocaleDateString()}` : '',
        ].filter(Boolean),
      }));
    } catch (error) {
      console.error('❌ 活跃推荐失败:', error);
      return [];
    }
  }

  /**
   * 基于用户交互的推荐
   */
  async interactionBasedRecommend(limit: number = 10): Promise<RecommendationResult[]> {
    try {
      // 获取用户最近查看的仓库
      const recentInteractions = await this.prisma.userInteraction.findMany({
        where: {
          action: 'view',
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
        distinct: ['repoId'],
      });

      if (recentInteractions.length === 0) {
        return [];
      }

      // 获取这些仓库的相似仓库
      const recommendations = new Map<number, RecommendationResult>();

      for (const interaction of recentInteractions) {
        const similar = await this.contentBasedRecommend(interaction.repoId, 3);

        similar.forEach(rec => {
          if (!recommendations.has(rec.repo.id)) {
            recommendations.set(rec.repo.id, {
              ...rec,
              reasons: [
                ...rec.reasons,
                `基于您浏览过的仓库推荐`,
              ],
            });
          }
        });
      }

      return Array.from(recommendations.values()).slice(0, limit);
    } catch (error) {
      console.error('❌ 交互推荐失败:', error);
      return [];
    }
  }

  /**
   * 混合推荐（综合多种策略）
   */
  async hybridRecommend(context?: any, limit: number = 10): Promise<RecommendationResult[]> {
    try {
      const recommendations = new Map<number, RecommendationResult>();

      // 1. 基于热度的推荐（权重 30%）
      const trending = await this.trendingRecommend(5, context?.filters);
      trending.forEach(rec => {
        recommendations.set(rec.repo.id, {
          ...rec,
          score: rec.score * 0.3,
        });
      });

      // 2. 基于最近活跃的推荐（权重 30%）
      const active = await this.recentActiveRecommend(5, context?.filters);
      active.forEach(rec => {
        const existing = recommendations.get(rec.repo.id);
        if (existing) {
          existing.score += rec.score * 0.3;
          existing.reasons.push(...rec.reasons);
        } else {
          recommendations.set(rec.repo.id, {
            ...rec,
            score: rec.score * 0.3,
          });
        }
      });

      // 3. 基于用户交互的推荐（权重 40%）
      const interaction = await this.interactionBasedRecommend(5);
      interaction.forEach(rec => {
        const existing = recommendations.get(rec.repo.id);
        if (existing) {
          existing.score += rec.score * 0.4;
          existing.reasons.push(...rec.reasons);
        } else {
          recommendations.set(rec.repo.id, {
            ...rec,
            score: rec.score * 0.4,
          });
        }
      });

      // 按分数排序并返回
      return Array.from(recommendations.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    } catch (error) {
      console.error('❌ 混合推荐失败:', error);
      return [];
    }
  }

  /**
   * 记录用户交互
   */
  async recordInteraction(repoId: number, action: string, context?: string): Promise<void> {
    try {
      await this.prisma.userInteraction.create({
        data: {
          repoId,
          action,
          context,
        },
      });
    } catch (error) {
      console.error('❌ 记录交互失败:', error);
    }
  }

  /**
   * 获取推荐理由
   */
  private generateReasons(repo: any, context?: any): string[] {
    const reasons: string[] = [];

    // 基于 Stars 数量
    if (repo.stargazersCount > 10000) {
      reasons.push(`⭐ ${repo.stargazersCount.toLocaleString()} Stars - 热门项目`);
    }

    // 基于最近更新
    if (repo.pushedAt) {
      const daysSinceUpdate = Math.floor(
        (Date.now() - new Date(repo.pushedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceUpdate < 7) {
        reasons.push(`📅 ${daysSinceUpdate} 天前更新 - 活跃维护`);
      }
    }

    // 基于语言匹配
    if (context?.preferredLanguages?.includes(repo.language)) {
      reasons.push(`💻 ${repo.language} - 您常用的语言`);
    }

    // 基于分类匹配
    if (context?.preferredCategories?.includes(repo.category)) {
      reasons.push(`📁 ${repo.category} - 您感兴趣的分类`);
    }

    return reasons;
  }
}
