import { RefreshCw, Rocket, History, CheckCircle, XCircle, Clock } from 'lucide-react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { triggerSync, fetchSyncHistory } from '../lib/api'

export default function SyncPage() {
  const [isSyncing, setIsSyncing] = useState(false)
  const queryClient = useQueryClient()

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['sync-history'],
    queryFn: () => fetchSyncHistory(10),
  })

  const syncMutation = useMutation({
    mutationFn: triggerSync,
    onSuccess: () => {
      // 同步成功后刷新相关数据
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['repos'] })
      queryClient.invalidateQueries({ queryKey: ['sync-history'] })
      setIsSyncing(false)
    },
    onError: () => {
      setIsSyncing(false)
    },
  })

  const handleSync = async (incremental: boolean) => {
    setIsSyncing(true)
    try {
      await syncMutation.mutateAsync(incremental)
    } catch (error) {
      console.error('同步失败:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-3">
      {/* 同步操作 */}
      <div className="card card-compact bg-base-100 shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-base">同步 GitHub Stars</h2>
          <div className="flex items-center gap-2">
            <button
              className="btn btn-sm normal-case btn-primary"
              onClick={() => handleSync(true)}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              增量同步
            </button>
            <button
              className="btn btn-sm normal-case"
              onClick={() => handleSync(false)}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Rocket size={14} className="animate-spin" />
              ) : (
                <Rocket size={14} />
              )}
              全量同步
            </button>
          </div>
          <div className="text-xs opacity-70">
            {isSyncing ? '正在同步中...' : '点击按钮开始同步 GitHub Stars'}
          </div>
        </div>
      </div>

      {/* 同步历史 */}
      <div className="card card-compact bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex items-center gap-2">
            <History size={16} />
            <h2 className="card-title text-base">同步历史</h2>
          </div>

          {historyLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {historyData?.data && historyData.data.length > 0 ? (
                historyData.data.map((record) => (
                  <div key={record.id} className="border border-base-300 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`badge badge-sm ${record.status === 'success' ? 'badge-success' : 'badge-error'
                          }`}>
                          {record.status === 'success' ? (
                            <CheckCircle size={12} />
                          ) : (
                            <XCircle size={12} />
                          )}
                          {record.status === 'success' ? '成功' : '失败'}
                        </span>
                        <span className="badge badge-outline badge-sm">
                          {record.type === 'incremental' ? '增量' : '全量'}
                        </span>
                      </div>
                      <div className="text-xs text-base-content/60">
                        <Clock size={12} className="inline mr-1" />
                        {formatDate(record.completedAt)}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-success">{record.added}</div>
                        <div className="text-xs text-base-content/60">新增</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-warning">{record.unstarred}</div>
                        <div className="text-xs text-base-content/60">取消</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">{record.total}</div>
                        <div className="text-xs text-base-content/60">总计</div>
                      </div>
                    </div>

                    {record.error && (
                      <div className="mt-2 p-2 bg-error/10 text-error text-xs rounded">
                        错误: {record.error}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-base-content/60">
                  暂无同步记录
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 