import { test, expect } from '@playwright/test'

/**
 * Tests for public pages that don't require authentication
 */

test.describe('Public Pages', () => {
  test('landing page loads correctly', async ({ page }) => {
    await page.goto('/')

    // Check main heading exists
    await expect(page.locator('h1')).toContainText('Track Campaigns')

    // Check CTA buttons
    await expect(page.getByRole('link', { name: /start your adventure/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /explore demo/i })).toBeVisible()

    // Check sign in link
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
  })

  test('changelog page loads', async ({ page }) => {
    await page.goto('/changelog')

    await expect(page.locator('h1')).toContainText('Changelog')

    // Check back link
    await expect(page.getByRole('link', { name: /back/i })).toBeVisible()
  })

  test('privacy policy page loads', async ({ page }) => {
    await page.goto('/privacy')

    await expect(page.locator('h1')).toContainText('Privacy')
  })

  test('terms of service page loads', async ({ page }) => {
    await page.goto('/terms')

    await expect(page.locator('h1')).toContainText('Terms')
  })

  test('cookies policy page loads', async ({ page }) => {
    await page.goto('/cookies')

    await expect(page.locator('h1')).toContainText('Cookie')
  })

  test('login page loads', async ({ page }) => {
    await page.goto('/login')

    // Should have email input
    await expect(page.getByPlaceholder(/email/i)).toBeVisible()

    // Should have sign in button
    await expect(page.getByRole('button', { name: /sign in|continue/i })).toBeVisible()
  })

  test('landing page navigation works', async ({ page }) => {
    await page.goto('/')

    // Click sign in
    await page.getByRole('link', { name: /sign in/i }).click()

    // Should navigate to login
    await expect(page).toHaveURL(/\/login/)
  })
})
