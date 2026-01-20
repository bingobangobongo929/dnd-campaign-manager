import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyTOTPToken, verifyBackupCodeWithLegacy, hashBackupCodes } from '@/lib/totp'
import { checkRateLimit, rateLimits, getClientIP } from '@/lib/rate-limit'
import { z } from 'zod'

// Input validation schema
const validateSchema = z.object({
  code: z.string().min(6).max(12),
  isBackupCode: z.boolean().optional().default(false),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting - use user ID to prevent brute force per account
  const rateLimit = checkRateLimit(`2fa-validate:${user.id}`, rateLimits.twoFactorValidate)
  if (!rateLimit.success) {
    // Log failed attempt due to rate limit
    await logAuditEvent(supabase, user.id, '2fa_validate_rate_limited', {
      ip: getClientIP(request),
      remaining: rateLimit.remaining,
      resetIn: rateLimit.resetIn,
    })

    return NextResponse.json(
      {
        error: 'Too many attempts. Please try again later.',
        retryAfter: rateLimit.resetIn,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimit.resetIn),
        },
      }
    )
  }

  try {
    // Validate input
    const body = await request.json()
    const parseResult = validateSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      )
    }

    const { code, isBackupCode } = parseResult.data

    // Get 2FA settings
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('totp_enabled, totp_secret, backup_codes')
      .eq('user_id', user.id)
      .single()

    if (!userSettings?.totp_enabled) {
      return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 })
    }

    let isValid = false

    if (isBackupCode) {
      // Verify backup code (async, handles both legacy and bcrypt)
      const backupCodes = userSettings.backup_codes || []
      const index = await verifyBackupCodeWithLegacy(code, backupCodes)

      if (index !== -1) {
        isValid = true
        // Remove the used backup code
        const updatedCodes = [...backupCodes]
        updatedCodes.splice(index, 1)

        // Re-hash remaining codes if migrating from legacy
        // This ensures all codes are bcrypt hashed after first use
        const hasLegacyCodes = updatedCodes.some(c => !c.startsWith('$2'))
        const finalCodes = hasLegacyCodes
          ? await hashBackupCodes(updatedCodes.map(c => c.startsWith('$2') ? c : c)) // Keep bcrypt, legacy stays for now
          : updatedCodes

        await supabase
          .from('user_settings')
          .update({ backup_codes: finalCodes })
          .eq('user_id', user.id)

        // Log backup code usage
        await logAuditEvent(supabase, user.id, '2fa_backup_code_used', {
          ip: getClientIP(request),
          remainingCodes: updatedCodes.length,
        })
      }
    } else {
      // Verify TOTP code
      isValid = verifyTOTPToken(userSettings.totp_secret!, code, user.email!)
    }

    if (!isValid) {
      // Log failed attempt
      await logAuditEvent(supabase, user.id, '2fa_validate_failed', {
        ip: getClientIP(request),
        method: isBackupCode ? 'backup_code' : 'totp',
      })

      return NextResponse.json({ error: 'Invalid code' }, { status: 401 })
    }

    // Update last login AND mark 2FA as verified for this session
    const now = new Date().toISOString()
    await supabase
      .from('user_settings')
      .update({
        last_login_at: now,
        totp_verified_at: now,
      })
      .eq('user_id', user.id)

    // Log successful validation
    await logAuditEvent(supabase, user.id, '2fa_validate_success', {
      ip: getClientIP(request),
      method: isBackupCode ? 'backup_code' : 'totp',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('2FA validate error:', error)
    return NextResponse.json({ error: 'Failed to validate 2FA' }, { status: 500 })
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
    // Don't fail the main request if audit logging fails
    console.error('Failed to log audit event:', error)
  }
}
