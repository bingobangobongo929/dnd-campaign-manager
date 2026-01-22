import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit'

export const runtime = 'nodejs'

// GET - Get all feedback for admin dashboard
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

    // Rate limiting
    const rateLimit = checkRateLimit(`admin-feedback:${user.id}`, rateLimits.adminStats)
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimit.resetIn },
        { status: 429, headers: { 'Retry-After': String(rateLimit.resetIn) } }
      )
    }

    // Parse query params for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const priority = searchParams.get('priority')
    const search = searchParams.get('search')
    const assignedTo = searchParams.get('assignedTo')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Use admin client to bypass RLS for fetching all feedback
    const adminSupabase = createAdminClient()

    // Build query
    let query = adminSupabase
      .from('feedback')
      .select(`
        *,
        feedback_attachments (id),
        feedback_responses (id)
      `, { count: 'exact' })

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (type && type !== 'all') {
      query = query.eq('type', type)
    }
    if (priority && priority !== 'all') {
      query = query.eq('priority', priority)
    }
    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo)
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,user_email.ilike.%${search}%`)
    }

    // Order and paginate
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: feedback, error, count } = await query

    if (error) {
      console.error('Failed to fetch feedback:', error)
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
    }

    // Transform to include counts
    const transformedFeedback = feedback?.map(f => ({
      ...f,
      attachment_count: f.feedback_attachments?.length || 0,
      response_count: f.feedback_responses?.length || 0,
      feedback_attachments: undefined,
      feedback_responses: undefined,
    }))

    // Get stats
    const { data: statsData } = await adminSupabase
      .from('feedback')
      .select('status, type')

    const stats = {
      total: count || 0,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
    }

    statsData?.forEach(f => {
      stats.byStatus[f.status] = (stats.byStatus[f.status] || 0) + 1
      stats.byType[f.type] = (stats.byType[f.type] || 0) + 1
    })

    return NextResponse.json({
      feedback: transformedFeedback,
      stats,
      pagination: {
        total: count,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    })
  } catch (error) {
    console.error('Admin feedback error:', error)
    return NextResponse.json({ error: 'Failed to get feedback' }, { status: 500 })
  }
}
