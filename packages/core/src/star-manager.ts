import { Database } from './database';
import { GitHubService } from './github';
import { RepoAnalyzer } from './analyzer';
import { Config, SyncResult, GetReposOptions, GetReposResult, StatsResult, CategoryStats, LanguageStats } from './types';

export class StarManager {
  private db: Database;
  private github: GitHubService;
  private analyzer: RepoAnalyzer;

  constructor(config: Config) {
    this.db = new Database(config.database);
    this.github = new GitHubService(config.github.token);
    this.analyzer = new RepoAnalyzer();
  }

  async initialize(): Promise<void> {
    await this.db.initialize();
  }

  async syncStarredRepos(_incremental: boolean = true, onProgress?: (progress: { current: number; total: number; repo: string; action: string }) => void): Promise<SyncResult> {
    const prisma = this.db.getPrisma();
    const startTime = new Date();

    try {
      onProgress?.({ current: 0, total: 0, repo: '', action: '正在获取 GitHub starred 仓库...' });

      // 总是获取 GitHub 上的全部 starred 仓库（集合A）
      const repos = await this.github.getAllStarredRepos((current, page) => {
        onProgress?.({ current, total: 0, repo: '', action: `正在获取第 ${page} 页，已获取 ${current} 个仓库...` });
      });
      const totalRepos = repos.length;

      onProgress?.({ current: 0, total: totalRepos, repo: '', action: `获取到 ${totalRepos} 个仓库，开始同步...` });

      let added = 0;
      const updated = 0;
      let unstarred = 0;

      // 获取数据库中当前 starred 的仓库（集合B）
      const existingStarredRepos = await prisma.starredRepo.findMany({
        where: { isStarred: true },
        select: { fullName: true }
      });

      const existingStarredSet = new Set(
        existingStarredRepos.map((repo: any) => repo.fullName)
      );

      // GitHub 上当前 starred 的仓库（集合A）
      const currentStarredSet = new Set(repos.map(repo => repo.full_name));

      // 计算差集
      const newStarredRepos = repos.filter(repo => !existingStarredSet.has(repo.full_name)); // A - B
      const unstarredRepoNames = Array.from(existingStarredSet).filter(fullName => !currentStarredSet.has(fullName)); // B - A
      const unchangedCount = repos.length - newStarredRepos.length; // A ∩ B

      onProgress?.({
        current: 0,
        total: newStarredRepos.length + unstarredRepoNames.length,
        repo: '',
        action: `需要处理：${newStarredRepos.length} 个新增，${unstarredRepoNames.length} 个取消，${unchangedCount} 个无变化`
      });

      // 批量插入新增的 starred 仓库（A - B）
      if (newStarredRepos.length > 0) {
        const BATCH_SIZE = 50;
        const batches = [];
        for (let i = 0; i < newStarredRepos.length; i += BATCH_SIZE) {
          batches.push(newStarredRepos.slice(i, i + BATCH_SIZE));
        }

        let processedCount = 0;
        for (const batch of batches) {
          const upsertOperations = batch.map(repo => {
            const analysis = this.analyzer.analyzeRepo(repo);
            return prisma.starredRepo.upsert({
              where: { id: repo.id },
              create: {
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
                topics: JSON.stringify(repo.topics || []),
                createdAt: new Date(repo.created_at),
                updatedAt: new Date(repo.updated_at),
                pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
                starredAt: new Date(repo.starred_at!),
                archived: repo.archived,
                disabled: repo.disabled,
                private: repo.private,
                fork: repo.fork,
                isStarred: true,
                tags: JSON.stringify(analysis.tags),
                category: analysis.category,
                syncAt: startTime,
              },
              update: {
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
                topics: JSON.stringify(repo.topics || []),
                updatedAt: new Date(repo.updated_at),
                pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
                archived: repo.archived,
                disabled: repo.disabled,
                private: repo.private,
                fork: repo.fork,
                isStarred: true,
                tags: JSON.stringify(analysis.tags),
                category: analysis.category,
                syncAt: startTime,
              }
            });
          });

          await prisma.$transaction(upsertOperations);
          processedCount += batch.length;
          added += batch.length;

          onProgress?.({
            current: processedCount,
            total: newStarredRepos.length + unstarredRepoNames.length,
            repo: batch[batch.length - 1].full_name,
            action: `已新增 ${processedCount}/${newStarredRepos.length} 个仓库`
          });
        }
      }

      // 批量更新取消 starred 的仓库（B - A）
      if (unstarredRepoNames.length > 0) {
        const updateOperations = unstarredRepoNames.map(fullName =>
          prisma.starredRepo.updateMany({
            where: { fullName },
            data: {
              isStarred: false,
              syncAt: startTime
            }
          })
        );

        await prisma.$transaction(updateOperations);
        unstarred = unstarredRepoNames.length;

        onProgress?.({
          current: newStarredRepos.length + unstarredRepoNames.length,
          total: newStarredRepos.length + unstarredRepoNames.length,
          repo: '',
          action: `已标记 ${unstarred} 个仓库为取消 star`
        });
      }

      // A ∩ B 的仓库完全跳过，0 数据库操作！

      const total = await prisma.starredRepo.count({
        where: { isStarred: true }
      });

      // Total number of records in database, regardless of isStarred
      const dbTotal = await prisma.starredRepo.count();

      // 记录同步历史
      await prisma.syncHistory.create({
        data: {
          syncAt: startTime,
          added,
          updated,
          unstarred,
          total,
          success: true
        }
      });

      onProgress?.({
        current: totalRepos,
        total: totalRepos,
        repo: '',
        action: '同步完成！'
      });

      return { added, unstarred, total, dbTotal };

    } catch (error) {
      // 记录失败的同步
      await prisma.syncHistory.create({
        data: {
          syncAt: startTime,
          added: 0,
          updated: 0,
          unstarred: 0,
          total: 0,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          success: false
        }
      });
      throw error;
    }
  }

  async getStarredRepos(options: GetReposOptions = {}): Promise<GetReposResult> {
    const prisma = this.db.getPrisma();
    const {
      category,
      language,
      tags,
      search,
      limit = 20,
      offset = 0
    } = options;

    const where: any = {};

    // 默认只显示 starred 的仓库，除非明确指定包含 unstarred
    if (!options.includeUnstarred) {
      where.isStarred = true;
    }

    if (category) {
      where.category = category;
    }

    if (language) {
      where.language = language;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { fullName: { contains: search } }
      ];
    }

    const [repos, total] = await Promise.all([
      prisma.starredRepo.findMany({
        where,
        orderBy: { starredAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.starredRepo.count({ where })
    ]);

    // 过滤标签
    let filteredRepos = repos;
    if (tags && tags.length > 0) {
      filteredRepos = repos.filter((repo: any) => {
        if (!repo.tags) return false;
        const repoTags = JSON.parse(repo.tags);
        return tags.some(tag => repoTags.includes(tag));
      });
    }

    return {
      repos: filteredRepos.map((repo: any) => ({
        ...repo,
        topics: repo.topics ? JSON.parse(repo.topics) : [],
        tags: repo.tags ? JSON.parse(repo.tags) : []
      })),
      total: tags && tags.length > 0 ? filteredRepos.length : total
    };
  }

  async updateRepoTags(repoId: number, tags: string[]): Promise<void> {
    const prisma = this.db.getPrisma();
    await prisma.starredRepo.update({
      where: { id: repoId },
      data: { tags: JSON.stringify(tags) }
    });
  }

  async updateRepoCategory(repoId: number, category: string): Promise<void> {
    const prisma = this.db.getPrisma();
    await prisma.starredRepo.update({
      where: { id: repoId },
      data: { category }
    });
  }

  async setGitHubRepoTopics(repoId: number, topics: string[]): Promise<void> {
    const prisma = this.db.getPrisma();
    const repo = await prisma.starredRepo.findUnique({
      where: { id: repoId },
      select: { ownerLogin: true, name: true }
    });

    if (!repo) {
      throw new Error(`Repository with id ${repoId} not found`);
    }

    await this.github.setRepoTopics(repo.ownerLogin, repo.name, topics);

    // 更新本地数据库
    await prisma.starredRepo.update({
      where: { id: repoId },
      data: { topics: JSON.stringify(topics) }
    });
  }

  async unstarRepo(repoId: number): Promise<void> {
    const prisma = this.db.getPrisma();
    const repo = await prisma.starredRepo.findUnique({
      where: { id: repoId },
      select: { ownerLogin: true, name: true, fullName: true, isStarred: true }
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
    await prisma.starredRepo.update({
      where: { id: repoId },
      data: {
        isStarred: false,
        syncAt: new Date()
      }
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
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return { success, failed };
  }

  async unstarRepoByFullName(fullName: string): Promise<void> {
    const prisma = this.db.getPrisma();
    const repo = await prisma.starredRepo.findUnique({
      where: { fullName },
      select: { id: true }
    });

    if (!repo) {
      throw new Error(`Repository ${fullName} not found`);
    }

    await this.unstarRepo(repo.id);
  }

  async getStats(): Promise<StatsResult> {
    const prisma = this.db.getPrisma();

    const [totalRepos, currentlyStarred, unstarred, lastSync] = await Promise.all([
      prisma.starredRepo.count(),
      prisma.starredRepo.count({ where: { isStarred: true } }),
      prisma.starredRepo.count({ where: { isStarred: false } }),
      prisma.syncHistory.findFirst({
        where: { success: true },
        orderBy: { syncAt: 'desc' }
      })
    ]);

    return {
      totalRepos,
      currentlyStarred,
      unstarred,
      lastSyncAt: lastSync?.syncAt.toISOString()
    };
  }

  async getCategoryStats(): Promise<CategoryStats[]> {
    const prisma = this.db.getPrisma();
    const result = await prisma.starredRepo.groupBy({
      by: ['category'],
      where: { isStarred: true },
      _count: { category: true }
    });

    return result.map((item: any) => ({
      category: item.category || '未分类',
      count: item._count.category
    }));
  }

  async getLanguageStats(): Promise<LanguageStats[]> {
    const prisma = this.db.getPrisma();
    const result = await prisma.starredRepo.groupBy({
      by: ['language'],
      where: {
        isStarred: true,
        language: { not: null }
      },
      _count: { language: true },
      orderBy: { _count: { language: 'desc' } }
    });

    return result.map((item: any) => ({
      language: item.language || 'Unknown',
      count: item._count.language
    }));
  }

  async getSyncHistory(limit: number = 10): Promise<any[]> {
    const prisma = this.db.getPrisma();
    return prisma.syncHistory.findMany({
      orderBy: { syncAt: 'desc' },
      take: limit
    });
  }

  async close(): Promise<void> {
    await this.db.close();
  }
}