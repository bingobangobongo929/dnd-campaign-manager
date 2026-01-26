import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit'
import { isAdmin, isSuperAdmin } from '@/lib/admin'

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

// PATCH - Update user settings (super_admin only for sensitive fields)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminSettings } = await supabase
      .from('user_settings')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!adminSettings || !isAdmin(adminSettings.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, updates } = body as {
      userId: string
      updates: {
        role?: 'user' | 'moderator' | 'super_admin'
        tier?: string
        is_founder?: boolean
        ai_access?: boolean
        suspended_at?: string | null
        suspended_reason?: string | null
        disabled_at?: string | null
        username?: string | null
      }
    }

    if (!userId || !updates || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'User ID and updates required' }, { status: 400 })
    }

    // Check permission level for sensitive operations
    const isSuperAdminUser = isSuperAdmin(adminSettings.role)

    // Only super_admin can change roles, tiers, founder status, AI access, disable accounts, or change usernames
    const sensitiveFields = ['role', 'tier', 'is_founder', 'ai_access', 'disabled_at', 'username']
    const hasSensitiveUpdate = sensitiveFields.some(field => field in updates)

    if (hasSensitiveUpdate && !isSuperAdminUser) {
      return NextResponse.json({ error: 'Only super admins can perform this action' }, { status: 403 })
    }

    // Validate role if provided
    if (updates.role && !['user', 'moderator', 'super_admin'].includes(updates.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()

    // Build the update object with additional tracking fields
    const updateData: Record<string, unknown> = { ...updates }

    // Add tracking fields based on what's being updated
    if ('is_founder' in updates) {
      updateData.founder_granted_at = updates.is_founder ? new Date().toISOString() : null
    }
    if ('ai_access' in updates) {
      updateData.ai_access_granted_by = updates.ai_access ? user.id : null
      updateData.ai_access_granted_at = updates.ai_access ? new Date().toISOString() : null
    }
    if ('suspended_at' in updates) {
      updateData.suspended_by = updates.suspended_at ? user.id : null
    }
    if ('disabled_at' in updates) {
      updateData.disabled_by = updates.disabled_at ? user.id : null
    }

    // Perform the update
    const { error: updateError } = await adminSupabase
      .from('user_settings')
      .update(updateData)
      .eq('user_id', userId)

    if (updateError) {
      console.error('Failed to update user:', updateError)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    // Log the admin action
    const actionDetails: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(updates)) {
      actionDetails[`new_${key}`] = value
    }

    await adminSupabase.from('admin_activity_log').insert({
      admin_id: user.id,
      action: 'update_user_settings',
      target_user_id: userId,
      details: actionDetails,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin update user error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
