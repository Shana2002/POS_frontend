import { expect, test, type Page } from '@playwright/test'

const rep = { id: 'u1', full_name: 'Sales Rep', email: 'sales@oxiaura.test', role: 'SALES_REP', branch_id: 'b1', is_active: true }
const admin = { ...rep, id: 'a1', full_name: 'Admin', email: 'admin@oxiaura.test', role: 'ADMIN', branch_id: null }
const customer = { id: 'c1', code: 'CUS-01', name: 'Lanka Retail', credit_limit: '5000.00', is_active: true }
const products = [{ id: 'p1', code: 'OX-01', name: 'Serum', category: 'Care', unit_price: '100.00', reorder_level: '2', unit_of_measure: 'each', is_active: true }, { id: 'p2', code: 'OX-02', name: 'Tester', category: 'Samples', unit_price: '0.00', reorder_level: '1', unit_of_measure: 'each', is_active: true }]
const line = { id: 'l1', invoice_id: 'i1', product_id: 'p1', product_code: 'OX-01', product_name: 'Serum', qty: '1', unit_price: '100.00', line_total: '777.00', delivered_qty: '0', outstanding_qty: '1', delivery_status: 'PENDING', delivery_date: null }
const draft = { id: 'i1', invoice_no: 'INV-DRAFT-1', customer_id: 'c1', customer_code: 'CUS-01', customer_name: 'Lanka Retail', branch_id: 'b1', branch_code: 'COL', invoice_date: '2026-08-14', due_date: null, status: 'DRAFT', gross_amount: '888.00', discount_pct: '0', discount_amount: '0.00', net_amount: '777.00', amount_paid: '0.00', balance_due: '777.00', sales_rep_id: 'u1', notes: '', issued_at: null, cancelled_at: null, cancel_reason: null, created_by: 'u1', created_at: '2026-08-14T00:00:00Z', lines: [line] }

async function signIn(page: Page, user = rep) { await page.route('**/api/v1/auth/login', (route) => route.fulfill({ json: { success: true, data: { access_token: 'access', refresh_token: 'refresh', user } } })); await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, data: user } })); await page.route('**/api/v1/health', (route) => route.fulfill({ json: { success: true, data: { status: 'ok', db: 'ok' } } })); await page.route('**/api/v1/customers?**', (route) => route.fulfill({ json: { success: true, data: [customer], meta: { page: 1, pages: 1 } } })); await page.route('**/api/v1/products?**', (route) => route.fulfill({ json: { success: true, data: products, meta: { page: 1, pages: 1 } } })); await page.route('**/api/v1/branches?**', (route) => route.fulfill({ json: { success: true, data: [{ id: 'b1', code: 'COL', name: 'Colombo', is_active: true, is_warehouse: false }], meta: { page: 1, pages: 1 } } })); await page.goto('/login'); await page.getByLabel('Email').fill(user.email); await page.getByLabel('Password').fill('password'); await page.getByRole('button', { name: 'Sign in' }).click() }

test('cashier searches, filters, builds a server-backed cart, and issues without claiming payment', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/invoices', (route) => route.fulfill({ status: 201, json: { success: true, data: draft } }))
  await page.route('**/api/v1/invoices/i1/issue', (route) => route.fulfill({ json: { success: true, data: { invoice: { ...draft, status: 'ISSUED', issued_at: '2026-08-14T10:00:00Z' }, movements: [{ id: 'm1' }] } } }))
  await page.route('**/api/v1/invoices/i1', (route) => route.fulfill({ json: { success: true, data: { ...draft, status: 'ISSUED' } } }))
  await page.goto('/pos')
  await page.getByLabel('Search sale products').fill('Serum')
  await page.getByRole('button', { name: 'Care' }).click()
  await page.getByLabel('POS customer').selectOption('c1')
  await page.getByRole('button', { name: 'Add to order' }).first().click()
  await expect(page.locator('.cart-totals .total').getByText('LKR 777.00')).toBeVisible()
  await expect(page.getByText('Payment is recorded separately after invoice issue.')).toBeVisible()
  await page.getByRole('button', { name: 'Issue draft invoice' }).click()
  await expect(page.getByText('This does not mark the invoice paid.')).toBeVisible()
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(page).toHaveURL(/invoices\/i1/)
})

test('invoice lifecycle supports delivery, cancellation reversal outcome, free issue, and PDF preview', async ({ page }) => {
  await signIn(page, admin)
  const issued = { ...draft, status: 'ISSUED', net_amount: '0.00', gross_amount: '0.00', balance_due: '0.00' }
  let current = issued
  await page.route('**/api/v1/invoices/i1', (route) => route.fulfill({ json: { success: true, data: current } }))
  await page.route('**/api/v1/invoices/i1/lines/l1/delivery', (route) => { current = { ...current, status: 'DELIVERED', lines: [{ ...line, delivered_qty: '1', outstanding_qty: '0', delivery_status: 'DELIVERED' }] }; return route.fulfill({ json: { success: true, data: current } }) })
  await page.route('**/api/v1/invoices/i1/cancel', (route) => { current = { ...current, status: 'CANCELLED', cancel_reason: 'Customer request' }; return route.fulfill({ json: { success: true, data: { invoice: current, reversals: [{ id: 'r1' }] } } }) })
  await page.route('**/api/v1/invoices/i1/pdf', (route) => route.fulfill({ contentType: 'application/pdf', headers: { 'Content-Disposition': 'inline; filename="invoice-INV-DRAFT-1.pdf"' }, body: Buffer.from('%PDF-1.4') }))
  await page.goto('/invoices/i1')
  await expect(page.getByText('Free issue — zero-revenue stock movement')).toBeVisible()
  await page.getByRole('button', { name: 'Update delivery' }).click()
  await page.getByLabel('Delivered quantity').fill('1')
  await page.getByRole('button', { name: 'Update delivery' }).last().click()
  await page.getByRole('button', { name: 'Preview PDF' }).click()
  await expect(page.getByTitle('PDF preview INV-DRAFT-1')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel invoice' }).click()
  await page.getByLabel('Cancellation reason').fill('Customer request')
  await page.getByRole('button', { name: 'Cancel and reverse' }).click()
  await expect(page.getByText('Cancellation posted with reversal movements')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cancel invoice' })).toHaveCount(0)
})

test('insufficient stock details render beside the failing POS line', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/invoices', (route) => route.fulfill({ status: 201, json: { success: true, data: draft } }))
  await page.route('**/api/v1/invoices/i1/issue', (route) => route.fulfill({ status: 409, json: { success: false, error: { code: 'INSUFFICIENT_STOCK', message: 'Insufficient stock.', details: { lines: { p1: 'Only 0 units available.' } } } } }))
  await page.goto('/pos')
  await page.getByLabel('POS customer').selectOption('c1')
  await page.getByRole('button', { name: 'Add to order' }).first().click()
  await page.getByRole('button', { name: 'Issue draft invoice' }).click()
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByText('Only 0 units available.')).toBeVisible()
})
