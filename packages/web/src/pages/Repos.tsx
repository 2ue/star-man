import { Filter, Search, SlidersHorizontal, Star, GitFork, ExternalLink, Tag, FolderOpen, Grid, List } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchRepos } from '../lib/api'
import type { RepoQuery } from '../types/api'

export default function Repos() {
  const [filters, setFilters] = useState<RepoQuery>({
    limit: 20,
    offset: 0,
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const { data: reposData, isLoading, error } = useQuery({
    queryKey: ['repos', filters],
    queryFn: () => fetchRepos(filters),
    keepPreviousData: true,
  })

  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      search: searchTerm || undefined,
      offset: 0,
    }))
  }

  const handleReset = () => {
    setFilters({
      limit: 20,
      offset: 0,
    })
    setSearchTerm('')
  }

  const handlePageChange = (newOffset: number) => {
    setFilters(prev => ({
      ...prev,
      offset: newOffset,
    }))
  }

  if (error) {
    return (
      <div className="card-modern">
        <div className="card-compact text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Filter size={20} className="text-red-500" />
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
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">筛选条件</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">搜索关键词</label>
              <input
                className="input-modern w-full"
                placeholder="仓库名称、描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">编程语言</label>
              <input
                className="input-modern w-full"
                placeholder="JavaScript, Python..."
                value={filters.language || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, language: e.target.value || undefined }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">分类</label>
              <input
                className="input-modern w-full"
                placeholder="Backend, Frontend..."
                value={filters.category || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value || undefined }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300">标签</label>
              <input
                className="input-modern w-full"
                placeholder="react, vue, node..."
                value={filters.tags || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, tags: e.target.value || undefined }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                className="btn-gradient-primary px-4 py-2"
                onClick={handleSearch}
              >
                <Search size={14} className="mr-1" />
                查询
              </button>
              <button
                className="btn btn-outline px-4 py-2"
                onClick={handleReset}
              >
                <Filter size={14} className="mr-1" />
                重置
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">视图:</span>
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                  <Grid size={14} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'list'
                      ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                  <List size={14} />
                </button>
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
              <div className="text-base font-medium text-gray-800 dark:text-white">
                共找到 <span className="text-blue-600 dark:text-blue-400 font-bold">{reposData?.total || 0}</span> 个仓库
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                第 {Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1} 页
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
                        <h3 className={`font-semibold text-gray-800 dark:text-white line-clamp-2 ${viewMode === 'list' ? 'text-base' : 'text-sm'
                          }`}>
                          {repo.name}
                        </h3>
                        <a
                          href={repo.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-xs glass-effect flex-shrink-0"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>

                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                        {repo.description || '暂无描述'}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        {repo.language && (
                          <span className="badge-modern">
                            {repo.language}
                          </span>
                        )}
                        {repo.category && (
                          <span className="badge badge-primary badge-xs flex items-center gap-1">
                            <FolderOpen size={8} />
                            {repo.category}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 mb-2">
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
                            <span key={tag} className="badge badge-secondary badge-xs flex items-center gap-1">
                              <Tag size={8} />
                              {tag}
                            </span>
                          ))}
                          {repo.tags.length > 3 && (
                            <span className="badge badge-ghost badge-xs">+{repo.tags.length - 3}</span>
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
              <div className="flex justify-center">
                <div className="join">
                  <button
                    className="join-item btn btn-outline btn-sm"
                    disabled={filters.offset === 0}
                    onClick={() => handlePageChange(Math.max(0, filters.offset! - filters.limit!))}
                  >
                    上一页
                  </button>
                  <button className="join-item btn btn-outline btn-sm">
                    第 {Math.floor(filters.offset! / filters.limit!) + 1} 页
                  </button>
                  <button
                    className="join-item btn btn-outline btn-sm"
                    disabled={!reposData.pagination.hasMore}
                    onClick={() => handlePageChange(filters.offset! + filters.limit!)}
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
} 