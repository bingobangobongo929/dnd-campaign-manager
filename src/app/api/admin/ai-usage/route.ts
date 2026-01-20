import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit'
import crypto from 'crypto'

export const runtime = 'nodejs'

// Hash user ID for anonymization in responses
function anonymizeUserId(userId: string): string {
  return crypto.createHash('sha256').update(userId).digest('hex').slice(0, 12)
}

// GET - Get all users' AI usage stats (admin only)
export async function GET(req: NextRequest) {
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
    const rateLimit = checkRateLimit(`admin-ai-usage:${user.id}`, rateLimits.adminAiUsage)
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimit.resetIn },
        { status: 429, headers: { 'Retry-After': String(rateLimit.resetIn) } }
      )
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'month'

    // Calculate date range
    let startDate: Date
    const now = new Date()
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'all':
        startDate = new Date(0)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    // Get all usage records for the period
    const { data: allUsage, error: usageError } = await supabase
      .from('api_usage')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (usageError) {
      console.error('Error fetching usage:', usageError)
      return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
    }

    const stats = allUsage || []

    // Calculate total aggregates
    const totalTokens = stats.reduce((sum, r) => sum + (r.total_tokens || 0), 0)
    const totalImages = stats.reduce((sum, r) => sum + (r.images_generated || 0), 0)
    const totalCostCents = stats.reduce((sum, r) => sum + (r.estimated_cost_cents || 0), 0)
    const totalRequests = stats.length

    // Group by user (using anonymized IDs in response)
    const byUser: Record<string, {
      anonymizedId: string
      requests: number
      tokens: number
      images: number
      costCents: number
      lastActivity: string
    }> = {}

    for (const record of stats) {
      const anonId = anonymizeUserId(record.user_id)
      if (!byUser[record.user_id]) {
        byUser[record.user_id] = {
          anonymizedId: anonId,
          requests: 0,
          tokens: 0,
          images: 0,
          costCents: 0,
          lastActivity: record.created_at
        }
      }
      byUser[record.user_id].requests++
      byUser[record.user_id].tokens += record.total_tokens || 0
      byUser[record.user_id].images += record.images_generated || 0
      byUser[record.user_id].costCents += record.estimated_cost_cents || 0
      if (new Date(record.created_at) > new Date(byUser[record.user_id].lastActivity)) {
        byUser[record.user_id].lastActivity = record.created_at
      }
    }

    // Get user emails for display
    const userIds = Object.keys(byUser)
    let userEmails: Record<string, string> = {}

    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('user_settings')
        .select('user_id')
        .in('user_id', userIds)

      // Get emails from auth.users (need admin access or use Supabase functions)
      // For now, we'll just use user IDs. Emails can be added with admin client if needed.
    }

    // Convert to array and sort by cost
    const userStats = Object.values(byUser)
      .sort((a, b) => b.costCents - a.costCents)

    // Group by provider
    const byProvider: Record<string, { requests: number; tokens: number; cost: number }> = {}
    for (const record of stats) {
      if (!byProvider[record.provider]) {
        byProvider[record.provider] = { requests: 0, tokens: 0, cost: 0 }
      }
      byProvider[record.provider].requests++
      byProvider[record.provider].tokens += record.total_tokens || 0
      byProvider[record.provider].cost += record.estimated_cost_cents || 0
    }

    // Group by operation type
    const byOperation: Record<string, { requests: number; tokens: number; cost: number }> = {}
    for (const record of stats) {
      if (!byOperation[record.operation_type]) {
        byOperation[record.operation_type] = { requests: 0, tokens: 0, cost: 0 }
      }
      byOperation[record.operation_type].requests++
      byOperation[record.operation_type].tokens += record.total_tokens || 0
      byOperation[record.operation_type].cost += record.estimated_cost_cents || 0
    }

    // Get recent requests (with anonymized user IDs)
    const recentRequests = stats
      .slice(0, 20)
      .map(r => ({
        id: r.id,
        anonymizedUserId: anonymizeUserId(r.user_id),
        provider: r.provider,
        model: r.model,
        operation: r.operation_type,
        inputTokens: r.input_tokens,
        outputTokens: r.output_tokens,
        tokens: r.total_tokens,
        images: r.images_generated,
        cost: r.estimated_cost_cents,
        success: r.success,
        responseTimeMs: r.response_time_ms,
        createdAt: r.created_at,
      }))

    // Currency conversion
    const totalCostUSD = totalCostCents / 100
    const CURRENCY_RATES = {
      USD: 1.00,
      GBP: 0.80,
      EUR: 0.92,
    }

    return NextResponse.json({
      period,
      startDate: startDate.toISOString(),
      summary: {
        totalRequests,
        totalTokens,
        totalImages,
        totalCostCents,
        costs: {
          USD: totalCostUSD.toFixed(2),
          GBP: (totalCostUSD * CURRENCY_RATES.GBP).toFixed(2),
          EUR: (totalCostUSD * CURRENCY_RATES.EUR).toFixed(2),
        },
        uniqueUsers: userIds.length,
      },
      byUser: userStats,
      byProvider,
      byOperation,
      recentRequests,
    })
  } catch (error) {
    console.error('Admin AI usage error:', error)
    return NextResponse.json({ error: 'Failed to get usage stats' }, { status: 500 })
  }
}
