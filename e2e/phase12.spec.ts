import { expect, test, type Page, type Route } from '@playwright/test'

const admin = { id: '1', full_name: 'Admin', email: 'admin@oxiaura.test', role: 'ADMIN', branch_id: null, is_active: true }
const manager = { id: '2', full_name: 'Manager', email: 'manager@oxiaura.test', role: 'BRANCH_MANAGER', branch_id: '1', is_active: true }
const branches = [{ id: '1', code: 'COL', name: 'Colombo', is_active: true, is_warehouse: false }, { id: '2', code: 'GAL', name: 'Galle', is_active: true, is_warehouse: false }]

const reports = {
  dashboard: { from: '2026-08-01', to: '2026-08-14', branch_id: null, net_revenue: '98765.43', collected: '80000.00', outstanding_receivable: '18765.43', discounts_given: '321.09', invoices_issued: 42, inventory_units: '765', inventory_value: '456789.12', total_expenses: '12345.67' },
  'product-performance': { from: '2026-08-01', to: '2026-08-14', branch_id: null, products: [{ product_id: '1', product_code: 'P001', product_name: 'Serum', units_sold: '21', revenue: '22222.22', current_stock: '11', stock_value: '3333.33', cost_source: 'LATEST_COST' }] },
  'sales-by-branch': { from: '2026-08-01', to: '2026-08-14', branch_id: null, branches: [{ branch_id: '1', branch_code: 'COL', branch_name: 'Colombo', invoice_count: 7, net_revenue: '44444.44', discounts_given: '111.11' }] },
  'sales-by-rep': { from: '2026-08-01', to: '2026-08-14', branch_id: null, reps: [{ sales_rep_id: '9', sales_rep_name: 'Nimali', invoice_count: 5, net_revenue: '55555.55' }] },
  'invoice-status': { from: '2026-08-01', to: '2026-08-14', branch_id: null, statuses: [{ status: 'ISSUED', invoice_count: 4, net_amount: '66666.66' }] },
  'expense-breakdown': { from: '2026-08-01', to: '2026-08-14', branch_id: null, categories: [{ category_id: '4', category_code: 'DEL', category_name: 'Delivery', expense_count: 3, total: '7777.77' }], category_count: 1, expense_count: 3, total: '7777.77', excluded: { pending: { expense_count: 2, total: '800.00' }, rejected: { expense_count: 1, total: '90.00' } } },
  'profit-loss': { from: '2026-08-01', to: '2026-08-14', branch_id: null, revenue: '90000.00', cogs: '40000.00', gross_profit: '50000.00', approved_expenses: '10000.00', disposal_value: '500.00', sample_value: '250.00', net_profit: '39250.00', warnings: [{ product_id: '1', product_code: 'P001', product_name: 'Serum', message: 'Latest cost unavailable.', units: '3', revenue_affected: '1200.00' }] },
  'stock-valuation': { as_of: '2026-08-14', branch_id: null, lines: [{ product_id: '1', product_code: 'P001', product_name: 'Serum', quantity: '11', unit_cost: null, value: null, cost_source: 'MISSING', cost_price_missing: true }], total_quantity: '11', total_value: '8888.88', valued_at_selling_price_count: 0, unvalued_count: 1, warnings: ['One product is missing cost data.'] },
} as const

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

function reportName(route: Route) { const parts = new URL(route.request().url()).pathname.split('/'); return parts[parts.length - 1] as keyof typeof reports }

async function mockReports(page: Page, empty = false) {
  await page.route('**/api/v1/reports/*', (route) => {
    if (route.request().url().includes('/export')) return route.fallback()
    const name = reportName(route)
    const data = structuredClone(reports[name]) as Record<string, unknown>
    if (empty) {
      if ('products' in data) data.products = []
      if ('branches' in data) data.branches = []
      if ('reps' in data) data.reps = []
      if ('statuses' in data) data.statuses = []
      if ('categories' in data) data.categories = []
      if ('lines' in data) data.lines = []
    }
    return route.fulfill({ json: { success: true, data } })
  })
}

test('dashboard renders server-owned KPIs and accessible summary table', async ({ page }) => {
  await mockReports(page)
  await signIn(page)
  await expect(page.getByRole('heading', { name: 'Executive dashboard' })).toBeVisible()
  await expect(page.getByText('LKR 98,765.43').first()).toBeVisible()
  await expect(page.getByRole('table', { name: 'Executive dashboard data' })).toBeVisible()
})

test('all eight report endpoints render populated and empty datasets', async ({ page }) => {
  await mockReports(page)
  await signIn(page)
  const names = Object.keys(reports) as Array<keyof typeof reports>
  for (const name of names) {
    await page.goto(`/reports/${name}`)
    await expect(page.locator('.report-page')).toBeVisible()
    await expect(page.locator('.inline-error')).toHaveCount(0)
  }
  await page.unroute('**/api/v1/reports/*')
  await mockReports(page, true)
  for (const name of names.filter((value) => value !== 'dashboard' && value !== 'profit-loss')) {
    await page.goto(`/reports/${name}`)
    await expect(page.getByText(/^No .* data$/)).toBeVisible()
  }
})

test('filter changes preserve parameters and the request uses current filters', async ({ page }) => {
  await mockReports(page)
  await signIn(page)
  await page.goto('/reports/sales-by-branch')
  await page.getByLabel('Report branch').selectOption('2')
  await expect(page).toHaveURL(/branch_id=2/)
  await page.getByLabel('Report from date').fill('2026-08-01')
  await expect(page).toHaveURL(/from=2026-08-01/)
  await page.getByLabel('Report to date').fill('2026-08-14')
  await expect(page).toHaveURL(/branch_id=2/)
  await expect(page).toHaveURL(/from=2026-08-01/)
  await expect(page).toHaveURL(/to=2026-08-14/)
  const request = page.waitForRequest((value) => value.url().includes('/reports/sales-by-branch') && value.url().includes('branch_id=2') && value.url().includes('from=2026-08-01') && value.url().includes('to=2026-08-14'))
  await page.getByRole('button', { name: 'Refresh report' }).click()
  await request
})

test('branch manager dashboard is locked to assigned branch and hides reports navigation', async ({ page }) => {
  await mockReports(page)
  await signIn(page, manager)
  await expect(page.getByLabel('Assigned report branch')).toHaveValue('COL · Colombo')
  await expect(page.getByRole('link', { name: 'Reports', exact: true })).toHaveCount(0)
  await expect(page.getByText('LKR 98,765.43').first()).toBeVisible()
})

test('profit and valuation warnings remain prominent with missing costs', async ({ page }) => {
  await mockReports(page)
  await signIn(page)
  await page.goto('/reports/profit-loss')
  await expect(page.getByRole('alert').filter({ hasText: 'Latest cost unavailable.' })).toBeVisible()
  await page.goto('/reports/stock-valuation')
  await expect(page.getByRole('alert').filter({ hasText: 'missing cost data' })).toBeVisible()
  await expect(page.getByText('Missing cost', { exact: true })).toBeVisible()
  await expect(page.getByText('LKR 8,888.88')).toBeVisible()
})

test('XLSX export preserves filters and uses the response filename', async ({ page }) => {
  await mockReports(page)
  await signIn(page)
  await page.route('**/api/v1/reports/sales-by-branch/export?**', (route) => route.fulfill({ status: 200, headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'content-disposition': 'attachment; filename="branch-sales.xlsx"' }, body: 'xlsx-data' }))
  await page.goto('/reports/sales-by-branch?branch_id=2&from=2026-08-01&to=2026-08-14')
  const request = page.waitForRequest((value) => value.url().includes('/reports/sales-by-branch/export'))
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'XLSX' }).click()
  const exportRequest = await request
  expect(exportRequest.url()).toContain('format=xlsx')
  expect(exportRequest.url()).toContain('branch_id=2')
  expect(exportRequest.url()).toContain('from=2026-08-01')
  expect((await download).suggestedFilename()).toBe('branch-sales.xlsx')
})
