import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit'

export const runtime = 'nodejs'

// GET - Get all users with their emails for admin dashboard
export async function GET(request: NextRequest) {
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

    // Rate limiting for admin endpoints
    const rateLimit = checkRateLimit(`admin-users:${user.id}`, rateLimits.adminStats)
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimit.resetIn },
        { status: 429, headers: { 'Retry-After': String(rateLimit.resetIn) } }
      )
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()
    console.log('[Admin Users] Creating admin client...')

    // Fetch ALL auth users first (this is the master list)
    console.log('[Admin Users] Fetching auth users...')
    const { data: authData, error: authError } = await adminSupabase.auth.admin.listUsers({
      perPage: 1000, // Get all users (adjust if needed)
    })

    console.log('[Admin Users] Auth response:', {
      userCount: authData?.users?.length || 0,
      hasError: !!authError,
      error: authError?.message,
    })

    if (authError) {
      console.error('[Admin Users] Failed to fetch auth users:', authError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Fetch user settings to join with auth users
    const { data: settingsData, error: settingsError } = await adminSupabase
      .from('user_settings')
      .select('*')

    if (settingsError) {
      console.error('Failed to fetch user settings:', settingsError)
      // Continue anyway - settings are optional
    }

    // Create a map of user ID to settings for quick lookup
    const settingsMap = new Map<string, any>()
    ;(settingsData || []).forEach(s => {
      settingsMap.set(s.user_id, s)
    })

    // Transform auth users to user format, joining with settings
    const usersData = authData.users
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(authUser => {
        const s = settingsMap.get(authUser.id)
        return {
          id: authUser.id,
          email: authUser.email || '',
          created_at: authUser.created_at,
          email_confirmed_at: authUser.email_confirmed_at,
          last_sign_in_at: authUser.last_sign_in_at,
          settings: s ? {
            username: s.username || null,
            tier: s.tier || 'adventurer',
            role: s.role || 'user',
            is_founder: s.is_founder || false,
            ai_access: s.ai_access || false,
            suspended_at: s.suspended_at,
            suspended_reason: s.suspended_reason,
            disabled_at: s.disabled_at,
            last_login_at: s.last_login_at,
            totp_enabled: s.totp_enabled,
          } : {
            username: null,
            tier: 'adventurer',
            role: 'user',
            is_founder: false,
            ai_access: false,
            suspended_at: null,
            suspended_reason: null,
            disabled_at: null,
            last_login_at: null,
            totp_enabled: false,
          },
        }
      })

    return NextResponse.json({ users: usersData })
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json({ error: 'Failed to get users' }, { status: 500 })
  }
}
