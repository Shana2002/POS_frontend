import type { UserRole } from '../../auth/types'
import type { PaymentHistory, PayableRow, PayablesReport, PurchaseFilters, PurchaseLineInput, ReceivePayload, SupplierPayment } from './types'

const costRoles: UserRole[] = ['ADMIN', 'HO_STAFF', 'BRANCH_MANAGER', 'ACCOUNTS']

export function buildPurchaseParams(filters: PurchaseFilters): Record<string, string | number> {
  const keys: Array<keyof PurchaseFilters> = ['branch_id', 'supplier_id', 'status', 'from', 'to', 'page', 'per_page']
  const entries: Array<[string, string | number]> = []
  keys.forEach((key) => { const value = filters[key]; if (!value) return; entries.push([key, key === 'page' || key === 'per_page' ? Number(value) : value]) })
  return Object.fromEntries(entries)
}

export function normalizePurchaseLines(lines: PurchaseLineInput[]) {
  const seen = new Set<string>()
  return lines.filter((line) => {
    if (!line.product_id || !line.qty || !line.unit_cost || seen.has(line.product_id)) return false
    seen.add(line.product_id)
    return true
  }).map(({ product_id, qty, unit_cost }) => ({ product_id, qty, unit_cost }))
}

export function hasDuplicateProducts(lines: PurchaseLineInput[]) {
  const ids = lines.map((line) => line.product_id).filter(Boolean)
  return new Set(ids).size !== ids.length
}
export function canEditPurchaseOrder(status: string) { return status.toUpperCase() === 'DRAFT' }
export function canOrderPurchaseOrder(role: UserRole | undefined, status: string) { return role === 'ADMIN' && status.toUpperCase() === 'DRAFT' }
export function canViewPurchaseCosts(role?: UserRole) { return Boolean(role && costRoles.includes(role)) }
export function receiveLineError(qty: string, outstanding: string) {
  if (!qty) return undefined
  const requested = Number(qty); const available = Number(outstanding)
  if (!Number.isFinite(requested) || requested < 0) return 'Enter a valid non-negative quantity.'
  if (requested > available) return `Cannot receive more than the outstanding quantity of ${outstanding}.`
  return undefined
}
export function buildReceivePayload(receivedDate: string, lines: Array<{ line_id: string; quantity: string }>): ReceivePayload {
  const normalized = lines.map(({ line_id, quantity }) => ({ line_id: Number(line_id), received_qty: Number(quantity) }))
  if (normalized.some((line) => !Number.isInteger(line.line_id) || !Number.isFinite(line.received_qty))) {
    throw new Error('Purchase order receipt contains an invalid line or quantity.')
  }
  return {
    received_date: receivedDate || undefined,
    lines: normalized,
  }
}
export function isReceiveable(status: string) { return !['CANCELLED', 'RECEIVED', 'CLOSED', 'DRAFT'].includes(status.toUpperCase()) }
export function paymentRows(history?: Partial<PaymentHistory>): SupplierPayment[] { return history?.payments || [] }
export function payableMoney(value?: string | number | null): string | number { return value ?? '0.00' }
export function payableRows(report?: Partial<PayablesReport>): PayableRow[] { return report?.rows || [] }
