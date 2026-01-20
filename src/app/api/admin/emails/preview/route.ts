import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  welcomeEmail,
  inviteCodeEmail,
  passwordResetEmail,
  twoFactorEnabledEmail,
  twoFactorDisabledEmail,
  accountDeletedEmail
} from '@/lib/email'

// POST - Generate email preview HTML (admin only)
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

    const { template } = await request.json()

    // Generate preview HTML based on template
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

    return NextResponse.json({
      html: emailData.html,
      subject: emailData.subject
    })
  } catch (err) {
    console.error('Failed to generate email preview:', err)
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 })
  }
}
