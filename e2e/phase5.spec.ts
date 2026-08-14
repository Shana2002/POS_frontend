import { expect, test, type Page } from '@playwright/test'

const admin = { id: 'a1', full_name: 'Admin User', email: 'admin@oxiaura.test', role: 'ADMIN', branch_id: null, is_active: true }
const manager = { id: 'm1', full_name: 'Branch Manager', email: 'manager@oxiaura.test', role: 'BRANCH_MANAGER', branch_id: 'b1', is_active: true }
const branches = [{ id: 'b1', code: 'COL', name: 'Colombo', is_warehouse: false, is_active: true }, { id: 'b2', code: 'KAN', name: 'Kandy', is_warehouse: false, is_active: true }]

async function signIn(page: Page, user = admin) {
  await page.route('**/api/v1/auth/login', (route) => route.fulfill({ json: { success: true, data: { access_token: 'access', refresh_token: 'refresh', user } } }))
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, data: user } }))
  await page.route('**/api/v1/health', (route) => route.fulfill({ json: { success: true, data: { status: 'ok', db: 'ok' } } }))
  await page.route('**/api/v1/branches?**', (route) => route.fulfill({ json: { success: true, data: branches, meta: { page: 1, pages: 1 } } }))
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test('stock levels expose low and historical states while branch managers stay scoped', async ({ page }) => {
  await signIn(page, manager)
  await page.route('**/api/v1/stock?**', (route) => route.fulfill({ json: { success: true, data: [{ product_id: 'p1', product_code: 'OX-01', product_name: 'Serum', branch_id: 'b1', branch_code: 'COL', branch_name: 'Colombo', quantity: '2', reorder_level: '5', is_low: true }], meta: { total: 1 } } }))
  await page.goto('/stock?branch_id=b2&as_of=2026-08-14&low_only=true')
  await expect(page.getByLabel('Assigned branch')).toBeVisible()
  await expect(page.getByLabel('Stock branch')).toHaveCount(0)
  await expect(page.getByText('Historical stock as of 2026-08-14')).toBeVisible()
  await expect(page.locator('.stock-status.low')).toContainText('Low stock')
  await expect(page.getByRole('link', { name: 'Load opening balances' })).toHaveCount(0)
})

test('matrix and valuation display only server-returned totals and missing-cost warnings', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/stock/matrix*', (route) => route.fulfill({ json: { success: true, data: { as_of: '2026-08-14', branches, rows: [{ product_id: 'p1', product_code: 'OX-01', product_name: 'Serum', reorder_level: '5', quantities: { b1: '2', b2: '7' }, total: '99', is_low: false }], branch_totals: { b1: '20', b2: '70' }, grand_total: '900' } } }))
  await page.goto('/stock/matrix?as_of=2026-08-14')
  await expect(page.getByText('Server totals')).toBeVisible()
  await expect(page.getByText('900')).toBeVisible()

  await page.route('**/api/v1/stock/valuation*', (route) => route.fulfill({ json: { success: true, data: { as_of: '2026-08-14', branch_id: null, lines: [{ product_id: 'p1', product_code: 'OX-01', product_name: 'Serum', quantity: '2', unit_cost: null, value: null, cost_source: null, cost_price_missing: true }], total_quantity: '2', total_value: '0.00', valued_at_selling_price_count: 0, unvalued_count: 1, warnings: ['OX-01 has no cost history.'] } } }))
  await page.goto('/stock/valuation?as_of=2026-08-14')
  await expect(page.getByText('Valuation requires attention')).toBeVisible()
  await expect(page.getByText('Not valued')).toBeVisible()
  await expect(page.getByText('LKR 0.00')).toBeVisible()
})

test('ADMIN opening load reports every created and skipped pair', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/stock/opening', async (route) => route.fulfill({ status: 201, json: { success: true, data: { created_count: 1, skipped_count: 1, created: [{ id: 'mv1', movement_date: '2026-08-14', product_id: 'p1', product_code: 'OX-01', product_name: 'Serum', branch_id: 'b1', branch_code: 'COL', movement_type: 'OPENING', qty_in: '5', qty_out: '0', signed_qty: '5', reference_type: 'OPENING', reference_id: 'opening', created_by: 'a1', created_at: '2026-08-14T00:00:00Z' }], skipped: [{ product_code: 'OX-02', branch_code: 'COL', qty: '3', reason: 'Opening balance already exists.' }] } } }))
  await page.goto('/stock/opening')
  await page.getByLabel('Row 1 product code').fill('OX-01')
  await page.getByLabel('Row 1 branch code').fill('COL')
  await page.getByLabel('Row 1 quantity').fill('5')
  await page.getByRole('button', { name: 'Add row' }).click()
  await page.getByLabel('Row 2 product code').fill('OX-02')
  await page.getByLabel('Row 2 branch code').fill('COL')
  await page.getByLabel('Row 2 quantity').fill('3')
  await page.getByRole('button', { name: 'Load 2 opening balances' }).click()
  await expect(page.getByText('1 created')).toBeVisible()
  await expect(page.getByText('1 skipped')).toBeVisible()
  await expect(page.getByText('! Opening balance already exists.')).toBeVisible()
})
