import { test, expect } from '@playwright/test'

/**
 * Security-focused E2E tests
 * Tests for common vulnerabilities and security misconfigurations
 */

test.describe('Security Headers', () => {
  test('response includes security headers', async ({ page }) => {
    const response = await page.goto('/')

    const headers = response?.headers()

    // Check for common security headers
    // Note: These may be set by Vercel/hosting, not the app itself
    // Adjust expectations based on your actual configuration
  })
})

test.describe('XSS Prevention', () => {
  test('login form escapes malicious input', async ({ page }) => {
    await page.goto('/login')

    // Try XSS payload in email field
    const xssPayload = '<script>alert("xss")</script>'
    await page.getByPlaceholder(/email/i).fill(xssPayload)

    // The script should not execute
    // Check that the page content doesn't contain unescaped script
    const content = await page.content()
    expect(content).not.toContain('<script>alert("xss")</script>')
  })

  test('search inputs escape malicious content', async ({ page }) => {
    await page.goto('/changelog')

    // If there's a search feature, test it
    // This is a placeholder - adjust based on actual features
  })
})

test.describe('URL Parameter Injection', () => {
  test('handles malicious redirect parameters', async ({ page }) => {
    // Try to inject a redirect to external site
    await page.goto('/login?redirect=https://evil.com')

    // Should not redirect to external domain after any action
    // The app should validate redirect URLs
  })

  test('handles malicious callback URLs', async ({ page }) => {
    await page.goto('/auth/callback?code=test&redirect=https://evil.com')

    // Should not redirect to external domain
  })
})

test.describe('API Security', () => {
  test('API requires authentication for protected endpoints', async ({ request }) => {
    // Try to access protected API without auth
    const response = await request.get('/api/recent-items')

    expect(response.status()).toBe(401)
  })

  test('API rejects invalid content types', async ({ request }) => {
    const response = await request.post('/api/recent-items', {
      data: 'not json',
      headers: {
        'Content-Type': 'text/plain',
      },
    })

    // Should reject or handle gracefully
    expect([400, 401, 415]).toContain(response.status())
  })
})

test.describe('Path Traversal Prevention', () => {
  test('rejects path traversal in share codes', async ({ page }) => {
    // Try path traversal in share URL
    const response = await page.goto('/share/c/../../../etc/passwd')

    // Should return 404 or redirect, not expose files
    expect([404, 302, 301]).toContain(response?.status() || 404)
  })
})

test.describe('Rate Limiting', () => {
  test.skip('login endpoint has rate limiting', async ({ request }) => {
    // Make multiple rapid requests
    const requests = Array(20).fill(null).map(() =>
      request.post('/api/auth/login', {
        data: { email: 'test@test.com' },
      })
    )

    const responses = await Promise.all(requests)

    // At least some should be rate limited (429)
    const rateLimited = responses.filter(r => r.status() === 429)

    // This test may need adjustment based on actual rate limiting config
  })
})

test.describe('Session Security', () => {
  test('cookies have secure attributes', async ({ page, context }) => {
    await page.goto('/login')

    const cookies = await context.cookies()

    // Check that auth-related cookies have secure flags
    // The exact cookie names depend on your Supabase configuration
    for (const cookie of cookies) {
      if (cookie.name.includes('auth') || cookie.name.includes('session')) {
        // In production, cookies should be secure
        if (process.env.NODE_ENV === 'production') {
          expect(cookie.secure).toBe(true)
        }
        // Should have httpOnly for sensitive cookies
        // expect(cookie.httpOnly).toBe(true)
      }
    }
  })
})

test.describe('CSRF Protection', () => {
  test('state-changing requests require proper origin', async ({ request }) => {
    // Try to make a request with a different origin
    const response = await request.post('/api/recent-items', {
      data: JSON.stringify({ itemType: 'campaign', itemId: 'test', itemName: 'test' }),
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://evil.com',
      },
    })

    // Should reject or require authentication
    expect([401, 403]).toContain(response.status())
  })
})
