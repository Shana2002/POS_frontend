import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { request } from '../../api/client'
import type { StockMovement } from '../products/types'
import { buildStockParams } from './stockUtils'
import type { OpeningPayload, OpeningResult, Pagination, StockFilters, StockLevel, StockMatrix, StockValuation } from './types'

export const stockKeys = {
  all: () => ['stock'] as const,
  levels: (filters: StockFilters) => ['stock', 'levels', filters] as const,
  matrix: (filters: StockFilters) => ['stock', 'matrix', filters] as const,
  valuation: (filters: StockFilters) => ['stock', 'valuation', filters] as const,
  movements: (filters: StockFilters) => ['stock', 'movements', filters] as const,
}

export function useStockLevels(filters: StockFilters) {
  return useQuery({ queryKey: stockKeys.levels(filters), queryFn: async () => { const response = await request<StockLevel[]>({ method: 'GET', url: '/stock', params: buildStockParams(filters, ['branch_id', 'product_id', 'low_only', 'as_of']) }); return { rows: response.data, meta: response.meta as Pagination | undefined } } })
}
export function useStockMatrix(filters: StockFilters) { return useQuery({ queryKey: stockKeys.matrix(filters), queryFn: async () => (await request<StockMatrix>({ method: 'GET', url: '/stock/matrix', params: buildStockParams(filters, ['branch_id', 'product_id', 'as_of']) })).data }) }
export function useStockValuation(filters: StockFilters, enabled = true) { return useQuery({ queryKey: stockKeys.valuation(filters), queryFn: async () => (await request<StockValuation>({ method: 'GET', url: '/stock/valuation', params: buildStockParams(filters, ['branch_id', 'as_of']) })).data, enabled }) }
export function useStockMovements(filters: StockFilters) { return useQuery({ queryKey: stockKeys.movements(filters), queryFn: async () => { const response = await request<StockMovement[]>({ method: 'GET', url: '/stock/movements', params: buildStockParams(filters, ['product_id', 'branch_id', 'from', 'to', 'type', 'page', 'per_page']) }); return { rows: response.data, meta: response.meta as Pagination | undefined } } }) }
export function useOpeningBalance() { const client = useQueryClient(); return useMutation({ mutationFn: (payload: OpeningPayload) => request<OpeningResult>({ method: 'POST', url: '/stock/opening', data: payload }).then((result) => result.data), onSuccess: () => { void client.invalidateQueries({ queryKey: stockKeys.all() }); void client.invalidateQueries({ queryKey: ['products', 'movement'] }) } }) }
