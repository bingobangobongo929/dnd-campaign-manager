import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, passwordResetEmail } from '@/lib/email'
import { randomBytes } from 'crypto'

// POST - Request password reset
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Check if user exists (using admin client)
    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({ success: true })
    }

    // Generate secure token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // 1 hour expiry

    // Delete any existing tokens for this user
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', user.id)

    // Create new token
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString()
      })

    if (tokenError) {
      console.error('Failed to create reset token:', tokenError)
      return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
    }

    // Send email
    const resetUrl = `https://multiloop.app/reset-password?token=${token}`
    const { subject, html } = passwordResetEmail(resetUrl)

    const emailResult = await sendEmail({
      to: email,
      subject,
      html
    })

    if (!emailResult.success) {
      console.error('Failed to send reset email:', emailResult.error)
      // Don't expose this to user
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Forgot password error:', err)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
