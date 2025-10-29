import { Search, Grid, List, Star, GitFork, ExternalLink, Tag, FolderOpen, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchRepos } from '../lib/api'
import type { RepoQuery, RepoFilters } from '../types/api'
import Pagination from '../components/Pagination'
import { useSearch } from '@tanstack/react-router'

// 更多标签dropdown组件（使用DaisyUI）
function MoreTagsDropdown({ tags, remainingCount }: { tags: string[], remainingCount: number }) {
  return (
    <div className="dropdown dropdown-left">
      <div
        tabIndex={0}
        role="button"
        className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
      >
        +{remainingCount}
      </div>
      <div tabIndex={0} className="dropdown-content menu bg-white border border-gray-200 rounded-lg shadow-lg p-3 w-80 z-50 dropdown-start">
        <div className="text-left">
          <div className="text-xs font-medium text-gray-700 mb-2">
            所有标签 ({tags.length + 3}个)
          </div>
          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700 border border-teal-200"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Repos() {
  // 获取 URL 搜索参数
  const searchParams = useSearch({ from: '/repos' }) as {
    category?: string
    language?: string
    tags?: string
    search?: string
    nameSearch?: string
  }

  // 分离UI状态和查询状态 - 初始化时直接从 URL 参数获取
  const [uiFilters, setUiFilters] = useState<RepoFilters>({
    limit: 20,
    offset: 0,
    // 新增筛选状态
    minStars: undefined,
    maxStars: undefined,
    pushedTimeRange: undefined,
    updatedTimeRange: undefined,
    sort: 'relevance',
    order: 'desc',
    // 从 URL 参数初始化筛选条件
    category: searchParams.category,
    language: searchParams.language,
    tags: searchParams.tags,
  })
  const [searchTerm, setSearchTerm] = useState(searchParams.search || '')           // 描述关键词搜索
  const [nameSearchTerm, setNameSearchTerm] = useState(searchParams.nameSearch || '')   // 仓库名称搜索
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // 实际用于API查询的参数 - 初始化时直接从 URL 参数获取
  const [queryFilters, setQueryFilters] = useState<RepoQuery>({
    limit: 20,
    offset: 0,
    sort: 'relevance',
    order: 'desc',
    // 从 URL 参数初始化查询条件
    category: searchParams.category,
    language: searchParams.language,
    tags: searchParams.tags,
  })
  const [querySearchTerm, setQuerySearchTerm] = useState<string>(searchParams.search || '')
  const [queryNameSearchTerm, setQueryNameSearchTerm] = useState<string>(searchParams.nameSearch || '')

  const { data: reposData, isLoading, error } = useQuery({
    queryKey: ['repos', queryFilters, querySearchTerm, queryNameSearchTerm],
    queryFn: () => {
      console.log('🚀 API调用参数:', {
        ...queryFilters,
        search: querySearchTerm || undefined,
        nameSearch: queryNameSearchTerm || undefined
      })
      return fetchRepos({
        ...queryFilters,
        search: querySearchTerm || undefined,
        nameSearch: queryNameSearchTerm || undefined
      })
    },
    keepPreviousData: true,
    enabled: true, // 总是启用查询
  })

  // 时间范围转换函数
  const getTimeRangeDates = (timeRange: string) => {
    const now = new Date()
    switch (timeRange) {
      case '1w':
        return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now }
      case '1m':
        return { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now }
      case '3m':
        return { start: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), end: now }
      case '6m':
        return { start: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000), end: now }
      case '1y':
        return { start: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), end: now }
      default:
        return { start: undefined, end: undefined }
    }
  }

  const handleSearch = () => {
    const timeRanges = getTimeRangeDates(uiFilters.pushedTimeRange || '')
    const updateTimeRanges = getTimeRangeDates(uiFilters.updatedTimeRange || '')

    // 构建查询参数，只包含后端API期望的字段
    const newQueryFilters: RepoQuery = {
      limit: uiFilters.limit,
      offset: 0, // 重置到第一页
      category: uiFilters.category,
      language: uiFilters.language,
      tags: uiFilters.tags,
      minStars: uiFilters.minStars,
      maxStars: uiFilters.maxStars,
      sort: uiFilters.sort,
      order: uiFilters.order,
      // 只有当时间范围选择有效时才添加时间参数
      ...(uiFilters.pushedTimeRange && {
        pushedAfter: timeRanges.start?.toISOString(),
        pushedBefore: timeRanges.end?.toISOString()
      }),
      ...(uiFilters.updatedTimeRange && {
        updatedAfter: updateTimeRanges.start?.toISOString(),
        updatedBefore: updateTimeRanges.end?.toISOString()
      })
    }

    // 调试：输出实际的API查询参数
    console.log('🔍 搜索参数:', newQueryFilters)
    console.log('📅 时间范围转换:', {
      pushedTimeRange: uiFilters.pushedTimeRange,
      pushedAfter: timeRanges.start?.toISOString(),
      pushedBefore: timeRanges.end?.toISOString(),
      updatedTimeRange: uiFilters.updatedTimeRange,
      updatedAfter: updateTimeRanges.start?.toISOString(),
      updatedBefore: updateTimeRanges.end?.toISOString()
    })

    setQueryFilters(newQueryFilters)
    setQuerySearchTerm(searchTerm)
    setQueryNameSearchTerm(nameSearchTerm)

    // 同时更新UI筛选器以保持同步
    setUiFilters(prev => ({ ...prev, offset: 0 }))
  }

  const handleReset = () => {
    setSearchTerm('')
    setNameSearchTerm('')
    setUiFilters({
      limit: 20,
      offset: 0,
      // 重置所有筛选条件
      minStars: undefined,
      maxStars: undefined,
      pushedTimeRange: undefined,
      updatedTimeRange: undefined,
      sort: 'relevance',
      order: 'desc'
    })
    setQueryFilters({
      limit: 20,
      offset: 0,
      sort: 'relevance',
      order: 'desc'
    })
    setQuerySearchTerm('')
    setQueryNameSearchTerm('')
  }

  const handlePageChange = (newOffset: number) => {
    setUiFilters(prev => ({
      ...prev,
      offset: newOffset,
    }))
    setQueryFilters(prev => ({
      ...prev,
      offset: newOffset,
    }))
  }

  if (error) {
    return (
      <div className="card-modern">
        <div className="card-compact text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <SlidersHorizontal size={20} className="text-red-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-2">加载失败</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {error instanceof Error ? error.message : '未知错误'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-slide-in-up">
      {/* 页面标题 */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          仓库管理
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          浏览、筛选和管理你的 GitHub Stars
        </p>
      </div>

      {/* 现代化筛选器 */}
      <div className="card-modern">
        <div className="card-compact">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <SlidersHorizontal size={16} className="text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">筛选条件</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            {/* 仓库名称搜索 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">仓库名称</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  className={`w-full pl-10 pr-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 text-sm placeholder-gray-400 ${
                    nameSearchTerm ? 'text-gray-900 font-medium' : 'text-gray-500'
                  }`}
                  placeholder="仓库名称模糊搜索..."
                  value={nameSearchTerm}
                  onChange={(e) => setNameSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>

            {/* 描述关键词搜索 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">描述关键词</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  className={`w-full pl-10 pr-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 text-sm placeholder-gray-400 ${
                    searchTerm ? 'text-gray-900 font-medium' : 'text-gray-500'
                  }`}
                  placeholder="描述中的关键词..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>

            {/* 编程语言 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">编程语言</label>
              <input
                className={`w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 text-sm placeholder-gray-400 ${
                  uiFilters.language ? 'text-gray-900 font-medium' : 'text-gray-500'
                }`}
                placeholder="JavaScript, Python..."
                value={uiFilters.language || ''}
                onChange={(e) => setUiFilters(prev => ({ ...prev, language: e.target.value || undefined }))}
              />
            </div>

            {/* 分类 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">分类</label>
              <input
                className={`w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 text-sm placeholder-gray-400 ${
                  uiFilters.category ? 'text-gray-900 font-medium' : 'text-gray-500'
                }`}
                placeholder="Backend, Frontend..."
                value={uiFilters.category || ''}
                onChange={(e) => setUiFilters(prev => ({ ...prev, category: e.target.value || undefined }))}
              />
            </div>

            {/* 标签 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">标签</label>
              <input
                className={`w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 text-sm placeholder-gray-400 ${
                  uiFilters.tags ? 'text-gray-900 font-medium' : 'text-gray-500'
                }`}
                placeholder="react, vue, node..."
                value={uiFilters.tags || ''}
                onChange={(e) => setUiFilters(prev => ({ ...prev, tags: e.target.value || undefined }))}
              />
            </div>

            {/* Star数量范围 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">Star数量范围</label>
              <div className="flex gap-2">
                <input
                  className={`w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 text-sm placeholder-gray-400 ${
                    uiFilters.minStars !== undefined ? 'text-gray-900 font-medium' : 'text-gray-500'
                  }`}
                  placeholder="最小Star数"
                  type="number"
                  min="0"
                  value={uiFilters.minStars || ''}
                  onChange={(e) => setUiFilters(prev => ({ ...prev, minStars: e.target.value ? parseInt(e.target.value) : undefined }))}
                />
                <input
                  className={`w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 text-sm placeholder-gray-400 ${
                    uiFilters.maxStars !== undefined ? 'text-gray-900 font-medium' : 'text-gray-500'
                  }`}
                  placeholder="最大Star数"
                  type="number"
                  min="0"
                  value={uiFilters.maxStars || ''}
                  onChange={(e) => setUiFilters(prev => ({ ...prev, maxStars: e.target.value ? parseInt(e.target.value) : undefined }))}
                />
              </div>
            </div>

            {/* 最后活跃时间 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">最后活跃时间</label>
              <select
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 text-sm"
                value={uiFilters.pushedTimeRange || ''}
                onChange={(e) => setUiFilters(prev => ({ ...prev, pushedTimeRange: e.target.value || undefined }))}
              >
                <option value="">全部时间</option>
                <option value="1w">最近一周</option>
                <option value="1m">最近一月</option>
                <option value="3m">最近三月</option>
                <option value="6m">最近半年</option>
                <option value="1y">最近一年</option>
              </select>
            </div>

            {/* 元数据更新时间 */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700">元数据更新时间</label>
              <select
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 text-sm"
                value={uiFilters.updatedTimeRange || ''}
                onChange={(e) => setUiFilters(prev => ({ ...prev, updatedTimeRange: e.target.value || undefined }))}
              >
                <option value="">全部时间</option>
                <option value="1w">最近一周</option>
                <option value="1m">最近一月</option>
                <option value="3m">最近三月</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                className="px-6 py-2.5 text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-md transition-all duration-200 flex items-center gap-2"
                onClick={handleSearch}
              >
                <Search size={16} />
                查询
              </button>
              <button
                className="px-6 py-2.5 text-sm font-medium bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center gap-2"
                onClick={handleReset}
              >
                <SlidersHorizontal size={16} />
                重置
              </button>
            </div>

            {/* 新增排序控件 */}
            <div className="flex items-center gap-4">
              {/* 排序方式 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">排序:</span>
                <select
                  className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                  value={uiFilters.sort || 'relevance'}
                  onChange={(e) => {
                    const newSort = e.target.value as any
                    setUiFilters(prev => ({ ...prev, sort: newSort }))
                    setQueryFilters(prev => ({ ...prev, sort: newSort, offset: 0 }))
                  }}
                >
                  <option value="relevance">相关度</option>
                  <option value="stars">Star数</option>
                  <option value="forks">Fork数</option>
                  <option value="pushed">最后活跃</option>
                  <option value="updated">元数据更新</option>
                  <option value="created">创建时间</option>
                </select>
              </div>

              {/* 排序方向 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">方向:</span>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => {
                      setUiFilters(prev => ({ ...prev, order: 'asc' }))
                      setQueryFilters(prev => ({ ...prev, order: 'asc', offset: 0 }))
                    }}
                    className={`p-1.5 rounded-md transition-colors ${uiFilters.order === 'asc'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                      }`}
                    title="升序"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      setUiFilters(prev => ({ ...prev, order: 'desc' }))
                      setQueryFilters(prev => ({ ...prev, order: 'desc', offset: 0 }))
                    }}
                    className={`p-1.5 rounded-md transition-colors ${uiFilters.order === 'desc'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                      }`}
                    title="降序"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">视图:</span>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                      }`}
                  >
                    <Grid size={14} />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-colors ${viewMode === 'list'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                      }`}
                  >
                    <List size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 仓库列表 */}
      <div className="space-y-4">
        {isLoading ? (
          // 加载状态
          <div className={viewMode === 'grid' ? 'grid-responsive' : 'space-y-3'}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`card-modern animate-pulse ${viewMode === 'list' ? 'flex items-center gap-3' : ''
                }`}>
                <div className="card-compact w-full">
                  <div className="skeleton h-4 w-1/2 mb-2" />
                  <div className="skeleton h-3 w-full mb-1" />
                  <div className="skeleton h-3 w-3/4" />
                  <div className="flex gap-2 mt-2">
                    <div className="skeleton h-4 w-12" />
                    <div className="skeleton h-4 w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* 统计信息 */}
            <div className="flex items-center justify-between">
              <div className="text-base font-medium text-gray-800">
                共找到 <span className="text-blue-600 font-bold">{reposData?.total || 0}</span> 个仓库
              </div>
              <div className="text-sm text-gray-600">
                第 {Math.floor((uiFilters.offset || 0) / (uiFilters.limit || 20)) + 1} 页
              </div>
            </div>

            {/* 仓库卡片 */}
            <div className={viewMode === 'grid' ? 'grid-responsive' : 'space-y-3'}>
              {reposData?.data?.map((repo) => (
                <div key={repo.id} className={`card-modern hover-lift ${viewMode === 'list' ? 'flex items-start gap-3' : ''
                  }`}>
                  <div className={`card-compact w-full ${viewMode === 'list' ? 'flex items-start gap-3' : ''
                    }`}>
                    <div className={`${viewMode === 'list' ? 'flex-1' : ''}`}>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className={`font-semibold text-gray-800 line-clamp-2 ${viewMode === 'list' ? 'text-base' : 'text-sm'
                          }`}>
                          {repo.name}
                        </h3>
                        <a
                          href={repo.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-xs bg-white/50 hover:bg-white/70 border border-gray-200 flex-shrink-0"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>

                      <p className="text-xs text-gray-600 line-clamp-2 mb-3">
                        {repo.description || '暂无描述'}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {repo.language && (
                          <span className="badge-modern">
                            {repo.language}
                          </span>
                        )}
                        {repo.category && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
                            <FolderOpen size={8} />
                            {repo.category}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                        <span className="flex items-center gap-1">
                          <Star size={12} className="text-yellow-500" />
                          {repo.stargazersCount?.toLocaleString() || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitFork size={12} className="text-blue-500" />
                          {repo.forksCount?.toLocaleString() || 0}
                        </span>
                      </div>

                      {repo.tags && repo.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {repo.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700 border border-teal-200 flex items-center gap-1">
                              <Tag size={8} />
                              {tag}
                            </span>
                          ))}
                          {repo.tags.length > 3 && (
                            <MoreTagsDropdown
                              tags={repo.tags.slice(3)}
                              remainingCount={repo.tags.length - 3}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 分页 */}
            {reposData?.pagination && (
              <Pagination
                total={reposData.total || 0}
                limit={uiFilters.limit || 20}
                offset={uiFilters.offset || 0}
                onPageChange={handlePageChange}
                onLimitChange={(newLimit) => {
                  setUiFilters(prev => ({
                    ...prev,
                    limit: newLimit,
                    offset: 0 // 重置到第一页
                  }))
                  setQueryFilters(prev => ({
                    ...prev,
                    limit: newLimit,
                    offset: 0 // 重置到第一页
                  }))
                }}
                limitOptions={[10, 20, 50, 100]}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}
