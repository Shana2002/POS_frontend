import type { UserRole } from '../../auth/types'
import type { OpeningLine, OpeningLineInput, StockFilters } from './types'

const branchScoped: UserRole[] = ['BRANCH_MANAGER', 'SALES_REP']
const costRoles: UserRole[] = ['ADMIN', 'HO_STAFF', 'ACCOUNTS']

export function stockScope(role: UserRole, assignedBranch: string | null, requestedBranch: string) {
  const locked = branchScoped.includes(role)
  return { branchId: locked ? assignedBranch || '' : requestedBranch, locked }
}

export function canViewStockCost(role?: UserRole) { return Boolean(role && costRoles.includes(role)) }
export function canImportOpening(role?: UserRole) { return role === 'ADMIN' }

export function buildStockParams(filters: StockFilters, allowed: string[]): Record<string, string | number | boolean> {
  const entries: Array<[string, string | number | boolean]> = []
  allowed.forEach((key) => {
    const value = filters[key]
    if (!value) return
    if (key === 'page' || key === 'per_page') entries.push([key, Number(value)])
    else if (key === 'low_only') entries.push([key, value === 'true'])
    else entries.push([key, value])
  })
  return Object.fromEntries(entries)
}

export function normalizeOpeningLines(lines: OpeningLineInput[]): OpeningLine[] {
  return lines.filter((line) => line.qty && (line.product_id || line.product_code) && (line.branch_id || line.branch_code)).map((line) => ({
    ...(line.product_id ? { product_id: line.product_id } : { product_code: line.product_code }),
    ...(line.branch_id ? { branch_id: line.branch_id } : { branch_code: line.branch_code }),
    qty: line.qty,
    ...(line.movement_date ? { movement_date: line.movement_date } : {}),
    ...(line.notes ? { notes: line.notes } : {}),
  }))
}

export function visibleAsOf(asOf?: string) { return asOf || 'Current stock' }
