import { Menu, Sun, Moon, Settings } from 'lucide-react'
import { Outlet, Link, useLocation } from '@tanstack/react-router'
import { useState } from 'react'

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const location = useLocation()

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'dark')
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'light'
        ? 'bg-gradient-to-br from-blue-50 via-white to-purple-50'
        : 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900'
      }`}>
      <div className="drawer lg:drawer-open">
        <input id="app-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex flex-col">
          {/* 现代化顶部导航栏 - 更紧凑 */}
          <div className="navbar glass-effect border-b border-white/20 dark:border-gray-700/20 h-14 min-h-14 px-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <label htmlFor="app-drawer" className="btn btn-ghost btn-sm lg:hidden glass-effect">
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
              <button
                className="btn btn-ghost btn-sm glass-effect"
                onClick={toggleTheme}
              >
                {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              </button>
              <button className="btn btn-ghost btn-sm glass-effect">
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
          <div className="glass-effect w-64 min-h-full border-r border-white/20 dark:border-gray-700/20 backdrop-blur-md">
            <div className="p-4">
              <div className="mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-2">
                  <span className="text-white font-bold text-base">S</span>
                </div>
                <h2 className="text-base font-semibold text-gray-800 dark:text-white">Star‑Man</h2>
                <p className="text-xs text-gray-600 dark:text-gray-400">GitHub Star 管理工具</p>
              </div>

              <nav className="space-y-1">
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  导航
                </div>

                <Link
                  to="/"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${isActive('/')
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 dark:border-blue-400/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/10'
                    }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${isActive('/') ? 'bg-blue-500' : 'bg-gray-400'
                    }`} />
                  <span className="font-medium text-sm">总览</span>
                </Link>

                <Link
                  to="/repos"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${isActive('/repos')
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 dark:border-blue-400/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/10'
                    }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${isActive('/repos') ? 'bg-blue-500' : 'bg-gray-400'
                    }`} />
                  <span className="font-medium text-sm">仓库</span>
                </Link>

                <Link
                  to="/sync"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${isActive('/sync')
                      ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 dark:border-blue-400/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-white/10'
                    }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${isActive('/sync') ? 'bg-blue-500' : 'bg-gray-400'
                    }`} />
                  <span className="font-medium text-sm">同步</span>
                </Link>
              </nav>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
