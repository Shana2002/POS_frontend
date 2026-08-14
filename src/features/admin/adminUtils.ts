import type { User } from '../../auth/types'
import type { ListFilters } from './types'

export function buildListParams(filters: ListFilters): Record<string, string | number> {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => key === 'page' || key === 'per_page' ? [key, Number(value)] : [key, value as string]))
}

export function isBranchScoped(user: User): boolean {
  return user.role === 'BRANCH_MANAGER' || user.role === 'SALES_REP'
}

export function roleRequiresBranch(role: User['role']): boolean {
  return role === 'BRANCH_MANAGER' || role === 'SALES_REP'
}

export function getAdminActionMessage(entity: 'user' | 'branch', active: boolean): string {
  return active ? `Deactivate this ${entity}? It will remain visible in historical records but cannot be used for new operations.` : `Activate this ${entity} for new operations?`
}

export function getSettingInputType(dataType: string): 'checkbox' | 'number' | 'date' | 'text' {
  if (dataType === 'boolean') return 'checkbox'
  if (dataType === 'number') return 'number'
  if (dataType === 'date') return 'date'
  return 'text'
}
