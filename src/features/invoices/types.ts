import type { StockMovement } from '../products/types'

export type InvoiceFilters = { branch_id?: string; customer_id?: string; status?: string; sales_rep_id?: string; from?: string; to?: string; search?: string; page?: string; per_page?: string; ignored?: string }
export type InvoiceLineInput = { product_id: string; qty: string; unit_price?: string }
export type InvoiceLine = { id: string; invoice_id: string; product_id: string; product_code: string; product_name: string; qty: string; unit_price: string; line_total: string; delivered_qty: string; outstanding_qty: string; delivery_status: string; delivery_date?: string | null }
export type Invoice = { id: string; invoice_no: string; customer_id: string; customer_code: string; customer_name: string; branch_id: string; branch_code: string; invoice_date: string; due_date?: string | null; status: string; gross_amount: string; discount_pct: string; discount_amount: string; net_amount: string; amount_paid: string; balance_due: string; sales_rep_id?: string | null; notes?: string | null; issued_at?: string | null; cancelled_at?: string | null; cancel_reason?: string | null; created_by: string; created_at: string; lines: InvoiceLine[] }
export type InvoicePayload = { customer_id: string; branch_id: string; invoice_date?: string; due_date?: string; discount_pct?: string; sales_rep_id?: string; notes?: string; lines: InvoiceLineInput[] }
export type IssueResult = { invoice: Invoice; movements: StockMovement[] }
export type CancelResult = { invoice: Invoice; reversals: StockMovement[] }
export type DeliveryPayload = { delivered_qty: string; delivery_date?: string }
export type Pagination = { page?: number; per_page?: number; total?: number; pages?: number }
export type BinaryFile = { blob: Blob; filename: string }
