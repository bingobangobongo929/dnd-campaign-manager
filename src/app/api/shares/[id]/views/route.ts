/**
 * Share View History API
 *
 * GET: Retrieve detailed view history and analytics for a specific share
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

interface ViewHistoryParams {
  params: Promise<{ id: string }>
}

// Parse user agent to get device type
function getDeviceType(userAgent: string | null): string {
  if (!userAgent) return 'Unknown'
  const ua = userAgent.toLowerCase()
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) return 'Mobile'
  if (ua.includes('tablet') || ua.includes('ipad')) return 'Tablet'
  if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) return 'Bot'
  return 'Desktop'
}

// Parse browser from user agent
function getBrowser(userAgent: string | null): string {
  if (!userAgent) return 'Unknown'
  const ua = userAgent.toLowerCase()
  if (ua.includes('firefox')) return 'Firefox'
  if (ua.includes('edg')) return 'Edge'
  if (ua.includes('chrome')) return 'Chrome'
  if (ua.includes('safari')) return 'Safari'
  if (ua.includes('opera') || ua.includes('opr')) return 'Opera'
  return 'Other'
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
    const limit = parseInt(searchParams.get('limit') || '500')

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

    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Group views by day for chart data (last 30 days)
    const viewsByDay = new Map<string, number>()
    const uniqueViewersByDay = new Map<string, Set<string>>()

    // Group views by hour for heatmap (0-23)
    const viewsByHour = new Array(24).fill(0)

    // Device and browser stats
    const deviceCounts = new Map<string, number>()
    const browserCounts = new Map<string, number>()

    // Recent activity tracking
    let viewingNow = 0
    let viewsLastHour = 0
    let viewsLast24Hours = 0
    const recentViews: Array<{ time: string; device: string; referrer: string | null }> = []

    for (const event of events || []) {
      const viewedAt = new Date(event.viewed_at)
      const date = viewedAt.toISOString().split('T')[0]
      const hour = viewedAt.getHours()

      // Daily views
      viewsByDay.set(date, (viewsByDay.get(date) || 0) + 1)
      if (!uniqueViewersByDay.has(date)) {
        uniqueViewersByDay.set(date, new Set())
      }
      if (event.viewer_hash) {
        uniqueViewersByDay.get(date)!.add(event.viewer_hash)
      }

      // Hourly heatmap
      viewsByHour[hour]++

      // Device stats
      const device = getDeviceType(event.user_agent)
      deviceCounts.set(device, (deviceCounts.get(device) || 0) + 1)

      // Browser stats
      const browser = getBrowser(event.user_agent)
      browserCounts.set(browser, (browserCounts.get(browser) || 0) + 1)

      // Recent activity
      if (viewedAt >= fiveMinutesAgo) {
        viewingNow++
      }
      if (viewedAt >= oneHourAgo) {
        viewsLastHour++
      }
      if (viewedAt >= oneDayAgo) {
        viewsLast24Hours++
      }

      // Collect recent views for activity feed (last 20)
      if (recentViews.length < 20) {
        let referrerDomain = null
        if (event.referrer) {
          try {
            referrerDomain = new URL(event.referrer).hostname
          } catch {
            referrerDomain = 'Direct'
          }
        }
        recentViews.push({
          time: event.viewed_at,
          device: getDeviceType(event.user_agent),
          referrer: referrerDomain,
        })
      }
    }

    // Generate last 30 days with zeros for missing days
    const chartData: Array<{ date: string; views: number; unique_viewers: number }> = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      chartData.push({
        date: dateStr,
        views: viewsByDay.get(dateStr) || 0,
        unique_viewers: uniqueViewersByDay.get(dateStr)?.size || 0,
      })
    }

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

    // Convert device/browser counts to arrays
    const deviceStats = Array.from(deviceCounts.entries())
      .map(([device, count]) => ({ device, count }))
      .sort((a, b) => b.count - a.count)

    const browserStats = Array.from(browserCounts.entries())
      .map(([browser, count]) => ({ browser, count }))
      .sort((a, b) => b.count - a.count)

    // Calculate trends (compare this week vs last week)
    const thisWeekViews = chartData.slice(-7).reduce((sum, d) => sum + d.views, 0)
    const lastWeekViews = chartData.slice(-14, -7).reduce((sum, d) => sum + d.views, 0)
    const weekOverWeekChange = lastWeekViews > 0
      ? Math.round(((thisWeekViews - lastWeekViews) / lastWeekViews) * 100)
      : thisWeekViews > 0 ? 100 : 0

    // Find peak hour
    const peakHour = viewsByHour.indexOf(Math.max(...viewsByHour))
    const peakHourFormatted = `${peakHour === 0 ? 12 : peakHour > 12 ? peakHour - 12 : peakHour}${peakHour < 12 ? 'am' : 'pm'}`

    return NextResponse.json({
      // Summary stats
      total_views: events?.length || 0,
      unique_viewers: new Set((events || []).map(e => e.viewer_hash).filter(Boolean)).size,
      viewing_now: viewingNow,
      views_last_hour: viewsLastHour,
      views_last_24_hours: viewsLast24Hours,

      // Trends
      week_over_week_change: weekOverWeekChange,
      this_week_views: thisWeekViews,
      last_week_views: lastWeekViews,

      // Chart data (30 days)
      chart_data: chartData,

      // Hourly heatmap (0-23)
      hourly_views: viewsByHour,
      peak_hour: peakHourFormatted,

      // Traffic sources
      top_referrers: topReferrers,

      // Device breakdown
      device_stats: deviceStats,
      browser_stats: browserStats,

      // Recent activity feed
      recent_views: recentViews,
    })
  } catch (error) {
    console.error('View history API error:', error)
    return NextResponse.json({ error: 'Failed to fetch view history' }, { status: 500 })
  }
}
