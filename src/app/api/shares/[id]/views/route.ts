/**
 * Share View History API
 *
 * GET: Retrieve view history for a specific share
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

interface ViewHistoryParams {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, { params }: ViewHistoryParams) {
  try {
    const { id: shareId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const shareType = searchParams.get('type') as 'character' | 'oneshot' | 'campaign'
    const limit = parseInt(searchParams.get('limit') || '100')

    if (!shareType) {
      return NextResponse.json({ error: 'Missing type parameter' }, { status: 400 })
    }

    // Fetch view events for this share
    const { data: events, error } = await supabase
      .from('share_view_events')
      .select('*')
      .eq('share_id', shareId)
      .eq('share_type', shareType)
      .order('viewed_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Fetch view history error:', error)
      return NextResponse.json({ error: 'Failed to fetch view history' }, { status: 500 })
    }

    // Group views by day for chart data
    const viewsByDay = new Map<string, number>()
    const uniqueViewersByDay = new Map<string, Set<string>>()

    for (const event of events || []) {
      const date = new Date(event.viewed_at).toISOString().split('T')[0]
      viewsByDay.set(date, (viewsByDay.get(date) || 0) + 1)

      if (!uniqueViewersByDay.has(date)) {
        uniqueViewersByDay.set(date, new Set())
      }
      if (event.viewer_hash) {
        uniqueViewersByDay.get(date)!.add(event.viewer_hash)
      }
    }

    // Convert to array sorted by date
    const chartData = Array.from(viewsByDay.entries())
      .map(([date, views]) => ({
        date,
        views,
        unique_viewers: uniqueViewersByDay.get(date)?.size || 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Calculate referrer stats
    const referrerCounts = new Map<string, number>()
    for (const event of events || []) {
      if (event.referrer) {
        try {
          const url = new URL(event.referrer)
          const domain = url.hostname
          referrerCounts.set(domain, (referrerCounts.get(domain) || 0) + 1)
        } catch {
          referrerCounts.set('Direct', (referrerCounts.get('Direct') || 0) + 1)
        }
      } else {
        referrerCounts.set('Direct', (referrerCounts.get('Direct') || 0) + 1)
      }
    }

    const topReferrers = Array.from(referrerCounts.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return NextResponse.json({
      events: events || [],
      chart_data: chartData,
      top_referrers: topReferrers,
      total_views: events?.length || 0,
      unique_viewers: new Set((events || []).map(e => e.viewer_hash).filter(Boolean)).size,
    })
  } catch (error) {
    console.error('View history API error:', error)
    return NextResponse.json({ error: 'Failed to fetch view history' }, { status: 500 })
  }
}
