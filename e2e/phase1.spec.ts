import { expect, test } from '@playwright/test'

const dashboard = { from: '2026-08-01', to: '2026-08-14', branch_id: null, net_revenue: '0.00', collected: '0.00', outstanding_receivable: '0.00', discounts_given: '0.00', invoices_issued: 0, inventory_units: '0', inventory_value: '0.00', total_expenses: '0.00' }

async function mockShellDependencies(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/health', (route) => route.fulfill({ json: { success: true, data: { status: 'ok', db: 'ok' } } }))
  await page.route('**/api/v1/branches?**', (route) => route.fulfill({ json: { success: true, data: [], meta: { page: 1, pages: 1 } } }))
  await page.route('**/api/v1/reports/dashboard**', (route) => route.fulfill({ json: { success: true, data: dashboard } }))
}

test('logs in, shows the protected shell, and logs out', async ({ page }) => {
  await mockShellDependencies(page)
  await page.route('**/api/v1/auth/login', async (route) => route.fulfill({ json: { success: true, data: { access_token: 'access-1', refresh_token: 'refresh-1', user: { id: 'u1', full_name: 'Asha Perera', email: 'asha@oxiaura.test', role: 'SALES_REP', branch_id: 'BR-01', is_active: true } } } }))
  await page.route('**/api/v1/auth/logout', async (route) => route.fulfill({ json: { success: true, data: { message: 'Logged out.' } } }))
  await page.goto('/login')
  await page.getByLabel('Email').fill('asha@oxiaura.test')
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/dashboard/)
  await expect(page.getByRole('complementary').getByText('Asha Perera')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: 'Sales', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Users' })).not.toBeVisible()
  await expect(page.getByRole('link', { name: 'Settings' })).not.toBeVisible()
  await page.getByRole('button', { name: /Log out/ }).click()
  await expect(page).toHaveURL(/login/)
})

test('refreshes an expired session once and restores the protected request', async ({ page }) => {
  await mockShellDependencies(page)
  let meAttempts = 0
  let refreshAttempts = 0
  await page.addInitScript(() => {
    localStorage.setItem('oxiaura_access_token', 'expired-token')
    localStorage.setItem('oxiaura_refresh_token', 'refresh-token')
  })
  await page.route('**/api/v1/auth/me', async (route) => {
    meAttempts += 1
    if (meAttempts === 1) {
      await route.fulfill({ status: 401, json: { success: false, error: { code: 'TOKEN_EXPIRED', message: 'Token expired.' } } })
      return
    }
    await route.fulfill({ json: { success: true, data: { id: 'u2', full_name: 'Nimal Silva', email: 'nimal@oxiaura.test', role: 'ACCOUNTS', branch_id: null, is_active: true } } })
  })
  await page.route('**/api/v1/auth/refresh', async (route) => {
    refreshAttempts += 1
    await route.fulfill({ json: { success: true, data: { access_token: 'fresh-token' } } })
  })
  await page.goto('/dashboard')
  await expect(page.getByRole('complementary').getByText('Nimal Silva')).toBeVisible()
  expect(meAttempts).toBe(2)
  expect(refreshAttempts).toBe(1)
})

test('shows backend invalid credentials without retrying', async ({ page }) => {
  let attempts = 0
  await page.route('**/api/v1/auth/login', async (route) => {
    attempts += 1
    await route.fulfill({ status: 401, json: { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' } } })
  })
  await page.goto('/login')
  await page.getByLabel('Email').fill('wrong@oxiaura.test')
  await page.getByLabel('Password').fill('wrong')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toContainText('Email or password is incorrect.')
  expect(attempts).toBe(1)
})
