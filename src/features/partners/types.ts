import type { UserRole } from '../../auth/types'

export type Pagination = { page?: number; per_page?: number; total?: number; pages?: number }
export type ListFilters = Record<string, string | undefined>

export type Customer = {
  id: string
  code: string
  name: string
  contact?: string | null
  email?: string | null
  address?: string | null
  credit_limit: string
  is_active: boolean
  created_at?: string
}

export type Supplier = {
  id: string
  code: string
  name: string
  contact?: string | null
  email?: string | null
  address?: string | null
  payment_terms_days: number
  is_active: boolean
}

export type ExpenseCategory = { id: string; code: string; name: string; is_active: boolean }
export type CustomerPayload = Omit<Customer, 'id' | 'created_at'>
export type SupplierPayload = Omit<Supplier, 'id'>
export type ExpenseCategoryPayload = Omit<ExpenseCategory, 'id'>
export type StatementFilters = { from?: string; to?: string; branch_id?: string }
// The API sends money as a JSON number (MoneyField serialises Decimal to float)
// and the statement ledger as `rows` with `balance`, not `entries` with
// `running_balance` — these types mirror the wire, not the rendered shape.
export type StatementRow = { date: string; type: string; description: string; reference: string | null; invoice_id: string | null; invoice_no: string | null; payment_id: string | null; debit: string | number; credit: string | number; balance: string | number }
export type CustomerStatement = { customer_id: string; customer_code: string; customer_name: string; from?: string; to?: string; branch_id?: string; opening_balance: string | number; closing_balance: string | number; total_invoiced: string | number; total_paid: string | number; row_count: number; rows: StatementRow[] }
export type StatementEntry = { id: string; date: string; type: string; reference: string; debit: string; credit: string; running_balance: string }
export type MasterEntity = Customer | Supplier
export type EntityOption = { id: string; code: string; name: string; is_active: boolean }
export type ManageRole = UserRole
