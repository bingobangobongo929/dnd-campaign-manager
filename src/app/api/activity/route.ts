/**
 * Activity Log API
 *
 * GET: Fetch user's activity log with pagination and filtering
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const entityType = searchParams.get('type') // Filter by entity type
    const entityId = searchParams.get('entity_id') // Filter by specific entity
    const days = parseInt(searchParams.get('days') || '30', 10) // Days to look back

    // Build query
    let query = supabase
      .from('activity_log')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (entityType) {
      query = query.eq('entity_type', entityType)
    }

    if (entityId) {
      query = query.eq('entity_id', entityId)
    }

    const { data: activities, count, error } = await query

    if (error) {
      console.error('Activity log error:', error)
      return NextResponse.json({ error: 'Failed to fetch activity log' }, { status: 500 })
    }

    // Group activities by date for easier display
    const groupedByDate: Record<string, typeof activities> = {}
    for (const activity of activities || []) {
      const date = new Date(activity.created_at).toISOString().split('T')[0]
      if (!groupedByDate[date]) {
        groupedByDate[date] = []
      }
      groupedByDate[date].push(activity)
    }

    // Get summary stats
    const stats = {
      total: count || 0,
      byType: {} as Record<string, number>,
      byAction: {} as Record<string, number>,
    }

    for (const activity of activities || []) {
      stats.byType[activity.entity_type] = (stats.byType[activity.entity_type] || 0) + 1
      const actionCategory = activity.action.split('.')[0]
      stats.byAction[actionCategory] = (stats.byAction[actionCategory] || 0) + 1
    }

    return NextResponse.json({
      activities: activities || [],
      groupedByDate,
      stats,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0),
      },
    })
  } catch (error) {
    console.error('Activity API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
