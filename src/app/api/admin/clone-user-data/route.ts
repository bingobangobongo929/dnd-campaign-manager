/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Clone all content from a source user to a target user's account
 * Super admin only - used for testing with real data without risking the original
 *
 * @param sourceUserId - The user ID to clone data FROM
 * @param targetUserId - The user ID to clone data TO (optional, defaults to admin's account)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify super admin using admin client to bypass RLS
    const { data: adminSettings } = await adminClient
      .from('user_settings')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (adminSettings?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const { sourceUserId, targetUserId } = await request.json()

    if (!sourceUserId) {
      return NextResponse.json({ error: 'Source user ID required' }, { status: 400 })
    }

    // Use targetUserId if provided, otherwise clone to admin's own account
    const destinationUserId = targetUserId || user.id

    // Get source user info for naming
    const { data: sourceSettings } = await adminClient
      .from('user_settings')
      .select('username')
      .eq('user_id', sourceUserId)
      .single()

    const sourceLabel = sourceSettings?.username || sourceUserId.slice(0, 8)

    const results = {
      campaigns: 0,
      oneshots: 0,
      characters: 0,
      errors: [] as string[],
    }

    // Clone campaigns - use adminClient to bypass RLS
    const { data: campaigns } = await adminClient
      .from('campaigns')
      .select('*')
      .eq('user_id', sourceUserId)
      .is('deleted_at', null)

    if (campaigns?.length) {
      for (const campaign of campaigns) {
        try {
          const { id, user_id, created_at, updated_at, deleted_at, ...campaignData } = campaign
          const { data: newCampaign, error } = await adminClient
            .from('campaigns')
            .insert({
              ...campaignData,
              user_id: destinationUserId,
              name: `${campaign.name} (from ${sourceLabel})`,
              content_mode: 'active',
              is_published: false,
            })
            .select()
            .single()

          if (error) throw error
          if (newCampaign) {
            // Copy campaign characters
            await copyCampaignCharacters(adminClient, id, newCampaign.id)
            // Copy campaign lore
            await copyCampaignLore(adminClient, id, newCampaign.id)
            // Copy canvas groups
            await copyCanvasGroups(adminClient, id, newCampaign.id)
            // Copy sessions
            await copyCampaignSessions(adminClient, id, newCampaign.id)
            // Copy world maps
            await copyWorldMaps(adminClient, id, newCampaign.id)
            results.campaigns++
          }
        } catch (err: any) {
          results.errors.push(`Campaign "${campaign.name}": ${err.message}`)
        }
      }
    }

    // Clone oneshots - use adminClient to bypass RLS
    const { data: oneshots } = await adminClient
      .from('oneshots')
      .select('*')
      .eq('user_id', sourceUserId)
      .is('deleted_at', null)

    if (oneshots?.length) {
      for (const oneshot of oneshots) {
        try {
          const { id, user_id, created_at, updated_at, deleted_at, ...oneshotData } = oneshot
          const { error } = await adminClient
            .from('oneshots')
            .insert({
              ...oneshotData,
              user_id: destinationUserId,
              title: `${oneshot.title} (from ${sourceLabel})`,
              content_mode: 'active',
              is_published: false,
            })

          if (error) throw error
          results.oneshots++
        } catch (err: any) {
          results.errors.push(`Oneshot "${oneshot.title}": ${err.message}`)
        }
      }
    }

    // Clone vault characters - use adminClient to bypass RLS
    const { data: characters } = await adminClient
      .from('vault_characters')
      .select('*')
      .eq('user_id', sourceUserId)
      .is('deleted_at', null)

    if (characters?.length) {
      for (const character of characters) {
        try {
          const { id: oldId, user_id, created_at, updated_at, deleted_at, ...charData } = character
          const { data: newChar, error } = await adminClient
            .from('vault_characters')
            .insert({
              ...charData,
              user_id: destinationUserId,
              name: `${character.name} (from ${sourceLabel})`,
              content_mode: 'active',
              is_published: false,
              // Clear campaign links since this is a copy
              campaign_links: [],
              linked_campaign_id: null,
            })
            .select()
            .single()

          if (error) throw error
          if (newChar) {
            // Copy character images
            await copyCharacterImages(adminClient, oldId, newChar.id)
            // Copy character relationships
            await copyCharacterRelationships(adminClient, oldId, newChar.id)
            // Copy character spells
            await copyCharacterSpells(adminClient, oldId, newChar.id)
            // Copy character writings
            await copyCharacterWritings(adminClient, oldId, newChar.id)
            results.characters++
          }
        } catch (err: any) {
          results.errors.push(`Character "${character.name}": ${err.message}`)
        }
      }
    }

    // Log the action
    await adminClient.from('admin_activity_log').insert({
      admin_id: user.id,
      action: 'clone_user_data',
      target_user_id: sourceUserId,
      details: {
        destination_user_id: destinationUserId,
        campaigns_cloned: results.campaigns,
        oneshots_cloned: results.oneshots,
        characters_cloned: results.characters,
        errors: results.errors.length,
      },
    })

    return NextResponse.json({
      success: true,
      results,
    })
  } catch (error: any) {
    console.error('Clone user data error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// Helper functions for copying related data

async function copyCampaignCharacters(supabase: any, oldCampaignId: string, newCampaignId: string) {
  const { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('campaign_id', oldCampaignId)

  if (!characters?.length) return

  const idMap = new Map<string, string>()

  for (const char of characters) {
    const { id: oldId, campaign_id, created_at, updated_at, ...charData } = char
    const { data: newChar } = await supabase
      .from('characters')
      .insert({ ...charData, campaign_id: newCampaignId })
      .select()
      .single()

    if (newChar) idMap.set(oldId, newChar.id)
  }

  // Copy relationships with ID mapping
  const { data: relationships } = await supabase
    .from('character_relationships')
    .select('*')
    .eq('campaign_id', oldCampaignId)

  if (relationships?.length) {
    const newRels = relationships
      .filter((r: any) => idMap.has(r.from_character_id) && idMap.has(r.to_character_id))
      .map((r: any) => {
        const { id, campaign_id, from_character_id, to_character_id, created_at, updated_at, ...relData } = r
        return {
          ...relData,
          campaign_id: newCampaignId,
          from_character_id: idMap.get(from_character_id),
          to_character_id: idMap.get(to_character_id),
        }
      })

    if (newRels.length) {
      await supabase.from('character_relationships').insert(newRels)
    }
  }
}

async function copyCampaignLore(supabase: any, oldCampaignId: string, newCampaignId: string) {
  const { data: lore } = await supabase
    .from('campaign_lore')
    .select('*')
    .eq('campaign_id', oldCampaignId)

  if (!lore?.length) return

  const newLore = lore.map((l: any) => {
    const { id, campaign_id, created_at, updated_at, ...loreData } = l
    return { ...loreData, campaign_id: newCampaignId }
  })

  await supabase.from('campaign_lore').insert(newLore)
}

async function copyCanvasGroups(supabase: any, oldCampaignId: string, newCampaignId: string) {
  const { data: groups } = await supabase
    .from('canvas_groups')
    .select('*')
    .eq('campaign_id', oldCampaignId)

  if (!groups?.length) return

  const newGroups = groups.map((g: any) => {
    const { id, campaign_id, created_at, updated_at, ...groupData } = g
    return { ...groupData, campaign_id: newCampaignId }
  })

  await supabase.from('canvas_groups').insert(newGroups)
}

async function copyCampaignSessions(supabase: any, oldCampaignId: string, newCampaignId: string) {
  const { data: sessions } = await supabase
    .from('campaign_sessions')
    .select('*')
    .eq('campaign_id', oldCampaignId)

  if (!sessions?.length) return

  const newSessions = sessions.map((s: any) => {
    const { id, campaign_id, created_at, updated_at, ...sessionData } = s
    return { ...sessionData, campaign_id: newCampaignId }
  })

  await supabase.from('campaign_sessions').insert(newSessions)
}

async function copyWorldMaps(supabase: any, oldCampaignId: string, newCampaignId: string) {
  const { data: maps } = await supabase
    .from('world_maps')
    .select('*')
    .eq('campaign_id', oldCampaignId)

  if (!maps?.length) return

  const newMaps = maps.map((m: any) => {
    const { id, campaign_id, created_at, updated_at, ...mapData } = m
    return { ...mapData, campaign_id: newCampaignId }
  })

  await supabase.from('world_maps').insert(newMaps)
}

async function copyCharacterImages(supabase: any, oldCharId: string, newCharId: string) {
  const { data: images } = await supabase
    .from('vault_character_images')
    .select('*')
    .eq('character_id', oldCharId)

  if (!images?.length) return

  const newImages = images.map((i: any) => {
    const { id, character_id, created_at, ...imageData } = i
    return { ...imageData, character_id: newCharId }
  })

  await supabase.from('vault_character_images').insert(newImages)
}

async function copyCharacterRelationships(supabase: any, oldCharId: string, newCharId: string) {
  const { data: rels } = await supabase
    .from('vault_character_relationships')
    .select('*')
    .eq('character_id', oldCharId)

  if (!rels?.length) return

  const newRels = rels.map((r: any) => {
    const { id, character_id, created_at, updated_at, ...relData } = r
    return { ...relData, character_id: newCharId }
  })

  await supabase.from('vault_character_relationships').insert(newRels)
}

async function copyCharacterSpells(supabase: any, oldCharId: string, newCharId: string) {
  const { data: spells } = await supabase
    .from('vault_character_spells')
    .select('*')
    .eq('character_id', oldCharId)

  if (!spells?.length) return

  const newSpells = spells.map((s: any) => {
    const { id, character_id, created_at, ...spellData } = s
    return { ...spellData, character_id: newCharId }
  })

  await supabase.from('vault_character_spells').insert(newSpells)
}

async function copyCharacterWritings(supabase: any, oldCharId: string, newCharId: string) {
  const { data: writings } = await supabase
    .from('vault_character_writings')
    .select('*')
    .eq('character_id', oldCharId)

  if (!writings?.length) return

  const newWritings = writings.map((w: any) => {
    const { id, character_id, created_at, updated_at, ...writingData } = w
    return { ...writingData, character_id: newCharId }
  })

  await supabase.from('vault_character_writings').insert(newWritings)
}
