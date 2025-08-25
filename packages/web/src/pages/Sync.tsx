import { RefreshCw, Rocket, History, CheckCircle, XCircle, Clock, Play, Pause, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { triggerSync, fetchSyncHistory } from '../lib/api'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

// 设置dayjs中文语言包
dayjs.locale('zh-cn')

export default function SyncPage() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncType, setSyncType] = useState<'incremental' | 'full'>('incremental')
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

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await syncMutation.mutateAsync(syncType === 'incremental')
    } catch (error) {
      console.error('同步失败:', error)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = dayjs(dateString)
      if (!date.isValid()) {
        return '时间未知'
      }
      return date.format('YYYY-MM-DD HH:mm')
    } catch (error) {
      return '时间未知'
    }
  }

  const getStatusColor = (success: boolean) => {
    return success
      ? 'text-green-600 bg-green-100'
      : 'text-red-600 bg-red-100'
  }

  const getStatusText = (success: boolean) => {
    return success ? '成功' : '失败'
  }

  const getTypeText = (record: any) => {
    // 根据记录信息推断同步类型，这里简单判断
    // 如果新增数量较多，可能是全量同步
    return record.added > 5 ? '全量' : '增量'
  }

  const getTypeColor = (type: string) => {
    return type === '增量'
      ? 'text-blue-600 bg-blue-100'
      : 'text-purple-600 bg-purple-100'
  }

  return (
    <div className="space-y-4 animate-slide-in-up">
      {/* 页面标题 */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          同步管理
        </h1>
        <p className="text-sm text-gray-600">
          保持你的 GitHub Stars 数据最新
        </p>
      </div>

      {/* 同步操作控制 */}
      <div className="card-modern">
        <div className="card-compact">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
              <RefreshCw size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">GitHub Stars 同步</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 同步类型选择 */}
            <div className="space-y-3">
              <h3 className="text-base font-medium text-gray-700 mb-3">选择同步类型</h3>

              <div className="space-y-2">
                <label className="flex items-center gap-2 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                  <input
                    type="radio"
                    name="syncType"
                    value="incremental"
                    checked={syncType === 'incremental'}
                    onChange={(e) => setSyncType(e.target.value as 'incremental' | 'full')}
                    className="radio radio-primary radio-sm"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
                      <RefreshCw size={16} className="text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-800">增量同步</div>
                      <div className="text-xs text-gray-600">只同步新增和变更的仓库</div>
                    </div>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-purple-300 transition-colors">
                  <input
                    type="radio"
                    name="syncType"
                    value="full"
                    checked={syncType === 'full'}
                    onChange={(e) => setSyncType(e.target.value as 'incremental' | 'full')}
                    className="radio radio-primary radio-sm"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center">
                      <Rocket size={16} className="text-white" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-gray-800">全量同步</div>
                      <div className="text-xs text-gray-600">重新同步所有仓库数据</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* 同步状态和控制 */}
            <div className="space-y-3">
              <h3 className="text-base font-medium text-gray-700 mb-3">同步控制</h3>

              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="mb-3">
                  {isSyncing ? (
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <RefreshCw size={20} className="text-blue-600 animate-spin" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <CheckCircle size={20} className="text-green-600" />
                    </div>
                  )}

                  <h4 className="text-base font-medium text-gray-800 mb-1">
                    {isSyncing ? '正在同步中...' : '准备就绪'}
                  </h4>
                  <p className="text-xs text-gray-600">
                    {isSyncing
                      ? `正在执行${syncType === 'incremental' ? '增量' : '全量'}同步`
                      : '点击按钮开始同步'
                    }
                  </p>
                </div>

                <button
                  className={`btn w-full ${isSyncing
                    ? 'btn-disabled'
                    : 'btn-gradient-primary'
                    }`}
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? (
                    <>
                      <Pause size={14} className="mr-1" />
                      同步中...
                    </>
                  ) : (
                    <>
                      <Play size={14} className="mr-1" />
                      开始同步
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 同步历史记录 */}
      <div className="card-modern">
        <div className="card-compact">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
              <History size={16} className="text-white" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">同步历史</h2>
          </div>

          {historyLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {historyData?.data && historyData.data.length > 0 ? (
                historyData.data.map((record) => (
                  <div key={record.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.success)}`}>
                          {record.success ? (
                            <CheckCircle size={10} className="inline mr-1" />
                          ) : (
                            <XCircle size={10} className="inline mr-1" />
                          )}
                          {getStatusText(record.success)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(getTypeText(record))}`}>
                          {getTypeText(record)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(record.syncAt)}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="text-center p-2 bg-green-50 rounded-lg">
                        <div className="text-base font-bold text-green-600">{record.added}</div>
                        <div className="text-xs text-green-600">新增</div>
                      </div>
                      <div className="text-center p-2 bg-yellow-50 rounded-lg">
                        <div className="text-base font-bold text-yellow-600">{record.unstarred}</div>
                        <div className="text-xs text-yellow-600">取消</div>
                      </div>
                      <div className="text-center p-2 bg-blue-50 rounded-lg">
                        <div className="text-base font-bold text-blue-600">{record.total}</div>
                        <div className="text-xs text-blue-600">总计</div>
                      </div>
                    </div>

                    {record.errorMessage && (
                      <div className="flex items-center gap-2 p-2 bg-red-50 text-red-600 rounded-lg">
                        <AlertCircle size={14} />
                        <span className="text-xs">错误: {record.errorMessage}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <History size={20} className="text-gray-400" />
                  </div>
                  <h3 className="text-base font-medium text-gray-600 mb-1">暂无同步记录</h3>
                  <p className="text-xs text-gray-500">开始第一次同步后，这里会显示历史记录</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 