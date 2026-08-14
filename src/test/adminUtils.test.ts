import { describe, expect, it } from 'vitest'
import { buildListParams, isBranchScoped } from '../features/admin/adminUtils'
import type { User } from '../auth/types'

describe('Phase 2 admin utilities', () => {
  it('preserves list filters and pagination as API query parameters', () => {
    expect(buildListParams({ search: 'asha perera', page: '2', per_page: '25', status: 'active' })).toEqual({ search: 'asha perera', page: 2, per_page: 25, status: 'active' })
  })

  it('identifies branch-scoped users and does not expose a global filter', () => {
    const user = { role: 'SALES_REP', branch_id: 'BR-01' } as User
    expect(isBranchScoped(user)).toBe(true)
    expect(isBranchScoped({ role: 'ADMIN', branch_id: null } as User)).toBe(false)
  })
})
