/**
 * Simple in-memory rate limiter for serverless functions.
 * Note: This resets on cold starts, so it's not perfect but prevents basic abuse.
 * For production, consider using Redis or Upstash.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  limit: number
  /** Time window in seconds */
  windowSeconds: number
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetIn: number
}

/**
 * Check rate limit for a given identifier (usually IP or email)
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now()
  const windowMs = options.windowSeconds * 1000
  const key = identifier

  const entry = rateLimitStore.get(key)

  if (!entry || entry.resetTime < now) {
    // First request or window expired - allow and start new window
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    })
    return {
      success: true,
      remaining: options.limit - 1,
      resetIn: options.windowSeconds,
    }
  }

  if (entry.count >= options.limit) {
    // Rate limit exceeded
    return {
      success: false,
      remaining: 0,
      resetIn: Math.ceil((entry.resetTime - now) / 1000),
    }
  }

  // Increment counter
  entry.count++
  return {
    success: true,
    remaining: options.limit - entry.count,
    resetIn: Math.ceil((entry.resetTime - now) / 1000),
  }
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  // Vercel forwards the real IP in these headers
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback - this shouldn't happen on Vercel
  return 'unknown'
}

// Pre-configured rate limiters for common use cases
export const rateLimits = {
  // Forgot password: 3 requests per 15 minutes per IP
  forgotPassword: { limit: 3, windowSeconds: 15 * 60 },

  // Signup: 5 requests per hour per IP
  signup: { limit: 5, windowSeconds: 60 * 60 },

  // Login: 10 requests per 15 minutes per IP
  login: { limit: 10, windowSeconds: 15 * 60 },

  // Invite email: 10 requests per hour per admin
  inviteEmail: { limit: 10, windowSeconds: 60 * 60 },
}
