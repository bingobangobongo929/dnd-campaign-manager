import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, inviteCodeEmail } from '@/lib/email'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit'

// Generate a readable invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed confusing chars (0, O, 1, I)
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// GET - List all invite codes (admin only)
export async function GET() {
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

    // Get all invites
    const { data: invites, error } = await supabase
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ invites })
  } catch (err) {
    console.error('Failed to fetch invites:', err)
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 })
  }
}

// POST - Create a new invite code (admin only)
export async function POST(request: NextRequest) {
  try {
    // Use server client for auth verification
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

    const body = await request.json()
    const { maxUses = 1, expiresInDays, note, sendEmail: shouldSendEmail, recipientEmail } = body

    // Rate limit invite emails per admin
    if (shouldSendEmail && recipientEmail) {
      const rateLimit = checkRateLimit(`invite-email:${user.id}`, rateLimits.inviteEmail)
      if (!rateLimit.success) {
        return NextResponse.json(
          { error: `Too many invite emails. Please wait ${Math.ceil(rateLimit.resetIn / 60)} minutes.` },
          { status: 429 }
        )
      }
    }

    // Use admin client for database operations (bypasses RLS)
    const adminSupabase = createAdminClient()

    // Generate unique code
    let code = generateInviteCode()
    let attempts = 0
    while (attempts < 10) {
      const { data: existing } = await adminSupabase
        .from('invite_codes')
        .select('id')
        .eq('code', code)
        .single()

      if (!existing) break
      code = generateInviteCode()
      attempts++
    }

    // Calculate expiration
    let expiresAt = null
    if (expiresInDays && expiresInDays > 0) {
      const expDate = new Date()
      expDate.setDate(expDate.getDate() + expiresInDays)
      expiresAt = expDate.toISOString()
    }

    // Create invite using admin client
    console.log('Attempting to insert invite code:', { code, created_by: user.id, max_uses: maxUses })
    const { data: invite, error } = await adminSupabase
      .from('invite_codes')
      .insert({
        code,
        created_by: user.id,
        max_uses: maxUses,
        expires_at: expiresAt,
        note: note || null,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to insert invite code - Full error:', JSON.stringify(error, null, 2))
      return NextResponse.json({
        error: 'Failed to create invite code',
        details: error.message
      }, { status: 500 })
    }

    console.log('Invite code created successfully:', invite?.code)

    // Send email if requested
    if (shouldSendEmail && recipientEmail) {
      try {
        console.log('Attempting to send invite email to:', recipientEmail)
        const { subject, html } = inviteCodeEmail(code)
        const emailResult = await sendEmail({
          to: recipientEmail,
          subject,
          html
        })
        if (!emailResult.success) {
          console.error('Failed to send invite email:', emailResult.error)
        } else {
          console.log('Invite email sent successfully')
        }
      } catch (emailErr) {
        console.error('Email send error:', emailErr)
        // Don't fail the whole request if email fails
      }
    }

    // Log admin action using admin client (non-blocking)
    ;(async () => {
      try {
        await adminSupabase.from('admin_activity_log').insert({
          admin_id: user.id,
          action: 'create_invite_code',
          details: { code, max_uses: maxUses, expires_at: expiresAt, note }
        })
        console.log('Admin action logged')
      } catch (logErr) {
        console.error('Failed to log admin action:', logErr)
      }
    })()

    return NextResponse.json({ invite })
  } catch (err) {
    console.error('Failed to create invite - Exception:', err)
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 })
  }
}
