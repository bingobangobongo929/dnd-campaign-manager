import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateTOTPSecret, generateTOTPUri, generateBackupCodes, hashBackupCode } from '@/lib/totp'
import QRCode from 'qrcode'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Generate new secret
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

    // Generate backup codes
    const backupCodes = generateBackupCodes(10)
    const hashedBackupCodes = backupCodes.map(hashBackupCode)

    // Store the secret temporarily (not enabled yet)
    // The secret will be confirmed when the user verifies with a code
    await supabase
      .from('user_settings')
      .update({
        totp_secret: secret,
        backup_codes: hashedBackupCodes,
      })
      .eq('user_id', user.id)

    return NextResponse.json({
      secret,
      qrCode: qrCodeDataUrl,
      backupCodes,
      uri,
    })
  } catch (error) {
    console.error('2FA setup error:', error)
    return NextResponse.json({ error: 'Failed to set up 2FA' }, { status: 500 })
  }
}
