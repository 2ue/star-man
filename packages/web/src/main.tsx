import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'tippy.js/dist/tippy.css'
import App from './App.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import Dashboard from './pages/Dashboard.tsx'
import Repos from './pages/Repos.tsx'
import SyncPage from './pages/Sync.tsx'
import TagsCloud from './pages/TagsCloud.tsx'
import Categories from './pages/Categories.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'always', // 本地 API 开发，忽略浏览器网络状态
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const rootRoute = createRootRoute({
  component: () => <App />,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <Dashboard />,
})

const reposRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'repos',
  component: () => <Repos />,
})

const syncRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'sync',
  component: () => <SyncPage />,
})

const tagsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'tags',
  component: () => <TagsCloud />,
})

const categoriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'categories',
  component: () => <Categories />,
})

const routeTree = rootRoute.addChildren([indexRoute, reposRoute, syncRoute, tagsRoute, categoriesRoute])
const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

const root = createRoot(rootElement)
root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
