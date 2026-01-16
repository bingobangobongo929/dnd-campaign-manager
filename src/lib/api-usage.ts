/**
 * API Usage Tracking Helper
 *
 * Use this to track AI API usage from server-side code.
 * The tracking is fire-and-forget - it won't block your main requests.
 */

import { createClient } from '@/lib/supabase/server'

// Cost estimates per 1K tokens (in cents)
const COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  'anthropic': { input: 0.3, output: 1.5 }, // Claude Sonnet
  'google': { input: 0.1, output: 0.3 }, // Gemini Flash
  'googlePro': { input: 0.25, output: 1.0 }, // Gemini Pro
}

// Cost per image (in cents)
const COST_PER_IMAGE: Record<string, number> = {
  'gemini-2.0-flash-exp': 2, // $0.02 per image generation
}

export interface UsageRecordParams {
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

/**
 * Record API usage. Call this after making AI API calls.
 * This is fire-and-forget - errors are logged but don't throw.
 */
export async function recordAPIUsage(params: UsageRecordParams): Promise<void> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      console.warn('Cannot record API usage: no authenticated user')
      return
    }

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
    } = params

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
      console.error('Failed to record API usage:', error.message)
    }
  } catch (error) {
    console.error('API usage tracking error:', error)
    // Never throw - don't break the main request
  }
}

/**
 * Wrapper to time an async operation and record its usage
 */
export async function withUsageTracking<T>(
  operation: () => Promise<T>,
  params: Omit<UsageRecordParams, 'response_time_ms' | 'success' | 'error_message'>
): Promise<T> {
  const startTime = Date.now()
  try {
    const result = await operation()
    const elapsed = Date.now() - startTime
    await recordAPIUsage({
      ...params,
      response_time_ms: elapsed,
      success: true,
    })
    return result
  } catch (error) {
    const elapsed = Date.now() - startTime
    await recordAPIUsage({
      ...params,
      response_time_ms: elapsed,
      success: false,
      error_message: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}
