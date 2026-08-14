import type { StockMovement } from '../products/types'

export type TransferFilters = { branch_id?: string; status?: string; from_branch?: string; to_branch?: string; page?: string; per_page?: string; ignored?: string }
export type TransferLineInput = { product_id: string; qty: string }
export type TransferLine = { id: number; product_id: number; product_code: string; product_name: string; qty: number; received_qty: number; shortfall_qty: number }
export type Transfer = { id: number; transfer_no: string; from_branch_id: number; from_branch_code: string; from_branch_name: string; to_branch_id: number; to_branch_code: string; to_branch_name: string; dispatch_date?: string | null; receive_date?: string | null; status: string; dispatched_by?: number | null; received_by?: number | null; remarks?: string | null; total_qty: number; total_received_qty: number; has_variance: boolean; cancelled_at?: string | null; cancelled_by?: number | null; cancel_reason?: string | null; created_by?: number | null; created_at: string; lines: TransferLine[] }
export type TransferPayload = { from_branch_id: number; to_branch_id: number; remarks?: string; lines: Array<{ product_id: number; qty: number }> }
export type DispatchResult = { transfer: Transfer; movements: StockMovement[] }
export type TransferVariance = { line_id: number; product_id: number; product_code: string; product_name: string; dispatched_qty: number; received_qty: number; shortfall_qty: number }
export type ReceiveResult = { transfer: Transfer; movements: StockMovement[]; variances: TransferVariance[]; has_variance: boolean }
export type CancelResult = { transfer: Transfer; reversals: StockMovement[] }
export type InTransitLine = { from_branch_id: number; from_branch_code: string; from_branch_name: string; to_branch_id: number; to_branch_code: string; to_branch_name: string; product_id: number; product_code: string; product_name: string; quantity: number }
export type InTransit = { lines: InTransitLine[]; total_quantity: number; route_count: number }
export type Pagination = { page?: number; per_page?: number; total?: number; pages?: number }
