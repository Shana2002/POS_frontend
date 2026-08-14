import { useEffect, useState } from 'react'
import { clearTokens } from '../api/client'
import { getCurrentUser } from './authApi'
import type { AuthStatus, User } from './types'

const sessionRequests = new Map<string, Promise<User>>()

function resolveSession(token: string): Promise<User> {
  const existing = sessionRequests.get(token)
  if (existing) return existing
  const pending = getCurrentUser().finally(() => sessionRequests.delete(token))
  sessionRequests.set(token, pending)
  return pending
}

export function useSession() {
  const [status, setStatus] = useState<AuthStatus>(() => localStorage.getItem('oxiaura_access_token') ? 'loading' : 'unauthenticated')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('oxiaura_access_token')
    if (!token) return
    let active = true
    resolveSession(token).then((currentUser) => {
      if (active) { setUser(currentUser); setStatus('authenticated') }
    }).catch(() => {
      clearTokens()
      if (active) { setUser(null); setStatus('unauthenticated') }
    })
    return () => { active = false }
  }, [])

  return { status, user, setUser, setStatus }
}
