import { expect, test, type Page } from '@playwright/test'

const admin = { id: 'a1', full_name: 'Admin User', email: 'admin@oxiaura.test', role: 'ADMIN', branch_id: null, is_active: true }
const branches = [{ id: 'b1', code: 'COL', name: 'Colombo', is_warehouse: false, is_active: true }]
const suppliers = [{ id: 's1', code: 'SUP-01', name: 'Aura Labs', contact: '', email: '', address: '', payment_terms_days: 30, is_active: true }]
const products = [{ id: 'p1', code: 'OX-01', name: 'Serum', category: 'Care', reorder_level: '5', unit_of_measure: 'each', is_active: true }, { id: 'p2', code: 'OX-02', name: 'Cleanser', category: 'Care', reorder_level: '5', unit_of_measure: 'each', is_active: true }]
const po = { id: 'po1', po_no: 'PO-001', supplier_id: 's1', supplier_code: 'SUP-01', supplier_name: 'Aura Labs', branch_id: 'b1', branch_code: 'COL', order_date: '2026-08-14', expected_date: '2026-08-20', total_amount: '1000.00', amount_paid: '200.00', balance: '800.00', brought_forward: '0.00', status: 'ORDERED', remarks: '', created_by: 'a1', created_at: '2026-08-14T00:00:00Z', lines: [{ id: 'l1', po_id: 'po1', product_id: 'p1', product_code: 'OX-01', product_name: 'Serum', qty: '10', unit_cost: '100.00', line_total: '1000.00', received_qty: '4', outstanding_qty: '6', received_date: null, received_by: null }] }

async function signIn(page: Page) {
  await page.route('**/api/v1/auth/login', (route) => route.fulfill({ json: { success: true, data: { access_token: 'access', refresh_token: 'refresh', user: admin } } }))
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, data: admin } }))
  await page.route('**/api/v1/health', (route) => route.fulfill({ json: { success: true, data: { status: 'ok', db: 'ok' } } }))
  await page.route('**/api/v1/branches?**', (route) => route.fulfill({ json: { success: true, data: branches, meta: { page: 1, pages: 1 } } }))
  await page.route('**/api/v1/suppliers?**', (route) => route.fulfill({ json: { success: true, data: suppliers, meta: { page: 1, pages: 1 } } }))
  await page.route('**/api/v1/products?**', (route) => route.fulfill({ json: { success: true, data: products, meta: { page: 1, pages: 1 } } }))
  await page.goto('/login')
  await page.getByLabel('Email').fill(admin.email)
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test('draft editor prevents duplicate products and saves server-owned totals', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/purchase-orders', async (route) => route.fulfill({ status: 201, json: { success: true, data: { ...po, status: 'DRAFT', total_amount: '777.00', balance: '777.00' } } }))
  await page.route('**/api/v1/purchase-orders/po1*', (route) => route.fulfill({ json: { success: true, data: { ...po, status: 'DRAFT', total_amount: '777.00', balance: '777.00' } } }))
  await page.route('**/api/v1/purchase-orders/po1/payments', (route) => route.fulfill({ json: { success: true, data: { purchase_order_id: 'po1', payments: [] } } }))
  await page.goto('/purchase-orders/new')
  await page.getByLabel('Purchase order supplier').selectOption('s1')
  await page.getByLabel('Purchase order branch').selectOption('b1')
  await page.getByLabel('Line 1 product').selectOption('p1')
  await page.getByLabel('Line 1 quantity').fill('2')
  await page.getByLabel('Line 1 unit cost').fill('100.00')
  await page.getByRole('button', { name: 'Add line' }).click()
  await page.getByLabel('Line 2 product').selectOption('p1')
  await page.getByLabel('Line 2 quantity').fill('1')
  await page.getByLabel('Line 2 unit cost').fill('100.00')
  await expect(page.getByText('Each product can appear only once.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save draft purchase order' })).toBeDisabled()
  await page.getByLabel('Line 2 product').selectOption('p2')
  await page.getByRole('button', { name: 'Save draft purchase order' }).click()
  await expect(page).toHaveURL(/purchase-orders\/po1/)
  await expect(page.getByText('LKR 777.00').first()).toBeVisible()
})

test('goods receipt blocks over-receipt then shows posted movements', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/purchase-orders/po1', (route) => route.fulfill({ json: { success: true, data: po } }))
  await page.route('**/api/v1/purchase-orders/po1/payments', (route) => route.fulfill({ json: { success: true, data: { purchase_order_id: 'po1', payments: [] } } }))
  await page.route('**/api/v1/purchase-orders/po1/receive', (route) => route.fulfill({ json: { success: true, data: { purchase_order: { ...po, status: 'RECEIVED', lines: [{ ...po.lines[0], received_qty: '10', outstanding_qty: '0' }] }, movements: [{ id: 'm1' }] } } }))
  await page.goto('/purchase-orders/po1')
  await expect(page.getByRole('cell', { name: '10', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: '4', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: '6', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Receive goods' }).click()
  await page.getByLabel('Receive OX-01 quantity').fill('7')
  await expect(page.getByText('Cannot receive more than the outstanding quantity of 6.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Post goods receipt' })).toBeDisabled()
  await page.getByLabel('Receive OX-01 quantity').fill('6')
  await page.getByRole('button', { name: 'Post goods receipt' }).click()
  await expect(page.getByText('Goods receipt posted successfully.')).toBeVisible()
  await expect(page.getByText('1 stock movement(s) created.')).toBeVisible()
})

test('supplier payment shows server balances before and after and payables server total', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/purchase-orders/po1', (route) => route.fulfill({ json: { success: true, data: po } }))
  await page.route('**/api/v1/purchase-orders/po1/payments', async (route) => route.request().method() === 'POST' ? route.fulfill({ status: 201, json: { success: true, data: { purchase_order: { ...po, amount_paid: '500.00', balance: '500.00' }, payment: { id: 'sp1', po_id: 'po1', payment_date: '2026-08-14', amount: '300.00', method: 'CASH', created_by: 'a1', created_at: '2026-08-14T00:00:00Z' } } } }) : route.fulfill({ json: { success: true, data: { purchase_order_id: 'po1', payments: [] } } }))
  await page.goto('/purchase-orders/po1')
  await page.getByRole('button', { name: 'Record payment' }).click()
  await expect(page.getByText('Current server balance')).toBeVisible()
  await page.getByLabel('Supplier payment amount').fill('300.00')
  await page.getByLabel('Supplier payment method').selectOption('CASH')
  await page.getByRole('dialog', { name: 'Record supplier payment' }).getByRole('button', { name: 'Record payment' }).click()
  await expect(page.getByText('Supplier payment recorded.')).toBeVisible()
  const paymentDialog = page.getByRole('dialog', { name: 'Record supplier payment' })
  await expect(paymentDialog.getByText('LKR 800.00')).toBeVisible()
  await expect(paymentDialog.getByText('LKR 500.00')).toBeVisible()

  await page.route('**/api/v1/payables/outstanding*', (route) => route.fulfill({ json: { success: true, data: { as_of: '2026-08-14', branch_id: null, rows: [{ purchase_order_id: 'po1', po_no: 'PO-001', supplier_id: 's1', supplier_code: 'SUP-01', supplier_name: 'Aura Labs', branch_id: 'b1', branch_code: 'COL', order_date: '2026-08-14', total_amount: '1000.00', amount_paid: '200.00', brought_forward: '0.00', balance: '800.00' }], total_balance: '9999.00' } } }))
  await page.goto('/payables')
  await expect(page.getByText('LKR 9,999.00')).toBeVisible()
})
