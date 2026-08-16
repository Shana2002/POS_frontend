import { describe, expect, it } from 'vitest'
import { buildPurchaseParams, buildReceivePayload, canEditPurchaseOrder, canOrderPurchaseOrder, canViewPurchaseCosts, normalizePurchaseLines, receiveLineError } from '../features/purchasing/purchaseUtils'

describe('phase 6 purchasing rules', () => {
  it('passes only documented register filters', () => {
    expect(buildPurchaseParams({ branch_id: 'b1', supplier_id: 's1', status: 'DRAFT', from: '2026-08-01', to: '2026-08-14', page: '2', per_page: '20', ignored: 'x' })).toEqual({ branch_id: 'b1', supplier_id: 's1', status: 'DRAFT', from: '2026-08-01', to: '2026-08-14', page: 2, per_page: 20 })
  })

  it('keeps one line per product and exact decimal strings', () => {
    expect(normalizePurchaseLines([
      { product_id: 'p1', qty: '2', unit_cost: '125.50' },
      { product_id: 'p1', qty: '3', unit_cost: '130.00' },
      { product_id: 'p2', qty: '1.5', unit_cost: '75.00' },
    ])).toEqual([
      { product_id: 'p1', qty: '2', unit_cost: '125.50' },
      { product_id: 'p2', qty: '1.5', unit_cost: '75.00' },
    ])
  })

  it('allows editing only while draft', () => {
    expect(canEditPurchaseOrder('DRAFT')).toBe(true)
    expect(canEditPurchaseOrder('RECEIVED')).toBe(false)
  })

  it('allows only an admin to transition a draft purchase order to ordered', () => {
    expect(canOrderPurchaseOrder('ADMIN', 'DRAFT')).toBe(true)
    expect(canOrderPurchaseOrder('HO_STAFF', 'DRAFT')).toBe(false)
    expect(canOrderPurchaseOrder('ADMIN', 'ORDERED')).toBe(false)
  })

  it('blocks obvious over-receipt without replacing backend validation', () => {
    expect(receiveLineError('6', '5')).toBe('Cannot receive more than the outstanding quantity of 5.')
    expect(receiveLineError('5', '5')).toBeUndefined()
  })

  it('serializes the goods receipt using the API field names', () => {
    expect(buildReceivePayload('2026-08-15', [
      { line_id: '1', quantity: '100' },
      { line_id: '2', quantity: '50' },
    ])).toEqual({
      lines: [
        { line_id: 1, received_qty: 100, received_date: '2026-08-15' },
        { line_id: 2, received_qty: 50, received_date: '2026-08-15' },
      ],
    })
  })

  it('omits zero-quantity lines because the receipt API requires positive quantities', () => {
    expect(buildReceivePayload('', [
      { line_id: '1', quantity: '0' },
      { line_id: '2', quantity: '50' },
    ])).toEqual({
      lines: [{ line_id: 2, received_qty: 50 }],
    })
  })

  it('rejects non-numeric purchase order line identifiers before posting', () => {
    expect(() => buildReceivePayload('', [{ line_id: 'line-1', quantity: '10' }])).toThrow('Purchase order receipt contains an invalid line or quantity.')
  })

  it('hides purchase costs from sales representatives', () => {
    expect(canViewPurchaseCosts('ACCOUNTS')).toBe(true)
    expect(canViewPurchaseCosts('SALES_REP')).toBe(false)
  })
})
