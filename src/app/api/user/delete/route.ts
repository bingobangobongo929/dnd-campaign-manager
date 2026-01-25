import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

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
      .select('totp_enabled, totp_secret')
      .eq('user_id', user.id)
      .single()

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

    // Delete all user data using cascade or manual deletion
    // Order matters to avoid foreign key violations

    // 1. Get all campaign IDs
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id')
      .eq('user_id', user.id)
    const campaignIds = campaigns?.map(c => c.id) || []

    // 2. Get all vault character IDs
    const { data: vaultCharacters } = await supabase
      .from('vault_characters')
      .select('id')
      .eq('user_id', user.id)
    const vaultCharacterIds = vaultCharacters?.map(vc => vc.id) || []

    // Delete in proper order
    if (campaignIds.length > 0) {
      // Delete session attendees
      await supabase.from('session_attendees').delete().in('session_id',
        (await supabase.from('sessions').select('id').in('campaign_id', campaignIds)).data?.map(s => s.id) || []
      )
      // Delete sessions
      await supabase.from('sessions').delete().in('campaign_id', campaignIds)
      // Delete timeline events
      await supabase.from('timeline_events').delete().in('campaign_id', campaignIds)
      // Delete character groups
      await supabase.from('character_groups').delete().in('campaign_id', campaignIds)
      // Delete campaign characters
      await supabase.from('characters').delete().in('campaign_id', campaignIds)
      // Delete campaigns
      await supabase.from('campaigns').delete().eq('user_id', user.id)
    }

    if (vaultCharacterIds.length > 0) {
      // Delete character tags
      await supabase.from('character_tags').delete().in('character_id', vaultCharacterIds)
      // Delete companions
      await supabase.from('companions').delete().in('character_id', vaultCharacterIds)
      // Delete NPCs
      await supabase.from('npcs').delete().in('character_id', vaultCharacterIds)
      // Delete vault sessions
      await supabase.from('vault_sessions').delete().in('character_id', vaultCharacterIds)
      // Delete vault characters
      await supabase.from('vault_characters').delete().eq('user_id', user.id)
    }

    // Delete tags
    await supabase.from('tags').delete().eq('user_id', user.id)

    // Delete oneshots
    await supabase.from('oneshots').delete().eq('user_id', user.id)

    // Delete user settings
    await supabase.from('user_settings').delete().eq('user_id', user.id)

    // Delete the user from Supabase Auth using admin API
    // This requires the service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (supabaseUrl && serviceRoleKey) {
      const adminClient = createAdminClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

      await adminClient.auth.admin.deleteUser(user.id)
    }

    // Sign out the user
    await supabase.auth.signOut()

    return NextResponse.json({ success: true, message: 'Account deleted successfully' })
  } catch (error) {
    console.error('Account deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}
