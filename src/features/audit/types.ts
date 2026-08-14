export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'REVERSE' | 'APPROVE'

export type AuditValue = Record<string, unknown> | null

export type AuditEntry = {
  id: string | number
  user_id: string | number
  table_name: string
  record_id: string | number
  action: AuditAction
  old_values: AuditValue
  new_values: AuditValue
  ip_address: string
  created_at: string
}

export type AuditListFilters = {
  table_name: string
  record_id: string
  user_id: string
  action: string
  from: string
  to: string
  page: string
  per_page: string
}
