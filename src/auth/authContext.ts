import { createContext, useContext } from 'react'
import type { AuthStatus, User } from './types'

export type AuthContextValue = {
  status: AuthStatus
  user: User | null
  signIn: (email: string, password: string) => Promise<User>
  signOut: () => Promise<void>
  updatePassword: (currentPassword: string, newPassword: string) => Promise<User>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}