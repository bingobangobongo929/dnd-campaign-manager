import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

interface VerifyPasswordRequest {
  shareCode: string
  password: string
}

/**
 * POST /api/shares/verify-password
 *
 * Verifies the password for a protected share link.
 * Returns a verification token that can be stored client-side.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const body: VerifyPasswordRequest = await request.json()
    const { shareCode, password } = body

    if (!shareCode || !password) {
      return NextResponse.json({ error: 'Share code and password are required' }, { status: 400 })
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

    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 })
    }

    // If no password is set, allow access
    if (!share.password_hash) {
      return NextResponse.json({ valid: true })
    }

    // Verify password
    const isValid = await bcrypt.compare(password, share.password_hash)

    if (!isValid) {
      return NextResponse.json({ valid: false, error: 'Invalid password' }, { status: 401 })
    }

    // Generate a simple verification token (timestamp + share ID hash)
    // This token will be checked client-side and stored in sessionStorage
    const verificationToken = Buffer.from(
      JSON.stringify({
        shareCode,
        verifiedAt: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      })
    ).toString('base64')

    return NextResponse.json({
      valid: true,
      token: verificationToken,
    })
  } catch (error) {
    console.error('Verify password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
