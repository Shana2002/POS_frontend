import { expect, test, type Page } from '@playwright/test'

const admin = { id: 1, full_name: 'Admin', email: 'admin@oxiaura.test', role: 'ADMIN', branch_id: null, is_active: true }
const manager = { id: 2, full_name: 'Manager', email: 'manager@oxiaura.test', role: 'BRANCH_MANAGER', branch_id: 1, is_active: true }
const branches = [{ id: 1, code: 'COL', name: 'Colombo', is_active: true, is_warehouse: false }, { id: 2, code: 'KAN', name: 'Kandy', is_active: true, is_warehouse: false }]
const products = [{ id: 1, code: 'OX-01', name: 'Serum', category: 'Care', reorder_level: '2', unit_of_measure: 'each', is_active: true }, { id: 2, code: 'OX-02', name: 'Cleanser', category: 'Care', reorder_level: '2', unit_of_measure: 'each', is_active: true }]
const line = { id: 1, product_id: 1, product_code: 'OX-01', product_name: 'Serum', qty: 10, received_qty: 0, shortfall_qty: 0 }
const transfer = { id: 1, transfer_no: 'TR-001', from_branch_id: 1, from_branch_code: 'COL', from_branch_name: 'Colombo', to_branch_id: 2, to_branch_code: 'KAN', to_branch_name: 'Kandy', dispatch_date: null, receive_date: null, status: 'DRAFT', dispatched_by: null, received_by: null, remarks: '', total_qty: 10, total_received_qty: 0, has_variance: false, cancelled_at: null, cancelled_by: null, cancel_reason: null, created_by: 1, created_at: '2026-08-14T00:00:00Z', lines: [line] }
async function signIn(page: Page, user = admin) { await page.route('**/api/v1/auth/login', (route) => route.fulfill({ json: { success: true, data: { access_token: 'access', refresh_token: 'refresh', user } } })); await page.route('**/api/v1/auth/me', (route) => route.fulfill({ json: { success: true, data: user } })); await page.route('**/api/v1/health', (route) => route.fulfill({ json: { success: true, data: { status: 'ok', db: 'ok' } } })); await page.route('**/api/v1/branches?**', (route) => route.fulfill({ json: { success: true, data: branches, meta: { page: 1, pages: 1 } } })); await page.route('**/api/v1/products?**', (route) => route.fulfill({ json: { success: true, data: products, meta: { page: 1, pages: 1 } } })); await page.goto('/login'); await page.getByLabel('Email').fill(user.email); await page.getByLabel('Password').fill('password'); await page.getByRole('button', { name: 'Sign in' }).click() }

test('draft transfer enforces different branches and unique products', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/transfers', (route) => route.fulfill({ status: 201, json: { success: true, data: transfer } }))
  await page.route('**/api/v1/transfers/1', (route) => route.fulfill({ json: { success: true, data: transfer } }))
  await page.route('**/api/v1/stock?**', (route) => route.fulfill({ json: { success: true, data: [], meta: { total: 0 } } }))
  await page.goto('/transfers/new')
  await page.getByLabel('Transfer source branch').selectOption('1')
  await page.getByLabel('Transfer destination branch').selectOption('2')
  await page.getByLabel('Transfer line 1 product').selectOption('1')
  await page.getByLabel('Transfer line 1 quantity').fill('10')
  await page.getByRole('button', { name: 'Add line' }).click()
  await page.getByLabel('Transfer line 2 product').selectOption('1')
  await page.getByLabel('Transfer line 2 quantity').fill('2')
  await expect(page.getByText('Each product can appear only once.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create draft transfer' })).toBeDisabled()
  await page.getByLabel('Transfer line 2 product').selectOption('2')
  const createRequest = page.waitForRequest('**/api/v1/transfers')
  await page.getByRole('button', { name: 'Create draft transfer' }).click()
  const createPayload = await createRequest
  expect(createPayload.postDataJSON()).toMatchObject({ from_branch_id: 1, to_branch_id: 2, lines: [{ product_id: 1, qty: 10 }, { product_id: 2, qty: 2 }] })
  await expect(page).toHaveURL(/transfers\/1/)
})

test('dispatch warns source-only stock impact and partial receipt shows unresolved variance', async ({ page }) => {
  await signIn(page)
  let current = transfer
  await page.route('**/api/v1/transfers/1', (route) => route.fulfill({ json: { success: true, data: current } }))
  await page.route('**/api/v1/stock?**', (route) => route.fulfill({ json: { success: true, data: [{ product_id: 1, product_code: 'OX-01', product_name: 'Serum', branch_id: 1, branch_code: 'COL', branch_name: 'Colombo', quantity: '25', reorder_level: '2', is_low: false }], meta: { total: 1 } } }))
  await page.route('**/api/v1/transfers/1/dispatch', (route) => { current = { ...current, status: 'DISPATCHED', dispatch_date: '2026-08-14' }; return route.fulfill({ json: { success: true, data: { transfer: current, movements: [{ id: 1 }] } } }) })
  await page.route('**/api/v1/transfers/1/receive', (route) => { current = { ...current, status: 'RECEIVED', receive_date: '2026-08-15', total_received_qty: 7, has_variance: true, lines: [{ ...line, received_qty: 7, shortfall_qty: 3 }] }; return route.fulfill({ json: { success: true, data: { transfer: current, movements: [{ id: 2 }], variances: [{ line_id: 1, product_id: 1, product_code: 'OX-01', product_name: 'Serum', dispatched_qty: 10, received_qty: 7, shortfall_qty: 3 }], has_variance: true } } }) })
  await page.goto('/transfers/1')
  await page.getByRole('button', { name: 'Dispatch transfer' }).click()
  await expect(page.getByText('Dispatch removes stock from the source branch only.')).toBeVisible()
  await expect(page.getByText('25')).toBeVisible()
  await page.getByRole('button', { name: 'Dispatch stock' }).click()
  await page.getByRole('button', { name: 'Receive transfer' }).click()
  await page.getByLabel('Receive OX-01').fill('7')
  await expect(page.getByText('3', { exact: true })).toBeVisible()
  const receiveRequest = page.waitForRequest('**/api/v1/transfers/1/receive')
  await page.getByRole('button', { name: 'Receive transfer' }).last().click()
  const receivePayload = await receiveRequest
  expect(receivePayload.postDataJSON()).toMatchObject({ lines: [{ line_id: 1, received_qty: 7 }] })
  await expect(page.getByRole('heading', { name: 'Unresolved receipt variances' })).toBeVisible()
  await expect(page.getByRole('cell', { name: '! 3' })).toBeVisible()
})

test('dispatched cancellation explains and shows reversal consequence while branch role remains scoped', async ({ page }) => {
  await signIn(page)
  let current = { ...transfer, status: 'DISPATCHED', dispatch_date: '2026-08-14' }
  const transferRequests: string[] = []
  await page.route(/\/api\/v1\/transfers(?:\?.*)?$/, (route) => { transferRequests.push(route.request().url()); return route.fulfill({ json: { success: true, data: [current], meta: { page: 1, pages: 1 } } }) })
  await page.route(/\/api\/v1\/transfers\/1(?:\?.*)?$/, (route) => route.fulfill({ json: { success: true, data: current } }))
  await page.route('**/api/v1/transfers/1/cancel', (route) => { current = { ...current, status: 'CANCELLED', cancel_reason: 'Route closed' }; return route.fulfill({ json: { success: true, data: { transfer: current, reversals: [{ id: 1 }] } } }) })
  await page.goto('/transfers?branch_id=1')
  await expect(page.getByLabel('Transfer branch')).toBeVisible()
  await expect.poll(() => transferRequests.length).toBeGreaterThan(0)
  expect(transferRequests.every((url) => {
    const query = new URL(url).searchParams
    return query.get('branch_id') === '1'
  })).toBe(true)
  await page.getByRole('link', { name: 'TR-001' }).click()
  await page.getByRole('button', { name: 'Cancel transfer' }).click()
  await expect(page.getByText('posts reversal stock movements back to the source branch')).toBeVisible()
  await page.getByLabel('Transfer cancellation reason').fill('Route closed')
  await page.getByRole('button', { name: 'Cancel transfer' }).last().click()
  await expect(page.getByText('CANCELLED')).toBeVisible()
  await expect(page.getByText('1 reversal stock movement posted.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cancel transfer' })).toHaveCount(0)
})

test('in-transit view uses server totals', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/transfers/in-transit*', (route) => route.fulfill({ json: { success: true, data: { lines: [{ from_branch_id: 1, from_branch_code: 'COL', from_branch_name: 'Colombo', to_branch_id: 2, to_branch_code: 'KAN', to_branch_name: 'Kandy', product_id: 1, product_code: 'OX-01', product_name: 'Serum', quantity: 7 }], total_quantity: 999, route_count: 42 } } }))
  await page.goto('/transfers/in-transit')
  await expect(page.getByText('999')).toBeVisible()
  await expect(page.getByText('42')).toBeVisible()
})

test('sales representatives can read branch transfers but cannot create them', async ({ page }) => {
  await signIn(page, { ...manager, id: 3, email: 'sales@oxiaura.test', role: 'SALES_REP' })
  await page.route(/\/api\/v1\/transfers(?:\?.*)?$/, (route) => route.fulfill({ json: { success: true, data: [transfer], meta: { page: 1, pages: 1 } } }))
  await page.goto('/transfers')
  await expect(page.getByRole('link', { name: 'TR-001' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Create transfer' })).toHaveCount(0)
  await page.goto('/transfers/new')
  await expect(page).toHaveURL(/\/forbidden$/)
})

test('branch manager draft creation locks the source to the assigned branch', async ({ page }) => {
  await signIn(page, manager)
  await page.goto('/transfers/new')
  await expect(page.getByLabel('Assigned transfer source')).toHaveValue('Colombo')
  await expect(page.getByLabel('Transfer source branch')).toHaveCount(0)
  await expect(page.getByLabel('Transfer destination branch ID')).toBeVisible()
})

test('branch manager can create a scoped draft without an unrestricted branch directory', async ({ page }) => {
  await signIn(page, manager)
  await page.route('**/api/v1/transfers', (route) => route.fulfill({ status: 201, json: { success: true, data: transfer } }))
  await page.route('**/api/v1/transfers/1', (route) => route.fulfill({ json: { success: true, data: transfer } }))
  await page.goto('/transfers/new')
  await page.getByLabel('Transfer destination branch ID').fill('2')
  await page.getByLabel('Transfer line 1 product').selectOption('1')
  await page.getByLabel('Transfer line 1 quantity').fill('10')
  const request = page.waitForRequest('**/api/v1/transfers')
  await page.getByRole('button', { name: 'Create draft transfer' }).click()
  expect((await request).postDataJSON()).toMatchObject({ from_branch_id: 1, to_branch_id: 2 })
  await expect(page).toHaveURL(/transfers\/1/)
})

test('destination branch manager can receive but cannot dispatch or cancel source stock', async ({ page }) => {
  await signIn(page, { ...manager, branch_id: 2 })
  const dispatched = { ...transfer, status: 'DISPATCHED', dispatch_date: '2026-08-14' }
  await page.route('**/api/v1/transfers/1?**', (route) => route.fulfill({ json: { success: true, data: dispatched } }))
  const stockRequests: string[] = []
  await page.route('**/api/v1/stock?**', (route) => { stockRequests.push(route.request().url()); return route.fulfill({ json: { success: true, data: [], meta: { total: 0 } } }) })
  await page.goto('/transfers/1')
  await expect(page.getByRole('button', { name: 'Receive transfer' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Dispatch transfer' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Cancel transfer' })).toHaveCount(0)
  expect(stockRequests).toHaveLength(0)
})

test('branch manager register ignores hostile route filters and cancellation stays hidden', async ({ page }) => {
  await signIn(page, manager)
  const transferRequests: string[] = []
  await page.route(/\/api\/v1\/transfers(?:\?.*)?$/, (route) => { transferRequests.push(route.request().url()); return route.fulfill({ json: { success: true, data: [transfer], meta: { page: 1, pages: 1 } } }) })
  await page.route('**/api/v1/transfers/1?**', (route) => route.fulfill({ json: { success: true, data: { ...transfer, status: 'DISPATCHED', dispatch_date: '2026-08-14' } } }))
  await page.goto('/transfers?branch_id=9&from_branch=9&to_branch=8')
  await expect(page.getByLabel('Assigned transfer branch')).toBeVisible()
  await expect(page.getByLabel('Transfer from branch')).toHaveCount(0)
  await expect.poll(() => transferRequests.length).toBeGreaterThan(0)
  expect(transferRequests.every((url) => {
    const query = new URL(url).searchParams
    return query.get('branch_id') === '1' && !query.has('from_branch') && !query.has('to_branch')
  })).toBe(true)
  await page.getByRole('link', { name: 'TR-001' }).click()
  await expect(page.getByRole('button', { name: 'Cancel transfer' })).toHaveCount(0)
})

test('existing received detail keeps every unresolved variance row visible', async ({ page }) => {
  await signIn(page)
  const received = { ...transfer, status: 'RECEIVED', receive_date: '2026-08-15', total_received_qty: 7, has_variance: true, lines: [{ ...line, received_qty: 7, shortfall_qty: 3 }] }
  await page.route('**/api/v1/transfers/1', (route) => route.fulfill({ json: { success: true, data: received } }))
  await page.route('**/api/v1/stock?**', (route) => route.fulfill({ json: { success: true, data: [], meta: { total: 0 } } }))
  await page.goto('/transfers/1')
  await expect(page.getByRole('heading', { name: 'Unresolved receipt variances' })).toBeVisible()
  const variance = page.locator('.variance-panel')
  await expect(variance.getByRole('cell', { name: /OX-01.*Serum/ })).toBeVisible()
  await expect(variance.getByRole('cell', { name: '! 3' })).toBeVisible()
})

test('transfer mutations invalidate transfer, in-transit, stock, and movement views', async ({ page }) => {
  await signIn(page)
  let detail = transfer
  let listRequests = 0
  let inTransitRequests = 0
  let movementRequests = 0
  let stockRequests = 0
  await page.route(/\/api\/v1\/transfers(?:\?.*)?$/, (route) => { listRequests += 1; return route.fulfill({ json: { success: true, data: [detail], meta: { page: 1, pages: 1 } } }) })
  await page.route('**/api/v1/transfers/in-transit*', (route) => { inTransitRequests += 1; return route.fulfill({ json: { success: true, data: { lines: [], total_quantity: 0, route_count: 0 } } }) })
  await page.route(/\/api\/v1\/stock\/movements(?:\?.*)?$/, (route) => { movementRequests += 1; return route.fulfill({ json: { success: true, data: [], meta: { page: 1, pages: 1 } } }) })
  await page.route(/\/api\/v1\/stock(?:\?.*)?$/, (route) => { stockRequests += 1; return route.fulfill({ json: { success: true, data: [{ product_id: 1, product_code: 'OX-01', product_name: 'Serum', branch_id: 1, branch_code: 'COL', branch_name: 'Colombo', quantity: '25', reorder_level: '2', is_low: false }], meta: { total: 1 } } }) })
  await page.route('**/api/v1/transfers/1', (route) => route.fulfill({ json: { success: true, data: detail } }))
  await page.route('**/api/v1/transfers/1/dispatch', (route) => { detail = { ...detail, status: 'DISPATCHED', dispatch_date: '2026-08-14' }; return route.fulfill({ json: { success: true, data: { transfer: detail, movements: [{ id: 1 }] } } }) })

  await page.goto('/transfers')
  await expect(page.getByRole('link', { name: 'TR-001' })).toBeVisible()
  await page.goto('/transfers/in-transit')
  await expect(page.getByText('No stock in transit')).toBeVisible()
  await page.goto('/stock/movements')
  await expect(page.getByText('No movements')).toBeVisible()
  await page.goto('/transfers/1')
  await page.getByRole('button', { name: 'Dispatch transfer' }).click()
  const dispatchResponse = page.waitForResponse('**/api/v1/transfers/1/dispatch')
  await page.getByRole('button', { name: 'Dispatch stock' }).click()
  await dispatchResponse
  await expect(page.getByRole('button', { name: 'Receive transfer' })).toBeVisible()
  await expect.poll(() => stockRequests).toBeGreaterThan(1)
  await page.goto('/transfers')
  await expect.poll(() => listRequests).toBeGreaterThan(1)
  await page.goto('/transfers/in-transit')
  await expect.poll(() => inTransitRequests).toBeGreaterThan(1)
  await page.goto('/stock/movements')
  await expect.poll(() => movementRequests).toBeGreaterThan(1)
})

test('transfer workspace remains usable at tablet width in dark mode', async ({ page }) => {
  await signIn(page)
  await page.route(/\/api\/v1\/transfers(?:\?.*)?$/, (route) => route.fulfill({ json: { success: true, data: [transfer], meta: { page: 1, pages: 1 } } }))
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto('/transfers')
  await page.getByLabel('Theme').selectOption('dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('heading', { name: 'Stock transfers' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Create transfer' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'TR-001' })).toBeVisible()
})

test('transfer API errors retain entered draft and receipt values', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/transfers', (route) => route.fulfill({ status: 409, json: { success: false, error: { code: 'TRANSFER_CONFLICT', message: 'This transfer conflicts with current stock.' } } }))
  await page.goto('/transfers/new')
  await page.getByLabel('Transfer source branch').selectOption('1')
  await page.getByLabel('Transfer destination branch').selectOption('2')
  await page.getByLabel('Transfer remarks').fill('Urgent restock')
  await page.getByLabel('Transfer line 1 product').selectOption('1')
  await page.getByLabel('Transfer line 1 quantity').fill('10')
  await page.getByRole('button', { name: 'Create draft transfer' }).click()
  await expect(page.getByText('This transfer conflicts with current stock.')).toBeVisible()
  await expect(page.getByLabel('Transfer remarks')).toHaveValue('Urgent restock')
  await expect(page.getByLabel('Transfer line 1 quantity')).toHaveValue('10')

  const dispatched = { ...transfer, status: 'DISPATCHED', dispatch_date: '2026-08-14' }
  await page.route('**/api/v1/transfers/1', (route) => route.fulfill({ json: { success: true, data: dispatched } }))
  await page.route('**/api/v1/stock?**', (route) => route.fulfill({ json: { success: true, data: [], meta: { total: 0 } } }))
  await page.route('**/api/v1/transfers/1/receive', (route) => route.fulfill({ status: 409, json: { success: false, error: { code: 'RECEIPT_CONFLICT', message: 'Receipt requires another review.' } } }))
  await page.goto('/transfers/1')
  await page.getByRole('button', { name: 'Receive transfer' }).click()
  await page.getByLabel('Receive OX-01').fill('7')
  await page.getByRole('button', { name: 'Receive transfer' }).last().click()
  await expect(page.getByText('Receipt requires another review.')).toBeVisible()
  await expect(page.getByLabel('Receive OX-01')).toHaveValue('7')
})

test('dispatch maps backend insufficient-stock details to the failing product row', async ({ page }) => {
  await signIn(page)
  await page.route('**/api/v1/transfers/1', (route) => route.fulfill({ json: { success: true, data: transfer } }))
  await page.route('**/api/v1/stock?**', (route) => route.fulfill({ json: { success: true, data: [{ product_id: 1, product_code: 'OX-01', product_name: 'Serum', branch_id: 1, branch_code: 'COL', branch_name: 'Colombo', quantity: '4', reorder_level: '2', is_low: false }], meta: { total: 1 } } }))
  await page.route('**/api/v1/transfers/1/dispatch', (route) => route.fulfill({ status: 409, json: { success: false, error: { code: 'INSUFFICIENT_STOCK', message: 'Colombo does not hold enough stock.', details: { lines: [{ product_id: 1, product_code: 'OX-01', requested: 10, available: 4, shortfall: 6 }] } } } }))
  await page.goto('/transfers/1')
  await page.getByRole('button', { name: 'Dispatch transfer' }).click()
  await page.getByRole('button', { name: 'Dispatch stock' }).click()
  await expect(page.getByText('Colombo does not hold enough stock.')).toBeVisible()
  await expect(page.getByText('Requested 10; source has 4 (short 6).')).toBeVisible()
})
