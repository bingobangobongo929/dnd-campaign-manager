import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyTOTPToken } from '@/lib/totp'

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { code, password } = await request.json()

    // Verify password
    const { error: passwordError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password,
    })

    if (passwordError) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    // Get current 2FA settings
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('totp_enabled, totp_secret')
      .eq('user_id', user.id)
      .single()

    if (!userSettings?.totp_enabled) {
      return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 })
    }

    // Verify the TOTP code
    const isValid = verifyTOTPToken(userSettings.totp_secret!, code, user.email!)

    if (!isValid) {
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

    return NextResponse.json({ success: true, message: '2FA disabled successfully' })
  } catch (error) {
    console.error('2FA disable error:', error)
    return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 })
  }
}
