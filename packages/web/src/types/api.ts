// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 统计数据类型
export interface Stats {
  totalRepos: number
  totalStars: number
  totalForks: number
  currentlyStarred: number
  unstarred: number
  lastSyncAt: string
  categories: CategoryStat[]
  languages: LanguageStat[]
  topTags: TagStat[]
}

export interface CategoryStat {
  category: string
  count: number
}

export interface LanguageStat {
  language: string
  count: number
}

export interface TagStat {
  tag: string
  count: number
}

// 仓库类型
export interface Repo {
  id: number
  name: string
  fullName: string
  description: string
  language: string
  category: string
  tags: string[]
  stargazersCount: number
  forksCount: number
  htmlUrl: string
  createdAt: string
  updatedAt: string
}

export interface ReposResponse {
  success: boolean
  data: Repo[]
  total: number
  pagination: {
    limit: number
    offset: number
    hasMore: boolean
  }
}

export interface RepoQuery {
  category?: string
  language?: string
  tags?: string
  search?: string
  limit?: number
  offset?: number
}

// 同步类型
export interface SyncResult {
  added: number
  unstarred: number
  total: number
}

export interface SyncResponse {
  success: boolean
  data: SyncResult
  message: string
}

export interface SyncHistory {
  id: number
  syncAt: string
  added: number
  updated: number
  unstarred: number
  total: number
  errorMessage: string | null
  success: boolean
}

export interface SyncHistoryResponse {
  success: boolean
  data: SyncHistory[]
} 