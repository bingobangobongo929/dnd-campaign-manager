import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

// POST /api/campaigns/[id]/members/remind - Send claim reminder to player
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { memberId, characterId } = body

    if (!memberId || !characterId) {
      return NextResponse.json(
        { error: 'memberId and characterId are required' },
        { status: 400 }
      )
    }

    // Verify the user is the campaign owner or co-DM
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, user_id')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Check if user is owner or co-DM
    const isOwner = campaign.user_id === user.id

    if (!isOwner) {
      const { data: membership } = await supabase
        .from('campaign_members')
        .select('role')
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id)
        .single()

      if (!membership || membership.role !== 'co_dm') {
        return NextResponse.json(
          { error: 'Only campaign owners and co-DMs can send reminders' },
          { status: 403 }
        )
      }
    }

    // Get the member details
    const { data: member, error: memberError } = await supabase
      .from('campaign_members')
      .select('id, email, user_id, vault_character_id')
      .eq('id', memberId)
      .eq('campaign_id', campaignId)
      .single()

    if (memberError || !member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Check if already claimed
    if (member.vault_character_id) {
      return NextResponse.json(
        { error: 'Character has already been claimed' },
        { status: 400 }
      )
    }

    // Get the character
    const { data: character, error: characterError } = await supabase
      .from('characters')
      .select('id, name')
      .eq('id', characterId)
      .single()

    if (characterError || !character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    // Get the email to send to
    let recipientEmail = member.email

    // If member has a user_id, get their email from auth
    if (member.user_id && !recipientEmail) {
      const { data: memberUser } = await supabase.auth.admin.getUserById(member.user_id)
      recipientEmail = memberUser?.user?.email
    }

    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'No email address found for this member' },
        { status: 400 }
      )
    }

    // Send the reminder email
    if (resend) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://multiloop.app'

      await resend.emails.send({
        from: 'Multiloop <noreply@multiloop.app>',
        to: recipientEmail,
        subject: `Reminder: Claim your character "${character.name}" in ${campaign.name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Your character is waiting!</h2>
            <p>You have a character ready to claim in <strong>${campaign.name}</strong>:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0;">${character.name}</h3>
              <p style="margin: 0; color: #666;">Claim this character to your vault to:</p>
              <ul style="color: #666;">
                <li>Track your journey across sessions</li>
                <li>Add private notes only you can see</li>
                <li>Keep a copy for future campaigns</li>
              </ul>
            </div>
            <p>
              <a href="${appUrl}/campaigns/${campaignId}/dashboard"
                 style="display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
                Claim Your Character
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">
              If you don't have a Multiloop account yet, you'll be prompted to create one.
            </p>
          </div>
        `,
      })
    }

    // Track that a reminder was sent (optional: could add a sent_reminders table)
    // For now, we'll just return success

    return NextResponse.json({
      success: true,
      message: `Reminder sent to ${recipientEmail}`,
    })

  } catch (error) {
    console.error('Remind error:', error)
    return NextResponse.json(
      { error: 'Failed to send reminder' },
      { status: 500 }
    )
  }
}
