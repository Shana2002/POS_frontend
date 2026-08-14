import type { UserRole } from '../../auth/types'
import type { ReportDefinition, ReportFilters, ReportName, ReportScope } from './types'

export const reportDefinitions: ReportDefinition[] = [
  { name: 'dashboard', label: 'Executive dashboard', description: 'Revenue, collections, receivables, inventory, and expenses at a glance.', columns: ['Metric', 'Value'] },
  { name: 'product-performance', label: 'Product performance', description: 'Sales, revenue, current stock, and valuation by product.', columns: ['Product', 'Units sold', 'Revenue', 'Current stock', 'Stock value', 'Cost source'] },
  { name: 'sales-by-branch', label: 'Sales by branch', description: 'Invoice volume, net revenue, and discounts across branches.', columns: ['Branch', 'Invoices', 'Net revenue', 'Discounts'] },
  { name: 'sales-by-rep', label: 'Sales by representative', description: 'Invoice volume and net revenue by sales representative.', columns: ['Representative', 'Invoices', 'Net revenue'] },
  { name: 'invoice-status', label: 'Invoice status', description: 'Invoice counts and net amounts grouped by lifecycle status.', columns: ['Status', 'Invoices', 'Net amount'] },
  { name: 'expense-breakdown', label: 'Expense breakdown', description: 'Approved expenses by category with excluded decisions disclosed.', columns: ['Category', 'Expenses', 'Total'] },
  { name: 'profit-loss', label: 'Profit and loss', description: 'Server-calculated revenue, costs, operating expenses, and net profit.', columns: ['Metric', 'Value'] },
  { name: 'stock-valuation', label: 'Stock valuation', description: 'Inventory quantities and values with cost-quality warnings.', columns: ['Product', 'Quantity', 'Unit cost', 'Value', 'Cost source'], asOf: true },
]

export function getReportDefinition(name: string): ReportDefinition {
  const definition = reportDefinitions.find((report) => report.name === name)
  if (!definition) throw new Error(`Unknown report: ${name}`)
  return definition
}

export function reportScope(role: UserRole, assignedBranchId: string | null | undefined, requestedBranchId: string): ReportScope {
  const locked = role === 'BRANCH_MANAGER' || role === 'SALES_REP'
  return { branchId: locked ? assignedBranchId || '' : requestedBranchId, locked }
}

export function buildReportParams(name: ReportName, filters: ReportFilters): Record<string, string> {
  const params: Record<string, string> = {}
  if (filters.branch_id) params.branch_id = filters.branch_id
  if (name === 'stock-valuation') {
    if (filters.as_of) params.as_of = filters.as_of
    return params
  }
  if (filters.from) params.from = filters.from
  if (filters.to) params.to = filters.to
  return params
}
