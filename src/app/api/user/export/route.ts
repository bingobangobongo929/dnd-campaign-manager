import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // First, fetch user's campaigns and vault characters to get their IDs
    const [
      { data: userSettings },
      { data: campaigns },
      { data: vaultCharacters },
      { data: tags },
      { data: oneshots },
    ] = await Promise.all([
      supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
      supabase.from('campaigns').select('*').eq('user_id', user.id),
      supabase.from('vault_characters').select('*').eq('user_id', user.id),
      supabase.from('tags').select('*').eq('user_id', user.id),
      supabase.from('oneshots').select('*').eq('user_id', user.id),
    ])

    const campaignIds = campaigns?.map(c => c.id) || []
    const vaultCharacterIds = vaultCharacters?.map(vc => vc.id) || []

    // Now fetch related data
    const [
      { data: characters },
      { data: sessions },
      { data: timelineEvents },
      { data: companions },
      { data: npcs },
      { data: vaultSessions },
      { data: characterTags },
    ] = await Promise.all([
      campaignIds.length > 0
        ? supabase.from('characters').select('*').in('campaign_id', campaignIds)
        : Promise.resolve({ data: [] }),
      campaignIds.length > 0
        ? supabase.from('sessions').select('*').in('campaign_id', campaignIds)
        : Promise.resolve({ data: [] }),
      campaignIds.length > 0
        ? supabase.from('timeline_events').select('*').in('campaign_id', campaignIds)
        : Promise.resolve({ data: [] }),
      vaultCharacterIds.length > 0
        ? supabase.from('companions').select('*').in('character_id', vaultCharacterIds)
        : Promise.resolve({ data: [] }),
      vaultCharacterIds.length > 0
        ? supabase.from('npcs').select('*').in('character_id', vaultCharacterIds)
        : Promise.resolve({ data: [] }),
      vaultCharacterIds.length > 0
        ? supabase.from('vault_sessions').select('*').in('character_id', vaultCharacterIds)
        : Promise.resolve({ data: [] }),
      vaultCharacterIds.length > 0
        ? supabase.from('character_tags').select('*').in('character_id', vaultCharacterIds)
        : Promise.resolve({ data: [] }),
    ])

    // Build export object
    const exportData = {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
      settings: userSettings ? {
        aiProvider: userSettings.ai_provider,
        theme: userSettings.theme,
        tier: userSettings.tier,
        termsAcceptedAt: userSettings.terms_accepted_at,
        privacyAcceptedAt: userSettings.privacy_accepted_at,
        marketingConsent: userSettings.marketing_consent,
        createdAt: userSettings.created_at,
        updatedAt: userSettings.updated_at,
      } : null,
      campaigns: campaigns?.map(c => ({
        id: c.id,
        name: c.name,
        gameSystem: c.game_system,
        description: c.description,
        status: c.status,
        imageUrl: c.image_url,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
        characters: (characters || [])
          .filter(ch => ch.campaign_id === c.id)
          .map(ch => ({
            id: ch.id,
            name: ch.name,
            type: ch.type,
            description: ch.description,
            summary: ch.summary,
            notes: ch.notes,
            imageUrl: ch.image_url,
            race: ch.race,
            class: ch.class,
            role: ch.role,
            status: ch.status,
            createdAt: ch.created_at,
            updatedAt: ch.updated_at,
          })),
        sessions: (sessions || [])
          .filter(s => s.campaign_id === c.id)
          .map(s => ({
            id: s.id,
            sessionNumber: s.session_number,
            title: s.title,
            date: s.date,
            summary: s.summary,
            notes: s.notes,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
          })),
        timelineEvents: (timelineEvents || [])
          .filter(te => te.campaign_id === c.id)
          .map(te => ({
            id: te.id,
            date: te.date,
            title: te.title,
            description: te.description,
            importance: te.importance,
            createdAt: te.created_at,
            updatedAt: te.updated_at,
          })),
      })) || [],
      vaultCharacters: vaultCharacters?.map(vc => ({
        id: vc.id,
        name: vc.name,
        race: vc.race,
        class: vc.class,
        level: vc.level,
        backstory: vc.backstory,
        personality: vc.personality,
        appearance: vc.appearance,
        goals: vc.goals,
        fears: vc.fears,
        quirks: vc.quirks,
        notes: vc.notes,
        imageUrl: vc.image_url,
        status: vc.status,
        createdAt: vc.created_at,
        updatedAt: vc.updated_at,
        companions: (companions || [])
          .filter(comp => comp.character_id === vc.id)
          .map(comp => ({
            id: comp.id,
            name: comp.name,
            type: comp.type,
            description: comp.description,
            imageUrl: comp.image_url,
            createdAt: comp.created_at,
            updatedAt: comp.updated_at,
          })),
        npcs: (npcs || [])
          .filter(n => n.character_id === vc.id)
          .map(n => ({
            id: n.id,
            name: n.name,
            relationship: n.relationship,
            description: n.description,
            imageUrl: n.image_url,
            createdAt: n.created_at,
            updatedAt: n.updated_at,
          })),
        sessions: (vaultSessions || [])
          .filter(vs => vs.character_id === vc.id)
          .map(vs => ({
            id: vs.id,
            sessionNumber: vs.session_number,
            title: vs.title,
            date: vs.date,
            summary: vs.summary,
            notes: vs.notes,
            createdAt: vs.created_at,
            updatedAt: vs.updated_at,
          })),
        tags: (characterTags || [])
          .filter(ct => ct.character_id === vc.id)
          .map(ct => {
            const tag = tags?.find(t => t.id === ct.tag_id)
            return {
              name: tag?.name,
              type: tag?.type,
              notes: ct.notes,
            }
          }),
      })) || [],
      oneshots: oneshots?.map(o => ({
        id: o.id,
        title: o.title,
        gameSystem: o.game_system,
        description: o.description,
        notes: o.notes,
        imageUrl: o.image_url,
        status: o.status,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
      })) || [],
      tags: tags?.map(t => ({
        id: t.id,
        name: t.name,
        type: t.type,
        color: t.color,
        createdAt: t.created_at,
      })) || [],
    }

    // Return as JSON file download
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="multiloop-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}
