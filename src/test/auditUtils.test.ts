import { describe, expect, it } from 'vitest'
import { buildAuditParams, compareAuditValues } from '../features/audit/auditUtils'

describe('audit utilities', () => {
  it('builds only documented audit-log query parameters', () => {
    expect(buildAuditParams({
      table_name: 'invoices',
      record_id: 'INV-42',
      user_id: '7',
      action: 'UPDATE',
      from: '2026-08-01',
      to: '2026-08-14',
      page: '2',
      per_page: '20',
      ignored: 'secret',
    })).toEqual({
      table_name: 'invoices',
      record_id: 'INV-42',
      user_id: '7',
      action: 'UPDATE',
      from: '2026-08-01',
      to: '2026-08-14',
      page: 2,
      per_page: 20,
    })
  })

  it('compares nested values at field level', () => {
    const rows = compareAuditValues(
      { status: 'DRAFT', customer: { name: 'Acme', phone: '011' }, note: 'remove me' },
      { status: 'ISSUED', customer: { name: 'Acme', email: 'ops@acme.test' }, total: '1250.00' },
    )

    expect(rows).toEqual([
      { field: 'customer.email', oldValue: undefined, newValue: 'ops@acme.test', change: 'added' },
      { field: 'customer.name', oldValue: 'Acme', newValue: 'Acme', change: 'unchanged' },
      { field: 'customer.phone', oldValue: '011', newValue: undefined, change: 'removed' },
      { field: 'note', oldValue: 'remove me', newValue: undefined, change: 'removed' },
      { field: 'status', oldValue: 'DRAFT', newValue: 'ISSUED', change: 'changed' },
      { field: 'total', oldValue: undefined, newValue: '1250.00', change: 'added' },
    ])
  })

  it('keeps arrays and null values copy-friendly without flattening array indices', () => {
    const rows = compareAuditValues({ lines: [{ id: 1 }], reason: null }, { lines: [{ id: 1 }, { id: 2 }], reason: null })
    expect(rows).toEqual([
      { field: 'lines', oldValue: [{ id: 1 }], newValue: [{ id: 1 }, { id: 2 }], change: 'changed' },
      { field: 'reason', oldValue: null, newValue: null, change: 'unchanged' },
    ])
  })
})
