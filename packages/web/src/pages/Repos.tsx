import { Filter, Search, SlidersHorizontal, Star, GitFork, ExternalLink, Tag, FolderOpen } from 'lucide-react'
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
      <div className="alert alert-error">
        <span>加载仓库列表失败: {error instanceof Error ? error.message : '未知错误'}</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 筛选器 */}
      <div className="card card-compact bg-base-100 shadow-sm">
        <div className="card-body gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} />
            <h2 className="card-title text-base">筛选</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              className="input input-sm input-bordered"
              placeholder="搜索关键词"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <input
              className="input input-sm input-bordered"
              placeholder="语言"
              value={filters.language || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, language: e.target.value || undefined }))}
            />
            <input
              className="input input-sm input-bordered"
              placeholder="分类"
              value={filters.category || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value || undefined }))}
            />
            <input
              className="input input-sm input-bordered"
              placeholder="标签(,分隔)"
              value={filters.tags || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, tags: e.target.value || undefined }))}
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-sm normal-case btn-primary" onClick={handleSearch}>
              <Search size={14} />查询
            </button>
            <button className="btn btn-sm normal-case" onClick={handleReset}>
              <Filter size={14} />重置
            </button>
          </div>
        </div>
      </div>

      {/* 仓库列表 */}
      <div className="space-y-3">
        {isLoading ? (
          // 加载状态
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card card-compact bg-base-100 shadow-sm">
                <div className="card-body">
                  <div className="skeleton h-4 w-1/2" />
                  <div className="skeleton h-3 w-full" />
                  <div className="skeleton h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* 统计信息 */}
            <div className="text-sm text-base-content/70">
              共找到 {reposData?.total || 0} 个仓库
            </div>

            {/* 仓库卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {reposData?.data?.map((repo) => (
                <div key={repo.id} className="card card-compact bg-base-100 shadow-sm hover:shadow-md transition-shadow">
                  <div className="card-body">
                    <div className="flex items-start justify-between">
                      <h3 className="card-title text-base line-clamp-2">{repo.name}</h3>
                      <a
                        href={repo.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-xs"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>

                    <p className="text-sm text-base-content/70 line-clamp-2">
                      {repo.description || '暂无描述'}
                    </p>

                    <div className="flex items-center gap-2 text-xs text-base-content/60">
                      {repo.language && (
                        <span className="badge badge-outline badge-xs">{repo.language}</span>
                      )}
                      {repo.category && (
                        <span className="badge badge-primary badge-xs flex items-center gap-1">
                          <FolderOpen size={10} />
                          {repo.category}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1">
                        <Star size={12} className="text-yellow-500" />
                        {repo.stargazersCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitFork size={12} className="text-blue-500" />
                        {repo.forksCount}
                      </span>
                    </div>

                    {repo.tags && repo.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {repo.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="badge badge-secondary badge-xs flex items-center gap-1">
                            <Tag size={10} />
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
              ))}
            </div>

            {/* 分页 */}
            {reposData?.pagination && (
              <div className="flex justify-center">
                <div className="join">
                  <button
                    className="join-item btn btn-sm"
                    disabled={filters.offset === 0}
                    onClick={() => handlePageChange(Math.max(0, filters.offset! - filters.limit!))}
                  >
                    上一页
                  </button>
                  <button className="join-item btn btn-sm">
                    第 {Math.floor(filters.offset! / filters.limit!) + 1} 页
                  </button>
                  <button
                    className="join-item btn btn-sm"
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