import { expect, test, type Page } from '@playwright/test'

const admin = { id: '1', full_name: 'Admin', email: 'admin@oxiaura.test', role: 'ADMIN', branch_id: null, is_active: true }
const manager = { id: '2', full_name: 'Manager', email: 'manager@oxiaura.test', role: 'BRANCH_MANAGER', branch_id: '1', is_active: true }
const branches = [{ id: '1', code: 'COL', name: 'Colombo', is_active: true, is_warehouse: false }]
const categories = [{ id: '4', code: 'DEL', name: 'Delivery', is_active: true }]
const pendingExpense = { id: '11', expense_date: '2026-08-14', category_id: '4', category_code: 'DEL', category_name: 'Delivery', description: 'Courier charge', amount: '1250.00', branch_id: '1', branch_code: 'COL', reference_no: 'REF-11', status: 'PENDING', approved_by: null, approved_at: null, rejected_by: null, rejected_at: null, rejection_reason: null, decided_by: null, decided_at: null, created_by: '1', created_at: '2026-08-14T01:00:00Z' }

async function signIn(page: Page, user = admin) {
  await page.route('**/api/v1/auth/login', (route) => route.fulfill({ json: { success: true, data: { access_token: 'access', refresh_token: 'refresh', user } } }))
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, data: user } }))
  await page.route('**/api/v1/health', (route) => route.fulfill({ json: { success: true, data: { status: 'ok', db: 'ok' } } }))
  await page.route('**/api/v1/branches?**', (route) => route.fulfill({ json: { success: true, data: branches, meta: { page: 1, pages: 1 } } }))
  await page.route('**/api/v1/expense-categories?**', (route) => route.fulfill({ json: { success: true, data: categories, meta: { page: 1, pages: 1 } } }))
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test('creates a pending expense with the documented payload and server amount', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/expenses', (route) => route.fulfill({ status: 201, json: { success: true, data: pendingExpense } }))
  await page.route('**/api/v1/expenses/11', (route) => route.fulfill({ json: { success: true, data: pendingExpense } }))
  await page.goto('/expenses/new')
  await page.getByLabel('Expense branch').selectOption('1')
  await page.getByLabel('Expense category').selectOption('4')
  await page.getByLabel('Expense description').fill('Courier charge')
  await page.getByLabel('Expense amount').fill('1250.00')
  await page.getByLabel('Expense reference').fill('REF-11')
  const request = page.waitForRequest('**/api/v1/expenses')
  await page.getByRole('button', { name: 'Record expense' }).click()
  expect((await request).postDataJSON()).toEqual({ branch_id: '1', category_id: '4', description: 'Courier charge', amount: '1250.00', reference_no: 'REF-11' })
  await expect(page).toHaveURL(/expenses\/11/)
  await expect(page.getByText('LKR 1,250.00')).toBeVisible()
  await expect(page.getByText('Pending approval · Excluded from approved expense reports.')).toBeVisible()
})

test('approval is double-submit safe and makes the expense historical', async ({ page }) => {
  await signIn(page)
  let current = pendingExpense
  let calls = 0
  await page.route('**/api/v1/expenses/11', (route) => route.fulfill({ json: { success: true, data: current } }))
  await page.route('**/api/v1/expenses/11/approve', async (route) => {
    calls += 1
    current = { ...current, status: 'APPROVED', approved_by: '1', approved_at: '2026-08-14T02:00:00Z', decided_by: '1', decided_at: '2026-08-14T02:00:00Z' }
    await new Promise((resolve) => setTimeout(resolve, 100))
    return route.fulfill({ json: { success: true, data: current } })
  })
  await page.goto('/expenses/11')
  await page.getByRole('button', { name: 'Approve' }).click()
  const confirm = page.getByRole('button', { name: 'Confirm approval' })
  await confirm.dblclick()
  await expect(page.getByText('Approved · Historical record is read-only.')).toBeVisible()
  expect(calls).toBe(1)
  await expect(page.getByRole('button', { name: 'Approve' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Reject' })).toHaveCount(0)
})

test('rejection requires and sends a reason', async ({ page }) => {
  await signIn(page)
  let current = pendingExpense
  await page.route('**/api/v1/expenses/11', (route) => route.fulfill({ json: { success: true, data: current } }))
  await page.route('**/api/v1/expenses/11/reject', (route) => {
    const body = route.request().postDataJSON()
    current = { ...current, status: 'REJECTED', rejected_by: '1', rejected_at: '2026-08-14T02:00:00Z', rejection_reason: body.reason, decided_by: '1', decided_at: '2026-08-14T02:00:00Z' }
    return route.fulfill({ json: { success: true, data: current } })
  })
  await page.goto('/expenses/11')
  await page.getByRole('button', { name: 'Reject' }).click()
  await expect(page.getByRole('button', { name: 'Confirm rejection' })).toBeDisabled()
  await page.getByLabel('Rejection reason').fill('Missing receipt')
  const request = page.waitForRequest('**/api/v1/expenses/11/reject')
  await page.getByRole('button', { name: 'Confirm rejection' }).click()
  expect((await request).postDataJSON()).toEqual({ reason: 'Missing receipt' })
  await expect(page.getByText('Rejected · Historical record is read-only.')).toBeVisible()
  await expect(page.getByText('Missing receipt')).toBeVisible()
})

test('branch manager is locked to assigned branch and cannot decide', async ({ page }) => {
  await signIn(page, manager)
  await page.route('**/api/v1/expenses/11?**', (route) => route.fulfill({ json: { success: true, data: pendingExpense } }))
  await page.goto('/expenses/new')
  await expect(page.getByLabel('Assigned expense branch')).toHaveValue('COL · Colombo')
  await page.goto('/expenses/11')
  await expect(page.getByRole('button', { name: 'Approve' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Reject' })).toHaveCount(0)
})
