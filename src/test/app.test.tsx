import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('exposes and copies the request ID without displaying other technical data', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<InlineError error={new ApiClientError('INVALID', 'Backend validation failed', undefined, 400, 'req-42')} />)

    await userEvent.click(screen.getByText('Technical details'))
    expect(screen.getByText('req-42')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Copy request ID' }))
    expect(writeText).toHaveBeenCalledWith('req-42')
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('shows backend connectivity when health is available', () => {
    render(<ConnectivityIndicator />)
    expect(screen.getByText('API connected')).toBeInTheDocument()
  })
})
