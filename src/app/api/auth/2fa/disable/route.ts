import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyTOTPToken } from '@/lib/totp'
import { sendEmail, twoFactorDisabledEmail } from '@/lib/email'
import { checkRateLimit, rateLimits, getClientIP } from '@/lib/rate-limit'
import { z } from 'zod'

// Input validation schema - password optional for OAuth-only users
const disableSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
  password: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting - same as 2FA validation
  const rateLimit = checkRateLimit(`2fa-disable:${user.id}`, rateLimits.twoFactorValidate)
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
    const parseResult = disableSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      )
    }

    const { code, password } = parseResult.data

    // Check if user is OAuth-only (no password identity)
    // OAuth users have identities like 'discord', email/password users have 'email' identity
    const isOAuthOnly = user.app_metadata?.provider === 'discord' ||
      (user.identities && user.identities.every(i => i.provider !== 'email'))

    // For users with passwords, require password verification
    if (!isOAuthOnly) {
      if (!password) {
        return NextResponse.json({ error: 'Password is required' }, { status: 400 })
      }

      const { error: passwordError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password,
      })

      if (passwordError) {
        // Log failed password attempt
        await logAuditEvent(supabase, user.id, '2fa_disable_password_failed', {
          ip: getClientIP(request),
        })

        return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
      }
    }
    // For OAuth-only users, we just require the TOTP code (verified below)

    // Get current 2FA settings
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('totp_enabled, totp_secret')
      .eq('user_id', user.id)
      .single()

    if (!userSettings?.totp_enabled) {
      return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 })
    }

    // Verify the TOTP code (secret is encrypted, verifyTOTPToken handles decryption)
    const isValid = verifyTOTPToken(userSettings.totp_secret!, code, user.email!)

    if (!isValid) {
      // Log failed 2FA code attempt
      await logAuditEvent(supabase, user.id, '2fa_disable_code_failed', {
        ip: getClientIP(request),
      })

      return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 401 })
    }

    // Disable 2FA
    const { error: updateError } = await supabase
      .from('user_settings')
      .update({
        totp_enabled: false,
        totp_secret: null,
        totp_verified_at: null,
        backup_codes: null,
      })
      .eq('user_id', user.id)

    if (updateError) {
      throw updateError
    }

    // Log successful disable
    await logAuditEvent(supabase, user.id, '2fa_disabled', {
      ip: getClientIP(request),
    })

    // Send confirmation email
    if (user.email) {
      const { subject, html } = twoFactorDisabledEmail()
      await sendEmail({ to: user.email, subject, html })
    }

    return NextResponse.json({ success: true, message: '2FA disabled successfully' })
  } catch (error) {
    console.error('2FA disable error:', error)
    return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 })
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
