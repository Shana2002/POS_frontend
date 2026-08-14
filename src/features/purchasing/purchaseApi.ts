import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from '../../api/client'
import { buildPurchaseParams } from './purchaseUtils'
import { invalidateFinancialQueries } from '../../lib/queryInvalidation'
import type { Pagination, PayablesReport, PaymentHistory, PaymentPayload, PaymentResult, PurchaseFilters, PurchaseOrder, PurchasePayload, ReceiptResult, ReceivePayload } from './types'

export const purchaseKeys = {
  all: () => ['purchase-orders'] as const,
  list: (filters: PurchaseFilters) => ['purchase-orders', 'list', filters] as const,
  detail: (id: string) => ['purchase-orders', 'detail', id] as const,
  payments: (id: string) => ['purchase-orders', 'payments', id] as const,
  payables: (filters: { branch_id?: string; supplier_id?: string; as_of?: string }) => ['payables', 'outstanding', filters] as const,
}

export function usePurchaseOrders(filters: PurchaseFilters) { return useQuery({ queryKey: purchaseKeys.list(filters), queryFn: async () => { const result = await request<PurchaseOrder[]>({ method: 'GET', url: '/purchase-orders', params: buildPurchaseParams(filters) }); return { rows: result.data, meta: result.meta as Pagination | undefined } } }) }
export function usePurchaseOrder(id: string, branchId?: string) { return useQuery({ queryKey: purchaseKeys.detail(id), queryFn: async () => (await request<PurchaseOrder>({ method: 'GET', url: `/purchase-orders/${id}`, params: branchId ? { branch_id: branchId } : undefined })).data, enabled: Boolean(id) }) }
export function useSupplierPayments(id: string) { return useQuery({ queryKey: purchaseKeys.payments(id), queryFn: async () => (await request<PaymentHistory>({ method: 'GET', url: `/purchase-orders/${id}/payments` })).data, enabled: Boolean(id) }) }
export function useOutstandingPayables(filters: { branch_id?: string; supplier_id?: string; as_of?: string }) { return useQuery({ queryKey: purchaseKeys.payables(filters), queryFn: async () => (await request<PayablesReport>({ method: 'GET', url: '/payables/outstanding', params: Object.fromEntries(Object.entries(filters).filter(([, value]) => value)) })).data }) }

export function usePurchaseMutations() {
  const client = useQueryClient()
  const invalidateOrder = (id?: string) => { void client.invalidateQueries({ queryKey: purchaseKeys.all() }); if (id) void client.invalidateQueries({ queryKey: purchaseKeys.detail(id) }) }
  const create = useMutation({ mutationFn: (payload: PurchasePayload) => request<PurchaseOrder>({ method: 'POST', url: '/purchase-orders', data: payload }).then((r) => r.data), onSuccess: (po) => invalidateOrder(po.id) })
  const update = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: Partial<PurchasePayload> }) => request<PurchaseOrder>({ method: 'PUT', url: `/purchase-orders/${id}`, data: payload }).then((r) => r.data), onSuccess: (po) => invalidateOrder(po.id) })
  const receive = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: ReceivePayload }) => request<ReceiptResult>({ method: 'POST', url: `/purchase-orders/${id}/receive`, data: payload }).then((r) => r.data), onSuccess: (result) => { invalidateOrder(result.purchase_order.id); invalidateFinancialQueries(client, ['stock', 'payables', 'products', 'reports']) } })
  const pay = useMutation({ mutationFn: ({ id, payload }: { id: string; payload: PaymentPayload }) => request<PaymentResult>({ method: 'POST', url: `/purchase-orders/${id}/payments`, data: payload }).then((r) => r.data), onSuccess: (result) => { invalidateOrder(result.purchase_order.id); void client.invalidateQueries({ queryKey: purchaseKeys.payments(result.purchase_order.id) }); invalidateFinancialQueries(client, ['payables', 'reports']) } })
  return { create, update, receive, pay }
}
