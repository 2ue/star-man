export interface PaginationProps {
  // 分页数据
  total: number
  limit: number
  offset: number
  // 分页控制
  onPageChange: (newOffset: number) => void
  onLimitChange: (newLimit: number) => void
  // 自定义配置
  limitOptions?: number[]
  showInfo?: boolean
  showQuickJump?: boolean
  className?: string
}

export default function Pagination({
  total,
  limit,
  offset,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 20, 50, 100],
  showInfo = true,
  showQuickJump = true,
  className = ''
}: PaginationProps) {
  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(total / limit)

  const handlePageChange = (newPage: number) => {
    onPageChange((newPage - 1) * limit)
  }

  const handleLimitChange = (newLimit: number) => {
    onLimitChange(newLimit)
  }

  // 如果没有数据，不显示分页
  if (total === 0) {
    return null
  }

  return (
    <div className={`card-modern ${className}`}>
      <div className="card-compact">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* 分页信息 */}
          {showInfo && (
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>
                <span className="font-medium text-gray-800">
                  {offset + 1}
                </span> - <span className="font-medium text-gray-800">
                  {Math.min(offset + limit, total)}
                </span> / <span className="font-medium text-gray-800">{total}</span>
              </span>

              {/* 每页数量选择 */}
              <div className="flex items-center gap-2">
                <span>每页</span>
                <select
                  className="w-20 px-2 py-1 text-sm border border-gray-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 appearance-none bg-no-repeat bg-right pr-8"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundSize: '1.5em 1.5em'
                  }}
                  value={limit}
                  onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                >
                  {limitOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                <span>条</span>
              </div>
            </div>
          )}

          {/* 分页控制 */}
          <div className="flex items-center gap-2">
            {/* 跳转到第一页 */}
            <button
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={offset === 0}
              onClick={() => handlePageChange(1)}
              title="第一页"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>

            {/* 上一页 */}
            <button
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={offset === 0}
              onClick={() => handlePageChange(currentPage - 1)}
              title="上一页"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7" />
              </svg>
            </button>

            {/* 页码显示 */}
            <div className="flex items-center gap-1">
              {(() => {
                const maxVisiblePages = 5

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
                      onClick={() => handlePageChange(1)}
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
                      onClick={() => handlePageChange(i)}
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
                      onClick={() => handlePageChange(totalPages)}
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
              disabled={offset + limit >= total}
              onClick={() => handlePageChange(currentPage + 1)}
              title="下一页"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* 跳转到最后一页 */}
            <button
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={offset + limit >= total}
              onClick={() => handlePageChange(totalPages)}
              title="最后一页"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M6 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* 快速跳转 */}
          {showQuickJump && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>跳转</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                className="w-20 px-2 py-1 text-sm border border-gray-200 rounded-md bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200 text-center"
                placeholder="页码"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const page = parseInt(e.currentTarget.value)
                    if (page >= 1 && page <= totalPages) {
                      handlePageChange(page)
                      e.currentTarget.value = ''
                    }
                  }
                }}
              />
              <span>页</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 