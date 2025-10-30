export interface Config {
  github: {
    token: string;
  };
  database: DatabaseConfig;
  api?: ApiConfig;
}

export interface ApiConfig {
  port: number;
  host?: string;
}

export interface DatabaseConfig {
  url: string;
  type?: 'sqlite' | 'mysql' | 'postgresql';
}

export interface StarredRepo {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
  };
  description?: string;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  language?: string;
  stargazers_count: number;
  forks_count: number;
  size: number;
  default_branch: string;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at?: string;
  starred_at?: string;
  archived: boolean;
  disabled: boolean;
  private: boolean;
  fork: boolean;
}

export interface RepoAnalysisResult {
  category: string;
  tags: string[];
  confidence: number;
}

export interface RepoAnalysis {
  category: string;
  tags: string[];
  confidence: number;
}

export interface SyncResult {
  added: number;
  unstarred: number;
  total: number;
  /** Total number of records in the database table, including unstarred */
  dbTotal: number;
}

export interface GetReposOptions {
  category?: string;
  language?: string;
  tags?: string[];
  search?: string;          // 描述关键词搜索（移除仓库名搜索）
  nameSearch?: string;      // 新增：仓库名称模糊搜索
  limit?: number;
  offset?: number;
  includeUnstarred?: boolean;

  // 新增字段
  // 时间筛选
  pushedAfter?: string;      // 最后活跃时间范围开始
  pushedBefore?: string;     // 最后活跃时间范围结束
  starredAfter?: string;     // Star时间范围开始
  starredBefore?: string;    // Star时间范围结束

  // 数量筛选
  minStars?: number;         // 最小Star数
  maxStars?: number;         // 最大Star数

  // 排序
  sort?: 'starred' | 'stars' | 'pushed';
  order?: 'asc' | 'desc';
}

export interface GetReposResult {
  repos: any[];
  total: number;
}

export interface StatsResult {
  totalRepos: number;
  currentlyStarred: number;
  unstarred: number;
  lastSyncAt?: string;
}

export interface CategoryStats {
  category: string;
  count: number;
}

export interface LanguageStats {
  language: string;
  count: number;
}