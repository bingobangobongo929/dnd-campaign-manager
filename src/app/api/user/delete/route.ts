import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, accountDeletionScheduledEmail } from '@/lib/email'
import { randomBytes } from 'crypto'

// Grace period in days
const DELETION_GRACE_PERIOD_DAYS = 14

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { confirmation, password, totpCode } = body

    // Verify confirmation text
    if (confirmation !== 'DELETE') {
      return NextResponse.json({ error: 'Please type DELETE to confirm' }, { status: 400 })
    }

    // Check if user is OAuth-only (no password identity)
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
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
      }
    }
    // For OAuth-only users, they're already authenticated via their provider

    // Check if 2FA is enabled and verify TOTP code if so
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('totp_enabled, totp_secret, username, deletion_scheduled_at')
      .eq('user_id', user.id)
      .single()

    // Check if deletion is already scheduled
    if (userSettings?.deletion_scheduled_at) {
      return NextResponse.json({
        error: 'Account deletion is already scheduled',
        deletionDate: userSettings.deletion_scheduled_at
      }, { status: 400 })
    }

    if (userSettings?.totp_enabled) {
      if (!totpCode) {
        return NextResponse.json({ error: '2FA code required' }, { status: 400 })
      }

      // Verify TOTP code
      const { TOTP } = await import('otpauth')
      const totp = new TOTP({
        issuer: 'Multiloop',
        label: user.email!,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: userSettings.totp_secret!,
      })

      const isValid = totp.validate({ token: totpCode, window: 1 }) !== null
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid 2FA code' }, { status: 401 })
      }
    }

    // Calculate deletion date (14 days from now)
    const now = new Date()
    const deletionDate = new Date(now.getTime() + (DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000))

    // Generate a secure cancellation token
    const cancellationToken = randomBytes(32).toString('hex')

    // Schedule deletion instead of immediate delete
    const { error: updateError } = await supabase
      .from('user_settings')
      .update({
        deletion_requested_at: now.toISOString(),
        deletion_scheduled_at: deletionDate.toISOString(),
        deletion_cancellation_token: cancellationToken,
      })
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Failed to schedule deletion:', updateError)
      return NextResponse.json({ error: 'Failed to schedule deletion' }, { status: 500 })
    }

    // Format deletion date for email
    const formattedDate = deletionDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Build cancel URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://multiloop.app'
    const cancelUrl = `${baseUrl}/account/cancel-deletion?token=${cancellationToken}&email=${encodeURIComponent(user.email!)}`

    // Send confirmation email
    const emailResult = await sendEmail({
      to: user.email!,
      ...accountDeletionScheduledEmail({
        userName: userSettings?.username || user.email?.split('@')[0] || 'Adventurer',
        deletionDate: formattedDate,
        cancelUrl,
      })
    })

    if (!emailResult.success) {
      console.error('Failed to send deletion scheduled email:', emailResult.error)
      // Don't fail the request, deletion is still scheduled
    }

    // Sign out the user
    await supabase.auth.signOut()

    return NextResponse.json({
      success: true,
      message: 'Account deletion scheduled',
      deletionDate: deletionDate.toISOString(),
      formattedDate,
      gracePeriodDays: DELETION_GRACE_PERIOD_DAYS,
    })
  } catch (error) {
    console.error('Account deletion scheduling error:', error)
    return NextResponse.json({ error: 'Failed to schedule account deletion' }, { status: 500 })
  }
}
