import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyTOTPToken } from '@/lib/totp'
import { sendEmail, twoFactorEnabledEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { code } = await request.json()

    if (!code || code.length !== 6) {
      return NextResponse.json({ error: 'Invalid code format' }, { status: 400 })
    }

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

    // Verify the code
    const isValid = verifyTOTPToken(userSettings.totp_secret, code, user.email!)

    if (!isValid) {
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
