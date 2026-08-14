import { describe, expect, it } from 'vitest'
import { amountError, buildPaymentParams, canPayInvoice, canReversePayment, paymentScope } from '../features/payments/paymentUtils'

describe('phase 8 payment and receivables rules', () => {
  it('passes only documented payment filters', () => {
    expect(buildPaymentParams({ branch_id: 'b1', invoice_id: 'i1', customer_id: 'c1', method: 'CASH', reversed: 'false', from: '2026-08-01', to: '2026-08-14', page: '2', per_page: '20', ignored: 'x' })).toEqual({ branch_id: 'b1', invoice_id: 'i1', customer_id: 'c1', method: 'CASH', reversed: false, from: '2026-08-01', to: '2026-08-14', page: 2, per_page: 20 })
  })

  it('locks branch-scoped payment users to their branch', () => {
    expect(paymentScope('BRANCH_MANAGER', 'b1', 'b9')).toEqual({ branchId: 'b1', locked: true })
    expect(paymentScope('ACCOUNTS', null, 'b9')).toEqual({ branchId: 'b9', locked: false })
  })

  it('allows payments only for issued invoice states with a balance', () => {
    expect(canPayInvoice({ status: 'ISSUED', balance_due: '50.00' })).toBe(true)
    expect(canPayInvoice({ status: 'DRAFT', balance_due: '50.00' })).toBe(false)
    expect(canPayInvoice({ status: 'ISSUED', balance_due: '0.00' })).toBe(false)
  })

  it('blocks obvious overpayment using exact decimal strings', () => {
    expect(amountError('100.01', '100.00')).toBe('Amount cannot exceed the current balance of 100.00.')
    expect(amountError('100.00', '100.00')).toBeUndefined()
  })

  it('does not offer reversal for already reversed payments', () => {
    expect(canReversePayment({ is_reversed: false })).toBe(true)
    expect(canReversePayment({ is_reversed: true })).toBe(false)
  })
})
