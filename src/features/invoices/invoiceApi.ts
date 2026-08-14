import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, request } from '../../api/client'
import { getFilenameFromDisposition } from '../../lib/download'
import { buildInvoiceParams } from './invoiceUtils'
import type { BinaryFile, CancelResult, DeliveryPayload, Invoice, InvoiceFilters, InvoiceLineInput, InvoicePayload, IssueResult, Pagination } from './types'

export const invoiceKeys = {
  all: () => ['invoices'] as const,
  list: (filters: InvoiceFilters) => ['invoices', 'list', filters] as const,
  detail: (id: string) => ['invoices', 'detail', id] as const,
}
export function useInvoices(filters: InvoiceFilters) { return useQuery({ queryKey: invoiceKeys.list(filters), queryFn: async () => { const result = await request<Invoice[]>({ method: 'GET', url: '/invoices', params: buildInvoiceParams(filters) }); return { rows: result.data, meta: result.meta as Pagination | undefined } } }) }
export function useInvoice(id: string, branchId?: string) { return useQuery({ queryKey: invoiceKeys.detail(id), queryFn: async () => (await request<Invoice>({ method: 'GET', url: `/invoices/${id}`, params: branchId ? { branch_id: branchId } : undefined })).data, enabled: Boolean(id) }) }

export function useInvoiceMutations() {
  const client = useQueryClient()
  const refresh = (invoice: Invoice) => { client.setQueryData(invoiceKeys.detail(invoice.id), invoice); void client.invalidateQueries({ queryKey: invoiceKeys.all() }) }
  const refreshStock = () => { void client.invalidateQueries({ queryKey: ['stock'] }); void client.invalidateQueries({ queryKey: ['products', 'movement'] }); void client.invalidateQueries({ queryKey: ['reports', 'product-performance'] }); void client.invalidateQueries({ queryKey: ['reports', 'dashboard'] }) }
  const create = useMutation({ mutationFn: (payload: InvoicePayload) => request<Invoice>({ method: 'POST', url: '/invoices', data: payload }).then((r) => r.data), onSuccess: refresh })
  const update = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: Partial<InvoicePayload> }) => request<Invoice>({ method: 'PUT', url: `/invoices/${id}`, data: payload }).then((r) => r.data), onSuccess: refresh })
  const remove = useMutation({ mutationFn: (id: string) => request<{ deleted: true; id: string }>({ method: 'DELETE', url: `/invoices/${id}` }).then((r) => r.data), onSuccess: () => void client.invalidateQueries({ queryKey: invoiceKeys.all() }) })
  const addLine = useMutation({ mutationFn: ({ id, line }: { id: string; line: InvoiceLineInput }) => request<Invoice>({ method: 'POST', url: `/invoices/${id}/lines`, data: line }).then((r) => r.data), onSuccess: refresh })
  const updateLine = useMutation({ mutationFn: ({ id, lineId, line }: { id: string; lineId: string; line: Partial<InvoiceLineInput> }) => request<Invoice>({ method: 'PUT', url: `/invoices/${id}/lines/${lineId}`, data: line }).then((r) => r.data), onSuccess: refresh })
  const removeLine = useMutation({ mutationFn: ({ id, lineId }: { id: string; lineId: string }) => request<Invoice>({ method: 'DELETE', url: `/invoices/${id}/lines/${lineId}` }).then((r) => r.data), onSuccess: refresh })
  const issue = useMutation({ mutationFn: (id: string) => request<IssueResult>({ method: 'POST', url: `/invoices/${id}/issue`, data: {} }).then((r) => r.data), onSuccess: (result) => { refresh(result.invoice); refreshStock() } })
  const cancel = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => request<CancelResult>({ method: 'POST', url: `/invoices/${id}/cancel`, data: { reason } }).then((r) => r.data), onSuccess: (result) => { refresh(result.invoice); refreshStock(); void client.invalidateQueries({ queryKey: ['receivables'] }) } })
  const deliver = useMutation({ mutationFn: ({ id, lineId, payload }: { id: string; lineId: string; payload: DeliveryPayload }) => request<Invoice>({ method: 'PATCH', url: `/invoices/${id}/lines/${lineId}/delivery`, data: payload }).then((r) => r.data), onSuccess: refresh })
  return { create, update, remove, addLine, updateLine, removeLine, issue, cancel, deliver }
}

export async function getInvoicePdf(id: string): Promise<BinaryFile> {
  const response = await api.get<Blob>(`/invoices/${id}/pdf`, { responseType: 'blob' })
  return { blob: response.data, filename: getFilenameFromDisposition(response.headers['content-disposition']) || `invoice-${id}.pdf` }
}

const lineQueues = new Map<string, Promise<Invoice>>()
export function serializeInvoiceLineMutation(key: string, operation: () => Promise<Invoice>) {
  const previous = lineQueues.get(key)?.catch(() => undefined)
  const next = (previous ? previous.then(operation) : operation()).finally(() => { if (lineQueues.get(key) === next) lineQueues.delete(key) })
  lineQueues.set(key, next)
  return next
}
