import { describe, expect, it } from 'vitest'
import {
  buildExpenseParams,
  canApproveExpense,
  canCreateExpense,
  canRejectExpense,
  expenseScope,
  validateExpenseAmount,
} from '../features/expenses/expenseUtils'

describe('phase 11 expense workflow rules', () => {
  it('passes only documented expense register filters', () => {
    expect(buildExpenseParams({
      branch_id: '2',
      category_id: '4',
      status: 'PENDING',
      from: '2026-08-01',
      to: '2026-08-14',
      search: 'courier',
      page: '3',
      per_page: '20',
      ignored: 'x',
    })).toEqual({
      branch_id: '2',
      category_id: '4',
      status: 'PENDING',
      from: '2026-08-01',
      to: '2026-08-14',
      search: 'courier',
      page: 3,
      per_page: 20,
    })
  })

  it('locks branch-scoped roles to their assigned branch', () => {
    expect(expenseScope('BRANCH_MANAGER', '1', '9')).toEqual({ branchId: '1', locked: true })
    expect(expenseScope('SALES_REP', '1', '9')).toEqual({ branchId: '1', locked: true })
    expect(expenseScope('ADMIN', null, '9')).toEqual({ branchId: '9', locked: false })
    expect(expenseScope('ACCOUNTS', null, '')).toEqual({ branchId: '', locked: false })
  })

  it('gates creation and decisions by role and pending lifecycle', () => {
    expect(canCreateExpense('ADMIN')).toBe(true)
    expect(canCreateExpense('BRANCH_MANAGER')).toBe(true)
    expect(canCreateExpense('SALES_REP')).toBe(false)
    expect(canApproveExpense('PENDING', 'ADMIN')).toBe(true)
    expect(canApproveExpense('PENDING', 'HO_STAFF')).toBe(true)
    expect(canApproveExpense('PENDING', 'ACCOUNTS')).toBe(true)
    expect(canApproveExpense('PENDING', 'BRANCH_MANAGER')).toBe(false)
    expect(canApproveExpense('APPROVED', 'ADMIN')).toBe(false)
    expect(canRejectExpense('PENDING', 'ADMIN')).toBe(true)
    expect(canRejectExpense('REJECTED', 'ADMIN')).toBe(false)
  })

  it('accepts exact positive decimal amounts without using number arithmetic', () => {
    expect(validateExpenseAmount('1250.00')).toBeUndefined()
    expect(validateExpenseAmount('0.01')).toBeUndefined()
    expect(validateExpenseAmount('')).toBe('Enter an amount.')
    expect(validateExpenseAmount('0')).toBe('Amount must be greater than zero.')
    expect(validateExpenseAmount('-1.00')).toBe('Enter a valid positive amount with up to two decimal places.')
    expect(validateExpenseAmount('1.999')).toBe('Enter a valid positive amount with up to two decimal places.')
  })
})
