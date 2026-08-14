import type { Invoice } from '../invoices/types'

export type PaymentFilters = { branch_id?: string; invoice_id?: string; customer_id?: string; method?: string; reversed?: string; from?: string; to?: string; page?: string; per_page?: string; ignored?: string }
export type Payment = { id: string; invoice_id: string; invoice_no: string; customer_id: string; customer_code: string; customer_name: string; branch_id: string; branch_code: string; payment_date: string; amount: string; method: string; reference?: string | null; is_reversed: boolean; reversed_at?: string | null; reversed_by?: string | null; reversal_reason?: string | null; created_by: string; created_at: string }
export type PaymentPayload = { invoice_id: string; payment_date?: string; amount: string; method: string; reference?: string }
export type PaymentResult = { payment: Payment; invoice: Invoice }
export type ReceivableRow = { invoice_id: string; invoice_no: string; customer_id: string; customer_code: string; customer_name: string; branch_id: string; branch_code: string; invoice_date: string; due_date?: string | null; days_overdue: number; net_amount: string; amount_paid: string; balance_due: string }
export type OutstandingReceivables = { as_of: string; branch_id?: string | null; rows: ReceivableRow[]; total_outstanding: string }
export type AgingBucket = { name: string; from_days: number | null; to_days: number | null; invoice_count: number; amount: string }
export type AgingAnalysis = { as_of: string; branch_id?: string | null; buckets: AgingBucket[]; total_outstanding: string }
export type Pagination = { page?: number; per_page?: number; total?: number; pages?: number }
export type BinaryFile = { blob: Blob; filename: string }
