import { describe, expect, it } from 'vitest'
import { transferKeys } from '../features/transfers/transferApi'
import { buildTransferParams, canCancelTransfer, canCreateTransfer, canDispatchTransfer, canManageTransferAction, canReceiveTransfer, dispatchAvailabilityError, hasDuplicateTransferProducts, isTransferBranchScoped, normalizeTransferLines, persistentTransferVariances, receiveVariance, transferLineError, transferScope } from '../features/transfers/transferUtils'

describe('phase 9 transfer rules', () => {
  it('passes only documented transfer filters', () => {
    expect(buildTransferParams({ branch_id: 'b1', status: 'DISPATCHED', from_branch: 'b1', to_branch: 'b2', page: '2', per_page: '20', ignored: 'x' })).toEqual({ branch_id: 'b1', status: 'DISPATCHED', from_branch: 'b1', to_branch: 'b2', page: 2, per_page: 20 })
  })

  it('locks scoped users to transfers involving their branch', () => {
    expect(transferScope('BRANCH_MANAGER', 'b1', 'b9')).toEqual({ branchId: 'b1', locked: true })
    expect(transferScope('ADMIN', null, 'b9')).toEqual({ branchId: 'b9', locked: false })
    expect(isTransferBranchScoped('BRANCH_MANAGER')).toBe(true)
    expect(isTransferBranchScoped('SALES_REP')).toBe(true)
    expect(isTransferBranchScoped('ADMIN')).toBe(false)
    expect(canCreateTransfer('BRANCH_MANAGER')).toBe(true)
    expect(canCreateTransfer('SALES_REP')).toBe(false)
    expect(canCreateTransfer('ACCOUNTS')).toBe(false)
  })

  it('normalizes unique transfer lines', () => {
    expect(normalizeTransferLines([{ product_id: '1', qty: '2' }, { product_id: '1', qty: '3' }, { product_id: '2', qty: '4' }])).toEqual([{ product_id: 1, qty: 2 }, { product_id: 2, qty: 4 }])
    expect(hasDuplicateTransferProducts([{ product_id: '1', qty: '2' }, { product_id: '1', qty: '3' }])).toBe(true)
  })

  it('maps dispatch, receive, and cancellation lifecycle actions', () => {
    expect(canDispatchTransfer('DRAFT')).toBe(true)
    expect(canDispatchTransfer('CANCELLED')).toBe(false)
    expect(canReceiveTransfer('DISPATCHED')).toBe(true)
    expect(canReceiveTransfer('RECEIVED')).toBe(false)
    expect(canCancelTransfer('DRAFT')).toBe(true)
    expect(canCancelTransfer('DISPATCHED')).toBe(true)
    expect(canCancelTransfer('RECEIVED')).toBe(false)
    expect(canCancelTransfer('CANCELLED')).toBe(false)
  })

  it('limits branch manager actions by backend role policy and transfer side', () => {
    const draft = { status: 'DRAFT', from_branch_id: 1, to_branch_id: 2 }
    const dispatched = { ...draft, status: 'DISPATCHED' }
    expect(canManageTransferAction('dispatch', draft, 'BRANCH_MANAGER', '1')).toBe(true)
    expect(canManageTransferAction('dispatch', draft, 'BRANCH_MANAGER', '2')).toBe(false)
    expect(canManageTransferAction('receive', dispatched, 'BRANCH_MANAGER', '2')).toBe(true)
    expect(canManageTransferAction('receive', dispatched, 'BRANCH_MANAGER', '1')).toBe(false)
    expect(canManageTransferAction('cancel', dispatched, 'BRANCH_MANAGER', '1')).toBe(false)
    expect(canManageTransferAction('cancel', dispatched, 'BRANCH_MANAGER', '2')).toBe(false)
    expect(canManageTransferAction('receive', dispatched, 'ADMIN', null)).toBe(true)
    expect(canManageTransferAction('cancel', dispatched, 'ADMIN', null)).toBe(true)
    expect(canManageTransferAction('cancel', dispatched, 'HO_STAFF', null)).toBe(true)
  })

  it('permits lower receipt and rejects receipt above dispatched quantity', () => {
    expect(receiveVariance('7', '10')).toEqual({ error: undefined, shortfall: '3' })
    expect(receiveVariance(7, 10)).toEqual({ error: undefined, shortfall: '3' })
    expect(receiveVariance('11', '10').error).toBe('Cannot receive more than the dispatched quantity of 10.')
    expect(receiveVariance('1.5', '10').error).toBe('Enter a whole received quantity.')
  })

  it('rejects fractional receipt quantities required to be whole units', () => {
    expect(receiveVariance('0.2', '3')).toEqual({ error: 'Enter a whole received quantity.', shortfall: undefined })
  })

  it('reconstructs unresolved variance rows from a received transfer detail', () => {
    expect(persistentTransferVariances({
      lines: [
        { id: 1, product_id: 1, product_code: 'OX-01', product_name: 'Serum', qty: 10, received_qty: 7, shortfall_qty: 3 },
        { id: 2, product_id: 2, product_code: 'OX-02', product_name: 'Cleanser', qty: 4, received_qty: 4, shortfall_qty: 0 },
      ],
    })).toEqual([{ line_id: 1, product_id: 1, product_code: 'OX-01', product_name: 'Serum', dispatched_qty: 10, received_qty: 7, shortfall_qty: 3 }])
  })

  it('rejects invalid draft transfer quantities', () => {
    expect(transferLineError('')).toBeUndefined()
    expect(transferLineError('0')).toBe('Enter a quantity greater than zero.')
    expect(transferLineError('-1')).toBe('Enter a quantity greater than zero.')
    expect(transferLineError('not-a-quantity')).toBe('Enter a valid quantity greater than zero.')
    expect(transferLineError('1.5')).toBe('Enter a whole quantity greater than zero.')
    expect(transferLineError('2')).toBeUndefined()
    expect(normalizeTransferLines([{ product_id: '1', qty: '' }, { product_id: '2', qty: '0' }, { product_id: '3', qty: '1.5' }, { product_id: '4', qty: '2' }])).toEqual([{ product_id: 4, qty: 2 }])
  })

  it('isolates transfer detail cache entries by branch scope', () => {
    expect(transferKeys.detail('t1', 'b1')).not.toEqual(transferKeys.detail('t1', 'b2'))
  })

  it('maps insufficient source stock details to the affected dispatch line', () => {
    const details = { lines: [{ product_id: 1, product_code: 'OX-01', requested: 10, available: 4, shortfall: 6 }] }
    expect(dispatchAvailabilityError(details, 1)).toBe('Requested 10; source has 4 (short 6).')
    expect(dispatchAvailabilityError(details, 2)).toBeUndefined()
  })
})
