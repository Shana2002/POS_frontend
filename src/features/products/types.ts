export type Product = {
  id: string
  code: string
  name: string
  category: string
  unit_price?: string
  cost_price?: string
  reorder_level: string
  unit_of_measure: string
  image_path?: string | null
  is_active: boolean
  is_low?: boolean
  created_at?: string
  updated_at?: string
}

export type ProductFormValues = {
  code: string
  name: string
  category: string
  unit_price?: string
  cost_price?: string
  reorder_level: string
  unit_of_measure: string
  image_path?: string
  is_active: boolean
}

export type ProductPayload = Omit<ProductFormValues, 'unit_price' | 'cost_price'> & { unit_price?: string; cost_price?: string }
export type ProductListFilters = { search?: string; category?: string; active?: string; page?: string; per_page?: string }
export type MovementFilters = { branch_id?: string; from?: string; to?: string; type?: string; page?: string; per_page?: string; [key: string]: string | undefined }
export type PriceHistoryEntry = { id: string; product_id: string; price: string; cost_price?: string; effective_from: string; changed_by: string; created_at: string }
export type StockMovement = { id: string; movement_date: string; product_id: string; product_code: string; product_name: string; branch_id: string; branch_code: string; movement_type: string; qty_in: string; qty_out: string; signed_qty: string; unit_cost?: string; reference_type: string; reference_id: string; notes?: string; created_by: string; created_at: string }
export type ProductMovement = { product_id: string; branch_id?: string; from?: string; to?: string; opening_balance: string; total_in: string; total_out: string; closing_balance: string; movement_count: number; rows: Array<{ movement: StockMovement; running_balance: string }> }
export type Pagination = { page?: number; per_page?: number; total?: number; pages?: number }
