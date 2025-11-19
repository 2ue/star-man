import { Sparkles, Search, Github, Star, AlertCircle, Loader2, Globe, Layers } from 'lucide-react'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { aiSearch } from '../lib/api'
import type { AISearchResultItem } from '../types/api'

type AIScope = 'starred' | 'github' | 'both'

export default function AISearchPage() {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<AIScope>('starred')
  const [limit, setLimit] = useState(20)

  const searchMutation = useMutation({
    mutationFn: aiSearch,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    try {
      await searchMutation.mutateAsync({
        query: query.trim(),
        scope,
        limit,
      })
    } catch (error) {
      console.error('AI 搜索失败:', error)
    }
  }

  const results: AISearchResultItem[] =
    searchMutation.data?.data?.results ?? []

  const isLoading = searchMutation.isPending
  const error = searchMutation.isError ? (searchMutation.error as any) : null

  const renderReliabilityBadge = (reliability: AISearchResultItem['reliability']) => {
    const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium'
    switch (reliability) {
      case 'high':
        return <span className={`${base} bg-emerald-50 text-emerald-700 border border-emerald-200`}>可靠性高</span>
      case 'low':
        return <span className={`${base} bg-red-50 text-red-700 border border-red-200`}>可靠性较低</span>
      default:
        return <span className={`${base} bg-amber-50 text-amber-700 border border-amber-200`}>可靠性中等</span>
    }
  }

  const renderSourceBadge = (item: AISearchResultItem) => {
    const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium'
    if (item.source === 'starred' || item.isStarred) {
      return (
        <span className={`${base} bg-blue-50 text-blue-700 border border-blue-200`}>
          <Star size={11} className="fill-blue-500 text-blue-500" />
          已收藏
        </span>
      )
    }
    if (item.source === 'github') {
      return (
        <span className={`${base} bg-slate-50 text-slate-700 border border-slate-200`}>
          <Github size={11} className="text-slate-500" />
          全网
        </span>
      )
    }
    return null
  }

  const handleScopeChange = (next: AIScope) => {
    setScope(next)
  }

  return (
    <div className="space-y-4 animate-slide-in-up">
      {/* 页面标题 */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white shadow-md shadow-purple-500/30">
              <Sparkles size={18} />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              AI 语义搜索
            </h1>
          </div>
          <p className="text-sm text-gray-600 max-w-2xl">
            用自然语言在你的 Star 仓库或 GitHub 全网中搜索项目，AI 会帮你做相关性排序、可靠性评估和推荐理由整理。
          </p>
        </div>
      </div>

      {/* 查询表单 */}
      <div className="card-modern mb-2">
        <div className="card-compact">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    className="input input-bordered w-full pl-9 pr-3 h-10 text-sm"
                    placeholder="例如：想系统学 Rust / 想找一些 LLM 应用最佳实践 / 前端状态管理方案对比"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="btn btn-primary btn-sm h-10 px-4 flex items-center gap-2 min-w-[90px]"
                  disabled={isLoading || !query.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-sm">分析中...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span className="text-sm">AI 搜索</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500">搜索范围：</span>
                <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
                  <button
                    type="button"
                    onClick={() => handleScopeChange('starred')}
                    className={`px-2 py-1 text-[11px] rounded-md flex items-center gap-1 ${
                      scope === 'starred'
                        ? 'bg-white shadow-sm text-blue-700'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Star size={11} className={scope === 'starred' ? 'text-blue-500' : 'text-gray-400'} />
                    我的 Star
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScopeChange('github')}
                    className={`px-2 py-1 text-[11px] rounded-md flex items-center gap-1 ${
                      scope === 'github'
                        ? 'bg-white shadow-sm text-blue-700'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Globe size={11} className={scope === 'github' ? 'text-blue-500' : 'text-gray-400'} />
                    GitHub 全网
                  </button>
                  <button
                    type="button"
                    onClick={() => handleScopeChange('both')}
                    className={`px-2 py-1 text-[11px] rounded-md flex items-center gap-1 ${
                      scope === 'both'
                        ? 'bg-white shadow-sm text-blue-700'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    <Layers size={11} className={scope === 'both' ? 'text-blue-500' : 'text-gray-400'} />
                    综合
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  最多返回：
                </span>
                <select
                  className="select select-bordered select-xs h-8 text-xs"
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value) || 20)}
                >
                  <option value={10}>10 个</option>
                  <option value={20}>20 个</option>
                  <option value={30}>30 个</option>
                </select>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="card-modern">
          <div className="card-compact flex items-start gap-3 text-sm text-red-700">
            <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
              <AlertCircle size={14} className="text-red-500" />
            </div>
            <div>
              <p className="font-medium mb-1">AI 搜索失败</p>
              <p className="text-xs text-red-600">
                {(searchMutation.data && !searchMutation.data.success && searchMutation.data.error) ||
                  error?.message ||
                  '请检查后端服务是否已启动，以及 AI 环境变量配置是否正确。'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 结果列表 */}
      <div className="space-y-3">
        {isLoading && (
          <div className="card-modern">
            <div className="card-compact flex items-center justify-center gap-2 text-sm text-gray-600">
              <Loader2 size={16} className="animate-spin" />
              <span>AI 正在分析你的仓库和搜索结果，请稍候...</span>
            </div>
          </div>
        )}

        {!isLoading && results.length === 0 && !error && (
          <div className="card-modern">
            <div className="card-compact text-center text-sm text-gray-500">
              <p className="mb-2">输入一个问题，点击「AI 搜索」开始体验。</p>
              <p>例如：「想找一些高质量的系统设计仓库」或「帮我找几份 Rust 的入门教程」。</p>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>为你找到 {results.length} 个相关仓库（已按相关性和可靠性排序）</span>
              <span>
                来源：
                {scope === 'starred'
                  ? '仅我的 Star 仓库'
                  : scope === 'github'
                    ? 'GitHub 全网搜索'
                    : '我的 Star + GitHub 全网'}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {results.map((item) => (
                <div
                  key={item.fullName}
                  className="card-modern hover:shadow-md hover:shadow-blue-500/10 transition-shadow duration-200"
                >
                  <div className="card-compact">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <a
                            href={item.htmlUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-semibold text-gray-800 hover:text-blue-600 truncate flex items-center gap-1"
                          >
                            {item.name}
                            <span className="text-[11px] text-gray-400 font-normal">
                              ({item.fullName})
                            </span>
                          </a>
                        </div>
                        {item.description && (
                          <p className="text-xs text-gray-600 line-clamp-2 mb-1">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-2">
                          {renderReliabilityBadge(item.reliability)}
                          {renderSourceBadge(item)}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          相关性评分：{Math.round(item.score * 100)}%
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      {item.language && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {item.language}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                        <Star size={11} className="text-amber-400 fill-amber-400" />
                        {item.stars.toLocaleString()} stars
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                        <Github size={11} className="text-gray-400" />
                        {item.forks.toLocaleString()} forks
                      </span>
                      <a
                        href={item.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700"
                      >
                        查看 GitHub
                        <span className="i-lucide-external-link text-[11px]" />
                      </a>
                    </div>

                    {item.reason && (
                      <div className="mt-1 border-t border-dashed border-gray-200 pt-2">
                        <p className="text-xs text-gray-700">
                          <span className="font-medium text-gray-600 mr-1">AI 推荐理由：</span>
                          {item.reason}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

