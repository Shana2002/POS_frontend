import { expect, test, type Page } from '@playwright/test'

const admin = { id: '1', full_name: 'Admin', email: 'admin@oxiaura.test', role: 'ADMIN', branch_id: null, is_active: true }
const manager = { id: '2', full_name: 'Manager', email: 'manager@oxiaura.test', role: 'BRANCH_MANAGER', branch_id: '1', is_active: true }
const auditRows = [{ id: 'a1', user_id: '1', table_name: 'invoices', record_id: 'INV-42', action: 'UPDATE', old_values: { status: 'DRAFT', customer: { name: 'Acme', phone: '011' }, note: 'remove me' }, new_values: { status: 'ISSUED', customer: { name: 'Acme', email: 'ops@acme.test' }, total: '1250.00' }, ip_address: '10.0.0.5', created_at: '2026-08-14T10:00:00Z' }]

async function signIn(page: Page, user = admin) {
  await page.route('**/api/v1/auth/login', (route) => route.fulfill({ json: { success: true, data: { access_token: 'access', refresh_token: 'refresh', user } } }))
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, data: user } }))
  await page.route('**/api/v1/health', (route) => route.fulfill({ json: { success: true, data: { status: 'ok', db: 'ok' } } }))
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test('ADMIN can filter audit entries and inspect field-level and raw values', async ({ page }) => {
  await page.route('**/api/v1/audit-log**', (route) => route.fulfill({ json: { success: true, data: auditRows, meta: { page: 1, pages: 1, total: 1 } } }))
  await signIn(page)
  await page.goto('/audit-log')
  await expect(page.getByRole('heading', { name: 'Audit log' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'invoices' })).toBeVisible()
  const filteredRequest = page.waitForRequest((request) => request.url().includes('/audit-log') && request.url().includes('action=UPDATE'))
  await page.getByLabel('Audit action').selectOption('UPDATE')
  await expect(page).toHaveURL(/action=UPDATE/)
  await filteredRequest
  await page.getByRole('button', { name: 'Compare' }).click()
  await expect(page.getByRole('dialog', { name: /invoices/ })).toBeVisible()
  await expect(page.getByRole('cell', { name: /customer.email/ })).toBeVisible()
  await expect(page.getByText('ISSUED', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'Raw JSON' }).click()
  await expect(page.getByText(/ops@acme\.test/)).toBeVisible()
})

test('large audit JSON stays inside the drawer and non-admins are blocked', async ({ page }) => {
  await page.route('**/api/v1/audit-log**', (route) => route.fulfill({ json: { success: true, data: [{ ...auditRows[0], new_values: { payload: 'x'.repeat(10000) } }], meta: { page: 1, pages: 1 } } }))
  await signIn(page)
  await page.goto('/audit-log')
  await page.getByRole('button', { name: 'Compare' }).click()
  const drawer = page.getByRole('dialog', { name: /invoices/ })
  await expect(drawer).toBeVisible()
  expect(await drawer.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  await page.getByRole('button', { name: 'Close audit entry' }).click()
  await page.getByLabel(/Operational status/).click()
  await expect(page.getByRole('region', { name: 'Operational status details' })).toBeVisible()

  await page.evaluate(() => localStorage.clear())
  await signIn(page, manager)
  await page.goto('/audit-log')
  await expect(page).toHaveURL(/forbidden/)
  await expect(page.getByText('Audit log')).toHaveCount(0)
})
