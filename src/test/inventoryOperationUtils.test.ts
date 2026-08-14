import { describe, expect, it } from 'vitest'
import {
  buildInventoryOperationParams,
  canApproveDisposal,
  canApproveStockCount,
  canCreateDisposal,
  canCreateSample,
  canCreateStockCount,
  canSubmitStockCount,
  inventoryOperationScope,
  normalizeCountLines,
  quantityError,
} from '../features/inventory-operations/inventoryOperationUtils'

describe('phase 10 inventory operation rules', () => {
  it('passes only documented register filters', () => {
    expect(buildInventoryOperationParams({ branch_id: '2', product_id: '4', reason: 'DAMAGED', approved: 'false', status: 'DRAFT', from: '2026-08-01', to: '2026-08-14', page: '3', per_page: '20', ignored: 'x' })).toEqual({
      branch_id: '2', product_id: '4', reason: 'DAMAGED', approved: 'false', status: 'DRAFT', from: '2026-08-01', to: '2026-08-14', page: 3, per_page: 20,
    })
  })

  it('locks branch-scoped roles to their assigned branch', () => {
    expect(inventoryOperationScope('BRANCH_MANAGER', '1', '9')).toEqual({ branchId: '1', locked: true })
    expect(inventoryOperationScope('SALES_REP', '1', '9')).toEqual({ branchId: '1', locked: true })
    expect(inventoryOperationScope('ADMIN', null, '9')).toEqual({ branchId: '9', locked: false })
  })

  it('gates create and approval actions by role and lifecycle', () => {
    expect(canCreateSample('SALES_REP')).toBe(true)
    expect(canCreateDisposal('SALES_REP')).toBe(false)
    expect(canCreateDisposal('BRANCH_MANAGER')).toBe(true)
    expect(canCreateStockCount('BRANCH_MANAGER')).toBe(true)
    expect(canApproveDisposal('PENDING', 'ADMIN')).toBe(true)
    expect(canApproveDisposal('PENDING', 'BRANCH_MANAGER')).toBe(false)
    expect(canApproveDisposal('APPROVED', 'ADMIN')).toBe(false)
    expect(canSubmitStockCount('DRAFT')).toBe(true)
    expect(canSubmitStockCount('SUBMITTED')).toBe(false)
    expect(canApproveStockCount('SUBMITTED', 'HO_STAFF')).toBe(true)
    expect(canApproveStockCount('DRAFT', 'ADMIN')).toBe(false)
    expect(canApproveStockCount('SUBMITTED', 'BRANCH_MANAGER')).toBe(false)
  })

  it('retains zero stock counts while rejecting duplicate and invalid lines', () => {
    expect(normalizeCountLines([{ product_id: '1', counted_qty: '0' }, { product_id: '2', counted_qty: '7' }])).toEqual([
      { product_id: 1, counted_qty: 0 },
      { product_id: 2, counted_qty: 7 },
    ])
    expect(normalizeCountLines([{ product_id: '1', counted_qty: '0' }, { product_id: '1', counted_qty: '2' }])).toEqual([{ product_id: 1, counted_qty: 0 }])
    expect(quantityError('0', true)).toBeUndefined()
    expect(quantityError('0', false)).toBe('Enter a quantity greater than zero.')
    expect(quantityError('-1', true)).toBe('Enter a non-negative quantity.')
    expect(quantityError('1.5', true)).toBe('Enter a whole quantity.')
  })
})
