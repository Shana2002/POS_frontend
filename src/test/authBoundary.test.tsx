import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const sessionState = vi.hoisted(() => ({ status: 'loading' as 'loading' | 'unauthenticated' }))
vi.mock('../auth/useSession', () => ({ useSession: () => ({ status: sessionState.status, user: null, setUser: vi.fn(), setStatus: vi.fn() }) }))

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
})
