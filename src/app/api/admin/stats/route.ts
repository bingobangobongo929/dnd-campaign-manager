import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit'

export const runtime = 'nodejs'

// GET - Get overview stats for admin dashboard (admin only)
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
    const rateLimit = checkRateLimit(`admin-stats:${user.id}`, rateLimits.adminStats)
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimit.resetIn },
        { status: 429, headers: { 'Retry-After': String(rateLimit.resetIn) } }
      )
    }

    // Use admin client to bypass RLS and get accurate counts
    const adminSupabase = createAdminClient()

    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Fetch all stats in parallel using admin client
    const [
      { count: totalUsers },
      { count: usersThisWeek },
      { count: usersThisMonth },
      { data: tierData },
      { count: totalCampaigns },
      { count: totalCharacters },
      { count: totalSessions },
      { count: totalOneshots },
      { count: activeToday },
      { count: activeWeek },
      { count: activeMonth },
    ] = await Promise.all([
      // Total users
      adminSupabase.from('user_settings').select('*', { count: 'exact', head: true }),
      // Users this week
      adminSupabase.from('user_settings').select('*', { count: 'exact', head: true })
        .gte('created_at', weekAgo.toISOString()),
      // Users this month
      adminSupabase.from('user_settings').select('*', { count: 'exact', head: true })
        .gte('created_at', monthAgo.toISOString()),
      // Users by tier
      adminSupabase.from('user_settings').select('tier'),
      // Total campaigns
      adminSupabase.from('campaigns').select('*', { count: 'exact', head: true }),
      // Total characters (vault)
      adminSupabase.from('vault_characters').select('*', { count: 'exact', head: true }),
      // Total sessions
      adminSupabase.from('sessions').select('*', { count: 'exact', head: true }),
      // Total oneshots
      adminSupabase.from('oneshots').select('*', { count: 'exact', head: true }),
      // Active users today
      adminSupabase.from('user_settings').select('*', { count: 'exact', head: true })
        .gte('last_login_at', today.toISOString()),
      // Active users this week
      adminSupabase.from('user_settings').select('*', { count: 'exact', head: true })
        .gte('last_login_at', weekAgo.toISOString()),
      // Active users this month
      adminSupabase.from('user_settings').select('*', { count: 'exact', head: true })
        .gte('last_login_at', monthAgo.toISOString()),
    ])

    // Calculate users by tier
    const tierCounts: Record<string, number> = {}
    tierData?.forEach(({ tier }) => {
      tierCounts[tier] = (tierCounts[tier] || 0) + 1
    })
    const usersByTier = Object.entries(tierCounts).map(([tier, count]) => ({ tier, count }))

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      usersThisWeek: usersThisWeek || 0,
      usersThisMonth: usersThisMonth || 0,
      usersByTier,
      totalCampaigns: totalCampaigns || 0,
      totalCharacters: totalCharacters || 0,
      totalSessions: totalSessions || 0,
      totalOneshots: totalOneshots || 0,
      activeUsersToday: activeToday || 0,
      activeUsersWeek: activeWeek || 0,
      activeUsersMonth: activeMonth || 0,
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 })
  }
}
