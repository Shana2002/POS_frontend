import { expect, test, type Page } from '@playwright/test'

const accounts = { id: 'a1', full_name: 'Accounts User', email: 'accounts@oxiaura.test', role: 'ACCOUNTS', branch_id: null, is_active: true }
const customer = { id: 'c1', code: 'CUS-01', name: 'Lanka Retail', credit_limit: '5000.00', is_active: true }
const invoice = { id: 'i1', invoice_no: 'INV-001', customer_id: 'c1', customer_code: 'CUS-01', customer_name: 'Lanka Retail', branch_id: 'b1', branch_code: 'COL', invoice_date: '2026-08-14', due_date: '2026-08-20', status: 'ISSUED', gross_amount: '1000.00', discount_pct: '0', discount_amount: '0.00', net_amount: '1000.00', amount_paid: '200.00', balance_due: '800.00', sales_rep_id: 'u1', notes: '', issued_at: '2026-08-14T00:00:00Z', cancelled_at: null, cancel_reason: null, created_by: 'u1', created_at: '2026-08-14T00:00:00Z', lines: [] }
const payment = { id: 'pay1', invoice_id: 'i1', invoice_no: 'INV-001', customer_id: 'c1', customer_code: 'CUS-01', customer_name: 'Lanka Retail', branch_id: 'b1', branch_code: 'COL', payment_date: '2026-08-14', amount: '300.00', method: 'CASH', reference: 'R-1', is_reversed: false, reversed_at: null, reversed_by: null, reversal_reason: null, created_by: 'a1', created_at: '2026-08-14T00:00:00Z' }

async function signIn(page: Page) { await page.route('**/api/v1/auth/login', (route) => route.fulfill({ json: { success: true, data: { access_token: 'access', refresh_token: 'refresh', user: accounts } } })); await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, data: accounts } })); await page.route('**/api/v1/health', (route) => route.fulfill({ json: { success: true, data: { status: 'ok', db: 'ok' } } })); await page.route('**/api/v1/branches?**', (route) => route.fulfill({ json: { success: true, data: [{ id: 'b1', code: 'COL', name: 'Colombo', is_active: true, is_warehouse: false }], meta: { page: 1, pages: 1 } } })); await page.route('**/api/v1/customers?**', (route) => route.fulfill({ json: { success: true, data: [customer], meta: { page: 1, pages: 1 } } })); await page.goto('/login'); await page.getByLabel('Email').fill(accounts.email); await page.getByLabel('Password').fill('password'); await page.getByRole('button', { name: 'Sign in' }).click() }

test('payment starts from eligible invoice, blocks obvious overpayment, and uses server result', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/invoices?**', (route) => route.fulfill({ json: { success: true, data: [invoice], meta: { page: 1, pages: 1 } } }))
  await page.route('**/api/v1/invoices/i1*', (route) => route.fulfill({ json: { success: true, data: invoice } }))
  await page.route('**/api/v1/payments', (route) => route.fulfill({ status: 201, json: { success: true, data: { payment, invoice: { ...invoice, amount_paid: '500.00', balance_due: '123.45' } } } }))
  await page.route('**/api/v1/payments/pay1*', (route) => route.fulfill({ json: { success: true, data: payment } }))
  await page.goto('/payments/new?invoice_id=i1')
  await expect(page.locator('.invoice-balance-card').getByText('LKR 800.00')).toBeVisible()
  await page.getByLabel('Customer payment amount').fill('800.01')
  await expect(page.getByText('Amount cannot exceed the current balance of 800.00.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Record payment' })).toBeDisabled()
  await page.getByLabel('Customer payment amount').fill('300.00')
  await page.getByRole('button', { name: 'Record payment' }).click()
  await expect(page).toHaveURL(/payments\/pay1/)
})

test('payment detail reverses with reason, keeps reversed history, and previews receipt PDF', async ({ page }) => {
  await signIn(page)
  let current = payment
  await page.route('**/api/v1/payments/pay1', (route) => route.fulfill({ json: { success: true, data: current } }))
  await page.route('**/api/v1/payments/pay1/reverse', (route) => { current = { ...current, is_reversed: true, reversal_reason: 'Duplicate entry', reversed_at: '2026-08-14T10:00:00Z' }; return route.fulfill({ json: { success: true, data: { payment: current, invoice: { ...invoice, balance_due: '800.00' } } } }) })
  await page.route('**/api/v1/payments/pay1/receipt-pdf', (route) => route.fulfill({ contentType: 'application/pdf', headers: { 'Content-Disposition': 'inline; filename="receipt-pay1.pdf"' }, body: Buffer.from('%PDF-1.4') }))
  await page.goto('/payments/pay1')
  await page.getByRole('button', { name: 'Preview receipt' }).click()
  await expect(page.getByTitle('Receipt preview pay1')).toBeVisible()
  await page.getByRole('button', { name: 'Reverse payment' }).click()
  await page.getByLabel('Payment reversal reason').fill('Duplicate entry')
  await page.getByRole('button', { name: 'Reverse payment' }).last().click()
  await expect(page.getByText('Payment reversed')).toBeVisible()
  await expect(page.getByText('Duplicate entry')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reverse payment' })).toHaveCount(0)
})

test('receivables and aging render server totals exactly', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/receivables/outstanding*', (route) => route.fulfill({ json: { success: true, data: { as_of: '2026-08-14', branch_id: null, rows: [{ invoice_id: 'i1', invoice_no: 'INV-001', customer_id: 'c1', customer_code: 'CUS-01', customer_name: 'Lanka Retail', branch_id: 'b1', branch_code: 'COL', invoice_date: '2026-08-01', due_date: '2026-08-10', days_overdue: 4, net_amount: '1000.00', amount_paid: '200.00', balance_due: '800.00' }], total_outstanding: '9876.54' } } }))
  await page.goto('/receivables/outstanding')
  await expect(page.getByText('LKR 9,876.54')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Record payment' })).toBeVisible()
  await page.route('**/api/v1/receivables/aging*', (route) => route.fulfill({ json: { success: true, data: { as_of: '2026-08-14', branch_id: null, buckets: [{ name: 'Current', from_days: 0, to_days: 0, invoice_count: 2, amount: '4321.00' }, { name: '31-60', from_days: 31, to_days: 60, invoice_count: 1, amount: '999.00' }], total_outstanding: '7654.32' } } }))
  await page.goto('/receivables/aging')
  await expect(page.getByText('LKR 7,654.32')).toBeVisible()
  await expect(page.getByText('LKR 4,321.00')).toBeVisible()
})

test('backend OVERPAYMENT remains visible as final authority', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/invoices?**', (route) => route.fulfill({ json: { success: true, data: [invoice], meta: { page: 1, pages: 1 } } }))
  await page.route('**/api/v1/invoices/i1*', (route) => route.fulfill({ json: { success: true, data: invoice } }))
  await page.route('**/api/v1/payments', (route) => route.fulfill({ status: 409, json: { success: false, error: { code: 'OVERPAYMENT', message: 'Payment exceeds the latest invoice balance.' } } }))
  await page.goto('/payments/new?invoice_id=i1')
  await page.getByLabel('Customer payment amount').fill('300.00')
  await page.getByRole('button', { name: 'Record payment' }).click()
  await expect(page.getByText('Payment exceeds the latest invoice balance.')).toBeVisible()
  await expect(page.getByText('Backend rejected this as an overpayment.')).toBeVisible()
})
