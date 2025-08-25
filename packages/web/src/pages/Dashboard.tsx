import { Activity, ListTree, Star, GitFork, Tag, TrendingUp, Users, Calendar } from 'lucide-react'
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
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-modern animate-pulse">
              <div className="p-6">
                <div className="skeleton h-4 w-1/2 mb-3" />
                <div className="skeleton h-8 w-3/4" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card-modern animate-pulse">
              <div className="p-6">
                <div className="skeleton h-5 w-1/3 mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="flex justify-between items-center">
                      <div className="skeleton h-4 w-1/3" />
                      <div className="skeleton h-6 w-16" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card-modern">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity size={24} className="text-red-500" />
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
          GitHub Stars 总览
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          管理你的 GitHub 收藏，发现更多优秀项目
        </p>
      </div>

      {/* 主要统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-modern group">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                <Star size={20} className="text-white" />
              </div>
              <TrendingUp size={20} className="text-gray-400 group-hover:text-yellow-500 transition-colors" />
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">总仓库数</h3>
            <div className="text-2xl font-bold text-gray-800 dark:text-white">
              {stats?.totalRepos?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-gray-500 mt-2">持续增长中</div>
          </div>
        </div>

        <div className="card-modern group">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                <Activity size={20} className="text-white" />
              </div>
              <TrendingUp size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">总 Star 数</h3>
            <div className="text-2xl font-bold text-gray-800 dark:text-white">
              {stats?.totalStars?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-gray-500 mt-2">来自所有仓库</div>
          </div>
        </div>

        <div className="card-modern group">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center">
                <GitFork size={20} className="text-white" />
              </div>
              <TrendingUp size={20} className="text-gray-400 group-hover:text-green-500 transition-colors" />
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">总 Fork 数</h3>
            <div className="text-2xl font-bold text-gray-800 dark:text-white">
              {stats?.totalForks?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-gray-500 mt-2">社区活跃度</div>
          </div>
        </div>

        <div className="card-modern group">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center">
                <Users size={20} className="text-white" />
              </div>
              <Calendar size={20} className="text-gray-400 group-hover:text-purple-500 transition-colors" />
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">最后同步</h3>
            <div className="text-lg font-bold text-gray-800 dark:text-white">
              {stats?.lastSyncAt ? new Date(stats.lastSyncAt).toLocaleDateString('zh-CN') : '未知'}
            </div>
            <div className="text-xs text-gray-500 mt-2">保持最新</div>
          </div>
        </div>
      </div>

      {/* 分类和语言统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-modern">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <ListTree size={20} className="text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">分类统计</h2>
            </div>
            <div className="space-y-4">
              {stats?.categories?.slice(0, 6).map((cat, index) => (
                <div key={cat.category} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-blue-500' :
                          index === 2 ? 'bg-green-500' :
                            index === 3 ? 'bg-purple-500' :
                              index === 4 ? 'bg-pink-500' : 'bg-gray-400'
                      }`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {cat.category || '未分类'}
                    </span>
                  </div>
                  <span className="badge-modern group-hover:scale-105 transition-transform">
                    {cat.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card-modern">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Tag size={20} className="text-white" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">语言统计</h2>
            </div>
            <div className="space-y-4">
              {stats?.languages?.slice(0, 6).map((lang, index) => (
                <div key={lang.language} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-red-500' :
                        index === 1 ? 'bg-blue-500' :
                          index === 2 ? 'bg-yellow-500' :
                            index === 3 ? 'bg-green-500' :
                              index === 4 ? 'bg-purple-500' : 'bg-gray-400'
                      }`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {lang.language || '未知'}
                    </span>
                  </div>
                  <span className="badge-modern group-hover:scale-105 transition-transform">
                    {lang.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 