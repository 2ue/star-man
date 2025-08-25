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
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Filter size={24} className="text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">加载失败</h3>
          <p className="text-gray-600">
            {error instanceof Error ? error.message : '未知错误'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-in-up">
      {/* 页面标题 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
          仓库管理
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          浏览、筛选和管理你的 GitHub Stars
        </p>
      </div>

      {/* 现代化筛选器 */}
      <div className="card-modern">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <SlidersHorizontal size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">筛选条件</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">搜索关键词</label>
              <input
                className="input-modern w-full"
                placeholder="仓库名称、描述..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">编程语言</label>
              <input
                className="input-modern w-full"
                placeholder="JavaScript, Python..."
                value={filters.language || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, language: e.target.value || undefined }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">分类</label>
              <input
                className="input-modern w-full"
                placeholder="Backend, Frontend..."
                value={filters.category || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value || undefined }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">标签</label>
              <input
                className="input-modern w-full"
                placeholder="react, vue, node..."
                value={filters.tags || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, tags: e.target.value || undefined }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                className="btn-gradient-primary px-6 py-2.5"
                onClick={handleSearch}
              >
                <Search size={16} className="mr-2" />
                查询
              </button>
              <button
                className="btn btn-outline px-6 py-2.5"
                onClick={handleReset}
              >
                <Filter size={16} className="mr-2" />
                重置
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">视图:</span>
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${viewMode === 'grid'
                      ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${viewMode === 'list'
                      ? 'bg-white dark:bg-gray-700 text-blue-600 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                    }`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 仓库列表 */}
      <div className="space-y-6">
        {isLoading ? (
          // 加载状态
          <div className={viewMode === 'grid' ? 'grid-responsive' : 'space-y-4'}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`card-modern animate-pulse ${viewMode === 'list' ? 'flex items-center gap-4' : ''
                }`}>
                <div className="p-6 w-full">
                  <div className="skeleton h-5 w-1/2 mb-3" />
                  <div className="skeleton h-4 w-full mb-2" />
                  <div className="skeleton h-4 w-3/4" />
                  <div className="flex gap-2 mt-3">
                    <div className="skeleton h-6 w-16" />
                    <div className="skeleton h-6 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* 统计信息 */}
            <div className="flex items-center justify-between">
              <div className="text-lg font-medium text-gray-800 dark:text-white">
                共找到 <span className="text-blue-600 font-bold">{reposData?.total || 0}</span> 个仓库
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                第 {Math.floor((filters.offset || 0) / (filters.limit || 20)) + 1} 页
              </div>
            </div>

            {/* 仓库卡片 */}
            <div className={viewMode === 'grid' ? 'grid-responsive' : 'space-y-4'}>
              {reposData?.data?.map((repo) => (
                <div key={repo.id} className={`card-modern hover-lift ${viewMode === 'list' ? 'flex items-start gap-4' : ''
                  }`}>
                  <div className={`p-6 w-full ${viewMode === 'list' ? 'flex items-start gap-4' : ''
                    }`}>
                    <div className={`${viewMode === 'list' ? 'flex-1' : ''}`}>
                      <div className="flex items-start justify-between mb-3">
                        <h3 className={`font-semibold text-gray-800 dark:text-white line-clamp-2 ${viewMode === 'list' ? 'text-lg' : 'text-base'
                          }`}>
                          {repo.name}
                        </h3>
                        <a
                          href={repo.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm glass-effect flex-shrink-0"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                        {repo.description || '暂无描述'}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        {repo.language && (
                          <span className="badge-modern">
                            {repo.language}
                          </span>
                        )}
                        {repo.category && (
                          <span className="badge badge-primary badge-sm flex items-center gap-1">
                            <FolderOpen size={10} />
                            {repo.category}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <span className="flex items-center gap-1">
                          <Star size={14} className="text-yellow-500" />
                          {repo.stargazersCount?.toLocaleString() || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitFork size={14} className="text-blue-500" />
                          {repo.forksCount?.toLocaleString() || 0}
                        </span>
                      </div>

                      {repo.tags && repo.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {repo.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="badge badge-secondary badge-sm flex items-center gap-1">
                              <Tag size={10} />
                              {tag}
                            </span>
                          ))}
                          {repo.tags.length > 3 && (
                            <span className="badge badge-ghost badge-sm">+{repo.tags.length - 3}</span>
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
                    className="join-item btn btn-outline"
                    disabled={filters.offset === 0}
                    onClick={() => handlePageChange(Math.max(0, filters.offset! - filters.limit!))}
                  >
                    上一页
                  </button>
                  <button className="join-item btn btn-outline">
                    第 {Math.floor(filters.offset! / filters.limit!) + 1} 页
                  </button>
                  <button
                    className="join-item btn btn-outline"
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