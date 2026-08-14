import { expect, test } from '@playwright/test'

const adminUser = { id: 'admin-1', full_name: 'Admin User', email: 'admin@oxiaura.test', role: 'ADMIN', branch_id: null, is_active: true }
const salesUser = { id: 'sales-1', full_name: 'Sales User', email: 'sales@oxiaura.test', role: 'SALES_REP', branch_id: 'BR-01', is_active: true }
const users = [{ id: 'u1', full_name: 'Asha Perera', email: 'asha@oxiaura.test', role: 'SALES_REP', branch_id: 'BR-01', is_active: true }]
const branches = [{ id: 'b1', code: 'BR-01', name: 'Colombo', address: 'Main Street', is_warehouse: false, is_active: true }]

async function mockAuth(page: import('@playwright/test').Page, user: typeof adminUser | typeof salesUser) {
  await page.route('**/api/v1/auth/login', async (route) => route.fulfill({ json: { success: true, data: { access_token: 'access', refresh_token: 'refresh', user } } }))
  await page.route('**/api/v1/auth/me', async (route) => route.fulfill({ json: { success: true, data: user } }))
  await page.route('**/api/v1/health', async (route) => route.fulfill({ json: { success: true, data: { status: 'ok', db: 'ok' } } }))
}

async function signIn(page: import('@playwright/test').Page, user: typeof adminUser | typeof salesUser) {
  await mockAuth(page, user)
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test('ADMIN can search users and must confirm deactivation', async ({ page }) => {
  await signIn(page, adminUser)
  await page.route('**/api/v1/users?**', async (route) => route.fulfill({ json: { success: true, data: users, meta: { page: 1, pages: 1, total: 1 } } }))
  await page.route('**/api/v1/users/u1/status', async (route) => route.fulfill({ json: { success: true, data: { ...users[0], is_active: false } } }))
  await page.goto('/users?search=asha&page=2')
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  await expect(page.getByLabel('Search users')).toHaveValue('asha')
  await expect(page).toHaveURL(/search=asha/)
  await page.getByRole('button', { name: 'Deactivate' }).click()
  await expect(page.getByRole('alertdialog')).toContainText('historical records')
  await page.getByRole('alertdialog').getByRole('button', { name: 'Confirm' }).click()
})

test('branch-scoped users see branches read-only and cannot create them', async ({ page }) => {
  await signIn(page, salesUser)
  await page.route('**/api/v1/branches?**', async (route) => route.fulfill({ json: { success: true, data: branches, meta: { page: 1, pages: 1, total: 1 } } }))
  await page.goto('/branches')
  await expect(page.getByRole('heading', { name: 'Branches' })).toBeVisible()
  await expect(page.getByText('Read only')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create branch' })).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Deactivate' })).not.toBeVisible()
})
