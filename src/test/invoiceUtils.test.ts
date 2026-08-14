import { describe, expect, it } from 'vitest'
import { buildInvoiceParams, canCancelInvoice, canDeliverInvoice, canEditInvoice, freeIssue, invoiceScope, lineError, normalizeInvoiceLines } from '../features/invoices/invoiceUtils'

describe('phase 7 invoice rules', () => {
  it('passes only documented register filters', () => {
    expect(buildInvoiceParams({ branch_id: 'b1', customer_id: 'c1', status: 'ISSUED', sales_rep_id: 'u1', from: '2026-08-01', to: '2026-08-14', search: 'INV', page: '2', per_page: '20', ignored: 'x' })).toEqual({ branch_id: 'b1', customer_id: 'c1', status: 'ISSUED', sales_rep_id: 'u1', from: '2026-08-01', to: '2026-08-14', search: 'INV', page: 2, per_page: 20 })
  })

  it('locks sales branch scope to the assigned branch', () => {
    expect(invoiceScope('SALES_REP', 'b1', 'b9')).toEqual({ branchId: 'b1', locked: true })
    expect(invoiceScope('ADMIN', null, 'b9')).toEqual({ branchId: 'b9', locked: false })
  })

  it('normalizes unique draft lines without calculating totals', () => {
    expect(normalizeInvoiceLines([{ product_id: 'p1', qty: '2', unit_price: '' }, { product_id: 'p1', qty: '5', unit_price: '10.00' }, { product_id: 'p2', qty: '1', unit_price: '25.00' }])).toEqual([{ product_id: 'p1', qty: '2' }, { product_id: 'p2', qty: '1', unit_price: '25.00' }])
  })

  it('maps lifecycle actions exactly', () => {
    expect(canEditInvoice('DRAFT')).toBe(true)
    expect(canEditInvoice('ISSUED')).toBe(false)
    expect(canDeliverInvoice('ISSUED')).toBe(true)
    expect(canCancelInvoice('CANCELLED')).toBe(false)
  })

  it('recognizes free issues only from the server net amount', () => {
    expect(freeIssue({ net_amount: '0.00' })).toBe(true)
    expect(freeIssue({ net_amount: '0.01' })).toBe(false)
  })

  it('extracts line errors from backend details', () => {
    expect(lineError({ lines: { p1: 'Only 2 units available.' } }, 'p1')).toBe('Only 2 units available.')
  })
})
