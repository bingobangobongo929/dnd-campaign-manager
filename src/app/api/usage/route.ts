/**
 * API Usage Tracking
 *
 * GET: Retrieve usage statistics for the current user
 * POST: Record a new usage entry
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

// Cost estimates per 1K tokens (in cents)
const COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  'anthropic': { input: 0.3, output: 1.5 }, // Claude Sonnet
  'google': { input: 0.1, output: 0.3 }, // Gemini Flash
  'googlePro': { input: 0.25, output: 1.0 }, // Gemini Pro
}

// Cost per image (in cents)
const COST_PER_IMAGE: Record<string, number> = {
  'imagen-3.0-generate-002': 4, // $0.04 per image
  'gemini-2.0-flash-exp': 2, // $0.02 per image (experimental)
}

interface UsageRecord {
  provider: string
  model: string
  endpoint: string
  operation_type: string
  input_tokens?: number
  output_tokens?: number
  images_generated?: number
  campaign_id?: string
  character_id?: string
  response_time_ms?: number
  success?: boolean
  error_message?: string
}

// POST - Record usage
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: UsageRecord = await req.json()
    const {
      provider,
      model,
      endpoint,
      operation_type,
      input_tokens = 0,
      output_tokens = 0,
      images_generated = 0,
      campaign_id,
      character_id,
      response_time_ms,
      success = true,
      error_message,
    } = body

    // Calculate estimated cost
    let estimated_cost_cents = 0

    // Token costs
    const costs = COST_PER_1K_TOKENS[provider] || { input: 0.2, output: 0.6 }
    estimated_cost_cents += Math.ceil((input_tokens / 1000) * costs.input)
    estimated_cost_cents += Math.ceil((output_tokens / 1000) * costs.output)

    // Image costs
    if (images_generated > 0) {
      const imageCost = COST_PER_IMAGE[model] || 4
      estimated_cost_cents += images_generated * imageCost
    }

    const { error } = await supabase.from('api_usage').insert({
      user_id: user.id,
      provider,
      model,
      endpoint,
      operation_type,
      input_tokens,
      output_tokens,
      total_tokens: input_tokens + output_tokens,
      images_generated,
      estimated_cost_cents,
      campaign_id,
      character_id,
      response_time_ms,
      success,
      error_message,
    })

    if (error) {
      // Don't fail the request if tracking fails - just log it
      console.error('Failed to record API usage:', error)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Usage tracking error:', error)
    return NextResponse.json({ success: true }) // Don't fail main requests
  }
}

// GET - Retrieve usage statistics
export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'month' // month, week, all

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
        startDate = new Date(0) // Beginning of time
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    // Get total usage stats
    const { data: totalStats, error: totalError } = await supabase
      .from('api_usage')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())

    if (totalError) {
      console.error('Error fetching usage:', totalError)
      return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
    }

    // Calculate aggregates
    const stats = totalStats || []
    const totalTokens = stats.reduce((sum, r) => sum + (r.total_tokens || 0), 0)
    const totalImages = stats.reduce((sum, r) => sum + (r.images_generated || 0), 0)
    const totalCostCents = stats.reduce((sum, r) => sum + (r.estimated_cost_cents || 0), 0)
    const requestCount = stats.length

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

    // Get recent requests
    const recentRequests = stats
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map(r => ({
        id: r.id,
        provider: r.provider,
        operation: r.operation_type,
        tokens: r.total_tokens,
        cost: r.estimated_cost_cents,
        success: r.success,
        created_at: r.created_at,
      }))

    return NextResponse.json({
      period,
      startDate: startDate.toISOString(),
      summary: {
        totalRequests: requestCount,
        totalTokens,
        totalImages,
        totalCostCents,
        totalCostDollars: (totalCostCents / 100).toFixed(2),
      },
      byProvider,
      byOperation,
      recentRequests,
    })
  } catch (error) {
    console.error('Usage stats error:', error)
    return NextResponse.json({ error: 'Failed to get usage stats' }, { status: 500 })
  }
}
