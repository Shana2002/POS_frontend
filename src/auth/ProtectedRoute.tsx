import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './authContext'
import type { ReactNode } from 'react'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const location = useLocation()
  if (auth.status === 'loading') return <main className="centered-state"><p>Checking your session...</p></main>
  if (auth.status === 'unauthenticated') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return children
}

export function RoleRoute({ roles, children }: { roles: string[]; children: ReactNode }) {
  const auth = useAuth()
  if (!auth.user || !roles.includes(auth.user.role)) return <Navigate to="/forbidden" replace />
  return children
}
