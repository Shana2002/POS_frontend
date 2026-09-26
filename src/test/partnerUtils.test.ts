import { describe, expect, it } from 'vitest'
import {
  buildMasterListParams,
  buildStatementParams,
  canManageMasterData,
  filterActiveOptions,
  statementEntries,
  statementReconciles,
} from '../features/partners/partnerUtils'

describe('phase 4 master-data rules', () => {
  it('keeps list filters and numeric pagination while dropping empty values', () => {
    expect(buildMasterListParams({ search: 'lanka', active: 'true', page: '2', per_page: '20', empty: '' })).toEqual({
      search: 'lanka',
      active: 'true',
      page: 2,
      per_page: 20,
    })
  })

  it('keeps statement dates and branch without replacing opening balance inputs', () => {
    expect(buildStatementParams({ from: '2026-08-01', to: '2026-08-14', branch_id: 'b1' })).toEqual({
      from: '2026-08-01',
      to: '2026-08-14',
      branch_id: 'b1',
    })
  })

  it('reconciles exact decimal statement values without binary floating point', () => {
    expect(statementReconciles('100.10', [{ debit: '0.20', credit: '0.10' }], '100.20')).toBe(true)
    expect(statementReconciles('100.10', [{ debit: '0.20', credit: '0.10' }], '100.21')).toBe(false)
  })

  it('maps the API statement rows to renderable entries, normalising number money', () => {
    // Wire shape from api_test_results.json: money as JSON numbers, rows with
    // `balance`, no per-row id, and null references on some rows.
    const statement = {
      customer_id: '1', customer_code: 'CUST-001', customer_name: 'Bloom Beauty Bar',
      from: undefined, to: undefined, opening_balance: 0, closing_balance: 3400,
      total_invoiced: 6900, total_paid: 3500, row_count: 2,
      rows: [
        { date: '2026-08-15', type: 'INVOICE', description: 'Invoice PB-00001', reference: 'PB-00001', invoice_id: '1', invoice_no: 'PB-00001', payment_id: null, debit: 6400, credit: 0, balance: 6400 },
        { date: '2026-08-15', type: 'PAYMENT', description: 'Payment by CASH against PB-00001', reference: null, invoice_id: '1', invoice_no: 'PB-00001', payment_id: '1', debit: 0, credit: 3000, balance: 3400 },
      ],
    }
    const entries = statementEntries(statement)
    expect(entries).toEqual([
      { id: '1-0', date: '2026-08-15', type: 'INVOICE', reference: 'PB-00001', debit: '6400.00', credit: '0.00', running_balance: '6400.00' },
      { id: '1', date: '2026-08-15', type: 'PAYMENT', reference: 'Payment by CASH against PB-00001', debit: '0.00', credit: '3000.00', running_balance: '3400.00' },
    ])
    expect(statementReconciles('0.00', entries, '3400.00')).toBe(true)
  })

  it('excludes inactive records from new-transaction selectors', () => {
    expect(filterActiveOptions([
      { id: '1', code: 'C-1', name: 'Active', is_active: true },
      { id: '2', code: 'C-2', name: 'Historical', is_active: false },
    ])).toEqual([{ id: '1', code: 'C-1', name: 'Active', is_active: true }])
  })

  it('limits master-data writes to operational head-office roles', () => {
    expect(canManageMasterData('ADMIN')).toBe(true)
    expect(canManageMasterData('HO_STAFF')).toBe(true)
    expect(canManageMasterData('SALES_REP')).toBe(false)
  })
})
