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
export type StatementEntry = { date: string; type: string; reference: string; id: string; debit: string; credit: string; running_balance: string }
export type CustomerStatement = { customer: Customer; from?: string; to?: string; branch_id?: string; opening_balance: string; entries: StatementEntry[]; closing_balance: string }
export type MasterEntity = Customer | Supplier
export type EntityOption = { id: string; code: string; name: string; is_active: boolean }
export type ManageRole = UserRole
