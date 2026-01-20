import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, welcomeEmail } from '@/lib/email'

// POST - Use an invite code (internal, called after signup)
export async function POST(request: NextRequest) {
  try {
    const { code, userId, email } = await request.json()

    if (!code || !userId) {
      return NextResponse.json({ error: 'Missing code or userId' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Use the database function to mark the code as used
    const { data, error } = await supabase.rpc('use_invite_code', {
      code_to_use: code.toUpperCase().trim(),
      user_id_using: userId
    })

    if (error) {
      console.error('Use invite error:', error)
      return NextResponse.json({ error: 'Failed to use invite code' }, { status: 500 })
    }

    // Get the invite code details to find who created it
    const { data: invite } = await supabase
      .from('invite_codes')
      .select('created_by')
      .eq('code', code.toUpperCase().trim())
      .single()

    // Update user settings with invited_by if we know who created the invite
    if (invite?.created_by) {
      await supabase
        .from('user_settings')
        .update({
          invited_by: invite.created_by,
          invite_code_used: code.toUpperCase().trim()
        })
        .eq('user_id', userId)
    }

    // Send welcome email
    if (email) {
      const userName = email.split('@')[0] // Use email prefix as name
      const { subject, html } = welcomeEmail(userName)
      await sendEmail({ to: email, subject, html })
    }

    return NextResponse.json({ success: data })
  } catch (err) {
    console.error('Use invite error:', err)
    return NextResponse.json({ error: 'Failed to use invite code' }, { status: 500 })
  }
}
