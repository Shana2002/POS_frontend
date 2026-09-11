import { expect, test } from '@playwright/test'

const adminUser = { id: 'admin-1', full_name: 'Admin User', email: 'admin@oxiaura.test', role: 'ADMIN', branch_id: null, is_active: true }
const salesUser = { id: 'sales-1', full_name: 'Sales User', email: 'sales@oxiaura.test', role: 'SALES_REP', branch_id: 'BR-01', is_active: true }
const product = { id: 'p1', code: 'OX-01', name: 'Herbal Soap', category_id: 'cat1', category_code: 'PCARE', category_name: 'Personal Care', unit_price: '550.00', cost_price: '320.00', reorder_level: '10', unit_of_measure: 'each', image_path: null, is_active: true, is_low: true, updated_at: '2026-08-14T02:00:00Z' }
const productCategories = [{ id: 'cat1', code: 'PCARE', name: 'Personal Care', is_active: true }]

async function signIn(page: import('@playwright/test').Page, user: typeof adminUser | typeof salesUser) {
  await page.route('**/api/v1/auth/login', async (route) => route.fulfill({ json: { success: true, data: { access_token: 'access', refresh_token: 'refresh', user } } }))
  await page.route('**/api/v1/auth/me', async (route) => route.fulfill({ json: { success: true, data: user } }))
  await page.route('**/api/v1/health', async (route) => route.fulfill({ json: { success: true, data: { status: 'ok', db: 'ok' } } }))
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: 'Sign in' }).click()
}

test('ADMIN searches products, changes price, and reviews URL-backed movement history', async ({ page }) => {
  await signIn(page, adminUser)
  await page.route('**/api/v1/products?**', async (route) => route.fulfill({ json: { success: true, data: [product], meta: { page: 1, pages: 1, total: 1 } } }))
  await page.route('**/api/v1/product-categories?**', async (route) => route.fulfill({ json: { success: true, data: productCategories, meta: { page: 1, pages: 1 } } }))
  await page.route('**/api/v1/products/p1', async (route) => route.fulfill({ json: { success: true, data: product } }))
  await page.route('**/api/v1/products/p1/price', async (route) => route.fulfill({ json: { success: true, data: { ...product, unit_price: '575.00' } } }))
  await page.route('**/api/v1/products/p1/price-history?**', async (route) => route.fulfill({ json: { success: true, data: [{ id: 'ph1', product_id: 'p1', price: '575.00', cost_price: '320.00', effective_from: '2026-08-14', changed_by: 'admin-1', created_at: '2026-08-14T03:00:00Z' }], meta: { page: 1, pages: 1 } } }))
  await page.route('**/api/v1/products/p1/movement?**', async (route) => route.fulfill({ json: { success: true, meta: { product_id: 'p1', branch_id: 'b1', from: '2026-08-01', to: '2026-08-14', opening_balance: '10', total_in: '5', total_out: '2', closing_balance: '13', movement_count: 1 }, rows: [{ movement: { id: 'm1', movement_date: '2026-08-10', product_id: 'p1', product_code: 'OX-01', product_name: 'Herbal Soap', branch_id: 'b1', branch_code: 'BR-01', movement_type: 'SALE', qty_in: '0', qty_out: '2', signed_qty: '-2', reference_type: 'INVOICE', reference_id: 'INV-1', created_by: 'admin-1', created_at: '2026-08-10T02:00:00Z' }, running_balance: '13' }] } }))

  await page.goto('/products?search=soap&category_id=cat1')
  await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible()
  await expect(page.getByLabel('Search products')).toHaveValue('soap')
  await expect(page.getByText('! Low stock')).toBeVisible()
  await page.getByRole('link', { name: 'Herbal Soap', exact: true }).click()
  await expect(page.getByText('Cost price')).toBeVisible()
  await page.getByRole('button', { name: 'Change price' }).click()
  await page.getByLabel('Selling price').fill('575.00')
  await page.getByRole('button', { name: 'Confirm price change' }).click()
  await expect(page.getByText('LKR 575.00')).toBeVisible()
  await page.getByRole('button', { name: 'Movement history' }).click()
  await page.getByLabel('Movement branch ID').fill('b1')
  await expect(page).toHaveURL(/branch_id=b1/)
  await page.getByLabel('Movement from date').fill('2026-08-01')
  await expect.poll(() => {
    const url = new URL(page.url())
    return { branch: url.searchParams.get('branch_id'), from: url.searchParams.get('from') }
  }).toEqual({ branch: 'b1', from: '2026-08-01' })
  await expect(page.getByText('Opening balance')).toBeVisible()
  await expect(page.getByRole('cell', { name: '13' })).toBeVisible()
})

test('a non-cost role sees no cost placeholder or catalogue write actions', async ({ page }) => {
  const restrictedProduct = Object.fromEntries(Object.entries(product).filter(([key]) => key !== 'cost_price'))
  await signIn(page, salesUser)
  await page.route('**/api/v1/products/p1', async (route) => route.fulfill({ json: { success: true, data: restrictedProduct } }))
  await page.goto('/products/p1')
  await expect(page.getByRole('heading', { name: 'Herbal Soap' })).toBeVisible()
  await expect(page.getByText('Cost price')).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Change price' })).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit product' })).not.toBeVisible()
})

// A real 1x1 PNG, so the authenticated blob fetch decodes into a renderable image.
const PNG_BUFFER = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')

test('the grid shows a server-uploaded image, fetched authenticated', async ({ page }) => {
  const withImage = { ...product, image_path: 'product_p1_ab12cd34ef56.png' }
  await signIn(page, salesUser)
  await page.route('**/api/v1/products?**', async (route) => route.fulfill({ json: { success: true, data: [withImage], meta: { page: 1, pages: 1, total: 1 } } }))
  await page.route('**/api/v1/product-categories?**', async (route) => route.fulfill({ json: { success: true, data: productCategories, meta: { page: 1, pages: 1 } } }))
  await page.route('**/api/v1/products/p1/image', async (route) => route.fulfill({ contentType: 'image/png', body: PNG_BUFFER }))
  await page.goto('/products')
  await expect(page.locator('.product-image img')).toBeVisible()
})

test('ADMIN attaches an image file when creating a product', async ({ page }) => {
  const created = { ...product, id: 'p2', code: 'OX-02', name: 'Aloe Cream', is_low: false }
  const withImage = { ...created, image_path: 'product_p2_ab12cd34ef56.png' }
  let uploaded = false
  await signIn(page, adminUser)
  await page.route('**/api/v1/products?**', async (route) => route.fulfill({ json: { success: true, data: [product], meta: { page: 1, pages: 1, total: 1 } } }))
  await page.route('**/api/v1/product-categories?**', async (route) => route.fulfill({ json: { success: true, data: productCategories, meta: { page: 1, pages: 1 } } }))
  await page.route('**/api/v1/products', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    return route.fulfill({ json: { success: true, data: created } })
  })
  await page.route('**/api/v1/products/p2/image', async (route) => {
    if (route.request().method() === 'POST') {
      uploaded = true
      return route.fulfill({ json: { success: true, data: withImage } })
    }
    return route.fulfill({ contentType: 'image/png', body: PNG_BUFFER })
  })
  await page.route('**/api/v1/products/p2', async (route) => route.fulfill({ json: { success: true, data: withImage } }))

  await page.goto('/products')
  await page.getByRole('button', { name: 'Create product' }).click()
  await page.getByLabel('Code').fill('OX-02')
  await page.getByLabel('Name').fill('Aloe Cream')
  await page.locator('.admin-form select').selectOption('cat1')
  await page.getByLabel('Reorder level').fill('5')
  await page.getByLabel('Unit of measure').fill('PCS')
  await page.getByLabel('Product image file').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: PNG_BUFFER })
  await page.getByRole('button', { name: 'Save product' }).click()

  await expect(page).toHaveURL(/\/products\/p2$/)
  expect(uploaded).toBe(true)
  await expect(page.locator('.product-overview-image img')).toBeVisible()
})
