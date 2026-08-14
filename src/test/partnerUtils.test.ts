import { describe, expect, it } from 'vitest'
import {
  buildMasterListParams,
  buildStatementParams,
  canManageMasterData,
  filterActiveOptions,
  statementReconciles,
} from '../features/partners/partnerUtils'

describe('phase 4 master-data rules', () => {
  it('keeps list filters and numeric pagination while dropping empty values', () => {
    expect(buildMasterListParams({ search: 'lanka', active: 'true', page: '2', per_page: '20', empty: '' })).toEqual({
      search: 'lanka',
      active: 'true',
      page: 2,
      per_page: 20,
    })
  })

  it('keeps statement dates and branch without replacing opening balance inputs', () => {
    expect(buildStatementParams({ from: '2026-08-01', to: '2026-08-14', branch_id: 'b1' })).toEqual({
      from: '2026-08-01',
      to: '2026-08-14',
      branch_id: 'b1',
    })
  })

  it('reconciles exact decimal statement values without binary floating point', () => {
    expect(statementReconciles('100.10', [{ debit: '0.20', credit: '0.10' }], '100.20')).toBe(true)
    expect(statementReconciles('100.10', [{ debit: '0.20', credit: '0.10' }], '100.21')).toBe(false)
  })

  it('excludes inactive records from new-transaction selectors', () => {
    expect(filterActiveOptions([
      { id: '1', code: 'C-1', name: 'Active', is_active: true },
      { id: '2', code: 'C-2', name: 'Historical', is_active: false },
    ])).toEqual([{ id: '1', code: 'C-1', name: 'Active', is_active: true }])
  })

  it('limits master-data writes to operational head-office roles', () => {
    expect(canManageMasterData('ADMIN')).toBe(true)
    expect(canManageMasterData('HO_STAFF')).toBe(true)
    expect(canManageMasterData('SALES_REP')).toBe(false)
  })
})
