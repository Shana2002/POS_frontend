import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from '../../api/client'
import { buildInventoryOperationParams } from './inventoryOperationUtils'
import type { Disposal, DisposalApprovalResult, OperationFilters, Pagination, Sample, SamplePayload, SampleResult, DisposalPayload, StockCount, StockCountApprovalResult, StockCountPayload } from './types'

export const inventoryOperationKeys = {
  samples: (filters: OperationFilters) => ['samples', 'list', filters] as const,
  sample: (id: string, branchId?: string) => ['samples', 'detail', id, branchId || ''] as const,
  disposals: (filters: OperationFilters) => ['disposals', 'list', filters] as const,
  disposal: (id: string, branchId?: string) => ['disposals', 'detail', id, branchId || ''] as const,
  counts: (filters: OperationFilters) => ['stock-counts', 'list', filters] as const,
  count: (id: string, branchId?: string) => ['stock-counts', 'detail', id, branchId || ''] as const,
}
function useOperationList<T>(url: string, filters: OperationFilters, key: readonly unknown[]) {
  return useQuery({ queryKey: key, queryFn: async () => { const result = await request<T[]>({ method: 'GET', url, params: buildInventoryOperationParams(filters) }); return { rows: result.data, meta: result.meta as Pagination | undefined } } })
}
export function useSamples(filters: OperationFilters) { return useOperationList<Sample>('/samples', filters, inventoryOperationKeys.samples(filters)) }
export function useSample(id: string, branchId?: string) { return useQuery({ queryKey: inventoryOperationKeys.sample(id, branchId), queryFn: async () => (await request<Sample>({ method: 'GET', url: `/samples/${id}`, params: branchId ? { branch_id: branchId } : undefined })).data, enabled: Boolean(id) }) }
export function useDisposals(filters: OperationFilters) { return useOperationList<Disposal>('/disposals', filters, inventoryOperationKeys.disposals(filters)) }
export function useDisposal(id: string, branchId?: string) { return useQuery({ queryKey: inventoryOperationKeys.disposal(id, branchId), queryFn: async () => (await request<Disposal>({ method: 'GET', url: `/disposals/${id}`, params: branchId ? { branch_id: branchId } : undefined })).data, enabled: Boolean(id) }) }
export function useStockCounts(filters: OperationFilters) { return useOperationList<StockCount>('/stock-counts', filters, inventoryOperationKeys.counts(filters)) }
export function useStockCount(id: string, branchId?: string) { return useQuery({ queryKey: inventoryOperationKeys.count(id, branchId), queryFn: async () => (await request<StockCount>({ method: 'GET', url: `/stock-counts/${id}`, params: branchId ? { branch_id: branchId } : undefined })).data, enabled: Boolean(id) }) }

export function useInventoryOperationMutations() {
  const client = useQueryClient()
  const refresh = (prefix: string, record: unknown) => { client.setQueriesData({ queryKey: [prefix, 'detail'] }, record); void client.invalidateQueries({ queryKey: [prefix] }) }
  const stockChanged = () => { void client.invalidateQueries({ queryKey: ['stock'] }); void client.invalidateQueries({ queryKey: ['products', 'movement'] }); void client.invalidateQueries({ queryKey: ['reports'] }) }
  const createSample = useMutation({ mutationFn: (payload: SamplePayload) => request<SampleResult>({ method: 'POST', url: '/samples', data: payload }).then((r) => r.data), onSuccess: (r) => { refresh('samples', r.sample); stockChanged() } })
  const createDisposal = useMutation({ mutationFn: (payload: DisposalPayload) => request<Disposal>({ method: 'POST', url: '/disposals', data: payload }).then((r) => r.data), onSuccess: (r) => refresh('disposals', r) })
  const approveDisposal = useMutation({ mutationFn: (id: string) => request<DisposalApprovalResult>({ method: 'POST', url: `/disposals/${id}/approve`, data: {} }).then((r) => r.data), onSuccess: (r) => { refresh('disposals', r.disposal); stockChanged() } })
  const createStockCount = useMutation({ mutationFn: (payload: StockCountPayload) => request<StockCount>({ method: 'POST', url: '/stock-counts', data: payload }).then((r) => r.data), onSuccess: (r) => refresh('stock-counts', r) })
  const submitStockCount = useMutation({ mutationFn: (id: string) => request<StockCount>({ method: 'POST', url: `/stock-counts/${id}/submit`, data: {} }).then((r) => r.data), onSuccess: (r) => refresh('stock-counts', r) })
  const approveStockCount = useMutation({ mutationFn: (id: string) => request<StockCountApprovalResult>({ method: 'POST', url: `/stock-counts/${id}/approve`, data: {} }).then((r) => r.data), onSuccess: (r) => { refresh('stock-counts', r.stock_count); stockChanged() } })
  return { createSample, createDisposal, approveDisposal, createStockCount, submitStockCount, approveStockCount }
}
