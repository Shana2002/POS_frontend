import type { ReactNode } from 'react'
import { changePassword, login, logout } from './authApi'
import { useSession } from './useSession'
import { AuthContext, type AuthContextValue } from './authContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSession()
  const value: AuthContextValue = {
    status: session.status,
    user: session.user,
    signIn: async (email, password) => {
      const result = await login(email, password)
      session.setUser(result.user); session.setStatus('authenticated')
      return result.user
    },
    signOut: async () => { await logout(); session.setUser(null); session.setStatus('unauthenticated') },
    updatePassword: async (currentPassword, newPassword) => {
      const result = await changePassword(currentPassword, newPassword)
      session.setUser(result.user)
      return result.user
    },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
