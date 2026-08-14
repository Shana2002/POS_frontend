import { describe, expect, it } from 'vitest'
import { formatMoney } from '../lib/money'
import { ApiClientError, parseApiResponse } from '../api/client'
import { getFilenameFromDisposition } from '../lib/download'
import { createClientErrorEvent } from '../lib/observability'
import { invalidateFinancialQueries } from '../lib/queryInvalidation'

describe('formatMoney', () => {
  it('preserves exact decimal strings without floating point drift', () => {
    expect(formatMoney('0.10')).toBe('LKR 0.10')
    expect(formatMoney('1250.00')).toBe('LKR 1,250.00')
  })
})

describe('parseApiResponse', () => {
  it('returns data from a successful envelope', () => {
    expect(parseApiResponse({ success: true, data: { status: 'ok' } })).toEqual({ status: 'ok' })
  })

  it('throws a typed error from an error envelope', () => {
    expect(() => parseApiResponse({ success: false, error: { code: 'NOPE', message: 'Denied' } })).toThrow(ApiClientError)
  })
})

describe('getFilenameFromDisposition', () => {
  it('supports quoted UTF-8 and plain filenames', () => {
    expect(getFilenameFromDisposition("attachment; filename*=UTF-8''report%20one.xlsx")).toBe('report one.xlsx')
    expect(getFilenameFromDisposition('inline; filename="invoice-1.pdf"')).toBe('invoice-1.pdf')
  })
})

describe('client observability', () => {
  it('serializes safe error context without credentials or request bodies', () => {
    const event = createClientErrorEvent(new Error('Render failed'), { route: '/dashboard', requestId: 'req-7' })
    expect(event).toMatchObject({ message: 'Render failed', route: '/dashboard', request_id: 'req-7' })
    expect(event).not.toHaveProperty('token')
    expect(event).not.toHaveProperty('request_body')
  })
})

describe('cross-feature financial invalidation', () => {
  it.each([
    ['invoice', ['invoices', 'stock', 'products', 'receivables', 'reports']],
    ['purchase', ['purchase-orders', 'stock', 'products', 'payables', 'reports']],
    ['payment', ['payments', 'invoices', 'receivables', 'customers', 'reports']],
  ] as const)('invalidates every affected %s cache family', (_workflow, expected) => {
    const invalidated: string[] = []
    invalidateFinancialQueries({ invalidateQueries: ({ queryKey }) => { invalidated.push(String(queryKey[0])); return Promise.resolve() } }, [...expected])
    expect(invalidated).toEqual(expected)
  })
})
