import { expect, test } from '@playwright/test'

test('boots on the login screen and switches color modes', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/login/)
  await expect(page.getByRole('heading', { name: 'Sign in to continue.' })).toBeVisible()
  await page.evaluate(() => localStorage.setItem('oxiaura-theme', 'dark'))
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})
