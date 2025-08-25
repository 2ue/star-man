import { RefreshCw, Rocket } from 'lucide-react'

export default function SyncPage() {
  return (
    <div className="card card-compact bg-base-100 shadow-sm">
      <div className="card-body">
        <h2 className="card-title text-base">同步 GitHub Stars</h2>
        <div className="flex items-center gap-2">
          <button className="btn btn-sm normal-case btn-primary"><RefreshCw size={14} />增量同步</button>
          <button className="btn btn-sm normal-case"><Rocket size={14} />全量同步</button>
        </div>
        <div className="text-xs opacity-70">联调 /api/sync 后生效</div>
      </div>
    </div>
  )
} 