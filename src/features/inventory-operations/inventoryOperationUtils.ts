import type { UserRole } from '../../auth/types'
import type { CountLineInput, OperationFilters } from './types'

const scopedRoles: UserRole[] = ['BRANCH_MANAGER', 'SALES_REP']
const operationKeys: Array<keyof OperationFilters> = ['branch_id', 'product_id', 'reason', 'approved', 'status', 'from', 'to', 'page', 'per_page']

export function buildInventoryOperationParams(filters: OperationFilters): Record<string, string | number> {
  return Object.fromEntries(operationKeys.flatMap((key) => {
    const value = filters[key]
    return value === undefined || value === '' ? [] : [[key, key === 'page' || key === 'per_page' ? Number(value) : value]]
  }))
}
export function inventoryOperationScope(role: UserRole, assignedBranch: string | number | null, requested: string) {
  const locked = scopedRoles.includes(role)
  return { branchId: locked && assignedBranch !== null ? String(assignedBranch) : requested, locked }
}
export function canCreateSample(role: UserRole) { return ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'SALES_REP'].includes(role) }
export function canCreateDisposal(role: UserRole) { return ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER'].includes(role) }
export function canCreateStockCount(role: UserRole) { return ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER'].includes(role) }
export function canApproveDisposal(status: string, role: UserRole) { return status.toUpperCase() === 'PENDING' && ['ADMIN', 'HO_STAFF'].includes(role) }
export function canSubmitStockCount(status: string) { return status.toUpperCase() === 'DRAFT' }
export function canApproveStockCount(status: string, role: UserRole) { return status.toUpperCase() === 'SUBMITTED' && ['ADMIN', 'HO_STAFF'].includes(role) }
export function quantityError(value: string, allowZero: boolean) {
  if (value === '') return undefined
  if (!/^\d+$/.test(value)) {
    if (/^-\d+$/.test(value)) return allowZero ? 'Enter a non-negative quantity.' : 'Enter a quantity greater than zero.'
    if (/^\d+\.\d+$/.test(value)) return 'Enter a whole quantity.'
    return allowZero ? 'Enter a valid non-negative quantity.' : 'Enter a valid quantity greater than zero.'
  }
  if (!allowZero && /^0+$/.test(value)) return 'Enter a quantity greater than zero.'
  return undefined
}
export function hasDuplicateCountProducts(lines: CountLineInput[]) { const ids = lines.map((line) => line.product_id).filter(Boolean); return new Set(ids).size !== ids.length }
export function normalizeCountLines(lines: CountLineInput[]) {
  const seen = new Set<string>()
  return lines.flatMap((line) => {
    if (!line.product_id || line.counted_qty === '' || quantityError(line.counted_qty, true) || seen.has(line.product_id)) return []
    seen.add(line.product_id)
    return [{ product_id: Number(line.product_id), counted_qty: Number(line.counted_qty) }]
  })
}
