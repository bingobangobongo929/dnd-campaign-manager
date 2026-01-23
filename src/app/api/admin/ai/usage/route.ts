import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Get AI usage statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    if (!userSettings?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get usage logs
    const { data: usageLogs, error: usageError } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (usageError) {
      console.error('Failed to fetch usage logs:', usageError)
      return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 })
    }

    // Calculate statistics
    const stats = {
      totalCalls: usageLogs?.length || 0,
      totalCost: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      avgDuration: 0,
      errorCount: 0,
      byOperationType: {} as Record<string, { count: number; cost: number }>,
      byModel: {} as Record<string, { count: number; cost: number }>,
      byDay: {} as Record<string, { count: number; cost: number }>,
      topUsers: [] as Array<{ userId: string; count: number; cost: number }>,
    }

    const userStats: Record<string, { count: number; cost: number }> = {}
    let totalDuration = 0

    usageLogs?.forEach(log => {
      const cost = log.cost_usd || 0
      stats.totalCost += cost
      stats.totalInputTokens += log.input_tokens || 0
      stats.totalOutputTokens += log.output_tokens || 0
      totalDuration += log.duration_ms || 0

      if (log.status === 'error') {
        stats.errorCount++
      }

      // By operation type
      const opType = log.operation_type || 'unknown'
      if (!stats.byOperationType[opType]) {
        stats.byOperationType[opType] = { count: 0, cost: 0 }
      }
      stats.byOperationType[opType].count++
      stats.byOperationType[opType].cost += cost

      // By model
      const model = log.model_used || 'unknown'
      if (!stats.byModel[model]) {
        stats.byModel[model] = { count: 0, cost: 0 }
      }
      stats.byModel[model].count++
      stats.byModel[model].cost += cost

      // By day
      const day = new Date(log.created_at || '').toISOString().split('T')[0]
      if (!stats.byDay[day]) {
        stats.byDay[day] = { count: 0, cost: 0 }
      }
      stats.byDay[day].count++
      stats.byDay[day].cost += cost

      // By user
      const userId = log.user_id
      if (userId) {
        if (!userStats[userId]) {
          userStats[userId] = { count: 0, cost: 0 }
        }
        userStats[userId].count++
        userStats[userId].cost += cost
      }
    })

    stats.avgDuration = stats.totalCalls > 0 ? totalDuration / stats.totalCalls : 0

    // Get top users
    stats.topUsers = Object.entries(userStats)
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10)

    // Get import funnel stats
    const { data: importSessions } = await supabase
      .from('import_sessions')
      .select('status')
      .gte('created_at', startDate.toISOString())

    const importFunnel = {
      started: 0,
      parsed: 0,
      reviewed: 0,
      saved: 0,
      cancelled: 0,
    }

    importSessions?.forEach(session => {
      importFunnel.started++
      if (session.status === 'parsed' || session.status === 'reviewed' || session.status === 'saved') {
        importFunnel.parsed++
      }
      if (session.status === 'reviewed' || session.status === 'saved') {
        importFunnel.reviewed++
      }
      if (session.status === 'saved') {
        importFunnel.saved++
      }
      if (session.status === 'cancelled') {
        importFunnel.cancelled++
      }
    })

    // Get suggestion feedback stats
    const { data: feedbackData } = await supabase
      .from('ai_suggestion_feedback')
      .select('action_taken, feedback')
      .gte('created_at', startDate.toISOString())

    const feedbackStats = {
      total: feedbackData?.length || 0,
      accepted: 0,
      edited: 0,
      dismissed: 0,
      positive: 0,
      negative: 0,
    }

    feedbackData?.forEach(f => {
      if (f.action_taken === 'accepted') feedbackStats.accepted++
      else if (f.action_taken === 'edited') feedbackStats.edited++
      else if (f.action_taken === 'dismissed') feedbackStats.dismissed++

      if (f.feedback === 'positive') feedbackStats.positive++
      else if (f.feedback === 'negative') feedbackStats.negative++
    })

    return NextResponse.json({
      stats,
      importFunnel,
      feedbackStats,
      period: `${days} days`,
      recentLogs: usageLogs?.slice(0, 50) || [],
    })
  } catch (error) {
    console.error('Get AI usage error:', error)
    return NextResponse.json({ error: 'Failed to get AI usage data' }, { status: 500 })
  }
}
