import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyTOTPToken } from '@/lib/totp'
import { sendEmail, twoFactorEnabledEmail } from '@/lib/email'
import { checkRateLimit, rateLimits, getClientIP } from '@/lib/rate-limit'
import { z } from 'zod'

// Input validation schema
const verifySchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting
  const rateLimit = checkRateLimit(`2fa-verify:${user.id}`, rateLimits.twoFactorValidate)
  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: 'Too many attempts. Please try again later.',
        retryAfter: rateLimit.resetIn,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.resetIn) },
      }
    )
  }

  try {
    // Validate input
    const body = await request.json()
    const parseResult = verifySchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid code format. Code must be 6 digits.' },
        { status: 400 }
      )
    }

    const { code } = parseResult.data

    // Get the pending secret
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('totp_secret, totp_enabled')
      .eq('user_id', user.id)
      .single()

    if (!userSettings?.totp_secret) {
      return NextResponse.json({ error: 'No 2FA setup in progress' }, { status: 400 })
    }

    if (userSettings.totp_enabled) {
      return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 })
    }

    // Verify the code (totp_secret is already encrypted, verifyTOTPToken handles decryption)
    const isValid = verifyTOTPToken(userSettings.totp_secret, code, user.email!)

    if (!isValid) {
      // Log failed attempt
      await logAuditEvent(supabase, user.id, '2fa_verify_failed', {
        ip: getClientIP(request),
      })

      return NextResponse.json({ error: 'Invalid verification code' }, { status: 401 })
    }

    // Enable 2FA
    const { error: updateError } = await supabase
      .from('user_settings')
      .update({
        totp_enabled: true,
        totp_verified_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    if (updateError) {
      throw updateError
    }

    // Log successful enable
    await logAuditEvent(supabase, user.id, '2fa_enabled', {
      ip: getClientIP(request),
    })

    // Send confirmation email
    if (user.email) {
      const { subject, html } = twoFactorEnabledEmail()
      await sendEmail({ to: user.email, subject, html })
    }

    return NextResponse.json({ success: true, message: '2FA enabled successfully' })
  } catch (error) {
    console.error('2FA verify error:', error)
    return NextResponse.json({ error: 'Failed to verify 2FA' }, { status: 500 })
  }
}

/**
 * Log audit event for 2FA actions
 */
async function logAuditEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  action: string,
  details: Record<string, unknown>
) {
  try {
    await supabase.from('admin_activity_log').insert({
      admin_id: userId,
      action,
      details,
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to log audit event:', error)
  }
}
