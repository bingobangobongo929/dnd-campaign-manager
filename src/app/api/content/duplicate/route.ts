/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface DuplicateRequest {
  contentType: 'campaign' | 'character' | 'oneshot'
  contentId: string
  newName?: string
  asTemplate?: boolean // If true, creates as template draft instead of active content
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: DuplicateRequest = await request.json()
    const { contentType, contentId, newName, asTemplate } = body

    if (!contentType || !contentId) {
      return NextResponse.json({ error: 'Content type and ID required' }, { status: 400 })
    }

    let newId: string | null = null

    if (contentType === 'campaign') {
      newId = await duplicateCampaign(supabase, user.id, contentId, newName?.trim(), asTemplate)
    } else if (contentType === 'character') {
      newId = await duplicateCharacter(supabase, user.id, contentId, newName?.trim(), asTemplate)
    } else if (contentType === 'oneshot') {
      newId = await duplicateOneshot(supabase, user.id, contentId, newName?.trim(), asTemplate)
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

async function duplicateCampaign(supabase: any, userId: string, campaignId: string, newName?: string, asTemplate?: boolean): Promise<string | null> {
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

  // Generate name if not provided
  const finalName = newName || (asTemplate ? `${campaign.name} (Template)` : `${campaign.name} (Copy)`)

  // Create new campaign (reset template-related fields)
  const { data: newCampaign, error: createError } = await supabase
    .from('campaigns')
    .insert({
      user_id: userId,
      name: finalName,
      description: campaign.description,
      image_url: campaign.image_url,
      game_system: campaign.game_system,
      setting: campaign.setting,
      session_frequency: campaign.session_frequency,
      current_session: 0,
      status: 'active',
      content_mode: asTemplate ? 'template' : 'active',
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

  // Copy related data with error tracking
  const copyResults = await Promise.allSettled([
    copyCharacters(supabase, campaignId, newCampaign.id),
    copyTags(supabase, campaignId, newCampaign.id),
    copyCanvasGroups(supabase, campaignId, newCampaign.id),
    copyLore(supabase, campaignId, newCampaign.id),
    copyWorldMaps(supabase, campaignId, newCampaign.id),
  ])

  const failures = copyResults
    .map((result, i) => ({ result, operation: ['characters', 'tags', 'canvas_groups', 'lore', 'world_maps'][i] }))
    .filter((item): item is { result: PromiseRejectedResult; operation: string } => item.result.status === 'rejected')

  if (failures.length > 0) {
    console.error('Some copy operations failed:', failures.map(f => ({ operation: f.operation, error: f.result.reason })))
    // Campaign was created but some data wasn't copied - still return success but log the issue
  }

  return newCampaign.id
}

async function copyCharacters(supabase: any, oldCampaignId: string, newCampaignId: string) {
  const { data: characters, error: fetchError } = await supabase
    .from('characters')
    .select('*')
    .eq('campaign_id', oldCampaignId)

  if (fetchError) {
    throw new Error(`Failed to fetch characters: ${fetchError.message}`)
  }

  if (!characters?.length) return

  const idMap = new Map<string, string>()

  // Insert characters with new IDs
  for (const char of characters) {
    const { id: oldId, campaign_id: _cid, created_at: _ca, updated_at: _ua, ...charData } = char
    const { data: newChar, error: insertError } = await supabase
      .from('characters')
      .insert({
        ...charData,
        campaign_id: newCampaignId,
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to copy character ${char.name}: ${insertError.message}`)
    }

    if (newChar) {
      idMap.set(oldId, newChar.id)
    }
  }

  // Copy relationships using the ID map
  const { data: relationships, error: relFetchError } = await supabase
    .from('character_relationships')
    .select('*')
    .eq('campaign_id', oldCampaignId)

  if (relFetchError) {
    throw new Error(`Failed to fetch relationships: ${relFetchError.message}`)
  }

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
      const { error: relInsertError } = await supabase.from('character_relationships').insert(newRelationships)
      if (relInsertError) {
        throw new Error(`Failed to copy relationships: ${relInsertError.message}`)
      }
    }
  }
}

async function copyTags(supabase: any, oldCampaignId: string, newCampaignId: string) {
  const { data: tags, error: fetchError } = await supabase
    .from('tags')
    .select('*')
    .eq('campaign_id', oldCampaignId)

  if (fetchError) {
    throw new Error(`Failed to fetch tags: ${fetchError.message}`)
  }

  if (!tags?.length) return

  const newTags = tags.map((t: any) => {
    const { id: _id, campaign_id: _cid, created_at: _ca, ...tagData } = t
    return { ...tagData, campaign_id: newCampaignId }
  })

  const { error: insertError } = await supabase.from('tags').insert(newTags)
  if (insertError) {
    throw new Error(`Failed to copy tags: ${insertError.message}`)
  }
}

async function copyCanvasGroups(supabase: any, oldCampaignId: string, newCampaignId: string) {
  const { data: groups, error: fetchError } = await supabase
    .from('canvas_groups')
    .select('*')
    .eq('campaign_id', oldCampaignId)

  if (fetchError) {
    throw new Error(`Failed to fetch canvas groups: ${fetchError.message}`)
  }

  if (!groups?.length) return

  const newGroups = groups.map((g: any) => {
    const { id: _id, campaign_id: _cid, created_at: _ca, updated_at: _ua, ...groupData } = g
    return { ...groupData, campaign_id: newCampaignId }
  })

  const { error: insertError } = await supabase.from('canvas_groups').insert(newGroups)
  if (insertError) {
    throw new Error(`Failed to copy canvas groups: ${insertError.message}`)
  }
}

async function copyLore(supabase: any, oldCampaignId: string, newCampaignId: string) {
  const { data: lore, error: fetchError } = await supabase
    .from('campaign_lore')
    .select('*')
    .eq('campaign_id', oldCampaignId)

  if (fetchError) {
    throw new Error(`Failed to fetch lore: ${fetchError.message}`)
  }

  if (!lore?.length) return

  const newLore = lore.map((l: any) => {
    const { id: _id, campaign_id: _cid, created_at: _ca, updated_at: _ua, ...loreData } = l
    return { ...loreData, campaign_id: newCampaignId }
  })

  const { error: insertError } = await supabase.from('campaign_lore').insert(newLore)
  if (insertError) {
    throw new Error(`Failed to copy lore: ${insertError.message}`)
  }
}

async function copyWorldMaps(supabase: any, oldCampaignId: string, newCampaignId: string) {
  const { data: maps, error: fetchError } = await supabase
    .from('world_maps')
    .select('*')
    .eq('campaign_id', oldCampaignId)

  if (fetchError) {
    throw new Error(`Failed to fetch world maps: ${fetchError.message}`)
  }

  if (!maps?.length) return

  const newMaps = maps.map((m: any) => {
    const { id: _id, campaign_id: _cid, created_at: _ca, updated_at: _ua, ...mapData } = m
    return { ...mapData, campaign_id: newCampaignId }
  })

  const { error: insertError } = await supabase.from('world_maps').insert(newMaps)
  if (insertError) {
    throw new Error(`Failed to copy world maps: ${insertError.message}`)
  }
}

async function duplicateCharacter(supabase: any, userId: string, characterId: string, newName?: string, asTemplate?: boolean): Promise<string | null> {
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

  // Generate name if not provided
  const finalName = newName || (asTemplate ? `${character.name} (Template)` : `${character.name} (Copy)`)

  // Create new character (reset template-related fields)
  const { id: _id, created_at: _ca, updated_at: _ua, template_id: _tid, template_version: _tv, saved_template_version: _stv, published_at: _pa, is_published: _ip, ...charData } = character

  const { data: newCharacter, error: createError } = await supabase
    .from('vault_characters')
    .insert({
      ...charData,
      name: finalName,
      content_mode: asTemplate ? 'template' : 'active',
      is_published: false,
      template_version: 0,
    })
    .select()
    .single()

  if (createError || !newCharacter) {
    console.error('Failed to create character:', createError)
    return null
  }

  // Copy related data with error tracking
  const copyResults = await Promise.allSettled([
    copyCharacterImages(supabase, characterId, newCharacter.id),
    copyCharacterRelationships(supabase, characterId, newCharacter.id),
    copyCharacterSpells(supabase, characterId, newCharacter.id),
    copyCharacterWritings(supabase, characterId, newCharacter.id),
    copyCharacterLocations(supabase, characterId, newCharacter.id),
  ])

  const failures = copyResults
    .map((result, i) => ({ result, operation: ['images', 'relationships', 'spells', 'writings', 'locations'][i] }))
    .filter((item): item is { result: PromiseRejectedResult; operation: string } => item.result.status === 'rejected')

  if (failures.length > 0) {
    console.error('Some character copy operations failed:', failures.map(f => ({ operation: f.operation, error: f.result.reason })))
  }

  return newCharacter.id
}

async function copyCharacterImages(supabase: any, oldCharId: string, newCharId: string) {
  const { data: images, error: fetchError } = await supabase
    .from('vault_character_images')
    .select('*')
    .eq('character_id', oldCharId)

  if (fetchError) {
    throw new Error(`Failed to fetch character images: ${fetchError.message}`)
  }

  if (!images?.length) return

  const newImages = images.map((i: any) => {
    const { id: _id, character_id: _cid, created_at: _ca, ...imageData } = i
    return { ...imageData, character_id: newCharId }
  })

  const { error: insertError } = await supabase.from('vault_character_images').insert(newImages)
  if (insertError) {
    throw new Error(`Failed to copy character images: ${insertError.message}`)
  }
}

async function copyCharacterRelationships(supabase: any, oldCharId: string, newCharId: string) {
  const { data: rels, error: fetchError } = await supabase
    .from('vault_character_relationships')
    .select('*')
    .eq('character_id', oldCharId)

  if (fetchError) {
    throw new Error(`Failed to fetch character relationships: ${fetchError.message}`)
  }

  if (!rels?.length) return

  const newRels = rels.map((r: any) => {
    const { id: _id, character_id: _cid, created_at: _ca, updated_at: _ua, ...relData } = r
    return { ...relData, character_id: newCharId }
  })

  const { error: insertError } = await supabase.from('vault_character_relationships').insert(newRels)
  if (insertError) {
    throw new Error(`Failed to copy character relationships: ${insertError.message}`)
  }
}

async function copyCharacterSpells(supabase: any, oldCharId: string, newCharId: string) {
  const { data: spells, error: fetchError } = await supabase
    .from('vault_character_spells')
    .select('*')
    .eq('character_id', oldCharId)

  if (fetchError) {
    throw new Error(`Failed to fetch character spells: ${fetchError.message}`)
  }

  if (!spells?.length) return

  const newSpells = spells.map((s: any) => {
    const { id: _id, character_id: _cid, created_at: _ca, ...spellData } = s
    return { ...spellData, character_id: newCharId }
  })

  const { error: insertError } = await supabase.from('vault_character_spells').insert(newSpells)
  if (insertError) {
    throw new Error(`Failed to copy character spells: ${insertError.message}`)
  }
}

async function copyCharacterWritings(supabase: any, oldCharId: string, newCharId: string) {
  const { data: writings, error: fetchError } = await supabase
    .from('vault_character_writings')
    .select('*')
    .eq('character_id', oldCharId)

  if (fetchError) {
    throw new Error(`Failed to fetch character writings: ${fetchError.message}`)
  }

  if (!writings?.length) return

  const newWritings = writings.map((w: any) => {
    const { id: _id, character_id: _cid, created_at: _ca, updated_at: _ua, ...writingData } = w
    return { ...writingData, character_id: newCharId }
  })

  const { error: insertError } = await supabase.from('vault_character_writings').insert(newWritings)
  if (insertError) {
    throw new Error(`Failed to copy character writings: ${insertError.message}`)
  }
}

async function copyCharacterLocations(supabase: any, oldCharId: string, newCharId: string) {
  const { data: locations, error: fetchError } = await supabase
    .from('vault_character_locations')
    .select('*')
    .eq('character_id', oldCharId)

  if (fetchError) {
    throw new Error(`Failed to fetch character locations: ${fetchError.message}`)
  }

  if (!locations?.length) return

  const newLocations = locations.map((l: any) => {
    const { id: _id, character_id: _cid, created_at: _ca, updated_at: _ua, ...locData } = l
    return { ...locData, character_id: newCharId }
  })

  const { error: insertError } = await supabase.from('vault_character_locations').insert(newLocations)
  if (insertError) {
    throw new Error(`Failed to copy character locations: ${insertError.message}`)
  }
}

async function duplicateOneshot(supabase: any, userId: string, oneshotId: string, newName?: string, asTemplate?: boolean): Promise<string | null> {
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

  // Generate name if not provided
  const finalName = newName || (asTemplate ? `${oneshot.title} (Template)` : `${oneshot.title} (Copy)`)

  // Create new oneshot (reset template-related fields)
  const { id: _id, created_at: _ca, updated_at: _ua, template_id: _tid, template_version: _tv, saved_template_version: _stv, published_at: _pa, is_published: _ip, ...oneshotData } = oneshot

  const { data: newOneshot, error: createError } = await supabase
    .from('oneshots')
    .insert({
      ...oneshotData,
      title: finalName,
      content_mode: asTemplate ? 'template' : 'active',
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
