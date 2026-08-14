import type { StockMovement } from '../products/types'

export type StockLevel = { product_id: string; product_code: string; product_name: string; branch_id: string; branch_code: string; branch_name: string; quantity: string; reorder_level: string; is_low: boolean }
export type StockFilters = { branch_id?: string; product_id?: string; low_only?: string; as_of?: string; from?: string; to?: string; type?: string; page?: string; per_page?: string; [key: string]: string | undefined }
export type StockMatrix = { as_of: string; branches: Array<{ id: string; code: string; name: string }>; rows: Array<{ product_id: string; product_code: string; product_name: string; reorder_level: string; quantities: Record<string, string>; total: string; is_low: boolean }>; branch_totals: Record<string, string>; grand_total: string }
export type ValuationLine = { product_id: string; product_code: string; product_name: string; quantity: string; unit_cost?: string | null; value?: string | null; cost_source?: string | null; cost_price_missing: boolean }
export type StockValuation = { as_of: string; branch_id?: string | null; lines: ValuationLine[]; total_quantity: string; total_value: string; valued_at_selling_price_count: number; unvalued_count: number; warnings: string[] }
export type Pagination = { page?: number; per_page?: number; total?: number; pages?: number }
export type OpeningLineInput = { product_id: string; product_code: string; branch_id: string; branch_code: string; qty: string; movement_date: string; notes: string }
export type OpeningLine = { product_id?: string; product_code?: string; branch_id?: string; branch_code?: string; qty: string; movement_date?: string; notes?: string }
export type OpeningPayload = { movement_date?: string; notes?: string; lines: OpeningLine[] }
export type OpeningSkipped = { product_id?: string; product_code?: string; branch_id?: string; branch_code?: string; qty: string; reason: string }
export type OpeningResult = { created_count: number; skipped_count: number; created: StockMovement[]; skipped: OpeningSkipped[] }
