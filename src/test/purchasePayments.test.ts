import { describe, expect, it } from 'vitest'
import { payableRows, paymentRows, payableMoney } from '../features/purchasing/purchaseUtils'
import type { PaymentHistory, PayablesReport } from '../features/purchasing/types'

describe('purchase payment history rendering data', () => {
  it('uses an empty collection when the backend omits payments', () => {
    expect(paymentRows({ purchase_order_id: 'po-1' } as Partial<PaymentHistory>)).toEqual([])
  })

  it('uses zero when a payables money field is missing', () => {
    expect(payableMoney(undefined)).toBe('0.00')
    expect(payableMoney('125.50')).toBe('125.50')
  })

  it('uses an empty collection when a payables response omits rows', () => {
    expect(payableRows({ total_balance: '0.00' } as Partial<PayablesReport>)).toEqual([])
  })
})