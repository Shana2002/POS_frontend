import type { UserRole } from '../../auth/types'
import type { InvoiceFilters, InvoiceLineInput } from './types'

export type DiscountMode = 'percentage' | 'flat'

const branchScoped: UserRole[] = ['BRANCH_MANAGER', 'SALES_REP']

export function buildInvoiceParams(filters: InvoiceFilters): Record<string, string | number> {
  const keys: Array<keyof InvoiceFilters> = ['branch_id', 'customer_id', 'status', 'sales_rep_id', 'from', 'to', 'search', 'page', 'per_page']
  const entries: Array<[string, string | number]> = []
  keys.forEach((key) => { const value = filters[key]; if (!value) return; entries.push([key, key === 'page' || key === 'per_page' ? Number(value) : value]) })
  return Object.fromEntries(entries)
}
export function invoiceScope(role: UserRole, assignedBranch: string | null, requested: string) { const locked = branchScoped.includes(role); return { branchId: locked ? assignedBranch || '' : requested, locked } }
export function normalizeInvoiceLines(lines: InvoiceLineInput[]) { const seen = new Set<string>(); return lines.filter((line) => { if (!line.product_id || !line.qty || seen.has(line.product_id)) return false; seen.add(line.product_id); return true }).map((line) => ({ product_id: line.product_id, qty: line.qty, ...(line.unit_price ? { unit_price: line.unit_price } : {}) })) }
export function hasDuplicateInvoiceProducts(lines: InvoiceLineInput[]) { const ids = lines.map((line) => line.product_id).filter(Boolean); return new Set(ids).size !== ids.length }
export function canEditInvoice(status: string) { return status.toUpperCase() === 'DRAFT' }
export function canDeliverInvoice(status: string) { return ['ISSUED', 'PARTIALLY_DELIVERED'].includes(status.toUpperCase()) }
export function canCancelInvoice(status: string) { return !['DRAFT', 'CANCELLED'].includes(status.toUpperCase()) }
export function freeIssue(invoice: Pick<{ net_amount: string }, 'net_amount'>) { return /^0+(?:\.0+)?$/.test(invoice.net_amount) }
export function lineError(details: Record<string, unknown> | undefined, productId: string) { const lines = details?.lines; if (!lines || typeof lines !== 'object') return undefined; const value = (lines as Record<string, unknown>)[productId]; return typeof value === 'string' ? value : undefined }
export function discountApprovalMessage(error: unknown) { return error instanceof Error && /discount|approv|role/i.test(error.message) ? error.message : undefined }

function decimalFraction(value: string) {
  const match = value.trim().match(/^(\d+)(?:\.(\d+))?$/)
  if (!match) throw new Error('Enter a valid non-negative discount.')
  const decimals = match[2] || ''
  return {
    numerator: Number(`${match[1]}${decimals}`),
    denominator: 10 ** decimals.length,
  }
}

export function buildDiscountPayload(mode: DiscountMode, value: string, grossAmount: string) {
  const discount = decimalFraction(value)
  if (mode === 'percentage') {
    if (discount.numerator > 100 * discount.denominator) throw new Error('Percentage discount cannot exceed 100%.')
    return { discount_pct: value.trim() }
  }

  const gross = decimalFraction(grossAmount)
  if (discount.numerator * gross.denominator > gross.numerator * discount.denominator) {
    throw new Error('Flat discount cannot exceed the gross amount.')
  }
  if (gross.numerator === 0) {
    if (discount.numerator === 0) return { discount_pct: '0' }
    throw new Error('A flat discount requires a positive gross amount.')
  }

  const scale = 1_000_000
  const numerator = discount.numerator * gross.denominator * 100 * scale
  const denominator = discount.denominator * gross.numerator
  const rounded = Math.round(numerator / denominator)
  const whole = Math.floor(rounded / scale)
  const fraction = String(rounded % scale).padStart(6, '0').replace(/0+$/, '')
  return { discount_pct: fraction ? `${whole}.${fraction}` : String(whole) }
}

export function calculateDiscountPreview(
  mode: DiscountMode,
  value: string,
  grossAmount: string,
) {
  const gross = decimalFraction(String(grossAmount))
  const discount = decimalFraction(value)
  if (mode === 'percentage' && discount.numerator > 100 * discount.denominator) {
    throw new Error('Percentage discount cannot exceed 100%.')
  }
  if (mode === 'flat' && discount.numerator * gross.denominator > gross.numerator * discount.denominator) {
    throw new Error('Flat discount cannot exceed the gross amount.')
  }
  const grossCents = Math.round(Number(grossAmount) * 100)
  const discountCents = mode === 'flat'
    ? Math.round(Number(value) * 100)
    : Math.round(grossCents * Number(value) / 100)
  return {
    discountAmount: (discountCents / 100).toFixed(2),
    netAmount: ((grossCents - discountCents) / 100).toFixed(2),
  }
}
