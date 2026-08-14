import type { UserRole } from '../../auth/types'

export const reportNames = [
  'dashboard',
  'product-performance',
  'sales-by-branch',
  'sales-by-rep',
  'invoice-status',
  'expense-breakdown',
  'profit-loss',
  'stock-valuation',
] as const

export type ReportName = typeof reportNames[number]
export type ReportFormat = 'xlsx' | 'pdf'
export type ReportFilters = { from?: string; to?: string; branch_id?: string; as_of?: string }
export type ReportScope = { branchId: string; locked: boolean }
export type ReportDefinition = { name: ReportName; label: string; description: string; columns: string[]; asOf?: boolean }

export type DashboardReport = { from: string; to: string; branch_id?: string | null; net_revenue: string; collected: string; outstanding_receivable: string; discounts_given: string; invoices_issued: number; inventory_units: string; inventory_value: string; total_expenses: string }
export type ProductPerformanceReport = { from: string; to: string; branch_id?: string | null; products: Array<{ product_id: string; product_code: string; product_name: string; units_sold: string; revenue: string; current_stock: string; stock_value: string; cost_source: string }> }
export type SalesByBranchReport = { from: string; to: string; branch_id?: string | null; branches: Array<{ branch_id: string; branch_code: string; branch_name: string; invoice_count: number; net_revenue: string; discounts_given: string }> }
export type SalesByRepReport = { from: string; to: string; branch_id?: string | null; reps: Array<{ sales_rep_id: string; sales_rep_name: string; invoice_count: number; net_revenue: string }> }
export type InvoiceStatusReport = { from: string; to: string; branch_id?: string | null; statuses: Array<{ status: string; invoice_count: number; net_amount: string }> }
export type ExpenseBreakdownReport = { from: string; to: string; branch_id?: string | null; categories: Array<{ category_id: string; category_code: string; category_name: string; expense_count: number; total: string }>; category_count: number; expense_count: number; total: string; excluded: { pending: { expense_count: number; total: string }; rejected: { expense_count: number; total: string } } }
export type ProfitLossWarning = { product_id: string; product_code: string; product_name: string; message: string; units: string; revenue_affected: string }
export type ProfitLossReport = { from: string; to: string; branch_id?: string | null; revenue: string; cogs: string; gross_profit: string; approved_expenses: string; disposal_value: string; sample_value: string; net_profit: string; warnings: ProfitLossWarning[] }
export type StockValuationReport = { as_of: string; branch_id?: string | null; lines: Array<{ product_id: string; product_code: string; product_name: string; quantity: string; unit_cost?: string | null; value?: string | null; cost_source: string; cost_price_missing: boolean }>; total_quantity: string; total_value: string; valued_at_selling_price_count: number; unvalued_count: number; warnings: string[] }

export type ReportData = DashboardReport | ProductPerformanceReport | SalesByBranchReport | SalesByRepReport | InvoiceStatusReport | ExpenseBreakdownReport | ProfitLossReport | StockValuationReport

export function isReportName(value: string | undefined): value is ReportName { return reportNames.includes(value as ReportName) }
export function isGlobalReportRole(role: UserRole): boolean { return role === 'ADMIN' || role === 'HO_STAFF' || role === 'ACCOUNTS' }
