import { Filter, Search, SlidersHorizontal } from 'lucide-react'

export default function Repos() {
  return (
    <div className="flex flex-col gap-3">
      <div className="card card-compact bg-base-100 shadow-sm">
        <div className="card-body gap-2">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} />
            <h2 className="card-title text-base">筛选</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input className="input input-sm input-bordered" placeholder="搜索关键词" />
            <input className="input input-sm input-bordered" placeholder="语言" />
            <input className="input input-sm input-bordered" placeholder="分类" />
            <input className="input input-sm input-bordered" placeholder="标签(,分隔)" />
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-sm normal-case btn-primary"><Search size={14} />查询</button>
            <button className="btn btn-sm normal-case"><Filter size={14} />重置</button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card card-compact bg-base-100 shadow-sm">
            <div className="card-body">
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 