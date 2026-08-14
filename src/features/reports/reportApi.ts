import { useQuery } from '@tanstack/react-query'
import { api, ApiClientError, request } from '../../api/client'
import { getFilenameFromDisposition } from '../../lib/download'
import { buildReportParams } from './reportUtils'
import type { ReportData, ReportFilters, ReportFormat, ReportName } from './types'

export const reportKeys = {
  all: ['reports'] as const,
  detail: (name: ReportName, filters: ReportFilters) => ['reports', name, filters] as const,
}

export function useReport<T extends ReportData>(name: ReportName, filters: ReportFilters) {
  return useQuery({
    queryKey: reportKeys.detail(name, filters),
    queryFn: async ({ signal }) => (await request<T>({
      method: 'GET',
      url: `/reports/${name}`,
      params: buildReportParams(name, filters),
      signal,
    })).data,
  })
}

async function binaryError(blob: Blob, status: number): Promise<ApiClientError> {
  try {
    const body = JSON.parse(await blob.text()) as { success?: boolean; error?: { code?: string; message?: string; details?: Record<string, unknown> } }
    if (body.success === false && body.error) return new ApiClientError(body.error.code || 'EXPORT_FAILED', body.error.message || 'Export failed.', body.error.details, status)
  } catch { /* Non-JSON binary error body. */ }
  return new ApiClientError('EXPORT_FAILED', 'The report export could not be generated.', undefined, status)
}

export async function exportReport(name: ReportName, format: ReportFormat, filters: ReportFilters): Promise<{ blob: Blob; filename: string; mimeType: string }> {
  try {
    const response = await api.get<Blob>(`/reports/${name}/export`, {
      params: { ...buildReportParams(name, filters), format },
      responseType: 'blob',
    })
    const mimeType = String(response.headers['content-type'] || response.data.type || '')
    const fallback = `${name}.${format}`
    return { blob: response.data, filename: getFilenameFromDisposition(String(response.headers['content-disposition'] || '')) || fallback, mimeType }
  } catch (error) {
    const response = (error as { response?: { data?: unknown; status?: number } }).response
    if (response?.data instanceof Blob) throw await binaryError(response.data, response.status || 500)
    throw error
  }
}
