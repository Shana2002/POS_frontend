import { expect, test } from '@playwright/test'

test('boots on the login screen, applies foundation styling, and switches color modes', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/login/)
  await expect(page.getByRole('heading', { name: 'Sign in to continue.' })).toBeVisible()
  await expect(page.locator('.login-page')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
  await expect(page.locator('.login-panel h1')).toHaveCSS('font-size', '48px')
  await page.evaluate(() => localStorage.setItem('oxiaura-theme', 'dark'))
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})
