/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface DuplicateRequest {
  contentType: 'campaign' | 'character' | 'oneshot'
  contentId: string
  newName: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: DuplicateRequest = await request.json()
    const { contentType, contentId, newName } = body

    if (!contentType || !contentId || !newName?.trim()) {
      return NextResponse.json({ error: 'Content type, ID, and name required' }, { status: 400 })
    }

    let newId: string | null = null

    if (contentType === 'campaign') {
      newId = await duplicateCampaign(supabase, user.id, contentId, newName.trim())
    } else if (contentType === 'character') {
      newId = await duplicateCharacter(supabase, user.id, contentId, newName.trim())
    } else if (contentType === 'oneshot') {
      newId = await duplicateOneshot(supabase, user.id, contentId, newName.trim())
    }

    if (!newId) {
      return NextResponse.json({ error: 'Failed to duplicate content' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      newId,
    })
  } catch (error) {
    console.error('Duplicate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function duplicateCampaign(supabase: any, userId: string, campaignId: string, newName: string): Promise<string | null> {
  // Get original campaign
  const { data: campaign, error: fetchError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('user_id', userId)
    .single()

  if (fetchError || !campaign) {
    console.error('Campaign not found:', fetchError)
    return null
  }

  // Create new campaign (reset template-related fields)
  const { data: newCampaign, error: createError } = await supabase
    .from('campaigns')
    .insert({
      user_id: userId,
      name: newName,
      description: campaign.description,
      image_url: campaign.image_url,
      game_system: campaign.game_system,
      setting: campaign.setting,
      session_frequency: campaign.session_frequency,
      current_session: 0,
      status: 'active',
      content_mode: 'active',
      is_published: false,
      template_version: 0,
      // Don't copy template_id - this is a fresh copy
    })
    .select()
    .single()

  if (createError || !newCampaign) {
    console.error('Failed to create campaign:', createError)
    return null
  }

  // Copy related data
  await Promise.all([
    // Copy characters
    copyCharacters(supabase, campaignId, newCampaign.id),
    // Copy tags
    copyTags(supabase, campaignId, newCampaign.id),
    // Copy canvas groups
    copyCanvasGroups(supabase, campaignId, newCampaign.id),
    // Copy lore
    copyLore(supabase, campaignId, newCampaign.id),
    // Copy world maps
    copyWorldMaps(supabase, campaignId, newCampaign.id),
  ])

  return newCampaign.id
}

async function copyCharacters(supabase: any, oldCampaignId: string, newCampaignId: string) {
  const { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('campaign_id', oldCampaignId)

  if (!characters?.length) return

  const idMap = new Map<string, string>()

  // Insert characters with new IDs
  for (const char of characters) {
    const { id: oldId, campaign_id: _cid, created_at: _ca, updated_at: _ua, ...charData } = char
    const { data: newChar } = await supabase
      .from('characters')
      .insert({
        ...charData,
        campaign_id: newCampaignId,
      })
      .select()
      .single()

    if (newChar) {
      idMap.set(oldId, newChar.id)
    }
  }

  // Copy relationships using the ID map
  const { data: relationships } = await supabase
    .from('character_relationships')
    .select('*')
    .eq('campaign_id', oldCampaignId)

  if (relationships?.length) {
    const newRelationships = relationships
      .filter((r: any) => idMap.has(r.from_character_id) && idMap.has(r.to_character_id))
      .map((r: any) => {
        const { id: _id, campaign_id: _cid, from_character_id, to_character_id, created_at: _ca, updated_at: _ua, ...relData } = r
        return {
          ...relData,
          campaign_id: newCampaignId,
          from_character_id: idMap.get(from_character_id),
          to_character_id: idMap.get(to_character_id),
        }
      })

    if (newRelationships.length) {
      await supabase.from('character_relationships').insert(newRelationships)
    }
  }
}

async function copyTags(supabase: any, oldCampaignId: string, newCampaignId: string) {
  const { data: tags } = await supabase
    .from('tags')
    .select('*')
    .eq('campaign_id', oldCampaignId)

  if (!tags?.length) return

  const newTags = tags.map((t: any) => {
    const { id: _id, campaign_id: _cid, created_at: _ca, ...tagData } = t
    return { ...tagData, campaign_id: newCampaignId }
  })

  await supabase.from('tags').insert(newTags)
}

async function copyCanvasGroups(supabase: any, oldCampaignId: string, newCampaignId: string) {
  const { data: groups } = await supabase
    .from('canvas_groups')
    .select('*')
    .eq('campaign_id', oldCampaignId)

  if (!groups?.length) return

  const newGroups = groups.map((g: any) => {
    const { id: _id, campaign_id: _cid, created_at: _ca, updated_at: _ua, ...groupData } = g
    return { ...groupData, campaign_id: newCampaignId }
  })

  await supabase.from('canvas_groups').insert(newGroups)
}

async function copyLore(supabase: any, oldCampaignId: string, newCampaignId: string) {
  const { data: lore } = await supabase
    .from('campaign_lore')
    .select('*')
    .eq('campaign_id', oldCampaignId)

  if (!lore?.length) return

  const newLore = lore.map((l: any) => {
    const { id: _id, campaign_id: _cid, created_at: _ca, updated_at: _ua, ...loreData } = l
    return { ...loreData, campaign_id: newCampaignId }
  })

  await supabase.from('campaign_lore').insert(newLore)
}

async function copyWorldMaps(supabase: any, oldCampaignId: string, newCampaignId: string) {
  const { data: maps } = await supabase
    .from('world_maps')
    .select('*')
    .eq('campaign_id', oldCampaignId)

  if (!maps?.length) return

  const newMaps = maps.map((m: any) => {
    const { id: _id, campaign_id: _cid, created_at: _ca, updated_at: _ua, ...mapData } = m
    return { ...mapData, campaign_id: newCampaignId }
  })

  await supabase.from('world_maps').insert(newMaps)
}

async function duplicateCharacter(supabase: any, userId: string, characterId: string, newName: string): Promise<string | null> {
  // Get original character
  const { data: character, error: fetchError } = await supabase
    .from('vault_characters')
    .select('*')
    .eq('id', characterId)
    .eq('user_id', userId)
    .single()

  if (fetchError || !character) {
    console.error('Character not found:', fetchError)
    return null
  }

  // Create new character (reset template-related fields)
  const { id: _id, created_at: _ca, updated_at: _ua, template_id: _tid, template_version: _tv, saved_template_version: _stv, published_at: _pa, is_published: _ip, ...charData } = character

  const { data: newCharacter, error: createError } = await supabase
    .from('vault_characters')
    .insert({
      ...charData,
      name: newName,
      content_mode: 'active',
      is_published: false,
      template_version: 0,
    })
    .select()
    .single()

  if (createError || !newCharacter) {
    console.error('Failed to create character:', createError)
    return null
  }

  // Copy related data
  await Promise.all([
    copyCharacterImages(supabase, characterId, newCharacter.id),
    copyCharacterRelationships(supabase, characterId, newCharacter.id),
    copyCharacterSpells(supabase, characterId, newCharacter.id),
    copyCharacterWritings(supabase, characterId, newCharacter.id),
    copyCharacterLocations(supabase, characterId, newCharacter.id),
  ])

  return newCharacter.id
}

async function copyCharacterImages(supabase: any, oldCharId: string, newCharId: string) {
  const { data: images } = await supabase
    .from('vault_character_images')
    .select('*')
    .eq('character_id', oldCharId)

  if (!images?.length) return

  const newImages = images.map((i: any) => {
    const { id: _id, character_id: _cid, created_at: _ca, ...imageData } = i
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
    const { id: _id, character_id: _cid, created_at: _ca, updated_at: _ua, ...relData } = r
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
    const { id: _id, character_id: _cid, created_at: _ca, ...spellData } = s
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
    const { id: _id, character_id: _cid, created_at: _ca, updated_at: _ua, ...writingData } = w
    return { ...writingData, character_id: newCharId }
  })

  await supabase.from('vault_character_writings').insert(newWritings)
}

async function copyCharacterLocations(supabase: any, oldCharId: string, newCharId: string) {
  const { data: locations } = await supabase
    .from('vault_character_locations')
    .select('*')
    .eq('character_id', oldCharId)

  if (!locations?.length) return

  const newLocations = locations.map((l: any) => {
    const { id: _id, character_id: _cid, created_at: _ca, updated_at: _ua, ...locData } = l
    return { ...locData, character_id: newCharId }
  })

  await supabase.from('vault_character_locations').insert(newLocations)
}

async function duplicateOneshot(supabase: any, userId: string, oneshotId: string, newName: string): Promise<string | null> {
  // Get original oneshot
  const { data: oneshot, error: fetchError } = await supabase
    .from('oneshots')
    .select('*')
    .eq('id', oneshotId)
    .eq('user_id', userId)
    .single()

  if (fetchError || !oneshot) {
    console.error('Oneshot not found:', fetchError)
    return null
  }

  // Create new oneshot (reset template-related fields)
  const { id: _id, created_at: _ca, updated_at: _ua, template_id: _tid, template_version: _tv, saved_template_version: _stv, published_at: _pa, is_published: _ip, ...oneshotData } = oneshot

  const { data: newOneshot, error: createError } = await supabase
    .from('oneshots')
    .insert({
      ...oneshotData,
      title: newName,
      content_mode: 'active',
      is_published: false,
      template_version: 0,
    })
    .select()
    .single()

  if (createError || !newOneshot) {
    console.error('Failed to create oneshot:', createError)
    return null
  }

  return newOneshot.id
}
