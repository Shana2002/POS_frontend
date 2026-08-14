import { describe, expect, it } from 'vitest'
import { getAdminActionMessage } from '../features/admin/adminUtils'

describe('deactivation confirmation', () => {
  it('states the historical-data consequence', () => {
    expect(getAdminActionMessage('user', true)).toContain('historical records')
    expect(getAdminActionMessage('branch', true)).toContain('Deactivate')
  })
})
