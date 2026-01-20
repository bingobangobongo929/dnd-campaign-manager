import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyTOTPToken, verifyBackupCode } from '@/lib/totp'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { code, isBackupCode } = await request.json()

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
      // Verify backup code
      const backupCodes = userSettings.backup_codes || []
      const index = verifyBackupCode(code, backupCodes)

      if (index !== -1) {
        isValid = true
        // Remove the used backup code
        const updatedCodes = [...backupCodes]
        updatedCodes.splice(index, 1)

        await supabase
          .from('user_settings')
          .update({ backup_codes: updatedCodes })
          .eq('user_id', user.id)
      }
    } else {
      // Verify TOTP code
      isValid = verifyTOTPToken(userSettings.totp_secret!, code, user.email!)
    }

    if (!isValid) {
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('2FA validate error:', error)
    return NextResponse.json({ error: 'Failed to validate 2FA' }, { status: 500 })
  }
}
