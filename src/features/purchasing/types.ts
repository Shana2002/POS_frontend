import type { StockMovement } from '../products/types'

export type PurchaseFilters = { branch_id?: string; supplier_id?: string; status?: string; from?: string; to?: string; page?: string; per_page?: string; ignored?: string }
export type PurchaseLineInput = { product_id: string; qty: string; unit_cost: string }
export type PurchaseLine = { id: string; po_id: string; product_id: string; product_code: string; product_name: string; qty: string; unit_cost?: string; line_total: string; received_qty: string; outstanding_qty: string; received_date?: string | null; received_by?: string | null }
export type PurchaseOrder = { id: string; po_no: string; supplier_id: string; supplier_code: string; supplier_name: string; branch_id: string; branch_code: string; order_date: string; expected_date?: string | null; total_amount: string; amount_paid: string; balance: string; brought_forward: string; status: string; remarks?: string | null; created_by: string; created_at: string; lines: PurchaseLine[] }
export type PurchasePayload = { supplier_id: string; branch_id: string; order_date?: string; expected_date?: string; brought_forward?: string; remarks?: string; lines: PurchaseLineInput[] }
export type PurchaseUpdatePayload = Partial<PurchasePayload> & { status?: 'ORDERED' }
export type ReceivePayload = { received_date?: string; lines: Array<{ line_id: number; received_qty: number }> }
export type ReceiptResult = { purchase_order: PurchaseOrder; movements: StockMovement[] }
export type SupplierPayment = { id: string; po_id: string; payment_date: string; amount: string; method: string; reference?: string | null; created_by: string; created_at: string }
export type PaymentPayload = { payment_date?: string; amount: string; method: string; reference?: string }
export type PaymentResult = { purchase_order: PurchaseOrder; payment: SupplierPayment }
export type PaymentHistory = { purchase_order_id: string; payments: SupplierPayment[] }
export type PayableRow = { purchase_order_id: string; po_no: string; supplier_id: string; supplier_code: string; supplier_name: string; branch_id: string; branch_code: string; order_date: string; total_amount: string; amount_paid: string; brought_forward: string; balance: string }
export type PayablesReport = { as_of: string; branch_id?: string | null; rows: PayableRow[]; total_balance: string }
export type Pagination = { page?: number; per_page?: number; total?: number; pages?: number }
