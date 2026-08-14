import type { UserRole } from '../../auth/types'

export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type Expense = {
  id: string
  expense_date: string
  category_id: string
  category_code: string
  category_name: string
  description: string
  amount: string
  branch_id: string
  branch_code: string
  reference_no?: string | null
  status: ExpenseStatus
  approved_by?: string | null
  approved_at?: string | null
  rejected_by?: string | null
  rejected_at?: string | null
  rejection_reason?: string | null
  decided_by?: string | null
  decided_at?: string | null
  created_by: string
  created_at: string
}

export type ExpenseFilters = {
  branch_id?: string
  category_id?: string
  status?: string
  from?: string
  to?: string
  search?: string
  page?: string
  per_page?: string
  ignored?: string
}

export type ExpensePayload = {
  category_id: string
  description: string
  amount: string
  expense_date?: string
  branch_id?: string
  reference_no?: string
}

export type Pagination = { page?: number; per_page?: number; total?: number; pages?: number }
export type ExpenseRole = UserRole
