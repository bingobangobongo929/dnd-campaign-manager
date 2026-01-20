import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  generateTOTPSecret,
  generateTOTPUri,
  generateBackupCodes,
  hashBackupCodes,
  encryptTOTPSecret,
} from '@/lib/totp'
import { checkRateLimit, rateLimits, getClientIP } from '@/lib/rate-limit'
import QRCode from 'qrcode'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limiting
  const rateLimit = checkRateLimit(`2fa-setup:${user.id}`, rateLimits.twoFactorSetup)
  if (!rateLimit.success) {
    return NextResponse.json(
      {
        error: 'Too many setup attempts. Please try again later.',
        retryAfter: rateLimit.resetIn,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.resetIn) },
      }
    )
  }

  try {
    // Check if 2FA is already enabled
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('totp_enabled')
      .eq('user_id', user.id)
      .single()

    if (userSettings?.totp_enabled) {
      return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 })
    }

    // Generate new secret (unencrypted for QR code generation)
    const secret = generateTOTPSecret()
    const uri = generateTOTPUri(user.email!, secret)

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(uri, {
      width: 256,
      margin: 2,
      color: {
        dark: '#ffffff',
        light: '#12121a',
      },
    })

    // Generate backup codes and hash them with bcrypt
    const backupCodes = generateBackupCodes(10)
    const hashedBackupCodes = await hashBackupCodes(backupCodes)

    // Encrypt the secret before storing
    const encryptedSecret = encryptTOTPSecret(secret)

    // Store the encrypted secret temporarily (not enabled yet)
    // The secret will be confirmed when the user verifies with a code
    await supabase
      .from('user_settings')
      .update({
        totp_secret: encryptedSecret,
        backup_codes: hashedBackupCodes,
      })
      .eq('user_id', user.id)

    // Log setup initiation
    await logAuditEvent(supabase, user.id, '2fa_setup_initiated', {
      ip: getClientIP(request),
    })

    return NextResponse.json({
      secret, // Return unencrypted for user to manually enter if QR fails
      qrCode: qrCodeDataUrl,
      backupCodes, // Return unhashed for user to save
      uri,
    })
  } catch (error) {
    console.error('2FA setup error:', error)
    return NextResponse.json({ error: 'Failed to set up 2FA' }, { status: 500 })
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
