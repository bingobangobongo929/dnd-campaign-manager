import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface StartPlayingRequest {
  saveId: string
  customName?: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: StartPlayingRequest = await request.json()
    const { saveId, customName } = body

    if (!saveId) {
      return NextResponse.json({ error: 'Save ID required' }, { status: 400 })
    }

    // Get the save and snapshot
    const { data: save, error: saveError } = await supabase
      .from('content_saves')
      .select(`
        *,
        snapshot:template_snapshots(*)
      `)
      .eq('id', saveId)
      .eq('user_id', user.id)
      .single()

    if (saveError || !save) {
      return NextResponse.json({ error: 'Save not found' }, { status: 404 })
    }

    if (save.instance_id) {
      return NextResponse.json({
        error: 'Already started playing this template',
        instanceId: save.instance_id,
      }, { status: 400 })
    }

    const snapshot = save.snapshot as any
    if (!snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
    }

    const snapshotData = snapshot.snapshot_data as any
    const relatedData = snapshot.related_data as any

    let newContentId: string | null = null

    if (snapshot.content_type === 'campaign') {
      // Create campaign from snapshot
      const campaignData = {
        ...snapshotData,
        id: undefined,
        user_id: user.id,
        name: customName || snapshotData.name,
        content_mode: 'active',
        template_id: snapshot.content_id,
        saved_template_version: snapshot.version,
        published_at: null,
        is_session0_ready: false,
        template_save_count: 0,
        allow_save: false,
        created_at: undefined,
        updated_at: undefined,
      }

      delete campaignData.id
      delete campaignData.created_at
      delete campaignData.updated_at

      const { data: newCampaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert(campaignData)
        .select()
        .single()

      if (campaignError || !newCampaign) {
        console.error('Campaign creation error:', campaignError)
        return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 })
      }

      newContentId = newCampaign.id

      // Copy related data with ID mappings
      if (relatedData) {
        const characterIdMap: Record<string, string> = {}
        const tagIdMap: Record<string, string> = {}

        // Copy tags first
        if (relatedData.tags && relatedData.tags.length > 0) {
          for (const tag of relatedData.tags) {
            const tagData = {
              ...tag,
              id: undefined,
              campaign_id: newContentId,
              created_at: undefined,
            }
            delete tagData.id
            delete tagData.created_at

            const { data: newTag } = await supabase
              .from('tags')
              .insert(tagData)
              .select()
              .single()

            if (newTag) {
              tagIdMap[tag.id] = newTag.id
            }
          }
        }

        // Copy characters
        if (relatedData.characters && relatedData.characters.length > 0) {
          for (const character of relatedData.characters) {
            const charData = {
              ...character,
              id: undefined,
              campaign_id: newContentId,
              created_at: undefined,
              updated_at: undefined,
            }
            delete charData.id
            delete charData.created_at
            delete charData.updated_at

            const { data: newChar } = await supabase
              .from('characters')
              .insert(charData)
              .select()
              .single()

            if (newChar) {
              characterIdMap[character.id] = newChar.id
            }
          }
        }

        // Copy character tags with mapped IDs
        if (relatedData.characterTags && relatedData.characterTags.length > 0) {
          for (const ct of relatedData.characterTags) {
            const newCharId = characterIdMap[ct.character_id]
            const newTagId = tagIdMap[ct.tag_id]
            const newRelatedCharId = ct.related_character_id ? characterIdMap[ct.related_character_id] : null

            if (newCharId && newTagId) {
              await supabase.from('character_tags').insert({
                character_id: newCharId,
                tag_id: newTagId,
                related_character_id: newRelatedCharId,
              })
            }
          }
        }

        // Copy canvas groups
        if (relatedData.canvasGroups && relatedData.canvasGroups.length > 0) {
          for (const group of relatedData.canvasGroups) {
            const groupData = {
              ...group,
              id: undefined,
              campaign_id: newContentId,
              created_at: undefined,
              updated_at: undefined,
            }
            delete groupData.id
            delete groupData.created_at
            delete groupData.updated_at

            await supabase.from('canvas_groups').insert(groupData)
          }
        }

        // Copy character relationships with mapped IDs
        if (relatedData.relationships && relatedData.relationships.length > 0) {
          for (const rel of relatedData.relationships) {
            const newCharId = characterIdMap[rel.character_id]
            const newRelatedId = characterIdMap[rel.related_character_id]

            if (newCharId && newRelatedId) {
              const relData = {
                ...rel,
                id: undefined,
                campaign_id: newContentId,
                character_id: newCharId,
                related_character_id: newRelatedId,
                created_at: undefined,
                updated_at: undefined,
              }
              delete relData.id
              delete relData.created_at
              delete relData.updated_at

              await supabase.from('character_relationships').insert(relData)
            }
          }
        }

        // Copy world maps
        if (relatedData.worldMaps && relatedData.worldMaps.length > 0) {
          for (const map of relatedData.worldMaps) {
            const mapData = {
              ...map,
              id: undefined,
              campaign_id: newContentId,
              created_at: undefined,
            }
            delete mapData.id
            delete mapData.created_at

            await supabase.from('world_maps').insert(mapData)
          }
        }

        // Copy media gallery
        if (relatedData.mediaGallery && relatedData.mediaGallery.length > 0) {
          for (const media of relatedData.mediaGallery) {
            const mediaData = {
              ...media,
              id: undefined,
              campaign_id: newContentId,
              created_at: undefined,
            }
            delete mediaData.id
            delete mediaData.created_at

            await supabase.from('media_gallery').insert(mediaData)
          }
        }

        // Copy campaign lore
        if (relatedData.lore && relatedData.lore.length > 0) {
          for (const loreItem of relatedData.lore) {
            const loreData = {
              ...loreItem,
              id: undefined,
              campaign_id: newContentId,
              created_at: undefined,
              updated_at: undefined,
            }
            delete loreData.id
            delete loreData.created_at
            delete loreData.updated_at

            await supabase.from('campaign_lore').insert(loreData)
          }
        }
      }

    } else if (snapshot.content_type === 'character') {
      // Create vault character from snapshot
      const characterData = {
        ...snapshotData,
        id: undefined,
        user_id: user.id,
        name: customName || snapshotData.name,
        content_mode: 'active',
        template_id: snapshot.content_id,
        saved_template_version: snapshot.version,
        published_at: null,
        is_session0_ready: false,
        template_save_count: 0,
        allow_save: false,
        created_at: undefined,
        updated_at: undefined,
      }

      delete characterData.id
      delete characterData.created_at
      delete characterData.updated_at

      const { data: newCharacter, error: charError } = await supabase
        .from('vault_characters')
        .insert(characterData)
        .select()
        .single()

      if (charError || !newCharacter) {
        console.error('Character creation error:', charError)
        return NextResponse.json({ error: 'Failed to create character' }, { status: 500 })
      }

      newContentId = newCharacter.id

      // Copy related data
      if (relatedData) {
        // Copy images
        if (relatedData.images && relatedData.images.length > 0) {
          for (const img of relatedData.images) {
            const imgData = {
              ...img,
              id: undefined,
              user_id: user.id,
              character_id: newContentId,
              created_at: undefined,
            }
            delete imgData.id
            delete imgData.created_at

            await supabase.from('vault_character_images').insert(imgData)
          }
        }

        // Copy relationships
        if (relatedData.relationships && relatedData.relationships.length > 0) {
          for (const rel of relatedData.relationships) {
            const relData = {
              ...rel,
              id: undefined,
              user_id: user.id,
              character_id: newContentId,
              related_character_id: null, // Can't map to user's characters
              created_at: undefined,
              updated_at: undefined,
            }
            delete relData.id
            delete relData.created_at
            delete relData.updated_at

            await supabase.from('vault_character_relationships').insert(relData)
          }
        }

        // Copy spells
        if (relatedData.spells && relatedData.spells.length > 0) {
          for (const spell of relatedData.spells) {
            const spellData = {
              ...spell,
              id: undefined,
              character_id: newContentId,
              created_at: undefined,
            }
            delete spellData.id
            delete spellData.created_at

            await supabase.from('vault_character_spells').insert(spellData)
          }
        }

        // Copy writings
        if (relatedData.writings && relatedData.writings.length > 0) {
          for (const writing of relatedData.writings) {
            const writingData = {
              ...writing,
              id: undefined,
              user_id: user.id,
              character_id: newContentId,
              created_at: undefined,
              updated_at: undefined,
            }
            delete writingData.id
            delete writingData.created_at
            delete writingData.updated_at

            await supabase.from('vault_character_writings').insert(writingData)
          }
        }
      }

    } else if (snapshot.content_type === 'oneshot') {
      // Create oneshot from snapshot
      const oneshotData = {
        ...snapshotData,
        id: undefined,
        user_id: user.id,
        title: customName || snapshotData.title,
        content_mode: 'active',
        template_id: snapshot.content_id,
        saved_template_version: snapshot.version,
        published_at: null,
        is_session0_ready: false,
        template_save_count: 0,
        allow_save: false,
        created_at: undefined,
        updated_at: undefined,
      }

      delete oneshotData.id
      delete oneshotData.created_at
      delete oneshotData.updated_at

      const { data: newOneshot, error: oneshotError } = await supabase
        .from('oneshots')
        .insert(oneshotData)
        .select()
        .single()

      if (oneshotError || !newOneshot) {
        console.error('Oneshot creation error:', oneshotError)
        return NextResponse.json({ error: 'Failed to create oneshot' }, { status: 500 })
      }

      newContentId = newOneshot.id
    }

    // Update the save record with the instance ID
    if (newContentId) {
      await supabase
        .from('content_saves')
        .update({
          instance_id: newContentId,
          started_playing_at: new Date().toISOString(),
        })
        .eq('id', saveId)
    }

    return NextResponse.json({
      success: true,
      instanceId: newContentId,
      contentType: snapshot.content_type,
    })
  } catch (error) {
    console.error('Start playing error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
