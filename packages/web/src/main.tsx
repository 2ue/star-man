import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import Dashboard from './pages/Dashboard.tsx'
import Repos from './pages/Repos.tsx'
import SyncPage from './pages/Sync.tsx'

const queryClient = new QueryClient()

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

const routeTree = rootRoute.addChildren([indexRoute, reposRoute, syncRoute])
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
