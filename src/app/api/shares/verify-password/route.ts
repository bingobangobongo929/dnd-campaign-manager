import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

interface VerifyPasswordRequest {
  shareCode: string
  password: string
}

// Simple in-memory rate limiting (per-instance, resets on cold start)
// For production with multiple instances, use Redis/Upstash
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_DURATION = 15 * 60 * 1000 // 15 minutes
const ATTEMPT_WINDOW = 5 * 60 * 1000 // 5 minutes

function checkRateLimit(shareCode: string): { allowed: boolean; retryAfter?: number } {
  const key = shareCode.toLowerCase()
  const now = Date.now()
  const attempts = failedAttempts.get(key)

  if (!attempts) {
    return { allowed: true }
  }

  // Reset if outside attempt window
  if (now - attempts.lastAttempt > ATTEMPT_WINDOW) {
    failedAttempts.delete(key)
    return { allowed: true }
  }

  // Check if locked out
  if (attempts.count >= MAX_ATTEMPTS) {
    const lockoutEnd = attempts.lastAttempt + LOCKOUT_DURATION
    if (now < lockoutEnd) {
      return { allowed: false, retryAfter: Math.ceil((lockoutEnd - now) / 1000) }
    }
    // Lockout expired, reset
    failedAttempts.delete(key)
    return { allowed: true }
  }

  return { allowed: true }
}

function recordFailedAttempt(shareCode: string): void {
  const key = shareCode.toLowerCase()
  const now = Date.now()
  const attempts = failedAttempts.get(key)

  if (!attempts) {
    failedAttempts.set(key, { count: 1, lastAttempt: now })
  } else {
    failedAttempts.set(key, { count: attempts.count + 1, lastAttempt: now })
  }
}

function clearFailedAttempts(shareCode: string): void {
  failedAttempts.delete(shareCode.toLowerCase())
}

// Sign token with HMAC for integrity
function signToken(data: object): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-secret'
  const payload = JSON.stringify(data)
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return Buffer.from(JSON.stringify({ payload, signature })).toString('base64')
}

/**
 * POST /api/shares/verify-password
 *
 * Verifies the password for a protected share link.
 * Returns a signed verification token that can be stored client-side.
 * Rate limited to prevent brute force attacks.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const body: VerifyPasswordRequest = await request.json()
    const { shareCode, password } = body

    if (!shareCode || !password) {
      return NextResponse.json({ error: 'Share code and password are required' }, { status: 400 })
    }

    // Check rate limit before doing anything
    const rateLimit = checkRateLimit(shareCode)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.', retryAfter: rateLimit.retryAfter },
        { status: 429 }
      )
    }

    // Find the share across all share tables
    const tables = ['campaign_shares', 'character_shares', 'oneshot_shares'] as const
    let share: { id: string; password_hash: string | null } | null = null

    for (const table of tables) {
      const { data } = await supabase
        .from(table)
        .select('id, password_hash')
        .eq('share_code', shareCode)
        .single()

      if (data) {
        share = data
        break
      }
    }

    // Security: Use same error for not found and wrong password to prevent enumeration
    if (!share) {
      recordFailedAttempt(shareCode)
      // Add artificial delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500))
      return NextResponse.json({ valid: false, error: 'Invalid share code or password' }, { status: 401 })
    }

    // If no password is set, allow access
    if (!share.password_hash) {
      return NextResponse.json({ valid: true })
    }

    // Verify password
    const isValid = await bcrypt.compare(password, share.password_hash)

    if (!isValid) {
      recordFailedAttempt(shareCode)
      // Add artificial delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500))
      return NextResponse.json({ valid: false, error: 'Invalid share code or password' }, { status: 401 })
    }

    // Clear failed attempts on success
    clearFailedAttempts(shareCode)

    // Generate a signed verification token
    const verificationToken = signToken({
      shareCode,
      verifiedAt: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    })

    return NextResponse.json({
      valid: true,
      token: verificationToken,
    })
  } catch (error) {
    console.error('Verify password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
