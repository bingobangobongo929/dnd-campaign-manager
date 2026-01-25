import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import {
  extractDiscordMetadata,
  saveDiscordToUserSettings,
  activatePendingDiscordMemberships,
  getDiscordDisplayName,
  findPendingDiscordMemberships,
  ensurePngAvatarUrl,
} from '@/lib/discord'

// OAuth callback route - handles Discord (and future OAuth providers)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/home'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription || error)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('No authorization code received')}`
    )
  }

  const supabase = await createClient()
  const adminClient = createAdminClient()

  // Exchange code for session
  const { data: authData, error: authError } = await supabase.auth.exchangeCodeForSession(code)

  if (authError || !authData.user) {
    console.error('Auth exchange error:', authError)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(authError?.message || 'Authentication failed')}`
    )
  }

  const user = authData.user

  // Check if this is a Discord OAuth login
  const discordMetadata = extractDiscordMetadata(user)

  if (discordMetadata) {
    // This is a Discord OAuth user
    const discordUsername = getDiscordDisplayName(discordMetadata)

    // Check if user_settings exists
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('user_id, discord_id')
      .eq('user_id', user.id)
      .single()

    if (!existingSettings) {
      // NEW USER via Discord OAuth
      // Check if they have a pending campaign invite for this Discord
      const pendingMemberships = await findPendingDiscordMemberships(
        adminClient,
        discordMetadata.provider_id,
        discordUsername
      )

      // If no pending campaign invite, check if this is an invite page redirect
      // (which means they're accepting a campaign invite link)
      const isInviteRedirect = next.startsWith('/invite/')

      if (pendingMemberships.length === 0 && !isInviteRedirect) {
        // No pending invite and not coming from an invite link
        // Block new signups - require invite code
        // Sign them out and redirect to login with error
        await supabase.auth.signOut()
        return NextResponse.redirect(
          `${origin}/login?error=${encodeURIComponent('Discord signup requires an invite code or campaign invite. Please sign up with email first, then link Discord.')}`
        )
      }

      // Create user_settings for new Discord user (they have a valid invite)
      // Use Discord avatar as their profile avatar (always PNG, no GIF)
      const now = new Date().toISOString()
      const avatarUrl = ensurePngAvatarUrl(discordMetadata.avatar_url)
      await supabase.from('user_settings').insert({
        user_id: user.id,
        tier: 'adventurer',
        role: 'user',
        discord_id: discordMetadata.provider_id,
        discord_username: discordUsername,
        discord_avatar: avatarUrl,
        discord_linked_at: now,
        avatar_url: avatarUrl, // Use Discord avatar as profile avatar
        terms_accepted_at: now,
        privacy_accepted_at: now,
        last_login_at: now,
      })
    } else if (!existingSettings.discord_id) {
      // User exists but Discord not linked - this is an AUTO-LINK situation
      // Supabase linked the Discord identity to this account automatically
      // We need to ask for user consent before saving Discord info

      // Save Discord metadata temporarily but redirect to confirmation page
      await saveDiscordToUserSettings(supabase, user.id, discordMetadata)

      // Redirect to Discord link confirmation page instead of the intended destination
      // This lets the user confirm the link and choose avatar preferences
      const pngAvatarUrl = ensurePngAvatarUrl(discordMetadata.avatar_url) || ''
      return NextResponse.redirect(
        `${origin}/settings/discord-linked?avatar=${encodeURIComponent(pngAvatarUrl)}&username=${encodeURIComponent(discordUsername)}`
      )
    }

    // Activate any pending campaign memberships for this Discord user
    const activated = await activatePendingDiscordMemberships(
      supabase,
      user.id,
      discordMetadata.provider_id,
      discordUsername
    )

    if (activated > 0) {
      console.log(`Activated ${activated} pending memberships for Discord user ${discordUsername}`)
    }

    // Update last login
    await supabase
      .from('user_settings')
      .update({ last_login_at: new Date().toISOString() })
      .eq('user_id', user.id)
  } else {
    // Non-Discord OAuth (future providers) or email login
    // Just ensure user_settings exists
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (!existingSettings) {
      const now = new Date().toISOString()
      await supabase.from('user_settings').insert({
        user_id: user.id,
        tier: 'adventurer',
        role: 'user',
        terms_accepted_at: now,
        privacy_accepted_at: now,
        last_login_at: now,
      })
    } else {
      await supabase
        .from('user_settings')
        .update({ last_login_at: new Date().toISOString() })
        .eq('user_id', user.id)
    }
  }

  // Redirect to the intended destination
  return NextResponse.redirect(`${origin}${next}`)
}
