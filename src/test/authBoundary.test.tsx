import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const sessionState = vi.hoisted(() => ({ status: 'loading' as 'loading' | 'unauthenticated' }))
const setUser = vi.hoisted(() => vi.fn())
const setStatus = vi.hoisted(() => vi.fn())
vi.mock('../auth/useSession', () => ({ useSession: () => ({ status: sessionState.status, user: null, setUser, setStatus }) }))

import { AuthProvider } from '../auth/AuthProvider'
import { ProtectedRoute } from '../auth/ProtectedRoute'

describe('authentication boundary', () => {
  it('does not render protected content while session is unresolved', () => {
    sessionState.status = 'loading'
    render(<MemoryRouter><AuthProvider><ProtectedRoute><div>private content</div></ProtectedRoute></AuthProvider></MemoryRouter>)
    expect(screen.queryByText('private content')).not.toBeInTheDocument()
    expect(screen.getByText('Checking your session...')).toBeInTheDocument()
  })

  it('redirects unauthenticated visitors to login', () => {
    sessionState.status = 'unauthenticated'
    render(<MemoryRouter initialEntries={['/dashboard']}><AuthProvider><Routes><Route path="/dashboard" element={<ProtectedRoute><div>private content</div></ProtectedRoute>} /><Route path="/login" element={<div>login page</div>} /></Routes></AuthProvider></MemoryRouter>)
    expect(screen.queryByText('private content')).not.toBeInTheDocument()
    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('clears the rendered session when token refresh reports authentication loss', () => {
    sessionState.status = 'loading'
    render(<MemoryRouter><AuthProvider><div>app</div></AuthProvider></MemoryRouter>)
    window.dispatchEvent(new Event('oxiaura:auth-cleared'))
    expect(setUser).toHaveBeenCalledWith(null)
    expect(setStatus).toHaveBeenCalledWith('unauthenticated')
  })
})
