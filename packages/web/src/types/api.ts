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
  search?: string          // 描述关键词搜索（移除仓库名搜索）
  nameSearch?: string      // 新增：仓库名称模糊搜索
  limit?: number
  offset?: number

  // 新增字段
  // 时间筛选
  pushedAfter?: string      // 最后活跃时间范围开始
  pushedBefore?: string     // 最后活跃时间范围结束
  updatedAfter?: string     // 元数据更新时间范围开始
  updatedBefore?: string    // 元数据更新时间范围结束

  // 数量筛选
  minStars?: number         // 最小Star数
  maxStars?: number         // 最大Star数

  // 排序
  sort?: 'relevance' | 'stars' | 'forks' | 'pushed' | 'updated' | 'created'
  order?: 'asc' | 'desc'
}

// 前端筛选状态接口，包含临时的UI字段
export interface RepoFilters extends RepoQuery {
  // 临时的UI字段，用于时间范围选择
  pushedTimeRange?: string  // 最后活跃时间范围选择
  updatedTimeRange?: string // 元数据更新时间范围选择
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
  total: number
} 