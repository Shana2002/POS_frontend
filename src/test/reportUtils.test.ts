import { describe, expect, it } from 'vitest'
import {
  buildReportParams,
  getReportDefinition,
  reportScope,
  reportDefinitions,
} from '../features/reports/reportUtils'

describe('phase 12 report rules', () => {
  it('passes date-window filters only to date-window reports', () => {
    expect(buildReportParams('sales-by-branch', {
      from: '2026-08-01',
      to: '2026-08-14',
      branch_id: '2',
      as_of: '2026-08-10',
    })).toEqual({ from: '2026-08-01', to: '2026-08-14', branch_id: '2' })
  })

  it('passes as-of and branch filters only to stock valuation', () => {
    expect(buildReportParams('stock-valuation', {
      from: '2026-08-01',
      to: '2026-08-14',
      branch_id: '2',
      as_of: '2026-08-10',
    })).toEqual({ as_of: '2026-08-10', branch_id: '2' })
  })

  it('locks branch-scoped users to their assigned branch', () => {
    expect(reportScope('BRANCH_MANAGER', '7', '99')).toEqual({ branchId: '7', locked: true })
    expect(reportScope('SALES_REP', '8', '')).toEqual({ branchId: '8', locked: true })
    expect(reportScope('ADMIN', null, '99')).toEqual({ branchId: '99', locked: false })
    expect(reportScope('ACCOUNTS', null, '')).toEqual({ branchId: '', locked: false })
  })

  it('defines every API report and its accessible table columns', () => {
    expect(reportDefinitions).toHaveLength(8)
    expect(reportDefinitions.map((report) => report.name)).toEqual([
      'dashboard',
      'product-performance',
      'sales-by-branch',
      'sales-by-rep',
      'invoice-status',
      'expense-breakdown',
      'profit-loss',
      'stock-valuation',
    ])
    expect(getReportDefinition('product-performance').columns.length).toBeGreaterThan(0)
    expect(() => getReportDefinition('unknown')).toThrow('Unknown report')
  })
})
