import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { StarManager } from '../star-manager';
import { GitHubService } from '../github';
import { createChatModel } from './llm-factory';
import { loadAIConfigFromEnv } from './config';

export type AISearchScope = 'starred' | 'github' | 'both';

export interface AISearchOptions {
  query: string;
  scope?: AISearchScope;
  limit?: number;
}

export type AIReliability = 'high' | 'medium' | 'low';

export interface AISearchResultItem {
  fullName: string;
  name: string;
  description?: string;
  language?: string | null;
  stars: number;
  forks: number;
  htmlUrl: string;
  source: 'starred' | 'github';
  isStarred: boolean;
  reliability: AIReliability;
  score: number;
  reason: string;
}

interface RepoCandidate {
  fullName: string;
  name: string;
  description?: string | null;
  language?: string | null;
  stars: number;
  forks: number;
  htmlUrl: string;
  pushedAt?: string | null;
  source: 'starred' | 'github';
  isStarred: boolean;
}

interface AIRankingResultItem {
  fullName: string;
  score: number;
  reliability: AIReliability;
  reason: string;
}

/**
 * 使用 LLM 对仓库候选集合进行语义排序与打分。
 */
export class AIRepoSearchService {
  private githubService?: GitHubService;

  constructor(
    private readonly starManager: StarManager,
    githubToken?: string
  ) {
    if (githubToken) {
      this.githubService = new GitHubService(githubToken);
    }
  }

  async search(options: AISearchOptions): Promise<{ results: AISearchResultItem[] }> {
    const { query } = options;
    const scope: AISearchScope = options.scope ?? 'starred';
    const limit = options.limit ?? 20;

    if (!query || !query.trim()) {
      throw new Error('query 不能为空');
    }

    const candidates = await this.collectCandidates(query.trim(), scope, Math.max(limit, 10));
    if (candidates.length === 0) {
      return { results: [] };
    }

    // 尝试加载 AI 配置
    const aiConfig = loadAIConfigFromEnv();
    if (!aiConfig) {
      // 未配置 AI：仅按 stars 和 pushedAt 进行简单排序返回
      const sorted = this.simpleRank(candidates).slice(0, limit);
      return { results: sorted.map(c => this.toResultItem(c, 'medium', 0.5, '基于 Star 数和最近活跃时间的简单排序（未启用 AI）')) };
    }

    let model: BaseChatModel;
    try {
      model = await createChatModel(aiConfig);
    } catch (error) {
      console.error('[AI] 创建模型失败，回退到简单排序:', error);
      const sorted = this.simpleRank(candidates).slice(0, limit);
      return { results: sorted.map(c => this.toResultItem(c, 'medium', 0.5, '基于 Star 数和最近活跃时间的简单排序（AI 初始化失败）')) };
    }

    const ranked = await this.rankWithAI(model, query.trim(), candidates, limit);
    return { results: ranked };
  }

  private async collectCandidates(query: string, scope: AISearchScope, limit: number): Promise<RepoCandidate[]> {
    const candidates: RepoCandidate[] = [];

    if (scope === 'starred' || scope === 'both') {
      const fromStarred = await this.collectFromStarred(query, limit);
      candidates.push(...fromStarred);
    }

    if ((scope === 'github' || scope === 'both') && this.githubService) {
      const fromGithub = await this.collectFromGitHub(query, limit);
      candidates.push(...fromGithub);
    }

    // 合并去重（按 fullName）
    const byFullName = new Map<string, RepoCandidate>();
    for (const repo of candidates) {
      const existing = byFullName.get(repo.fullName);
      if (!existing) {
        byFullName.set(repo.fullName, repo);
      } else {
        // 若本地 starred 与 GitHub 搜索结果重复，以 isStarred = true 为准，source 优先 starred
        const merged: RepoCandidate = {
          ...existing,
          ...repo,
          source: existing.source === 'starred' ? existing.source : repo.source,
          isStarred: existing.isStarred || repo.isStarred,
        };
        byFullName.set(repo.fullName, merged);
      }
    }

    // 限制候选总数，以免 prompt 过长
    return Array.from(byFullName.values()).slice(0, Math.max(limit, 30));
  }

  private async collectFromStarred(query: string, limit: number): Promise<RepoCandidate[]> {
    const searchLimit = Math.max(limit, 30);
    const result = await this.starManager.getStarredRepos({
      search: query,
      nameSearch: query,
      limit: searchLimit,
      offset: 0,
      sort: 'starred',
      order: 'desc',
    });

    return result.repos.map((repo: any) => ({
      fullName: repo.fullName,
      name: repo.name,
      description: repo.description,
      language: repo.language,
      stars: repo.stargazersCount,
      forks: repo.forksCount,
      htmlUrl: repo.htmlUrl,
      pushedAt: repo.pushedAt ? new Date(repo.pushedAt).toISOString() : null,
      source: 'starred',
      isStarred: repo.isStarred ?? true,
    }));
  }

  private async collectFromGitHub(query: string, limit: number): Promise<RepoCandidate[]> {
    if (!this.githubService) return [];

    const perPage = Math.max(limit, 30);
    try {
      const items = await this.githubService.searchRepos(query, perPage);
      const candidates: RepoCandidate[] = items.map((repo: any) => ({
        fullName: repo.full_name,
        name: repo.name,
        description: repo.description,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        htmlUrl: repo.html_url,
        pushedAt: repo.pushed_at,
        source: 'github',
        isStarred: false,
      }));

      // 标记哪些已经被本地 Star 记录
      const fullNames = candidates.map(c => c.fullName);
      const statusMap = await this.starManager.getStarredStatusByFullNames(fullNames);

      return candidates.map(c => ({
        ...c,
        isStarred: statusMap[c.fullName] ?? false,
      }));
    } catch (error) {
      console.error('[AI] GitHub 搜索失败，将仅使用本地 starred 仓库:', error);
      return [];
    }
  }

  private simpleRank(candidates: RepoCandidate[]): RepoCandidate[] {
    return [...candidates].sort((a, b) => {
      // 先按 Star 数
      const starDiff = (b.stars ?? 0) - (a.stars ?? 0);
      if (starDiff !== 0) return starDiff;

      // 再按最后活跃时间
      const aTime = a.pushedAt ? new Date(a.pushedAt).getTime() : 0;
      const bTime = b.pushedAt ? new Date(b.pushedAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  private async rankWithAI(
    model: BaseChatModel,
    query: string,
    candidates: RepoCandidate[],
    limit: number
  ): Promise<AISearchResultItem[]> {
    const truncated = candidates.slice(0, Math.max(limit * 2, 20));

    const payload = truncated.map(c => ({
      fullName: c.fullName,
      name: c.name,
      description: c.description,
      language: c.language,
      stars: c.stars,
      forks: c.forks,
      htmlUrl: c.htmlUrl,
      pushedAt: c.pushedAt,
      source: c.source,
      isStarred: c.isStarred,
    }));

    const prompt = [
      '你是一个帮助开发者筛选 GitHub 仓库的智能助手。',
      '根据用户的问题，从给定的仓库列表中选择最相关的仓库，并评估其可靠性。',
      '',
      '请遵循以下要求：',
      '1. 只使用提供的仓库信息，不要编造不存在的仓库。',
      '2. 对每个你认为有用的仓库给出 0-1 的相关性评分 score（越高越相关）。',
      '3. 根据 Star 数、最近活跃时间、是否已被用户 star 等因素，给出可靠性等级 reliability：high / medium / low。',
      '4. 给出简短的中文推荐理由 reason，说明这个仓库为什么值得关注。',
      '5. 只返回 JSON，格式如下：',
      '',
      '{',
      '  "results": [',
      '    {',
      '      "fullName": "owner/repo",',
      '      "score": 0.92,',
      '      "reliability": "high",',
      '      "reason": "适合入门 xx 的高质量教程..."',
      '    }',
      '  ]',
      '}',
      '',
      `用户问题：${query}`,
      '',
      '候选仓库列表（JSON 数组）：',
      JSON.stringify(payload, null, 2),
      '',
      '只返回 JSON，不要添加任何多余解释或 Markdown。'
    ].join('\n');

    let rawText = '';
    try {
      const response = await model.invoke(prompt as any);
      const content: any = (response as any).content;

      if (typeof content === 'string') {
        rawText = content;
      } else if (Array.isArray(content)) {
        rawText = content
          .map((part: any) => {
            if (typeof part === 'string') return part;
            if (typeof part?.text === 'string') return part.text;
            return '';
          })
          .join('\n');
      } else if (typeof content?.toString === 'function') {
        rawText = content.toString();
      }
    } catch (error) {
      const err: any = error;
      // 尝试打印更多来自上游 OpenAI/Gemini 代理的错误信息，便于排查
      console.error('[AI] 调用模型失败，回退到简单排序:', err);
      if (err?.response?.data || err?.error) {
        console.error('[AI] 上游错误响应数据:', err.response?.data || err.error);
      }
      const sorted = this.simpleRank(candidates).slice(0, limit);
      return sorted.map(c => this.toResultItem(c, 'medium', 0.5, '基于 Star 数和最近活跃时间的简单排序（AI 调用失败）'));
    }

    const ranking = this.parseAIRanking(rawText);
    if (!ranking || ranking.length === 0) {
      console.warn('[AI] 无法解析 AI 返回结果，回退到简单排序');
      const sorted = this.simpleRank(candidates).slice(0, limit);
      return sorted.map(c => this.toResultItem(c, 'medium', 0.5, '基于 Star 数和最近活跃时间的简单排序（AI 结果解析失败）'));
    }

    const byFullName = new Map<string, RepoCandidate>();
    for (const c of candidates) {
      byFullName.set(c.fullName, c);
    }

    const results: AISearchResultItem[] = [];
    for (const item of ranking) {
      const repo = byFullName.get(item.fullName);
      if (!repo) continue;
      results.push(this.toResultItem(repo, item.reliability, item.score, item.reason));
      if (results.length >= limit) break;
    }

    // 如果 AI 结果少于 limit，用简单排序补齐
    if (results.length < limit) {
      const existingFullNames = new Set(results.map(r => r.fullName));
      const sorted = this.simpleRank(candidates);
      for (const c of sorted) {
        if (existingFullNames.has(c.fullName)) continue;
        results.push(this.toResultItem(c, 'medium', 0.4, '基于 Star 数和最近活跃时间的补充结果'));
        if (results.length >= limit) break;
      }
    }

    return results;
  }

  private parseAIRanking(text: string): AIRankingResultItem[] | null {
    if (!text) return null;

    const trimmed = text.trim();
    let jsonText = trimmed;

    // 尝试直接解析
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      // 尝试从中间抽取 JSON 子串
      const firstBrace = Math.min(
        ...['{', '[']
          .map(ch => jsonText.indexOf(ch))
          .filter(idx => idx >= 0)
      );
      const lastBrace = Math.max(
        ...['}', ']']
          .map(ch => jsonText.lastIndexOf(ch))
          .filter(idx => idx >= 0)
      );

      if (firstBrace >= 0 && lastBrace > firstBrace) {
        const substring = jsonText.slice(firstBrace, lastBrace + 1);
        try {
          parsed = JSON.parse(substring);
        } catch {
          return null;
        }
      } else {
        return null;
      }
    }

    const rawResults = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.results)
        ? parsed.results
        : null;

    if (!rawResults) return null;

    const mapped: AIRankingResultItem[] = [];
    for (const item of rawResults) {
      if (!item || typeof item.fullName !== 'string') continue;
      const scoreNum = typeof item.score === 'number' ? item.score : 0;
      const reliability: AIReliability =
        item.reliability === 'high' || item.reliability === 'low'
          ? item.reliability
          : 'medium';
      const reason = typeof item.reason === 'string' ? item.reason : '';

      mapped.push({
        fullName: item.fullName,
        score: Math.max(0, Math.min(1, scoreNum)),
        reliability,
        reason,
      });
    }

    return mapped;
  }

  private toResultItem(
    repo: RepoCandidate,
    reliability: AIReliability,
    score: number,
    reason: string
  ): AISearchResultItem {
    return {
      fullName: repo.fullName,
      name: repo.name,
      description: repo.description ?? undefined,
      language: repo.language ?? undefined,
      stars: repo.stars,
      forks: repo.forks,
      htmlUrl: repo.htmlUrl,
      source: repo.source,
      isStarred: repo.isStarred,
      reliability,
      score,
      reason,
    };
  }
}
