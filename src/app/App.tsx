import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AppErrorBoundary } from './AppErrorBoundary'
import { router } from './router'
import { AuthProvider } from '../auth/AuthProvider'

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } })

export function App() {
  return <AppErrorBoundary><QueryClientProvider client={queryClient}><AuthProvider><RouterProvider router={router} /><Toaster richColors position="bottom-right" /></AuthProvider></QueryClientProvider></AppErrorBoundary>
}
