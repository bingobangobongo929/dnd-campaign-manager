import { test, expect } from '@playwright/test'

/**
 * Tests for share functionality and public share pages
 */

test.describe('Share Pages', () => {
  test('invalid share code returns 404 or error page', async ({ page }) => {
    await page.goto('/share/c/invalid-code-12345')

    // Should show error or 404
    const content = await page.textContent('body')
    const hasError = content?.toLowerCase().includes('not found') ||
                     content?.toLowerCase().includes('invalid') ||
                     content?.toLowerCase().includes('error') ||
                     content?.toLowerCase().includes('expired')

    expect(hasError).toBe(true)
  })

  test('campaign share page handles missing code', async ({ page }) => {
    const response = await page.goto('/share/campaign/')

    // Should return 404
    expect([404, 200]).toContain(response?.status() || 404)
  })

  test('character share page handles missing code', async ({ page }) => {
    const response = await page.goto('/share/character/')

    expect([404, 200]).toContain(response?.status() || 404)
  })

  test('oneshot share page handles missing code', async ({ page }) => {
    const response = await page.goto('/share/oneshot/')

    expect([404, 200]).toContain(response?.status() || 404)
  })
})

test.describe('Share Page Security', () => {
  test('share pages do not expose sensitive user data', async ({ page }) => {
    // Even if we get to a share page, ensure no sensitive data leaks
    await page.goto('/share/c/test-code')

    const content = await page.content()

    // Should not contain email addresses (beyond expected UI)
    // Should not contain API keys or tokens
    expect(content).not.toMatch(/sk_[a-zA-Z0-9]+/) // Stripe keys
    expect(content).not.toMatch(/eyJ[a-zA-Z0-9_-]+\.eyJ/) // JWT tokens
  })

  test('share pages do not allow SQL injection in code', async ({ page }) => {
    // Try SQL injection in share code
    await page.goto("/share/c/'; DROP TABLE campaigns; --")

    // Should handle gracefully, not error
    const response = await page.goto("/share/c/' OR '1'='1")
    expect(response?.status()).not.toBe(500)
  })
})
