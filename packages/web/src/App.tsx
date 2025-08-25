import { Menu } from 'lucide-react'
import { Outlet, Link } from '@tanstack/react-router'

export default function App() {
  return (
    <div data-theme="compact" className="min-h-screen bg-base-200 text-base-content">
      <div className="drawer lg:drawer-open">
        <input id="app-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex flex-col">
          <div className="navbar bg-base-100 border-b border-base-300/60 h-12 min-h-12 px-3">
            <div className="flex items-center gap-2">
              <label htmlFor="app-drawer" className="btn btn-ghost btn-xs lg:hidden">
                <Menu size={16} />
              </label>
              <span className="font-semibold tracking-tight">Star‑Man</span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <button className="btn btn-ghost btn-xs">主题</button>
            </div>
          </div>
          <main className="container-tight py-3">
            <Outlet />
          </main>
        </div>
        <aside className="drawer-side">
          <label htmlFor="app-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
          <ul className="menu menu-xs p-2 w-64 min-h-full bg-base-100 border-r border-base-300/60">
            <li className="menu-title">导航</li>
            <li><Link to="/">总览</Link></li>
            <li><Link to="/repos">仓库</Link></li>
            <li><Link to="/sync">同步</Link></li>
          </ul>
        </aside>
      </div>
    </div>
  )
}
