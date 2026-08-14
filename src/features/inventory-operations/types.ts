import type { StockMovement } from '../products/types'

export type OperationFilters = {
  branch_id?: string
  product_id?: string
  reason?: string
  approved?: string
  status?: string
  from?: string
  to?: string
  page?: string
  per_page?: string
  ignored?: string
}
export type Pagination = { page?: number; per_page?: number; total?: number; pages?: number }
export type Sample = { id: number; sample_date: string; product_id: number; product_code: string; product_name: string; branch_id: number; branch_code: string; qty: number; person?: string | null; purpose?: string | null; authorised_by: string; status: string; created_by: number; created_at: string }
export type Disposal = { id: number; disposal_date: string; product_id: number; product_code: string; product_name: string; branch_id: number; branch_code: string; qty: number; unit_price?: string; value?: string; reason: string; remark?: string | null; is_approved: boolean; approved_by?: number | null; approved_at?: string | null; created_by: number; created_at: string }
export type StockCountLine = { id: number; product_id: number; product_code: string; product_name: string; system_qty?: number | null; counted_qty: number; variance?: number | null; adjusted: boolean }
export type StockCount = { id: number; count_no: string; branch_id: number; branch_code: string; count_date: string; status: string; counted_by: number; approved_by?: number | null; submitted_at?: string | null; approved_at?: string | null; total_variance?: number | null; created_at: string; lines: StockCountLine[] }
export type SamplePayload = { product_id: number; branch_id: number; qty: number; authorised_by: string; sample_date?: string; person?: string; purpose?: string }
export type DisposalPayload = { product_id: number; branch_id: number; qty: number; reason: string; disposal_date?: string; remark?: string }
export type CountLineInput = { product_id: string; counted_qty: string }
export type StockCountPayload = { branch_id: number; count_date?: string; lines: Array<{ product_id: number; counted_qty: number }> }
export type SampleResult = { sample: Sample; movement: StockMovement }
export type DisposalApprovalResult = { disposal: Disposal; movement: StockMovement }
export type StockCountApprovalResult = { stock_count: StockCount; movements: StockMovement[] }
