import { expect, test } from '@playwright/test'

const admin = { id: 'a1', full_name: 'Admin User', email: 'admin@oxiaura.test', role: 'ADMIN', branch_id: null, is_active: true }
const customer = { id: 'c1', code: 'CUS-001', name: 'Lanka Retail', contact: '0771234567', email: 'accounts@lanka.test', address: 'Colombo', credit_limit: '50000.00', is_active: true, created_at: '2026-08-01T00:00:00Z' }

async function signIn(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/auth/login', (route) => route.fulfill({ json: { success: true, data: { access_token: 'access', refresh_token: 'refresh', user: admin } } }))
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, data: admin } }))
  await page.route('**/api/v1/health', (route) => route.fulfill({ json: { success: true, data: { status: 'ok', db: 'ok' } } }))
  await page.goto('/login')
  await page.getByLabel('Email').fill(admin.email)
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test('ADMIN searches customers and reviews a reconciled URL-filtered statement', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/customers?**', (route) => route.fulfill({ json: { success: true, data: [customer], meta: { page: 1, pages: 1, total: 1 } } }))
  await page.route('**/api/v1/customers/c1', (route) => route.fulfill({ json: { success: true, data: customer } }))
  await page.route('**/api/v1/customers/c1/statement*', (route) => route.fulfill({ json: { success: true, data: { customer, from: '2026-08-01', to: '2026-08-14', branch_id: 'b1', opening_balance: '100.00', entries: [{ date: '2026-08-10', type: 'INVOICE', reference: 'INV-1', id: 'e1', debit: '25.00', credit: '0.00', running_balance: '125.00' }], closing_balance: '125.00' } } }))

  await page.goto('/customers?search=lanka')
  await expect(page.getByLabel('Search customers')).toHaveValue('lanka')
  await page.getByRole('link', { name: 'CUS-001 · Lanka Retail' }).click()
  await page.getByRole('button', { name: 'Statement' }).click()
  await page.getByLabel('Statement from date').fill('2026-08-01')
  await page.getByLabel('Statement to date').fill('2026-08-14')
  await page.getByLabel('Statement branch ID').fill('b1')
  await expect(page).toHaveURL(/from=2026-08-01/)
  await expect(page.getByText('LKR 100.00')).toBeVisible()
  await expect(page.getByText('✓ Reconciled')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'LKR 125.00' })).toBeVisible()
})

test('expense categories are available as real phase 4 administration', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/expense-categories?**', (route) => route.fulfill({ json: { success: true, data: [{ id: 'ec1', code: 'UTIL', name: 'Utilities', is_active: true }], meta: { page: 1, pages: 1 } } }))
  await page.goto('/expense-categories')
  await expect(page.getByRole('heading', { name: 'Expense categories' })).toBeVisible()
  await expect(page.getByText('Utilities')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create category' })).toBeVisible()
})
