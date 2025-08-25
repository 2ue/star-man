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
  const [historyPage, setHistoryPage] = useState(0)
  const [historyLimit, setHistoryLimit] = useState(10)
  const queryClient = useQueryClient()

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['sync-history', historyPage, historyLimit],
    queryFn: () => fetchSyncHistory(historyLimit, historyPage * historyLimit),
  })

  const syncMutation = useMutation({
    mutationFn: triggerSync,
    onSuccess: () => {
      // 同步成功后刷新相关数据
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['repos'] })
      queryClient.invalidateQueries({ queryKey: ['sync-history'] })
      setIsSyncing(false)
      // 重置到第一页
      setHistoryPage(0)
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

  const handleHistoryPageChange = (newPage: number) => {
    setHistoryPage(newPage)
  }

  const handleHistoryLimitChange = (newLimit: number) => {
    setHistoryLimit(newLimit)
    setHistoryPage(0) // 重置到第一页
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

              <div className="space-y-3">
                <label
                  className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-300 ${syncType === 'incremental'
                    ? 'border-2 border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/20'
                    : 'border-2 border-gray-200 bg-white hover:border-blue-300 hover:bg-purple-50/30'
                    }`}
                  onClick={() => setSyncType('incremental')}
                >
                  <div className="flex items-center justify-center">
                    <div className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${syncType === 'incremental'
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                      }`}>
                      {syncType === 'incremental' && (
                        <div className="w-full h-full rounded-full bg-white scale-75"></div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${syncType === 'incremental'
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg'
                      : 'bg-gradient-to-br from-blue-400 to-blue-600'
                      }`}>
                      <RefreshCw size={20} className="text-white" />
                    </div>
                    <div>
                      <div className={`font-semibold text-base transition-colors duration-300 ${syncType === 'incremental' ? 'text-blue-800' : 'text-gray-800'
                        }`}>
                        增量同步
                      </div>
                      <div className={`text-sm transition-colors duration-300 ${syncType === 'incremental' ? 'text-blue-600' : 'text-gray-600'
                        }`}>
                        只同步新增和变更的仓库
                      </div>
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all duration-300 ${syncType === 'full'
                    ? 'border-2 border-purple-500 bg-purple-50 shadow-lg shadow-purple-500/20'
                    : 'border-2 border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50/30'
                    }`}
                  onClick={() => setSyncType('full')}
                >
                  <div className="flex items-center justify-center">
                    <div className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${syncType === 'full'
                      ? 'border-purple-500 bg-purple-500'
                      : 'border-gray-300'
                      }`}>
                      {syncType === 'full' && (
                        <div className="w-full h-full rounded-full bg-white scale-75"></div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${syncType === 'full'
                      ? 'bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg'
                      : 'bg-gradient-to-br from-purple-400 to-purple-600'
                      }`}>
                      <Rocket size={20} className="text-white" />
                    </div>
                    <div>
                      <div className={`font-semibold text-base transition-colors duration-300 ${syncType === 'full' ? 'text-purple-800' : 'text-gray-800'
                        }`}>
                        全量同步
                      </div>
                      <div className={`text-sm transition-colors duration-300 ${syncType === 'full' ? 'text-purple-600' : 'text-gray-600'
                        }`}>
                        重新同步所有仓库数据
                      </div>
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <History size={16} className="text-white" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">同步历史</h2>
            </div>

            {/* 记录总数和每页数量选择 */}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>
                共 <span className="font-medium text-gray-800">{historyData?.total || 0}</span> 条记录
              </span>
              <div className="flex items-center gap-2">
                <span>每页</span>
                <select
                  className="w-20 px-2 py-1 text-sm border border-gray-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 appearance-none bg-no-repeat bg-right pr-8"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundSize: '1.5em 1.5em'
                  }}
                  value={historyLimit}
                  onChange={(e) => handleHistoryLimitChange(parseInt(e.target.value))}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span>条</span>
              </div>
            </div>
          </div>

          {historyLoading ? (
            <div className="space-y-3">
              {Array.from({ length: historyLimit }).map((_, i) => (
                <div key={i} className="skeleton h-20 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <>
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

              {/* 分页控件 */}
              {historyData?.data && historyData.data.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* 分页信息 */}
                    <div className="text-sm text-gray-600">
                      <span>
                        第 <span className="font-medium text-gray-800">{historyPage + 1}</span> 页，
                        显示 <span className="font-medium text-gray-800">
                          {historyPage * historyLimit + 1}
                        </span> - <span className="font-medium text-gray-800">
                          {Math.min((historyPage + 1) * historyLimit, historyData.total || 0)}
                        </span> / <span className="font-medium text-gray-800">{historyData.total || 0}</span>
                      </span>
                    </div>

                    {/* 分页控制 */}
                    <div className="flex items-center gap-2">
                      {/* 跳转到第一页 */}
                      <button
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={historyPage === 0}
                        onClick={() => handleHistoryPageChange(0)}
                        title="第一页"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                      </button>

                      {/* 上一页 */}
                      <button
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={historyPage === 0}
                        onClick={() => handleHistoryPageChange(historyPage - 1)}
                        title="上一页"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7" />
                        </svg>
                      </button>

                      {/* 页码显示 */}
                      <div className="flex items-center gap-1">
                        {(() => {
                          const totalPages = Math.ceil((historyData.total || 0) / historyLimit)
                          const maxVisiblePages = 5
                          const currentPage = historyPage + 1

                          let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                          let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

                          if (endPage - startPage + 1 < maxVisiblePages) {
                            startPage = Math.max(1, endPage - maxVisiblePages + 1)
                          }

                          const pages = []

                          // 第一页
                          if (startPage > 1) {
                            pages.push(
                              <button
                                key={1}
                                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
                                onClick={() => handleHistoryPageChange(0)}
                              >
                                1
                              </button>
                            )
                            if (startPage > 2) {
                              pages.push(
                                <span key="ellipsis1" className="px-2 py-2 text-gray-400">...</span>
                              )
                            }
                          }

                          // 中间页码
                          for (let i = startPage; i <= endPage; i++) {
                            pages.push(
                              <button
                                key={i}
                                className={`px-3 py-2 text-sm rounded-lg transition-all duration-200 ${i === currentPage
                                    ? 'bg-blue-500 text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                                  }`}
                                onClick={() => handleHistoryPageChange(i - 1)}
                              >
                                {i}
                              </button>
                            )
                          }

                          // 最后一页
                          if (endPage < totalPages) {
                            if (endPage < totalPages - 1) {
                              pages.push(
                                <span key="ellipsis2" className="px-2 py-2 text-gray-400">...</span>
                              )
                            }
                            pages.push(
                              <button
                                key={totalPages}
                                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
                                onClick={() => handleHistoryPageChange(totalPages - 1)}
                              >
                                {totalPages}
                              </button>
                            )
                          }

                          return pages
                        })()}
                      </div>

                      {/* 下一页 */}
                      <button
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={historyPage >= Math.ceil((historyData.total || 0) / historyLimit) - 1}
                        onClick={() => handleHistoryPageChange(historyPage + 1)}
                        title="下一页"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* 跳转到最后一页 */}
                      <button
                        className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={historyPage >= Math.ceil((historyData.total || 0) / historyLimit) - 1}
                        onClick={() => handleHistoryPageChange(Math.ceil((historyData.total || 0) / historyLimit) - 1)}
                        title="最后一页"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M6 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    {/* 快速跳转 */}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>跳转</span>
                      <input
                        type="number"
                        min={1}
                        max={Math.ceil((historyData.total || 0) / historyLimit)}
                        className="w-20 px-2 py-1 text-sm border border-gray-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 text-center"
                        placeholder="页码"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const page = parseInt(e.currentTarget.value)
                            if (page >= 1 && page <= Math.ceil((historyData.total || 0) / historyLimit)) {
                              handleHistoryPageChange(page - 1)
                              e.currentTarget.value = ''
                            }
                          }
                        }}
                      />
                      <span>页</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
} 