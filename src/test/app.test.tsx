import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApiClientError } from '../api/client'
import { InlineError } from '../components/InlineError'
import { ConnectivityIndicator } from '../components/ConnectivityIndicator'

vi.mock('../api/health', () => ({
  useHealth: () => ({ data: { status: 'ok', db: 'ok' }, isPending: false, isError: false }),
}))

describe('Phase 0 application states', () => {
  it('renders backend messages in the standard error UI', () => {
    render(<InlineError error={new ApiClientError('INVALID', 'Backend validation failed')} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Backend validation failed')
  })

  it('shows backend connectivity when health is available', () => {
    render(<ConnectivityIndicator />)
    expect(screen.getByText('API connected')).toBeInTheDocument()
  })
})
