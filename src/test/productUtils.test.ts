import { describe, expect, it } from 'vitest'
import { buildMovementParams, canShowProductCost, productUpdatePayload } from '../features/products/productUtils'

describe('product catalogue rules', () => {
  it('does not suggest a hidden cost when the API omits it', () => {
    expect(canShowProductCost({ id: 'p1', code: 'OX-01', name: 'Soap', category: 'Care', reorder_level: '4', unit_of_measure: 'each', image_path: null, is_active: true, unit_price: '550.00' })).toBe(false)
  })

  it('keeps price fields out of an ordinary product edit', () => {
    expect(productUpdatePayload({ code: 'OX-01', name: 'Soap', category: 'Care', unit_price: '550.00', cost_price: '320.00', reorder_level: '4', unit_of_measure: 'each', image_path: '', is_active: true })).not.toHaveProperty('unit_price')
  })

  it('keeps documented movement filters and pagination', () => {
    expect(buildMovementParams({ branch_id: 'b1', from: '2026-08-01', to: '2026-08-14', type: 'SALE', page: '2', per_page: '20', ignored: 'x' })).toEqual({ branch_id: 'b1', from: '2026-08-01', to: '2026-08-14', type: 'SALE', page: 2, per_page: 20 })
  })
})
