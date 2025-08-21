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
  updated: number;
  unstarred: number;
  total: number;
}

export interface GetReposOptions {
  category?: string;
  language?: string;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
  includeUnstarred?: boolean;
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