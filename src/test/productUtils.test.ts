import { describe, expect, it } from 'vitest'
import { buildMovementParams, canShowProductCost, productImageKind, productUpdatePayload } from '../features/products/productUtils'

describe('product catalogue rules', () => {
  it('does not suggest a hidden cost when the API omits it', () => {
    expect(canShowProductCost({ id: 'p1', code: 'OX-01', name: 'Soap', category_id: 'c1', category_code: 'CARE', category_name: 'Care', reorder_level: '4', unit_of_measure: 'each', image_path: null, is_active: true, unit_price: '550.00' })).toBe(false)
  })

  it('keeps price fields out of an ordinary product edit', () => {
    expect(productUpdatePayload({ code: 'OX-01', name: 'Soap', category_id: 'c1', unit_price: '550.00', cost_price: '320.00', reorder_level: '4', unit_of_measure: 'each', is_active: true })).not.toHaveProperty('unit_price')
  })

  it('sends the selected category id when registering or editing a product', () => {
    expect(productUpdatePayload({ code: 'OX-01', name: 'Soap', category_id: 'c1', reorder_level: '4', unit_of_measure: 'each', is_active: true })).toMatchObject({ category_id: 'c1' })
  })

  it('keeps the image out of the JSON create/update body — it goes through the upload endpoints', () => {
    const payload = productUpdatePayload({ code: 'OX-01', name: 'Soap', category_id: 'c1', reorder_level: '4', unit_of_measure: 'each', image_file: new File([], 'photo.png'), is_active: true })
    expect(payload).not.toHaveProperty('image_path')
    expect(payload).not.toHaveProperty('image_file')
  })

  describe('product image kinds', () => {
    it('treats missing and empty paths as no image', () => {
      expect(productImageKind(undefined)).toBe('none')
      expect(productImageKind(null)).toBe('none')
      expect(productImageKind('')).toBe('none')
    })

    it('renders legacy rows with a full URL directly', () => {
      expect(productImageKind('https://example.com/photo.png')).toBe('url')
      expect(productImageKind('http://example.com/photo.jpg')).toBe('url')
      expect(productImageKind('//example.com/photo.png')).toBe('url')
      expect(productImageKind('data:image/png;base64,AAAA')).toBe('url')
    })

    it('fetches server-stored filenames authenticated', () => {
      expect(productImageKind('product_7_ab12cd34ef56.png')).toBe('server')
    })
  })

  it('keeps documented movement filters and pagination', () => {
    expect(buildMovementParams({ branch_id: 'b1', from: '2026-08-01', to: '2026-08-14', type: 'SALE', page: '2', per_page: '20', ignored: 'x' })).toEqual({ branch_id: 'b1', from: '2026-08-01', to: '2026-08-14', type: 'SALE', page: 2, per_page: 20 })
  })
})
