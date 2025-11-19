import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Github, Star, GitFork, Tag, Calendar, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import { fetchRepoById, aiClassifyRepo, updateRepoTags, updateRepoCategory } from '../lib/api'
import type { Repo } from '../types/api'

export default function RepoDetailPage() {
  const { repoId } = useParams({ from: '/repos/$repoId' }) as { repoId: string }
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const id = Number(repoId)

  const [applyStatus, setApplyStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const { data: repo, isLoading, error } = useQuery<Repo>({
    queryKey: ['repo', id],
    queryFn: () => fetchRepoById(id),
    enabled: Number.isFinite(id),
  })

  const classifyMutation = useMutation({
    mutationFn: () => aiClassifyRepo(id),
  })

  const applyMutation = useMutation({
    mutationFn: async () => {
      const result = classifyMutation.data?.data
      if (!result) {
        throw new Error('暂无可应用的 AI 建议，请先生成 AI 总结')
      }
      await Promise.all([
        updateRepoTags(id, result.tags),
        updateRepoCategory(id, result.category),
      ])
    },
    onSuccess: async () => {
      setApplyStatus('success')
      // 刷新列表和详情缓存
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['repos'] }),
        queryClient.invalidateQueries({ queryKey: ['repo', id] }),
      ])
      setTimeout(() => setApplyStatus('idle'), 2500)
    },
    onError: () => {
      setApplyStatus('error')
      setTimeout(() => setApplyStatus('idle'), 3000)
    },
  })

  const handleGenerateAI = async () => {
    setApplyStatus('idle')
    try {
      await classifyMutation.mutateAsync()
    } catch (err) {
      console.error('AI 仓库分析失败:', err)
    }
  }

  const handleApplyAI = async () => {
    try {
      await applyMutation.mutateAsync()
    } catch (err) {
      console.error('应用 AI 标签/分类失败:', err)
    }
  }

  const aiData = classifyMutation.data?.data

  const renderTags = (tags: string[] | undefined) => {
    if (!tags || tags.length === 0) return <span className="text-xs text-gray-400">暂无标签</span>
    return (
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-teal-50 text-teal-700 border border-teal-200"
          >
            <Tag size={11} className="mr-1 text-teal-500" />
            {tag}
          </span>
        ))}
      </div>
    )
  }

  const renderTopics = (topics: string[] | undefined) => {
    if (!topics || topics.length === 0) return null
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {topics.map((topic) => (
          <span
            key={topic}
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200"
          >
            #{topic}
          </span>
        ))}
      </div>
    )
  }

  if (!Number.isFinite(id)) {
    return (
      <div className="card-modern">
        <div className="card-compact text-sm text-red-600 flex items-center gap-2">
          <AlertCircle size={16} />
          无效的仓库 ID
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="card-modern">
        <div className="card-compact flex items-center justify-center gap-2 text-sm text-gray-600">
          <Loader2 size={16} className="animate-spin" />
          正在加载仓库详情...
        </div>
      </div>
    )
  }

  if (error || !repo) {
    return (
      <div className="card-modern">
        <div className="card-compact flex flex-col gap-2 text-sm text-red-600">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>加载仓库详情失败</span>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-xs w-fit"
            onClick={() => navigate({ to: '/repos' })}
          >
            <ArrowLeft size={14} className="mr-1" />
            返回仓库列表
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-slide-in-up">
      {/* 顶部返回 + 标题 */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-ghost btn-xs px-2"
            onClick={() => navigate({ to: '/repos' })}
          >
            <ArrowLeft size={14} className="mr-1" />
            返回
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-800">{repo.name}</h1>
              <a
                href={repo.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <Github size={13} />
                查看 GitHub
              </a>
            </div>
            <p className="text-xs text-gray-500">{repo.fullName}</p>
          </div>
        </div>
      </div>

      {/* 基本信息 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-modern">
          <div className="card-compact">
            <h3 className="text-xs font-medium text-gray-500 mb-2">基本信息</h3>
            {repo.description && (
              <p className="text-sm text-gray-700 mb-2">{repo.description}</p>
            )}
            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
              {repo.language && (
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {repo.language}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Star size={13} className="text-amber-400 fill-amber-400" />
                {repo.stargazersCount.toLocaleString()} Stars
              </span>
              <span className="inline-flex items-center gap-1">
                <GitFork size={13} className="text-gray-400" />
                {repo.forksCount.toLocaleString()} Forks
              </span>
            </div>
            <div className="mt-2 flex flex-col gap-1 text-xs text-gray-500">
              <div className="inline-flex items-center gap-1">
                <Calendar size={12} />
                创建于 {new Date(repo.createdAt).toLocaleDateString()}
              </div>
              <div className="inline-flex items-center gap-1">
                <Calendar size={12} />
                更新于 {new Date(repo.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        <div className="card-modern">
          <div className="card-compact">
            <h3 className="text-xs font-medium text-gray-500 mb-2">当前分类与标签</h3>
            <div className="mb-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                分类：{repo.category || '未分类'}
              </span>
            </div>
            <div>{renderTags(repo.tags)}</div>
            {renderTopics(repo.topics)}
          </div>
        </div>

        <div className="card-modern">
          <div className="card-compact">
            <h3 className="text-xs font-medium text-gray-500 mb-2">AI 操作</h3>
            <p className="text-xs text-gray-600 mb-3">
              使用 AI 对此仓库进行一次性的智能分析，生成摘要、推荐分类和标签。确认后可一键应用到当前仓库。
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="btn btn-primary btn-sm flex items-center gap-2"
                onClick={handleGenerateAI}
                disabled={classifyMutation.isPending}
              >
                {classifyMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    生成 AI 总结中...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    生成 AI 总结
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn btn-outline btn-sm flex items-center gap-2"
                onClick={handleApplyAI}
                disabled={!aiData || applyMutation.isPending}
              >
                {applyMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    应用中...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    将 AI 推荐结果应用为标签与分类
                  </>
                )}
              </button>

              {applyStatus === 'success' && (
                <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
                  <CheckCircle2 size={14} />
                  已成功更新此仓库的分类与标签
                </div>
              )}

              {applyStatus === 'error' && (
                <div className="flex items-center gap-1 text-xs text-red-600 mt-1">
                  <AlertCircle size={14} />
                  应用 AI 结果失败，请稍后重试
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI 结果展示 */}
      {aiData && (
        <div className="card-modern">
          <div className="card-compact space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white">
                <Sparkles size={14} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">AI 分析结果</h3>
                <p className="text-xs text-gray-500">以下内容由 AI 基于仓库信息生成，你可以按需手动调整。</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">推荐分类</div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200">
                  {aiData.category || '未分类'}
                </span>
              </div>
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">推荐标签</div>
                {renderTags(aiData.tags)}
              </div>
            </div>

            {aiData.summary && (
              <div className="mt-2">
                <div className="text-xs font-medium text-gray-500 mb-1">AI 摘要</div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {aiData.summary}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

