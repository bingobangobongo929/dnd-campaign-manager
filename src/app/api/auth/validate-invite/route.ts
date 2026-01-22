import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory rate limiting by IP (per-instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const MAX_REQUESTS = 10 // 10 attempts
const WINDOW_MS = 60 * 1000 // per minute

function getRateLimitKey(request: NextRequest): string {
  // Get IP from various headers (Vercel, Cloudflare, etc.)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  return forwarded?.split(',')[0]?.trim() || realIp || 'unknown'
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: MAX_REQUESTS - 1 }
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: MAX_REQUESTS - entry.count }
}

// POST - Validate an invite code (public - no auth required)
export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = getRateLimitKey(request)
    const rateLimit = checkRateLimit(ip)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { valid: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Use admin client since this is a public endpoint
    const supabase = createAdminClient()
    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ valid: false, error: 'Invalid code' }, { status: 400 })
    }

    // Use the database function to validate
    const { data, error } = await supabase.rpc('validate_invite_code', {
      code_to_validate: code.toUpperCase().trim()
    })

    if (error) {
      console.error('Validate invite error:', error)
      return NextResponse.json({ valid: false, error: 'Failed to validate code' }, { status: 500 })
    }

    const result = data?.[0]
    if (!result) {
      return NextResponse.json({ valid: false, error: 'Invalid invite code' })
    }

    return NextResponse.json({
      valid: result.valid,
      error: result.error_message || null
    })
  } catch (err) {
    console.error('Validate invite error:', err)
    return NextResponse.json({ valid: false, error: 'Failed to validate code' }, { status: 500 })
  }
}
