import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const admin = { id: '1', full_name: 'Admin', email: 'admin@oxiaura.test', role: 'ADMIN', branch_id: null, is_active: true }
const salesRep = { id: '2', full_name: 'Sales Rep', email: 'sales@oxiaura.test', role: 'SALES_REP', branch_id: 'b1', is_active: true }
const dashboard = { from: '2026-08-01', to: '2026-08-14', branch_id: null, net_revenue: '100.00', collected: '80.00', outstanding_receivable: '20.00', discounts_given: '0.00', invoices_issued: 1, inventory_units: '5', inventory_value: '500.00', total_expenses: '10.00' }

async function signIn(page: Page, user = admin) {
  await page.route('**/api/v1/auth/login', (route) => route.fulfill({ json: { success: true, data: { access_token: 'access', refresh_token: 'refresh', user } } }))
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, data: user } }))
  await page.route('**/api/v1/health', (route) => route.fulfill({ json: { success: true, data: { status: 'ok', db: 'ok' } } }))
  await page.route('**/api/v1/branches?**', (route) => route.fulfill({ json: { success: true, data: [{ id: 'b1', code: 'COL', name: 'Colombo', is_active: true, is_warehouse: false }], meta: { page: 1, pages: 1 } } }))
  await page.route('**/api/v1/reports/dashboard**', (route) => route.fulfill({ json: { success: true, data: dashboard } }))
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('heading', { name: 'Executive dashboard' })).toBeVisible()
}

test('login and authenticated shell have no serious WCAG violations and support skip navigation', async ({ page }) => {
  await page.goto('/login')
  const loginResults = await new AxeBuilder({ page }).analyze()
  expect(loginResults.violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''))).toEqual([])

  await signIn(page)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#main-content')).toBeFocused()
  const shellResults = await new AxeBuilder({ page }).analyze()
  expect(shellResults.violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''))).toEqual([])
})

test('system theme follows operating-system changes after startup', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await signIn(page)
  await page.getByLabel('Theme').selectOption('system')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('sales representatives cannot see or directly open restricted administration and finance routes', async ({ page }) => {
  await signIn(page, salesRep)
  for (const label of ['Users', 'Settings', 'Audit log', 'Payments', 'Reports', 'Expense categories']) {
    await expect(page.getByRole('link', { name: label, exact: true })).toHaveCount(0)
  }
  await page.goto('/expense-categories')
  await expect(page).toHaveURL(/forbidden/)
})

test('tablet dashboard stays within the viewport and keeps primary navigation operable', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await signIn(page)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Sales' })).toBeVisible()
})
