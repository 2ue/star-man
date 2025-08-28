import { Activity, ListTree, Star, GitFork, Tag, TrendingUp, Users, Calendar } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchStats } from '../lib/api'

export default function Dashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    refetchInterval: parseInt(import.meta.env.VITE_STATS_REFRESH_INTERVAL || '30000'), // 默认 30 秒刷新
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card-modern animate-pulse">
              <div className="card-compact">
                <div className="skeleton h-4 w-1/2 mb-2" />
                <div className="skeleton h-6 w-3/4" />
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card-modern animate-pulse">
              <div className="card-compact">
                <div className="skeleton h-4 w-1/3 mb-3" />
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="flex justify-between items-center">
                      <div className="skeleton h-3 w-1/3" />
                      <div className="skeleton h-5 w-12" />
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
        <div className="card-compact text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Activity size={20} className="text-red-500" />
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
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          GitHub Stars 总览
        </h1>
        <p className="text-sm text-gray-600">
          管理你的 GitHub 收藏，发现更多优秀项目
        </p>
      </div>

      {/* 主要统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-modern group">
          <div className="card-compact">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                <Star size={18} className="text-white" />
              </div>
              <TrendingUp size={16} className="text-gray-400 group-hover:text-yellow-500 transition-colors" />
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">总仓库数</h3>
            <div className="text-xl font-bold text-gray-800 dark:text-white">
              {stats?.totalRepos?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">持续增长中</div>
          </div>
        </div>

        <div className="card-modern group">
          <div className="card-compact">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                <Activity size={18} className="text-white" />
              </div>
              <TrendingUp size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">总 Star 数</h3>
            <div className="text-xl font-bold text-gray-800">
              {stats?.currentlyStarred?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">来自所有仓库</div>
          </div>
        </div>

        <div className="card-modern group">
          <div className="card-compact">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-lg flex items-center justify-center">
                <GitFork size={18} className="text-white" />
              </div>
              <TrendingUp size={16} className="text-gray-400 group-hover:text-green-500 transition-colors" />
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">总 Fork 数</h3>
            <div className="text-xl font-bold text-gray-800">
              {stats?.totalForks?.toLocaleString() || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">社区活跃度</div>
          </div>
        </div>

        <div className="card-modern group">
          <div className="card-compact">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
                <Users size={18} className="text-white" />
              </div>
              <Calendar size={16} className="text-gray-400 group-hover:text-purple-500 transition-colors" />
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">最后同步</h3>
            <div className="text-lg font-bold text-gray-800">
              {stats?.lastSyncAt ? new Date(stats.lastSyncAt).toLocaleDateString('zh-CN') : '未知'}
            </div>
            <div className="text-xs text-gray-500 mt-1">保持最新</div>
          </div>
        </div>
      </div>

      {/* 分类和语言统计 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-modern">
          <div className="card-compact">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <ListTree size={16} className="text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">分类统计</h2>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                共 {stats?.categories?.length || 0} 个分类
              </span>
            </div>
            <div className="space-y-3">
              {stats?.categories?.slice(0, 6).map((cat, index) => (
                <div key={cat.category} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-blue-500' :
                        index === 2 ? 'bg-green-500' :
                          index === 3 ? 'bg-purple-500' :
                            index === 4 ? 'bg-pink-500' : 'bg-gray-400'
                      }`} />
                    <span className="text-sm font-medium text-gray-700">
                      {cat.category || '未分类'}
                    </span>
                  </div>
                  <span className="badge-modern group-hover:scale-105 transition-transform">
                    {cat.count}
                  </span>
                </div>
              ))}

              {/* 显示更多分类的提示 */}
              {stats?.categories && stats.categories.length > 6 && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="text-center">
                    <span className="text-xs text-gray-500">
                      还有 {stats.categories.length - 6} 个分类未显示
                    </span>
                    <div className="text-xs text-blue-600 mt-1">
                      完整数据请查看仓库管理页面
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card-modern">
          <div className="card-compact">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Tag size={16} className="text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">语言统计</h2>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                共 {stats?.languages?.length || 0} 种语言
              </span>
            </div>
            <div className="space-y-3">
              {stats?.languages?.slice(0, 6).map((lang, index) => (
                <div key={lang.language} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-red-500' :
                      index === 1 ? 'bg-blue-500' :
                        index === 2 ? 'bg-yellow-500' :
                          index === 3 ? 'bg-green-500' :
                            index === 4 ? 'bg-purple-500' : 'bg-gray-400'
                      }`} />
                    <span className="text-sm font-medium text-gray-700">
                      {lang.language || '未知'}
                    </span>
                  </div>
                  <span className="badge-modern group-hover:scale-105 transition-transform">
                    {lang.count}
                  </span>
                </div>
              ))}

              {/* 显示更多语言的提示 */}
              {stats?.languages && stats.languages.length > 6 && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="text-center">
                    <span className="text-xs text-gray-500">
                      还有 {stats.languages.length - 6} 种语言未显示
                    </span>
                    <div className="text-xs text-blue-600 mt-1">
                      完整数据请查看仓库管理页面
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 