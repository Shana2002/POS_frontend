import type { UserRole } from '../../auth/types'
import type { ExpenseFilters } from './types'

const scopedRoles: UserRole[] = ['BRANCH_MANAGER', 'SALES_REP']
const decisionRoles: UserRole[] = ['ADMIN', 'HO_STAFF', 'ACCOUNTS']
const createRoles: UserRole[] = ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'ACCOUNTS']
const filterKeys: Array<keyof ExpenseFilters> = ['branch_id', 'category_id', 'status', 'from', 'to', 'search', 'page', 'per_page']

export function buildExpenseParams(filters: ExpenseFilters): Record<string, string | number> {
  return Object.fromEntries(filterKeys.flatMap((key) => {
    const value = filters[key]
    return value === undefined || value === '' ? [] : [[key, key === 'page' || key === 'per_page' ? Number(value) : value]]
  }))
}

export function expenseScope(role: UserRole, assignedBranch: string | number | null, requested: string) {
  const locked = scopedRoles.includes(role)
  return { branchId: locked && assignedBranch !== null ? String(assignedBranch) : requested, locked }
}

export function canCreateExpense(role: UserRole) { return createRoles.includes(role) }
export function canApproveExpense(status: string, role: UserRole) { return status.toUpperCase() === 'PENDING' && decisionRoles.includes(role) }
export function canRejectExpense(status: string, role: UserRole) { return canApproveExpense(status, role) }

export function validateExpenseAmount(value: string) {
  if (!value) return 'Enter an amount.'
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return 'Enter a valid positive amount with up to two decimal places.'
  if (/^0+(?:\.0{1,2})?$/.test(value)) return 'Amount must be greater than zero.'
  return undefined
}
