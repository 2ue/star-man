import { Activity, ListTree } from 'lucide-react'

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="card card-compact bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex items-center gap-2">
            <Activity size={16} />
            <h2 className="card-title text-base">统计总览</h2>
          </div>
          <div className="text-sm opacity-70">Star、语言与分类分布</div>
        </div>
      </div>
      <div className="card card-compact md:col-span-2 bg-base-100 shadow-sm">
        <div className="card-body">
          <div className="flex items-center gap-2">
            <ListTree size={16} />
            <h2 className="card-title text-base">最近活动</h2>
          </div>
          <div className="text-sm opacity-70">待接入 /api/stats</div>
        </div>
      </div>
    </div>
  )
} 