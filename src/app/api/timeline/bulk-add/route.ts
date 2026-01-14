import { createClient } from '@/lib/supabase/server'

interface TimelineEventInput {
  title: string
  description?: string
  event_type: string
  character_ids?: string[]
  event_date: string
}

export async function POST(req: Request) {
  try {
    const { campaignId, events } = await req.json() as {
      campaignId: string
      events: TimelineEventInput[]
    }

    if (!campaignId) {
      return new Response(JSON.stringify({ error: 'Campaign ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ error: 'At least one event required' }), {
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

    // Verify user owns the campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (!campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get current max event_order
    const { data: maxOrderResult } = await supabase
      .from('timeline_events')
      .select('event_order')
      .eq('campaign_id', campaignId)
      .order('event_order', { ascending: false })
      .limit(1)
      .single()

    let nextOrder = (maxOrderResult?.event_order || 0) + 1

    // Insert all events
    const eventsToInsert = events.map((event, index) => ({
      campaign_id: campaignId,
      title: event.title,
      description: event.description || null,
      event_type: event.event_type,
      character_ids: event.character_ids || [],
      event_date: event.event_date,
      event_order: nextOrder + index,
    }))

    const { data: insertedEvents, error } = await supabase
      .from('timeline_events')
      .insert(eventsToInsert)
      .select()

    if (error) throw error

    return new Response(JSON.stringify({
      success: true,
      events: insertedEvents,
      count: insertedEvents?.length || 0,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Timeline bulk add error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to add timeline events',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
