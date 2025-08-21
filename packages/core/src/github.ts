import { Octokit } from '@octokit/rest';
import { StarredRepo } from './types';

export class GitHubService {
  private octokit: Octokit;
  private username?: string;

  constructor(token: string, username?: string) {
    this.octokit = new Octokit({
      auth: token,
    });
    this.username = username;
  }

  async getAuthenticatedUser() {
    if (!this.username) {
      const { data } = await this.octokit.rest.users.getAuthenticated();
      this.username = data.login;
    }
    return this.username;
  }

  async getAllStarredRepos(onProgress?: (current: number, page: number) => void): Promise<StarredRepo[]> {
    const username = await this.getAuthenticatedUser();
    const allRepos: StarredRepo[] = [];
    let page = 1;
    const perPage = 100;

    for (; ;) {
      try {
        onProgress?.(allRepos.length, page);

        const { data } = await this.octokit.rest.activity.listReposStarredByUser({
          username,
          per_page: perPage,
          page,
          headers: {
            Accept: 'application/vnd.github.star+json', // 获取 starred_at 时间
          },
        });

        if (data.length === 0) break;

        // 转换数据格式
        const repos = data.map((item: any) => ({
          ...item.repo,
          starred_at: item.starred_at,
        }));

        allRepos.push(...repos);
        page++;

        onProgress?.(allRepos.length, page);

        // 避免 API 限制
        await this.delay(100);
      } catch (error) {
        console.error(`Error fetching page ${page}:`, error);
        break;
      }
    }

    return allRepos;
  }

  async getStarredReposSince(since: string): Promise<StarredRepo[]> {
    const username = await this.getAuthenticatedUser();
    const allRepos: StarredRepo[] = [];
    let page = 1;
    const perPage = 100;

    for (; ;) {
      try {
        const { data } = await this.octokit.rest.activity.listReposStarredByUser({
          username,
          per_page: perPage,
          page,
          headers: {
            Accept: 'application/vnd.github.star+json',
          },
        });

        if (data.length === 0) break;

        const repos = data.map((item: any) => ({
          ...item.repo,
          starred_at: item.starred_at,
        }));

        // 过滤出指定时间之后的仓库
        const newRepos = repos.filter(repo =>
          new Date(repo.starred_at!) > new Date(since)
        );

        allRepos.push(...newRepos);

        // 如果这一页没有新的仓库，说明已经获取完毕
        if (newRepos.length === 0) break;

        page++;
        await this.delay(100);
      } catch (error) {
        console.error(`Error fetching page ${page}:`, error);
        break;
      }
    }

    return allRepos;
  }

  async setRepoTopics(owner: string, repo: string, topics: string[]): Promise<void> {
    try {
      await this.octokit.rest.repos.replaceAllTopics({
        owner,
        repo,
        names: topics,
      });
    } catch (error) {
      console.error(`Error setting topics for ${owner}/${repo}:`, error);
      throw error;
    }
  }

  async unstarRepo(owner: string, repo: string): Promise<void> {
    try {
      await this.octokit.rest.activity.unstarRepoForAuthenticatedUser({
        owner,
        repo,
      });
    } catch (error) {
      console.error(`Error unstarring ${owner}/${repo}:`, error);
      throw error;
    }
  }

  async getRepoDetails(owner: string, repo: string) {
    try {
      const { data } = await this.octokit.rest.repos.get({
        owner,
        repo,
      });
      return data;
    } catch (error) {
      console.error(`Error getting repo details for ${owner}/${repo}:`, error);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}