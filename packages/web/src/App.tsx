import { Menu, Settings, ChevronLeft, ChevronRight } from 'lucide-react'
import { Outlet, Link, useLocation } from '@tanstack/react-router'
import { useState } from 'react'

export default function App() {
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const isActive = (path: string) => location.pathname === path

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className={`drawer ${sidebarCollapsed ? '' : 'lg:drawer-open'}`}>
        <input id="app-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex flex-col">
          {/* 现代化顶部导航栏 - 更紧凑 */}
          <div className="navbar bg-white/80 backdrop-blur-md border-b border-white/20 h-14 min-h-14 px-4">
            <div className="flex items-center gap-3">
              <label htmlFor="app-drawer" className="btn btn-ghost btn-sm lg:hidden bg-white/50 hover:bg-white/70">
                <Menu size={16} />
              </label>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-bold text-xs">S</span>
                </div>
                <span className="font-bold text-base tracking-tight text-gradient">Star‑Man</span>
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <button className="btn btn-ghost btn-sm bg-white/50 hover:bg-white/70">
                <Settings size={14} />
              </button>
            </div>
          </div>

          {/* 主内容区域 - 更紧凑 */}
          <main className="container-tight py-4 animate-fade-in">
            <Outlet />
          </main>
        </div>

        {/* 现代化侧边栏 - 更紧凑 */}
        <aside className="drawer-side">
          <label htmlFor="app-drawer" aria-label="close sidebar" className="drawer-overlay"></label>
          <div className={`min-h-full bg-white/80 backdrop-blur-md border-r border-white/20 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'
            }`}>
            <div className="p-4">
              {/* 侧边栏头部 */}
              <div className={`mb-6 ${sidebarCollapsed ? 'text-center' : ''}`}>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-2 mx-auto">
                  <span className="text-white font-bold text-base">S</span>
                </div>
                {!sidebarCollapsed && (
                  <>
                    <h2 className="text-base font-semibold text-gray-800">Star‑Man</h2>
                    <p className="text-xs text-gray-600">GitHub Star 管理工具</p>
                  </>
                )}
              </div>

              {/* 收起/展开按钮 */}
              <div className="flex justify-center mb-4">
                <button
                  onClick={toggleSidebar}
                  className="btn btn-ghost btn-sm bg-white/50 hover:bg-white/70 rounded-full w-8 h-8 p-0"
                  title={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
                >
                  {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
              </div>

              <nav className="space-y-1">
                {!sidebarCollapsed && (
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                    导航
                  </div>
                )}

                <Link
                  to="/"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${isActive('/')
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-700'
                      : 'text-gray-700 hover:bg-white/50'
                    } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  title={sidebarCollapsed ? '总览' : ''}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${isActive('/') ? 'bg-blue-500' : 'bg-gray-400'
                    }`} />
                  {!sidebarCollapsed && <span className="font-medium text-sm">总览</span>}
                </Link>

                <Link
                  to="/repos"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${isActive('/repos')
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-700'
                      : 'text-gray-700 hover:bg-white/50'
                    } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  title={sidebarCollapsed ? '仓库' : ''}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${isActive('/repos') ? 'bg-blue-500' : 'bg-gray-400'
                    }`} />
                  {!sidebarCollapsed && <span className="font-medium text-sm">仓库</span>}
                </Link>

                <Link
                  to="/sync"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${isActive('/sync')
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-700'
                      : 'text-gray-700 hover:bg-white/50'
                    } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  title={sidebarCollapsed ? '同步' : ''}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${isActive('/sync') ? 'bg-blue-500' : 'bg-gray-400'
                    }`} />
                  {!sidebarCollapsed && <span className="font-medium text-sm">同步</span>}
                </Link>
              </nav>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
