import { PrismaClient } from '@prisma/client';
import { GitHubService } from './github';
import { analyzeRepo } from './analyzer';
import { Config, SyncResult, GetReposOptions, GetReposResult, StatsResult, CategoryStats, LanguageStats } from './types';

// ============ 辅助函数 ============

/**
 * 将 GitHub 仓库数据映射为数据库格式
 * 纯函数 - 消除 create/update 重复代码
 */
function mapRepoToDbFormat(repo: any, category: string, syncTime: Date) {
  return {
    id: repo.id,
    nodeId: repo.node_id,
    name: repo.name,
    fullName: repo.full_name,
    ownerLogin: repo.owner.login,
    ownerId: repo.owner.id,
    ownerAvatarUrl: repo.owner.avatar_url,
    description: repo.description,
    htmlUrl: repo.html_url,
    cloneUrl: repo.clone_url,
    sshUrl: repo.ssh_url,
    language: repo.language,
    stargazersCount: repo.stargazers_count,
    forksCount: repo.forks_count,
    size: repo.size,
    defaultBranch: repo.default_branch,
    createdAt: new Date(repo.created_at),
    updatedAt: new Date(repo.updated_at),
    pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
    starredAt: new Date(repo.starred_at!),
    archived: repo.archived,
    disabled: repo.disabled,
    private: repo.private,
    fork: repo.fork,
    isStarred: true,
    category,
    syncAt: syncTime,
  };
}

/**
 * 批量分割数组
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// ============ StarManager 类 ============

export class StarManager {
  private prisma: PrismaClient;
  private github: GitHubService;

  constructor(config: Config) {
    this.prisma = new PrismaClient({
      datasources: {
        db: { url: config.database.url },
      },
    });
    this.github = new GitHubService(config.github.token);
  }

  async initialize(): Promise<void> {
    await this.prisma.$connect();
  }

  /**
   * 同步 tags 和 topics 到关系表
   * 使用事务确保原子性
   */
  private async syncRepoRelations(
    repoId: number,
    tags: string[],
    topics: string[]
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. 清理旧关系
      await tx.repoTag.deleteMany({ where: { repoId } });
      await tx.repoTopic.deleteMany({ where: { repoId } });

      // 2. 创建/获取 tags
      if (tags.length > 0) {
        for (const tagName of tags) {
          await tx.tag.upsert({
            where: { name: tagName },
            create: { name: tagName },
            update: {},
          });
        }

        const tagRecords = await tx.tag.findMany({
          where: { name: { in: tags } },
          select: { id: true },
        });

        await tx.repoTag.createMany({
          data: tagRecords.map(tag => ({ repoId, tagId: tag.id })),
        });
      }

      // 3. 创建/获取 topics
      if (topics.length > 0) {
        for (const topicName of topics) {
          await tx.topic.upsert({
            where: { name: topicName },
            create: { name: topicName },
            update: {},
          });
        }

        const topicRecords = await tx.topic.findMany({
          where: { name: { in: topics } },
          select: { id: true },
        });

        await tx.repoTopic.createMany({
          data: topicRecords.map(topic => ({ repoId, topicId: topic.id })),
        });
      }
    });
  }

  /**
   * 同步 GitHub starred 仓库
   * 重构版本：提取函数，简化嵌套，从 200 行降到 ~100 行
   */
  async syncStarredRepos(
    _incremental: boolean = true,
    onProgress?: (progress: { current: number; total: number; repo: string; action: string }) => void
  ): Promise<SyncResult> {
    const syncTime = new Date();

    try {
      onProgress?.({ current: 0, total: 0, repo: '', action: '正在获取 GitHub starred 仓库...' });

      // 1. 获取 GitHub 上的全部 starred 仓库
      const githubRepos = await this.github.getAllStarredRepos((current, page) => {
        onProgress?.({ current, total: 0, repo: '', action: `正在获取第 ${page} 页，已获取 ${current} 个仓库...` });
      });
      const totalRepos = githubRepos.length;

      onProgress?.({ current: 0, total: totalRepos, repo: '', action: `获取到 ${totalRepos} 个仓库，开始同步...` });

      // 2. 获取数据库中当前 starred 的仓库
      const existingStarredRepos = await this.prisma.starredRepo.findMany({
        where: { isStarred: true },
        select: { fullName: true },
      });

      // 3. 计算差集（集合运算）
      const existingSet = new Set(existingStarredRepos.map(r => r.fullName));
      const currentSet = new Set(githubRepos.map(r => r.full_name));

      const newRepos = githubRepos.filter(r => !existingSet.has(r.full_name)); // A - B
      const unstarredNames = Array.from(existingSet).filter(name => !currentSet.has(name)); // B - A
      const unchangedCount = githubRepos.length - newRepos.length; // A ∩ B

      onProgress?.({
        current: 0,
        total: newRepos.length + unstarredNames.length,
        repo: '',
        action: `需要处理：${newRepos.length} 个新增，${unstarredNames.length} 个取消，${unchangedCount} 个无变化`,
      });

      let added = 0;

      // 4. 批量处理新增的仓库
      if (newRepos.length > 0) {
        const BATCH_SIZE = 50;
        const batches = chunk(newRepos, BATCH_SIZE);

        for (const batch of batches) {
          // 分析仓库并生成数据
          const repoDataList = batch.map(repo => {
            const analysis = analyzeRepo(repo);
            return {
              data: mapRepoToDbFormat(repo, analysis.category, syncTime),
              tags: analysis.tags,
              topics: repo.topics || [],
            };
          });

          // 批量 upsert 仓库主记录
          for (const { data, tags, topics } of repoDataList) {
            await this.prisma.starredRepo.upsert({
              where: { id: data.id },
              create: data,
              update: data,
            });

            // 同步关系表
            await this.syncRepoRelations(data.id, tags, topics);
          }

          added += batch.length;

          onProgress?.({
            current: added,
            total: newRepos.length + unstarredNames.length,
            repo: batch[batch.length - 1].full_name,
            action: `已新增 ${added}/${newRepos.length} 个仓库`,
          });
        }
      }

      // 5. 批量标记取消 star 的仓库
      let unstarred = 0;
      if (unstarredNames.length > 0) {
        await this.prisma.starredRepo.updateMany({
          where: { fullName: { in: unstarredNames } },
          data: { isStarred: false, syncAt: syncTime },
        });
        unstarred = unstarredNames.length;

        onProgress?.({
          current: newRepos.length + unstarredNames.length,
          total: newRepos.length + unstarredNames.length,
          repo: '',
          action: `已标记 ${unstarred} 个仓库为取消 star`,
        });
      }

      // 6. 统计数据
      const total = await this.prisma.starredRepo.count({ where: { isStarred: true } });
      const dbTotal = await this.prisma.starredRepo.count();

      // 7. 记录同步历史
      await this.prisma.syncHistory.create({
        data: {
          syncAt: syncTime,
          added,
          updated: 0,
          unstarred,
          total,
          success: true,
        },
      });

      onProgress?.({
        current: totalRepos,
        total: totalRepos,
        repo: '',
        action: '同步完成！',
      });

      return { added, unstarred, total, dbTotal };

    } catch (error) {
      // 记录失败的同步
      await this.prisma.syncHistory.create({
        data: {
          syncAt: syncTime,
          added: 0,
          updated: 0,
          unstarred: 0,
          total: 0,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          success: false,
        },
      });
      throw error;
    }
  }

  /**
   * 获取 starred 仓库列表
   * 重构版本：使用数据库关系查询，消除内存过滤和 JSON.parse
   */
  async getStarredRepos(options: GetReposOptions = {}): Promise<GetReposResult> {
    const {
      category,
      language,
      tags,
      search,
      nameSearch,
      limit = 20,
      offset = 0,
      pushedAfter,
      pushedBefore,
      starredAfter,
      starredBefore,
      minStars,
      maxStars,
      sort = 'starred',
      order = 'desc',
    } = options;

    // 构建 where 条件
    const where: any = {};

    // 默认只显示 starred 的仓库
    if (!options.includeUnstarred) {
      where.isStarred = true;
    }

    if (category) where.category = category;
    if (language) where.language = language;

    // 搜索条件（OR 组合）
    const searchConditions: any[] = [];
    if (nameSearch) {
      searchConditions.push(
        { name: { contains: nameSearch } },
        { fullName: { contains: nameSearch } }
      );
    }
    if (search) {
      searchConditions.push({ description: { contains: search } });
    }
    if (searchConditions.length > 0) {
      where.OR = searchConditions;
    }

    // Star 数量范围
    if (minStars !== undefined || maxStars !== undefined) {
      where.stargazersCount = {};
      if (minStars !== undefined) where.stargazersCount.gte = minStars;
      if (maxStars !== undefined) where.stargazersCount.lte = maxStars;
    }

    // 时间范围
    if (pushedAfter || pushedBefore) {
      where.pushedAt = {};
      if (pushedAfter) where.pushedAt.gte = new Date(pushedAfter);
      if (pushedBefore) where.pushedAt.lte = new Date(pushedBefore);
    }
    if (starredAfter || starredBefore) {
      where.starredAt = {};
      if (starredAfter) where.starredAt.gte = new Date(starredAfter);
      if (starredBefore) where.starredAt.lte = new Date(starredBefore);
    }

    // ✅ 关键修复：tags 使用关系查询（不再是内存过滤）
    if (tags && tags.length > 0) {
      where.tags = {
        some: {
          tag: {
            name: { in: tags },
          },
        },
      };
    }

    // 排序
    const orderBy: any = {};
    switch (sort) {
      case 'stars':
        orderBy.stargazersCount = order;
        break;
      case 'pushed':
        orderBy.pushedAt = order;
        break;
      case 'starred':
      default:
        orderBy.starredAt = order;
    }

    // 执行查询（一次性完成，包含关系）
    const [repos, total] = await Promise.all([
      this.prisma.starredRepo.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          tags: {
            include: { tag: true },
          },
          topics: {
            include: { topic: true },
          },
        },
      }),
      this.prisma.starredRepo.count({ where }),
    ]);

    // ✅ 格式化返回（零 JSON.parse，从关系表直接读取）
    return {
      repos: repos.map((repo: any) => ({
        ...repo,
        tags: repo.tags.map((rt: any) => rt.tag.name),
        topics: repo.topics.map((rt: any) => rt.topic.name),
      })),
      total,
    };
  }

  async updateRepoTags(repoId: number, tags: string[]): Promise<void> {
    await this.syncRepoRelations(repoId, tags, []);
  }

  async updateRepoCategory(repoId: number, category: string): Promise<void> {
    await this.prisma.starredRepo.update({
      where: { id: repoId },
      data: { category },
    });
  }

  async setGitHubRepoTopics(repoId: number, topics: string[]): Promise<void> {
    const repo = await this.prisma.starredRepo.findUnique({
      where: { id: repoId },
      select: { ownerLogin: true, name: true },
    });

    if (!repo) {
      throw new Error(`Repository with id ${repoId} not found`);
    }

    await this.github.setRepoTopics(repo.ownerLogin, repo.name, topics);

    // 更新本地关系表
    await this.syncRepoRelations(repoId, [], topics);
  }

  async unstarRepo(repoId: number): Promise<void> {
    const repo = await this.prisma.starredRepo.findUnique({
      where: { id: repoId },
      select: { ownerLogin: true, name: true, fullName: true, isStarred: true },
    });

    if (!repo) {
      throw new Error(`Repository with id ${repoId} not found`);
    }

    if (!repo.isStarred) {
      throw new Error(`Repository ${repo.fullName} is already unstarred`);
    }

    // 在 GitHub 上取消 star
    await this.github.unstarRepo(repo.ownerLogin, repo.name);

    // 更新本地数据库
    await this.prisma.starredRepo.update({
      where: { id: repoId },
      data: {
        isStarred: false,
        syncAt: new Date(),
      },
    });
  }

  async unstarRepos(repoIds: number[]): Promise<{ success: number; failed: Array<{ id: number; error: string }> }> {
    let success = 0;
    const failed: Array<{ id: number; error: string }> = [];

    for (const repoId of repoIds) {
      try {
        await this.unstarRepo(repoId);
        success++;
      } catch (error) {
        failed.push({
          id: repoId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { success, failed };
  }

  async unstarRepoByFullName(fullName: string): Promise<void> {
    const repo = await this.prisma.starredRepo.findUnique({
      where: { fullName },
      select: { id: true },
    });

    if (!repo) {
      throw new Error(`Repository ${fullName} not found`);
    }

    await this.unstarRepo(repo.id);
  }

  async getStats(): Promise<StatsResult> {
    const [totalRepos, currentlyStarred, unstarred, lastSync] = await Promise.all([
      this.prisma.starredRepo.count(),
      this.prisma.starredRepo.count({ where: { isStarred: true } }),
      this.prisma.starredRepo.count({ where: { isStarred: false } }),
      this.prisma.syncHistory.findFirst({
        where: { success: true },
        orderBy: { syncAt: 'desc' },
      }),
    ]);

    return {
      totalRepos,
      currentlyStarred,
      unstarred,
      lastSyncAt: lastSync?.syncAt.toISOString(),
    };
  }

  async getCategoryStats(): Promise<CategoryStats[]> {
    const result = await this.prisma.starredRepo.groupBy({
      by: ['category'],
      where: { isStarred: true },
      _count: { category: true },
    });

    return result.map((item: any) => ({
      category: item.category || '未分类',
      count: item._count.category,
    }));
  }

  async getLanguageStats(): Promise<LanguageStats[]> {
    const result = await this.prisma.starredRepo.groupBy({
      by: ['language'],
      where: {
        isStarred: true,
        language: { not: null },
      },
      _count: { language: true },
      orderBy: { _count: { language: 'desc' } },
    });

    return result.map((item: any) => ({
      language: item.language || 'Unknown',
      count: item._count.language,
    }));
  }

  async getSyncHistory(limit: number = 10): Promise<any[]> {
    return this.prisma.syncHistory.findMany({
      orderBy: { syncAt: 'desc' },
      take: limit,
    });
  }

  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
