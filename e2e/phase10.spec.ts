import { expect, test, type Page } from '@playwright/test'

const admin = { id: 1, full_name: 'Admin', email: 'admin@oxiaura.test', role: 'ADMIN', branch_id: null, is_active: true }
const manager = { id: 2, full_name: 'Manager', email: 'manager@oxiaura.test', role: 'BRANCH_MANAGER', branch_id: 1, is_active: true }
const branches = [{ id: 1, code: 'COL', name: 'Colombo', is_active: true, is_warehouse: false }]
const products = [{ id: 1, code: 'OX-01', name: 'Serum', category: 'Care', reorder_level: '2', unit_of_measure: 'each', is_active: true }, { id: 2, code: 'OX-02', name: 'Cleanser', category: 'Care', reorder_level: '2', unit_of_measure: 'each', is_active: true }]
const sample = { id: 1, sample_date: '2026-08-14', product_id: 1, product_code: 'OX-01', product_name: 'Serum', branch_id: 1, branch_code: 'COL', qty: 2, person: 'Clinic', purpose: 'Demonstration', authorised_by: 'Operations lead', status: 'ISSUED', created_by: 1, created_at: '2026-08-14T00:00:00Z' }
const disposal = { id: 1, disposal_date: '2026-08-14', product_id: 1, product_code: 'OX-01', product_name: 'Serum', branch_id: 1, branch_code: 'COL', qty: 3, reason: 'DAMAGED', remark: '', is_approved: false, approved_by: null, approved_at: null, created_by: 1, created_at: '2026-08-14T00:00:00Z' }
const draftCount = { id: 1, count_no: 'SC-001', branch_id: 1, branch_code: 'COL', count_date: '2026-08-14', status: 'DRAFT', counted_by: 1, approved_by: null, submitted_at: null, approved_at: null, total_variance: null, created_at: '2026-08-14T00:00:00Z', lines: [{ id: 1, product_id: 1, product_code: 'OX-01', product_name: 'Serum', system_qty: null, counted_qty: 0, variance: null, adjusted: false }, { id: 2, product_id: 2, product_code: 'OX-02', product_name: 'Cleanser', system_qty: null, counted_qty: 7, variance: null, adjusted: false }] }

async function signIn(page: Page, user = admin) {
  await page.route('**/api/v1/auth/login', (route) => route.fulfill({ json: { success: true, data: { access_token: 'access', refresh_token: 'refresh', user } } }))
  await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, data: user } }))
  await page.route('**/api/v1/health', (route) => route.fulfill({ json: { success: true, data: { status: 'ok', db: 'ok' } } }))
  await page.route('**/api/v1/branches?**', (route) => route.fulfill({ json: { success: true, data: branches, meta: { page: 1, pages: 1 } } }))
  await page.route('**/api/v1/products?**', (route) => route.fulfill({ json: { success: true, data: products, meta: { page: 1, pages: 1 } } }))
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test('sample issue sends authorizer and shows the posted stock result', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/samples', (route) => route.fulfill({ status: 201, json: { success: true, data: { sample, movement: { id: 91 } } } }))
  await page.route('**/api/v1/samples/1', (route) => route.fulfill({ json: { success: true, data: sample } }))
  await page.goto('/samples/new')
  await page.getByLabel('Sample branch').selectOption('1')
  await page.getByLabel('Sample product').selectOption('1')
  await page.getByLabel('Sample quantity').fill('2')
  await page.getByLabel('Sample authorizer').fill('Operations lead')
  const request = page.waitForRequest('**/api/v1/samples')
  await page.getByRole('button', { name: 'Issue sample' }).click()
  expect((await request).postDataJSON()).toMatchObject({ product_id: 1, branch_id: 1, qty: 2, authorised_by: 'Operations lead' })
  await expect(page).toHaveURL(/samples\/1/)
  await expect(page.getByText('Stock movement posted for this issue.')).toBeVisible()
})

test('pending disposal is visibly unposted and approval posts stock', async ({ page }) => {
  await signIn(page)
  let current = disposal
  await page.route('**/api/v1/disposals/1', (route) => route.fulfill({ json: { success: true, data: current } }))
  await page.route('**/api/v1/disposals/1/approve', (route) => { current = { ...current, is_approved: true, approved_by: 1, approved_at: '2026-08-14T01:00:00Z' }; return route.fulfill({ json: { success: true, data: { disposal: current, movement: { id: 92 } } } }) })
  await page.goto('/disposals/1')
  await expect(page.getByText('Pending approval · Not yet posted to stock.')).toBeVisible()
  await page.getByRole('button', { name: 'Approve write-off' }).click()
  await expect(page.getByText('creates a permanent stock movement')).toBeVisible()
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByText('Stock write-off posted.')).toBeVisible()
  await expect(page.getByText('Approval completed and the resulting stock movement was posted.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Approve write-off' })).toHaveCount(0)
})

test('stock count preserves zero, reviews server variance, and shows approval movements', async ({ page }) => {
  await signIn(page)
  let current = draftCount
  await page.route('**/api/v1/stock-counts', (route) => route.fulfill({ status: 201, json: { success: true, data: current } }))
  await page.route('**/api/v1/stock-counts/1', (route) => route.fulfill({ json: { success: true, data: current } }))
  await page.route('**/api/v1/stock-counts/1/submit', (route) => { current = { ...current, status: 'SUBMITTED', submitted_at: '2026-08-14T01:00:00Z', total_variance: -5, lines: [{ ...current.lines[0], system_qty: 5, variance: -5 }, { ...current.lines[1], system_qty: 7, variance: 0 }] }; return route.fulfill({ json: { success: true, data: current } }) })
  await page.route('**/api/v1/stock-counts/1/approve', (route) => { current = { ...current, status: 'APPROVED', approved_by: 1, approved_at: '2026-08-14T02:00:00Z', lines: current.lines.map((line) => ({ ...line, adjusted: line.variance !== 0 })) }; return route.fulfill({ json: { success: true, data: { stock_count: current, movements: [{ id: 93 }] } } }) })
  await page.goto('/stock-counts/new')
  await page.getByLabel('Count branch').selectOption('1')
  await page.getByLabel('Count line 1 product').selectOption('1')
  await page.getByLabel('Count line 1 quantity').fill('0')
  await page.getByRole('button', { name: 'Add product' }).click()
  await page.getByLabel('Count line 2 product').selectOption('2')
  await page.getByLabel('Count line 2 quantity').fill('7')
  const createRequest = page.waitForRequest('**/api/v1/stock-counts')
  await page.getByRole('button', { name: 'Save draft count' }).click()
  expect((await createRequest).postDataJSON()).toMatchObject({ lines: [{ product_id: 1, counted_qty: 0 }, { product_id: 2, counted_qty: 7 }] })
  await page.getByRole('button', { name: 'Submit for review' }).click()
  await expect(page.getByText('does not adjust stock')).toBeVisible()
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByText('No stock adjustment has been posted.')).toBeVisible()
  await expect(page.getByRole('cell', { name: '0 · Matched' })).toBeVisible()
  await page.getByRole('button', { name: 'Approve adjustments' }).click()
  await page.getByRole('button', { name: 'Confirm' }).click()
  await expect(page.getByText('Approved with 1 adjustment movement posted.')).toBeVisible()
  await expect(page.getByRole('cell', { name: '● Adjusted' })).toBeVisible()
  await expect(page.getByRole('cell', { name: '○ No adjustment' })).toBeVisible()
})

test('branch manager is locked to assigned branch and cannot approve', async ({ page }) => {
  await signIn(page, manager)
  await page.route('**/api/v1/disposals/1?**', (route) => route.fulfill({ json: { success: true, data: disposal } }))
  await page.goto('/disposals/new')
  await expect(page.getByLabel('Assigned disposal branch')).toHaveValue('COL · Colombo')
  await page.goto('/disposals/1')
  await expect(page.getByRole('button', { name: 'Approve write-off' })).toHaveCount(0)
})
