import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

/**
 * GET /api/ai/analyze-campaign/preview
 * Returns a preview of what will be analyzed:
 * - Sessions updated since last run (or ALL sessions if fullAudit=true)
 * - Characters updated since last run (or ALL characters if fullAudit=true)
 * - Last run time
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const campaignId = searchParams.get('campaignId')
    const fullAudit = searchParams.get('fullAudit') === 'true'

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

    // Get sessions - ALL for full audit, or just updated since last run
    let sessionsQuery = supabase
      .from('sessions')
      .select('id, title, session_number, updated_at')
      .eq('campaign_id', campaignId)

    if (!fullAudit) {
      sessionsQuery = sessionsQuery.gt('updated_at', lastRunTime)
    }

    const { data: sessionsToAnalyze } = await sessionsQuery
      .order('session_number', { ascending: false })
      .limit(fullAudit ? 50 : 10)

    // Get characters - ALL for full audit, or just updated since last run
    let charactersQuery = supabase
      .from('characters')
      .select('id, name, type, updated_at')
      .eq('campaign_id', campaignId)

    if (!fullAudit) {
      charactersQuery = charactersQuery.gt('updated_at', lastRunTime)
    }

    const { data: charactersUpdated } = await charactersQuery
      .order('updated_at', { ascending: false })
      .limit(fullAudit ? 50 : 10)

    // For full audit, also get total counts
    const { count: totalSessionsInCampaign } = fullAudit
      ? await supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaignId)
      : { count: null }

    const { count: totalCharactersInCampaign } = fullAudit
      ? await supabase
          .from('characters')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaignId)
      : { count: null }

    return new Response(JSON.stringify({
      sessionsToAnalyze: sessionsToAnalyze || [],
      charactersUpdated: charactersUpdated || [],
      lastRunTime: campaign.last_intelligence_run,
      totalSessionsCount: fullAudit ? (totalSessionsInCampaign || 0) : (sessionsToAnalyze?.length || 0),
      totalCharactersCount: fullAudit ? (totalCharactersInCampaign || 0) : (charactersUpdated?.length || 0),
      fullAudit,
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
