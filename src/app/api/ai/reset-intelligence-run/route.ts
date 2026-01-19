import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { campaignId } = await req.json()

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

    // Tier check - only standard and premium tiers can use AI
    const { data: settings } = await supabase
      .from('user_settings')
      .select('tier')
      .eq('user_id', user.id)
      .single()
    if ((settings?.tier || 'free') === 'free') {
      return new Response(JSON.stringify({ error: 'AI features require a paid plan' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
    }

    // Reset the timestamp
    const { error } = await supabase
      .from('campaigns')
      .update({ last_intelligence_run: null })
      .eq('id', campaignId)
      .eq('user_id', user.id)

    if (error) throw error

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to reset' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
