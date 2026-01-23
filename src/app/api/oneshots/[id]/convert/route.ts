import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/oneshots/[id]/convert
 * Converts a oneshot into a campaign, copying over relevant data.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: oneshotId } = await context.params
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Load the oneshot
    const { data: oneshot, error: oneshotError } = await supabase
      .from('oneshots')
      .select('*')
      .eq('id', oneshotId)
      .eq('user_id', user.id)
      .single()

    if (oneshotError || !oneshot) {
      return NextResponse.json({ error: 'Oneshot not found' }, { status: 404 })
    }

    // Create a new campaign from the oneshot
    const campaignId = uuidv4()
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({
        id: campaignId,
        user_id: user.id,
        name: oneshot.title,
        tagline: oneshot.tagline || null,
        image_url: oneshot.image_url || null,
        system: oneshot.game_system || null,
        description: [
          oneshot.introduction,
          oneshot.setting_notes,
        ].filter(Boolean).join('\n\n') || null,
        setting: oneshot.setting_notes || null,
        player_count: oneshot.player_count_max || 4,
        // Store oneshot reference in notes for reference
        notes: `Converted from one-shot: ${oneshot.title}`,
        status: 'active',
      })
      .select()
      .single()

    if (campaignError || !campaign) {
      console.error('Failed to create campaign:', campaignError)
      return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
    }

    // Load structured NPCs from the oneshot (if any)
    const { data: oneshotNpcs } = await supabase
      .from('oneshot_npcs')
      .select('*')
      .eq('oneshot_id', oneshotId)
      .order('sort_order')

    // Create campaign characters from NPCs
    if (oneshotNpcs && oneshotNpcs.length > 0) {
      const characterInserts = oneshotNpcs.map((npc, index) => ({
        campaign_id: campaignId,
        user_id: user.id,
        name: npc.name,
        type: 'npc' as const,
        description: npc.description || null,
        appearance: npc.appearance || null,
        personality: npc.personality || null,
        goals: npc.motivation || null,
        image_url: npc.image_url || null,
        status: 'active',
        position_x: 100 + (index % 5) * 200,
        position_y: 100 + Math.floor(index / 5) * 200,
      }))

      await supabase.from('characters').insert(characterInserts)
    }

    // Load structured locations from the oneshot (if any)
    const { data: oneshotLocations } = await supabase
      .from('oneshot_locations')
      .select('*')
      .eq('oneshot_id', oneshotId)
      .order('sort_order')

    // Create lore entries for locations
    if (oneshotLocations && oneshotLocations.length > 0) {
      const loreInserts = oneshotLocations.map(location => ({
        campaign_id: campaignId,
        user_id: user.id,
        name: location.name,
        type: 'location' as const,
        description: [location.description, location.features].filter(Boolean).join('\n\n') || null,
        is_secret: false,
      }))

      await supabase.from('campaign_lore').insert(loreInserts)
    }

    // Create a "Session 0" entry with the session plan
    if (oneshot.session_plan) {
      await supabase.from('sessions').insert({
        campaign_id: campaignId,
        user_id: user.id,
        session_number: 0,
        title: 'Session 0 - One-Shot Conversion',
        summary: oneshot.session_plan,
        notes: [
          '## Original One-Shot Details',
          '',
          oneshot.introduction ? `### Introduction\n${oneshot.introduction}` : '',
          oneshot.character_creation ? `### Character Creation\n${oneshot.character_creation}` : '',
          oneshot.twists ? `### Plot Twists\n${oneshot.twists}` : '',
          oneshot.handouts ? `### Handouts\n${oneshot.handouts}` : '',
        ].filter(Boolean).join('\n\n'),
        date: new Date().toISOString().split('T')[0],
        phase: 'complete',
      })
    }

    return NextResponse.json({
      success: true,
      campaignId: campaign.id,
      message: 'One-shot converted to campaign successfully',
    })
  } catch (error) {
    console.error('Error converting oneshot to campaign:', error)
    return NextResponse.json({ error: 'Failed to convert oneshot' }, { status: 500 })
  }
}
