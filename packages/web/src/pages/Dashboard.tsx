import { Activity, ListTree, Star, GitFork, Tag } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchStats } from '../lib/api'

export default function Dashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    refetchInterval: 30000, // 30秒刷新一次
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card card-compact bg-base-100 shadow-sm">
            <div className="card-body">
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-8 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>加载统计数据失败: {error instanceof Error ? error.message : '未知错误'}</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card card-compact bg-base-100 shadow-sm">
          <div className="card-body">
            <div className="flex items-center gap-2">
              <Star size={16} className="text-yellow-500" />
              <h2 className="card-title text-base">总仓库数</h2>
            </div>
            <div className="text-2xl font-bold">{stats?.totalRepos || 0}</div>
          </div>
        </div>

        <div className="card card-compact bg-base-100 shadow-sm">
          <div className="card-body">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-blue-500" />
              <h2 className="card-title text-base">总 Star 数</h2>
            </div>
            <div className="text-2xl font-bold">{stats?.totalStars || 0}</div>
          </div>
        </div>

        <div className="card card-compact bg-base-100 shadow-sm">
          <div className="card-body">
            <div className="flex items-center gap-2">
              <GitFork size={16} className="text-green-500" />
              <h2 className="card-title text-base">总 Fork 数</h2>
            </div>
            <div className="text-2xl font-bold">{stats?.totalForks || 0}</div>
          </div>
        </div>
      </div>

      {/* 分类和语言统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card card-compact bg-base-100 shadow-sm">
          <div className="card-body">
            <div className="flex items-center gap-2">
              <ListTree size={16} />
              <h2 className="card-title text-base">分类统计</h2>
            </div>
            <div className="space-y-2">
              {stats?.categories?.slice(0, 5).map((cat) => (
                <div key={cat.category} className="flex justify-between items-center">
                  <span className="text-sm">{cat.category || '未分类'}</span>
                  <span className="badge badge-primary badge-sm">{cat.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card card-compact bg-base-100 shadow-sm">
          <div className="card-body">
            <div className="flex items-center gap-2">
              <Tag size={16} />
              <h2 className="card-title text-base">语言统计</h2>
            </div>
            <div className="space-y-2">
              {stats?.languages?.slice(0, 5).map((lang) => (
                <div key={lang.language} className="flex justify-between items-center">
                  <span className="text-sm">{lang.language || '未知'}</span>
                  <span className="badge badge-secondary badge-sm">{lang.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 