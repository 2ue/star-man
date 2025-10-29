import { Cloud, Tag, TrendingUp, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { fetchTagsStats } from '../lib/api'
import { useNavigate } from '@tanstack/react-router'
import ReactWordcloud from 'react-wordcloud'
import 'tippy.js/dist/tippy.css'
import 'tippy.js/animations/scale.css'

export default function TagsCloud() {
  const navigate = useNavigate()

  const { data: tagsData, isLoading, error } = useQuery({
    queryKey: ['tags-stats'],
    queryFn: fetchTagsStats,
  })

  // 转换数据格式为 react-wordcloud 需要的格式
  const words = tagsData?.map(tag => ({
    text: tag.tag,
    value: tag.count
  })) || []

  // 词云配置
  const options = {
    rotations: 2,
    rotationAngles: [0, 0] as [number, number],
    fontSizes: [14, 60] as [number, number],
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontWeight: '600',
    padding: 2,
    scale: 'sqrt' as const,
    spiral: 'rectangular' as const,
    transitionDuration: 1000,
    enableTooltip: true,
    deterministic: true,
  }

  // 词云回调
  const callbacks = {
    onWordClick: (word: { text: string; value: number }) => {
      // 点击标签跳转到仓库页面并筛选
      navigate({
        to: '/repos',
        search: { tags: word.text }
      })
    },
    getWordTooltip: (word: { text: string; value: number }) =>
      `${word.text}: ${word.value} 个仓库`,
  }

  if (error) {
    return (
      <div className="card-modern">
        <div className="card-compact text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Cloud size={20} className="text-red-500" />
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
          标签词云
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          可视化展示所有标签的使用频率，点击标签可跳转查看相关仓库
        </p>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-modern">
          <div className="card-compact">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Tag size={16} className="text-white" />
              </div>
              <TrendingUp size={16} className="text-gray-400" />
            </div>
            <h3 className="text-xs font-medium text-gray-600 mb-1">标签总数</h3>
            <div className="text-xl font-bold text-gray-800">
              {tagsData?.length || 0}
            </div>
          </div>
        </div>

        <div className="card-modern">
          <div className="card-compact">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
                <TrendingUp size={16} className="text-white" />
              </div>
              <Tag size={16} className="text-gray-400" />
            </div>
            <h3 className="text-xs font-medium text-gray-600 mb-1">最热门标签</h3>
            <div className="text-lg font-bold text-gray-800">
              {tagsData?.[0]?.tag || '-'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {tagsData?.[0]?.count || 0} 个仓库
            </div>
          </div>
        </div>

        <div className="card-modern">
          <div className="card-compact">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                <Cloud size={16} className="text-white" />
              </div>
              <TrendingUp size={16} className="text-gray-400" />
            </div>
            <h3 className="text-xs font-medium text-gray-600 mb-1">标签覆盖</h3>
            <div className="text-xl font-bold text-gray-800">
              {tagsData ? Math.round((tagsData.reduce((sum, t) => sum + t.count, 0) / tagsData.length) * 10) / 10 : 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">平均每标签</div>
          </div>
        </div>
      </div>

      {/* 词云区域 */}
      <div className="card-modern">
        <div className="card-compact">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Cloud size={16} className="text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">标签词云</h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              点击标签查看相关仓库
            </span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 size={32} className="text-blue-500 animate-spin mb-3" />
              <p className="text-sm text-gray-600">加载标签数据中...</p>
            </div>
          ) : words.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Cloud size={48} className="text-gray-300 mb-3" />
              <p className="text-sm text-gray-600">暂无标签数据</p>
            </div>
          ) : (
            <div className="w-full" style={{ height: '500px' }}>
              <ReactWordcloud
                words={words}
                options={options}
                callbacks={callbacks}
              />
            </div>
          )}
        </div>
      </div>

      {/* 热门标签列表 */}
      <div className="card-modern">
        <div className="card-compact">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <TrendingUp size={16} className="text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">热门标签 Top 20</h2>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between animate-pulse">
                  <div className="skeleton h-4 w-1/3" />
                  <div className="skeleton h-6 w-12" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tagsData?.slice(0, 20).map((tag, index) => (
                <div
                  key={tag.tag}
                  className="flex items-center justify-between group cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  onClick={() => navigate({ to: '/repos', search: { tags: tag.tag } })}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-50 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700 border border-teal-200 flex items-center gap-1">
                      <Tag size={10} />
                      {tag.tag}
                    </span>
                  </div>
                  <span className="badge-modern group-hover:scale-105 transition-transform">
                    {tag.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
