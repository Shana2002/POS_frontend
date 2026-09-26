import type { UserRole } from '../../auth/types'
import type { CustomerStatement, EntityOption, ListFilters, StatementEntry, StatementFilters } from './types'

export function buildMasterListParams(filters: ListFilters): Record<string, string | number> {
  return Object.fromEntries(Object.entries(filters).flatMap(([key, value]) => value ? [[key, key === 'page' || key === 'per_page' ? Number(value) : value]] : []))
}

export function buildStatementParams(filters: StatementFilters): Record<string, string> {
  return Object.fromEntries(Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])))
}

function decimalParts(value: string): bigint {
  const sign = value.trim().startsWith('-') ? BigInt(-1) : BigInt(1)
  const normalized = value.trim().replace(/^[+-]/, '')
  const [whole = '0', fraction = ''] = normalized.split('.')
  return sign * BigInt(`${whole || '0'}${fraction.padEnd(2, '0').slice(0, 2)}`)
}

export function statementReconciles(openingBalance: string, entries: Pick<StatementEntry, 'debit' | 'credit'>[], closingBalance: string): boolean {
  const expected = entries.reduce((balance, entry) => balance + decimalParts(entry.debit) - decimalParts(entry.credit), decimalParts(openingBalance))
  return expected === decimalParts(closingBalance)
}

// Money crosses the wire as a JSON number (MoneyField), so every statement
// figure is `string | number` until it passes through here. StatementEntry is
// the one place the amounts are guaranteed strings: statementReconciles'
// decimalParts parses them with BigInt, and a number like 1250.5 would break
// its regex-free string split.
export function moneyString(value: string | number): string {
  return typeof value === 'number' ? value.toFixed(2) : value
}

export function statementEntries(statement: CustomerStatement): StatementEntry[] {
  return statement.rows.map((row, index) => ({
    id: row.payment_id ?? `${row.invoice_id ?? 'entry'}-${index}`,
    date: row.date,
    type: row.type,
    reference: row.reference ?? row.description,
    debit: moneyString(row.debit),
    credit: moneyString(row.credit),
    running_balance: moneyString(row.balance),
  }))
}

export function filterActiveOptions<T extends EntityOption>(options: T[]): T[] { return options.filter((option) => option.is_active) }
export function canManageMasterData(role?: UserRole): boolean { return role === 'ADMIN' || role === 'HO_STAFF' }
export function canManageExpenseCategories(role?: UserRole): boolean { return role === 'ADMIN' || role === 'HO_STAFF' || role === 'ACCOUNTS' }
export function deactivationMessage(type: 'customer' | 'supplier' | 'expense category', name: string): string { return `${name} will remain visible in historical records but will no longer be available for new transactions. Deactivate this ${type}?` }
