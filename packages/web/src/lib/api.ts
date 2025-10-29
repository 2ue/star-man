import axios from 'axios'
import type {
  Stats,
  ReposResponse,
  RepoQuery,
  SyncResponse,
  SyncHistoryResponse
} from '../types/api'

// 开发环境下使用相对路径走 Vite 代理，生产环境使用完整 URL
const baseURL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '')

export const http = axios.create({
  baseURL,
  timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '10000'),
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
http.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_API_LOGGING === 'true') {
      console.log('API Request:', config.method?.toUpperCase(), config.url)
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
http.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_API_LOGGING === 'true') {
      console.log('API Response:', response.status, response.config.url)
    }
    return response
  },
  (error) => {
    if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_API_LOGGING === 'true') {
      console.error('API Error:', error.response?.status, error.config?.url, error.message)
    }
    return Promise.reject(error)
  }
)

// 获取统计数据
export const fetchStats = async (): Promise<Stats> => {
  const response = await http.get<Stats>('/api/stats')
  return response.data
}

// 获取仓库列表
export const fetchRepos = async (query: RepoQuery = {}): Promise<ReposResponse> => {
  const response = await http.get<ReposResponse>('/api/repos', { params: query })
  return response.data
}

// 触发同步 - 使用配置的同步超时时间
export const triggerSync = async (incremental: boolean): Promise<SyncResponse> => {
  const response = await http.post<SyncResponse>('/api/sync',
    { incremental },
    { timeout: parseInt(import.meta.env.VITE_SYNC_TIMEOUT || '180000') }
  )
  return response.data
}

// 获取同步历史
export const fetchSyncHistory = async (limit: number = 10, offset: number = 0): Promise<SyncHistoryResponse> => {
  const response = await http.get<SyncHistoryResponse>('/api/sync/history', {
    params: { limit, offset }
  })
  return response.data
}

// 更新仓库标签
export const updateRepoTags = async (repoId: number, tags: string[]): Promise<{ success: boolean }> => {
  const response = await http.put(`/api/repos/${repoId}/tags`, { tags })
  return response.data
}

// 更新仓库分类
export const updateRepoCategory = async (repoId: number, category: string): Promise<{ success: boolean }> => {
  const response = await http.put(`/api/repos/${repoId}/category`, { category })
  return response.data
}

// 获取所有标签统计（用于词云）
export const fetchTagsStats = async (): Promise<import('../types/api').TagStat[]> => {
  const response = await http.get<import('../types/api').TagStat[]>('/api/stats/tags')
  return response.data
}

// 获取所有分类统计
export const fetchCategoriesStats = async (): Promise<import('../types/api').CategoryStat[]> => {
  const response = await http.get<import('../types/api').CategoryStat[]>('/api/stats/categories')
  return response.data
}
