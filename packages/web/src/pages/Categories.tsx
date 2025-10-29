import { FolderOpen, TrendingUp, Layers, ExternalLink } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchCategoriesStats } from '../lib/api'
import { useNavigate } from '@tanstack/react-router'

export default function Categories() {
  const navigate = useNavigate()

  const { data: categoriesData, isLoading, error } = useQuery({
    queryKey: ['categories-stats'],
    queryFn: fetchCategoriesStats,
  })

  // 计算总仓库数
  const totalRepos = categoriesData?.reduce((sum, cat) => sum + cat.count, 0) || 0

  // 获取渐变色类名
  const getGradientClass = (index: number) => {
    const gradients = [
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600',
      'from-green-500 to-green-600',
      'from-orange-500 to-orange-600',
      'from-pink-500 to-pink-600',
      'from-teal-500 to-teal-600',
      'from-red-500 to-red-600',
      'from-indigo-500 to-indigo-600',
      'from-yellow-500 to-yellow-600',
      'from-cyan-500 to-cyan-600',
    ]
    return gradients[index % gradients.length]
  }

  if (error) {
    return (
      <div className="card-modern">
        <div className="card-compact text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Layers size={20} className="text-red-500" />
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
          仓库分类
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          按照项目类型浏览你的 GitHub Stars
        </p>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-modern">
          <div className="card-compact">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Layers size={16} className="text-white" />
              </div>
              <TrendingUp size={16} className="text-gray-400" />
            </div>
            <h3 className="text-xs font-medium text-gray-600 mb-1">分类总数</h3>
            <div className="text-xl font-bold text-gray-800">
              {categoriesData?.length || 0}
            </div>
          </div>
        </div>

        <div className="card-modern">
          <div className="card-compact">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
                <FolderOpen size={16} className="text-white" />
              </div>
              <TrendingUp size={16} className="text-gray-400" />
            </div>
            <h3 className="text-xs font-medium text-gray-600 mb-1">最大分类</h3>
            <div className="text-lg font-bold text-gray-800">
              {categoriesData?.[0]?.category || '-'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {categoriesData?.[0]?.count || 0} 个仓库
            </div>
          </div>
        </div>

        <div className="card-modern">
          <div className="card-compact">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                <TrendingUp size={16} className="text-white" />
              </div>
              <Layers size={16} className="text-gray-400" />
            </div>
            <h3 className="text-xs font-medium text-gray-600 mb-1">平均分布</h3>
            <div className="text-xl font-bold text-gray-800">
              {categoriesData && categoriesData.length > 0
                ? Math.round((totalRepos / categoriesData.length) * 10) / 10
                : 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">每个分类</div>
          </div>
        </div>
      </div>

      {/* 分类卡片网格 */}
      <div className="grid-responsive">
        {isLoading ? (
          // 加载状态
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card-modern animate-pulse">
              <div className="card-compact">
                <div className="skeleton h-8 w-8 rounded-lg mb-3" />
                <div className="skeleton h-4 w-2/3 mb-2" />
                <div className="skeleton h-6 w-1/3 mb-1" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ))
        ) : categoriesData && categoriesData.length > 0 ? (
          categoriesData.map((category, index) => {
            const percentage = totalRepos > 0 ? (category.count / totalRepos) * 100 : 0
            return (
              <div
                key={category.category}
                className="card-modern hover-lift cursor-pointer group"
                onClick={() => navigate({ to: '/repos', search: { category: category.category } })}
              >
                <div className="card-compact">
                  {/* 图标 */}
                  <div className={`w-10 h-10 bg-gradient-to-br ${getGradientClass(index)} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <FolderOpen size={20} className="text-white" />
                  </div>

                  {/* 分类名称 */}
                  <h3 className="text-base font-semibold text-gray-800 mb-2 line-clamp-1">
                    {category.category || '未分类'}
                  </h3>

                  {/* 仓库数量 */}
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold text-gray-800">
                      {category.count}
                    </span>
                    <span className="text-xs text-gray-500">个仓库</span>
                  </div>

                  {/* 百分比进度条 */}
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-2">
                    <div
                      className={`bg-gradient-to-r ${getGradientClass(index)} h-2 rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  {/* 占比文字 */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      占比 {percentage.toFixed(1)}%
                    </span>
                    <ExternalLink size={12} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="col-span-full card-modern">
            <div className="card-compact text-center py-12">
              <Layers size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600">暂无分类数据</p>
            </div>
          </div>
        )}
      </div>

      {/* 分类列表（详细视图） */}
      <div className="card-modern">
        <div className="card-compact">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Layers size={16} className="text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">所有分类</h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              点击分类查看相关仓库
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between animate-pulse">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-6 w-12" />
                </div>
              ))}
            </div>
          ) : categoriesData && categoriesData.length > 0 ? (
            <div className="space-y-2">
              {categoriesData.map((category, index) => {
                const percentage = totalRepos > 0 ? (category.count / totalRepos) * 100 : 0
                return (
                  <div
                    key={category.category}
                    className="flex items-center justify-between group cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors"
                    onClick={() => navigate({ to: '/repos', search: { category: category.category } })}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${getGradientClass(index)}`} />
                      <span className="text-sm font-medium text-gray-700">
                        {category.category || '未分类'}
                      </span>
                      <div className="flex-1 max-w-xs">
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`bg-gradient-to-r ${getGradientClass(index)} h-1.5 rounded-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">
                        {percentage.toFixed(1)}%
                      </span>
                      <span className="badge-modern group-hover:scale-105 transition-transform">
                        {category.count}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Layers size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600">暂无分类数据</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
