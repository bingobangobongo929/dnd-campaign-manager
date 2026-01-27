import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/ai/suggestions/undo
 * Undoes an applied suggestion by deleting the created entity
 * and reverting the suggestion status back to pending.
 */
export async function POST(req: Request) {
  try {
    const { suggestionId } = await req.json() as { suggestionId: string }

    if (!suggestionId) {
      return new Response(JSON.stringify({ error: 'Suggestion ID required' }), {
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

    // Tier check
    const { data: settings } = await supabase
      .from('user_settings')
      .select('tier')
      .eq('user_id', user.id)
      .single()
    if ((settings?.tier || 'free') === 'free') {
      return new Response(JSON.stringify({ error: 'AI features require a paid plan' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get the suggestion
    const { data: suggestion, error: fetchError } = await supabase
      .from('intelligence_suggestions')
      .select('*, campaigns!inner(user_id)')
      .eq('id', suggestionId)
      .single()

    if (fetchError || !suggestion) {
      return new Response(JSON.stringify({ error: 'Suggestion not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Verify ownership
    if ((suggestion.campaigns as { user_id: string }).user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Check if suggestion was applied
    if (suggestion.status !== 'applied') {
      return new Response(JSON.stringify({ error: 'Only applied suggestions can be undone' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Check if within 24 hour window (using created_at as proxy)
    const createdAt = suggestion.created_at ? new Date(suggestion.created_at) : null
    if (createdAt) {
      const hoursSinceCreated = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60)
      if (hoursSinceCreated > 24) {
        return new Response(JSON.stringify({
          error: 'Undo window expired',
          message: 'Suggestions can only be undone within 24 hours of being created'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    const finalValue = suggestion.final_value as Record<string, unknown> | null

    // Perform inverse operation based on suggestion type
    let undoMessage = 'Suggestion undone'

    switch (suggestion.suggestion_type) {
      case 'timeline_event':
      case 'item_detected':
      case 'combat_outcome': {
        // Delete the created timeline event
        const eventId = finalValue?.timeline_event_id as string | undefined
        if (eventId) {
          const { error } = await supabase
            .from('timeline_events')
            .delete()
            .eq('id', eventId)
          if (error) throw error
          undoMessage = 'Timeline event deleted'
        }

        // For combat_outcome, also revert character status if changed
        if (suggestion.suggestion_type === 'combat_outcome') {
          const characterId = finalValue?.character_id as string | undefined
          const outcomeType = (finalValue as { outcome_type?: string })?.outcome_type
          if (characterId && (outcomeType === 'death' || outcomeType === 'injury')) {
            await supabase
              .from('characters')
              .update({ status: 'alive' })
              .eq('id', characterId)
            undoMessage = 'Timeline event deleted and character status reverted'
          }
        }
        break
      }

      case 'location_detected': {
        // Delete the created location
        const locationId = finalValue?.location_id as string | undefined
        if (locationId && !finalValue?.existing_location_id) {
          const { error } = await supabase
            .from('locations')
            .delete()
            .eq('id', locationId)
          if (error) throw error
          undoMessage = 'Location deleted'
        }
        break
      }

      case 'quest_detected': {
        // Delete the created quest
        const questId = finalValue?.quest_id as string | undefined
        if (questId && !finalValue?.existing_quest_id) {
          const { error } = await supabase
            .from('quests')
            .delete()
            .eq('id', questId)
          if (error) throw error
          undoMessage = 'Quest deleted'
        }
        break
      }

      case 'encounter_detected': {
        // Delete the created encounter
        const encounterId = finalValue?.encounter_id as string | undefined
        if (encounterId && !finalValue?.existing_encounter_id) {
          const { error } = await supabase
            .from('encounters')
            .delete()
            .eq('id', encounterId)
          if (error) throw error
          undoMessage = 'Encounter deleted'
        }
        break
      }

      case 'faction_detected': {
        // Delete the created faction
        const factionId = finalValue?.faction_id as string | undefined
        if (factionId && !finalValue?.existing_faction_id) {
          const { error } = await supabase
            .from('campaign_factions')
            .delete()
            .eq('id', factionId)
          if (error) throw error
          undoMessage = 'Faction deleted'
        }
        break
      }

      case 'npc_detected': {
        // Delete the created NPC character
        const characterId = finalValue?.character_id as string | undefined
        if (characterId && !finalValue?.existing_character_id) {
          const { error } = await supabase
            .from('characters')
            .delete()
            .eq('id', characterId)
          if (error) throw error
          undoMessage = 'NPC character deleted'
        }
        break
      }

      case 'relationship': {
        // Delete the created relationship
        const relationshipId = finalValue?.relationship_id as string | undefined
        if (relationshipId && !finalValue?.existing_relationship_id) {
          const { error } = await supabase
            .from('canvas_relationships')
            .delete()
            .eq('id', relationshipId)
          if (error) throw error
          undoMessage = 'Relationship deleted'
        }
        break
      }

      case 'status_change': {
        // Revert character status to previous value
        if (suggestion.character_id && suggestion.current_value) {
          const { error } = await supabase
            .from('characters')
            .update({ status: suggestion.current_value })
            .eq('id', suggestion.character_id)
          if (error) throw error
          undoMessage = 'Character status reverted'
        }
        break
      }

      case 'secret_revealed':
      case 'story_hook':
      case 'quote':
      case 'important_person': {
        // For array fields, remove the added item
        if (suggestion.character_id && suggestion.field_name) {
          const { data: character } = await supabase
            .from('characters')
            .select('*')
            .eq('id', suggestion.character_id)
            .single()

          if (character) {
            const fieldName = suggestion.field_name as keyof typeof character
            const currentArray = (character[fieldName] as unknown[]) || []

            // Remove the last added item (the one we added)
            if (currentArray.length > 0) {
              const updatedArray = currentArray.slice(0, -1)
              const { error } = await supabase
                .from('characters')
                .update({ [fieldName]: updatedArray })
                .eq('id', suggestion.character_id)
              if (error) throw error
              undoMessage = `${suggestion.field_name} entry removed`
            }
          }
        }
        break
      }

      default:
        // For unsupported types, just revert to pending
        undoMessage = 'Suggestion reverted (manual cleanup may be needed)'
    }

    // Revert suggestion status to pending
    const { error: updateError } = await supabase
      .from('intelligence_suggestions')
      .update({
        status: 'pending',
        final_value: null
      })
      .eq('id', suggestionId)

    if (updateError) throw updateError

    return new Response(JSON.stringify({
      success: true,
      message: undoMessage
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Undo suggestion error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to undo suggestion',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
