import type { UserRole } from '../../auth/types'
import type { TransferFilters, TransferLine, TransferLineInput, TransferVariance } from './types'

const scopedRoles: UserRole[] = ['BRANCH_MANAGER', 'SALES_REP']
type DecimalParts = { units: bigint; scale: number }
type Quantity = string | number

function decimalParts(value: Quantity): DecimalParts | null {
  const match = String(value).trim().match(/^(-?)(\d+)(?:\.(\d+))?$/)
  if (!match) return null
  const fraction = match[3] || ''
  const units = BigInt(`${match[2]}${fraction}`)
  return { units: match[1] ? -units : units, scale: fraction.length }
}

function scaleUnits(value: DecimalParts, scale: number) {
  return value.units * BigInt(`1${'0'.repeat(scale - value.scale)}`)
}

function decimalString(units: bigint, scale: number) {
  if (scale === 0) return units.toString()
  const raw = units.toString().padStart(scale + 1, '0')
  const whole = raw.slice(0, -scale)
  const fraction = raw.slice(-scale).replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole
}
export function buildTransferParams(filters: TransferFilters): Record<string, string | number> { const keys: Array<keyof TransferFilters> = ['branch_id', 'status', 'from_branch', 'to_branch', 'page', 'per_page']; const entries: Array<[string, string | number]> = []; keys.forEach((key) => { const value = filters[key]; if (!value) return; entries.push([key, key === 'page' || key === 'per_page' ? Number(value) : value]) }); return Object.fromEntries(entries) }
export function isTransferBranchScoped(role: UserRole) { return scopedRoles.includes(role) }
export function canCreateTransfer(role: UserRole) { return role === 'ADMIN' || role === 'HO_STAFF' || role === 'BRANCH_MANAGER' }
export function transferScope(role: UserRole, assignedBranch: string | number | null, requested: string) { const locked = isTransferBranchScoped(role); return { branchId: locked && assignedBranch !== null ? String(assignedBranch) : requested, locked } }
export function normalizeTransferLines(lines: TransferLineInput[]) { const seen = new Set<string>(); return lines.filter((line) => { if (!line.product_id || !line.qty || transferLineError(line.qty) || seen.has(line.product_id)) return false; seen.add(line.product_id); return true }).map(({ product_id, qty }) => ({ product_id: Number(product_id), qty: Number(qty) })) }
export function hasDuplicateTransferProducts(lines: TransferLineInput[]) { const ids = lines.map((line) => line.product_id).filter(Boolean); return new Set(ids).size !== ids.length }
export function canDispatchTransfer(status: string) { return status.toUpperCase() === 'DRAFT' }
export function canReceiveTransfer(status: string) { return status.toUpperCase() === 'DISPATCHED' }
export function canCancelTransfer(status: string) { return ['DRAFT', 'DISPATCHED'].includes(status.toUpperCase()) }
export function canManageTransferAction(action: 'dispatch' | 'receive' | 'cancel', transfer: { status: string; from_branch_id: number; to_branch_id: number }, role: UserRole, assignedBranch: string | null) { const lifecycleAllowed = action === 'dispatch' ? canDispatchTransfer(transfer.status) : action === 'receive' ? canReceiveTransfer(transfer.status) : canCancelTransfer(transfer.status); if (!lifecycleAllowed) return false; if (action === 'cancel') return role === 'ADMIN' || role === 'HO_STAFF'; if (role !== 'BRANCH_MANAGER') return role === 'ADMIN' || role === 'HO_STAFF'; const branchId = assignedBranch ? Number(assignedBranch) : null; return action === 'receive' ? transfer.to_branch_id === branchId : transfer.from_branch_id === branchId }
export function transferLineError(qty: Quantity) { if (qty === '' || qty === undefined || qty === null) return undefined; const value = decimalParts(qty); if (!value) return 'Enter a valid quantity greater than zero.'; if (value.units <= BigInt(0)) return 'Enter a quantity greater than zero.'; if (value.scale > 0) return 'Enter a whole quantity greater than zero.'; return undefined }
export function receiveVariance(received: Quantity, dispatched: Quantity) { const receivedQty = decimalParts(received); const dispatchedQty = decimalParts(dispatched); if (!receivedQty || receivedQty.units < BigInt(0)) return { error: 'Enter a valid non-negative received quantity.', shortfall: undefined }; if (receivedQty.scale > 0) return { error: 'Enter a whole received quantity.', shortfall: undefined }; if (!dispatchedQty || dispatchedQty.units < BigInt(0)) return { error: 'Dispatched quantity is unavailable.', shortfall: undefined }; const scale = Math.max(receivedQty.scale, dispatchedQty.scale); const receivedUnits = scaleUnits(receivedQty, scale); const dispatchedUnits = scaleUnits(dispatchedQty, scale); if (receivedUnits > dispatchedUnits) return { error: `Cannot receive more than the dispatched quantity of ${dispatched}.`, shortfall: undefined }; return { error: undefined, shortfall: decimalString(dispatchedUnits - receivedUnits, scale) } }
export function persistentTransferVariances(transfer: { lines: TransferLine[] }): TransferVariance[] { return transfer.lines.flatMap((line) => line.shortfall_qty > 0 ? [{ line_id: line.id, product_id: line.product_id, product_code: line.product_code, product_name: line.product_name, dispatched_qty: line.qty, received_qty: line.received_qty, shortfall_qty: line.shortfall_qty }] : []) }
export function dispatchAvailabilityError(details: Record<string, unknown> | undefined, productId: number) { const lines = details?.lines; if (!Array.isArray(lines)) return undefined; const row = lines.find((value) => value && typeof value === 'object' && Number((value as Record<string, unknown>).product_id) === productId) as Record<string, unknown> | undefined; if (!row) return undefined; return `Requested ${String(row.requested)}; source has ${String(row.available)} (short ${String(row.shortfall)}).` }
export function cancellationConsequence(status: string) { return status.toUpperCase() === 'DISPATCHED' ? 'Cancelling this dispatched transfer posts reversal stock movements back to the source branch.' : 'Cancelling this draft does not post stock movements.' }
