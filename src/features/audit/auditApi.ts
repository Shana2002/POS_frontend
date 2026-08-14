import { useQuery } from '@tanstack/react-query'
import { request } from '../../api/client'
import { buildAuditParams } from './auditUtils'
import type { AuditEntry, AuditListFilters } from './types'

export const auditKeys = {
  all: ['audit-log'] as const,
  list: (filters: AuditListFilters) => ['audit-log', 'list', filters] as const,
}

export function useAuditLog(filters: AuditListFilters) {
  return useQuery({
    queryKey: auditKeys.list(filters),
    queryFn: async ({ signal }) => {
      const result = await request<AuditEntry[]>({
        method: 'GET',
        url: '/audit-log',
        params: buildAuditParams(filters),
        signal,
      })
      return { rows: result.data, meta: result.meta }
    },
  })
}
