export type AuditFilters = {
  table_name?: string
  record_id?: string
  user_id?: string
  action?: string
  from?: string
  to?: string
  page?: string
  per_page?: string
  [key: string]: string | undefined
}

export type AuditChange = 'added' | 'removed' | 'changed' | 'unchanged'

export type AuditComparisonRow = {
  field: string
  oldValue: unknown
  newValue: unknown
  change: AuditChange
}

const filterKeys = ['table_name', 'record_id', 'user_id', 'action', 'from', 'to', 'page', 'per_page'] as const

export function buildAuditParams(filters: AuditFilters): Record<string, string | number> {
  const entries: Array<[string, string | number]> = []
  for (const key of filterKeys) {
    const value = filters[key]
    if (!value) continue
    entries.push([key, key === 'page' || key === 'per_page' ? Number(value) : value])
  }
  return Object.fromEntries(entries)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function flatten(value: unknown, prefix = ''): Record<string, unknown> {
  if (!isRecord(value)) return prefix ? { [prefix]: value } : {}
  const result: Record<string, unknown> = {}
  for (const key of Object.keys(value).sort()) {
    const path = prefix ? `${prefix}.${key}` : key
    const item = value[key]
    if (isRecord(item)) Object.assign(result, flatten(item, path))
    else result[path] = item
  }
  return result
}

function equal(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function compareAuditValues(oldValues: unknown, newValues: unknown): AuditComparisonRow[] {
  const oldFields = flatten(oldValues)
  const newFields = flatten(newValues)
  const fields = Array.from(new Set([...Object.keys(oldFields), ...Object.keys(newFields)])).sort()
  return fields.map((field) => {
    const inOld = Object.prototype.hasOwnProperty.call(oldFields, field)
    const inNew = Object.prototype.hasOwnProperty.call(newFields, field)
    const oldValue = oldFields[field]
    const newValue = newFields[field]
    const change: AuditChange = !inOld ? 'added' : !inNew ? 'removed' : equal(oldValue, newValue) ? 'unchanged' : 'changed'
    return { field, oldValue, newValue, change }
  })
}

export function formatAuditValue(value: unknown): string {
  if (value === undefined) return 'Not present'
  if (value === null) return 'null'
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}
