import type { User } from '../../auth/types'

export type Branch = { id: string; code: string; name: string; address?: string | null; manager_id?: string | null; is_warehouse: boolean; invoice_prefix?: string | null; is_active: boolean }
export type Setting = { id: string; key: string; value: string; data_type: string; updated_by?: string | null; updated_at?: string }
export type Pagination = { page?: number; per_page?: number; total?: number; pages?: number }
export type ListFilters = Record<string, string | undefined>

export type UserPayload = { full_name: string; email: string; password?: string; role: User['role']; branch_id?: string; phone?: string; is_active?: boolean }
export type BranchPayload = { code: string; name: string; address?: string; manager_id?: string; is_warehouse?: boolean; invoice_prefix?: string; is_active?: boolean }
