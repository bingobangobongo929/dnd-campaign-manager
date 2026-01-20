import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  sendEmail,
  welcomeEmail,
  inviteCodeEmail,
  passwordResetEmail,
  twoFactorEnabledEmail,
  twoFactorDisabledEmail,
  accountDeletedEmail
} from '@/lib/email'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit'

// POST - Send test email (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!settings || !['super_admin', 'moderator'].includes(settings.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Rate limit test emails per admin
    const rateLimit = checkRateLimit(`test-email:${user.id}`, rateLimits.inviteEmail)
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Too many test emails. Please wait ${Math.ceil(rateLimit.resetIn / 60)} minutes.` },
        { status: 429 }
      )
    }

    const { template, email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 })
    }

    // Generate email HTML based on template
    let emailData: { subject: string; html: string }

    switch (template) {
      case 'welcome':
        emailData = welcomeEmail('Test User')
        break
      case 'invite':
        emailData = inviteCodeEmail('TESTCODE', 'Admin')
        break
      case 'password-reset':
        emailData = passwordResetEmail('https://multiloop.app/reset-password?token=test-token-123')
        break
      case '2fa-enabled':
        emailData = twoFactorEnabledEmail()
        break
      case '2fa-disabled':
        emailData = twoFactorDisabledEmail()
        break
      case 'account-deleted':
        emailData = accountDeletedEmail('Test User')
        break
      default:
        return NextResponse.json({ error: 'Unknown template' }, { status: 400 })
    }

    // Add test email indicator to subject
    const testSubject = `[TEST] ${emailData.subject}`

    // Send the email
    const result = await sendEmail({
      to: email,
      subject: testSubject,
      html: emailData.html
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (err) {
    console.error('Failed to send test email:', err)
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
  }
}
