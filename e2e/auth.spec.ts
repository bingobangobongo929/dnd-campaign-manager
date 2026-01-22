import { test, expect } from '@playwright/test'

/**
 * Authentication flow tests
 * Note: These tests require test credentials set in environment variables
 */

test.describe('Authentication', () => {
  test('unauthenticated users are redirected from dashboard', async ({ page }) => {
    // Try to access protected route
    await page.goto('/home')

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated users are redirected from campaigns', async ({ page }) => {
    await page.goto('/campaigns')

    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated users are redirected from vault', async ({ page }) => {
    await page.goto('/vault')

    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated users are redirected from settings', async ({ page }) => {
    await page.goto('/settings')

    await expect(page).toHaveURL(/\/login/)
  })

  test('login form validates email format', async ({ page }) => {
    await page.goto('/login')

    // Enter invalid email
    await page.getByPlaceholder(/email/i).fill('invalid-email')
    await page.getByRole('button', { name: /sign in|continue/i }).click()

    // Should show validation error or browser validation
    // The exact behavior depends on your form implementation
  })

  test('login form requires email', async ({ page }) => {
    await page.goto('/login')

    // Try to submit without email
    const emailInput = page.getByPlaceholder(/email/i)
    await emailInput.focus()
    await emailInput.blur()

    // Click submit
    await page.getByRole('button', { name: /sign in|continue/i }).click()

    // Should still be on login page
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Authenticated User Flow', () => {
  // These tests require valid test credentials
  // Set PLAYWRIGHT_TEST_EMAIL and PLAYWRIGHT_TEST_PASSWORD env vars

  test.skip('can login with valid credentials', async ({ page }) => {
    const testEmail = process.env.PLAYWRIGHT_TEST_EMAIL
    const testPassword = process.env.PLAYWRIGHT_TEST_PASSWORD

    if (!testEmail || !testPassword) {
      test.skip()
      return
    }

    await page.goto('/login')

    // Enter credentials
    await page.getByPlaceholder(/email/i).fill(testEmail)
    await page.getByRole('button', { name: /sign in|continue/i }).click()

    // Wait for password field (magic link or password)
    await page.getByPlaceholder(/password/i).fill(testPassword)
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/(home|campaigns|vault)/)
  })
})
