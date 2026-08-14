import { describe, expect, it } from 'vitest'
import { buildStockParams, canViewStockCost, normalizeOpeningLines, stockScope } from '../features/stock/stockUtils'

describe('phase 5 stock rules', () => {
  it('locks branch-scoped users to their assigned branch', () => {
    expect(stockScope('BRANCH_MANAGER', 'branch-7', 'branch-99')).toEqual({ branchId: 'branch-7', locked: true })
    expect(stockScope('ADMIN', null, 'branch-99')).toEqual({ branchId: 'branch-99', locked: false })
  })

  it('builds documented stock filters without empty values', () => {
    expect(buildStockParams({ branch_id: 'b1', product_id: '', low_only: 'true', as_of: '2026-08-14', page: '2', ignored: 'x' }, ['branch_id', 'product_id', 'low_only', 'as_of'])).toEqual({ branch_id: 'b1', low_only: true, as_of: '2026-08-14' })
  })

  it('gates cost-bearing views to cost roles', () => {
    expect(canViewStockCost('ACCOUNTS')).toBe(true)
    expect(canViewStockCost('SALES_REP')).toBe(false)
  })

  it('keeps valid opening rows and supports product or branch codes', () => {
    expect(normalizeOpeningLines([
      { product_id: 'p1', product_code: '', branch_id: 'b1', branch_code: '', qty: '5', movement_date: '', notes: '' },
      { product_id: '', product_code: 'SKU-2', branch_id: '', branch_code: 'WH', qty: '2.5', movement_date: '2026-08-14', notes: 'Counted' },
    ])).toEqual([
      { product_id: 'p1', branch_id: 'b1', qty: '5' },
      { product_code: 'SKU-2', branch_code: 'WH', qty: '2.5', movement_date: '2026-08-14', notes: 'Counted' },
    ])
  })
})
