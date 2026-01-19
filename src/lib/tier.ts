/**
 * Tier utilities for server-side tier checking in API routes
 */

import { createClient } from '@/lib/supabase/server'
import type { UserTier } from '@/types/database'
import { TIER_HAS_AI } from '@/types/database'

/**
 * Get user's tier from database. Returns 'free' if not found.
 */
export async function getUserTier(userId: string): Promise<UserTier> {
  const supabase = await createClient()

  const { data: settings } = await supabase
    .from('user_settings')
    .select('tier')
    .eq('user_id', userId)
    .single()

  return (settings?.tier as UserTier) || 'free'
}

/**
 * Check if user can access AI features based on their tier.
 * Use this in API routes to gate AI endpoints.
 */
export async function canUserAccessAI(userId: string): Promise<boolean> {
  const tier = await getUserTier(userId)
  return TIER_HAS_AI[tier]
}

/**
 * Response helper for when user doesn't have AI access
 */
export function aiAccessDeniedResponse() {
  return new Response(
    JSON.stringify({
      error: 'AI features are not available on your current plan',
      code: 'AI_ACCESS_DENIED',
    }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
