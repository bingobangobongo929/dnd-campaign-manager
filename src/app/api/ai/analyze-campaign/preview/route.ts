import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

/**
 * GET /api/ai/analyze-campaign/preview
 * Returns a preview of what will be analyzed:
 * - Sessions updated since last run
 * - Characters updated since last run
 * - Last run time
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const campaignId = searchParams.get('campaignId')

    if (!campaignId) {
      return new Response(JSON.stringify({ error: 'Campaign ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get campaign with last run time
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, user_id, last_intelligence_run, created_at')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Verify ownership or membership
    if (campaign.user_id !== user.id) {
      // Check if user is a member
      const { data: membership } = await supabase
        .from('campaign_members')
        .select('role')
        .eq('campaign_id', campaignId)
        .eq('user_id', user.id)
        .single()

      if (!membership || membership.role !== 'dm') {
        return new Response(JSON.stringify({ error: 'Access denied' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    // Use last run time or campaign creation if never run
    const lastRunTime = campaign.last_intelligence_run || campaign.created_at

    // Get sessions updated since last run
    const { data: sessionsToAnalyze } = await supabase
      .from('sessions')
      .select('id, title, session_number, updated_at')
      .eq('campaign_id', campaignId)
      .gt('updated_at', lastRunTime)
      .order('session_number', { ascending: false })
      .limit(10)

    // Get characters updated since last run
    const { data: charactersUpdated } = await supabase
      .from('characters')
      .select('id, name, type, updated_at')
      .eq('campaign_id', campaignId)
      .gt('updated_at', lastRunTime)
      .order('updated_at', { ascending: false })
      .limit(10)

    return new Response(JSON.stringify({
      sessionsToAnalyze: sessionsToAnalyze || [],
      charactersUpdated: charactersUpdated || [],
      lastRunTime: campaign.last_intelligence_run,
      totalSessionsCount: sessionsToAnalyze?.length || 0,
      totalCharactersCount: charactersUpdated?.length || 0,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Preview error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to load preview',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
