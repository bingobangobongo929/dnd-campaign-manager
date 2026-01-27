import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

/**
 * Helper to detect if user edited the suggestion before applying.
 * Compares keys in both objects to find meaningful changes.
 * Returns enriched final_value with correction metadata if edited.
 */
function trackCorrection(
  suggestedValue: Record<string, unknown>,
  finalValue: Record<string, unknown>,
  suggestionType: string
): Record<string, unknown> {
  // Skip tracking for certain fields that are expected to change (like IDs)
  const skipFields = ['timeline_event_id', 'location_id', 'quest_id', 'encounter_id', 'faction_id', 'character_id', 'relationship_id', 'session_quest_id']

  const corrections: Array<{ field: string; original: unknown; corrected: unknown }> = []

  for (const key of Object.keys(finalValue)) {
    if (skipFields.includes(key)) continue

    const originalVal = suggestedValue[key]
    const newVal = finalValue[key]

    // Check for meaningful difference
    if (originalVal !== undefined && newVal !== undefined) {
      const originalStr = typeof originalVal === 'string' ? originalVal.trim().toLowerCase() : JSON.stringify(originalVal)
      const newStr = typeof newVal === 'string' ? newVal.trim().toLowerCase() : JSON.stringify(newVal)

      if (originalStr !== newStr && originalStr !== '' && newStr !== '') {
        corrections.push({
          field: key,
          original: originalVal,
          corrected: newVal
        })
      }
    }
  }

  if (corrections.length > 0) {
    return {
      ...finalValue,
      _correction_metadata: {
        was_edited: true,
        suggestion_type: suggestionType,
        corrections,
        original_suggested: suggestedValue
      }
    }
  }

  return finalValue
}

// GET /api/ai/suggestions?campaignId=X&status=pending&characterId=Y
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const campaignId = searchParams.get('campaignId')
    const status = searchParams.get('status') // 'pending', 'applied', 'rejected', or null for all
    const characterId = searchParams.get('characterId') // Optional: filter by character

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

    // Build query
    let query = supabase
      .from('intelligence_suggestions')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    // Filter by character if provided
    if (characterId) {
      query = query.eq('character_id', characterId)
    }

    const { data: suggestions, error } = await query

    if (error) throw error

    // Get counts by status
    const { data: countData } = await supabase
      .from('intelligence_suggestions')
      .select('status')
      .eq('campaign_id', campaignId)

    const counts = {
      pending: 0,
      applied: 0,
      rejected: 0,
    }

    countData?.forEach(s => {
      if (s.status in counts) {
        counts[s.status as keyof typeof counts]++
      }
    })

    return new Response(JSON.stringify({
      suggestions: suggestions || [],
      counts,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Get suggestions error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to load suggestions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// PATCH /api/ai/suggestions - Update suggestion status (approve/reject)
export async function PATCH(req: Request) {
  try {
    const { suggestionId, action, finalValue, rejectReason } = await req.json() as {
      suggestionId: string
      action: 'approve' | 'reject'
      finalValue?: unknown
      rejectReason?: string
    }

    if (!suggestionId || !action) {
      return new Response(JSON.stringify({ error: 'Suggestion ID and action required' }), {
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

    if (action === 'reject') {
      // Update status and store rejection reason if provided
      const updateData: { status: 'rejected'; final_value?: { reject_reason: string } } = {
        status: 'rejected',
      }

      // Validate rejection reason - must be string, max 200 chars, only allowed values
      if (rejectReason) {
        const ALLOWED_REASONS = ['incorrect', 'already_handled', 'not_relevant', 'will_add_manually', 'duplicate']
        if (typeof rejectReason !== 'string' || rejectReason.length > 200) {
          return new Response(JSON.stringify({ error: 'Invalid rejection reason' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          })
        }
        // Only store if it's an allowed value (prevents arbitrary string injection)
        if (ALLOWED_REASONS.includes(rejectReason)) {
          updateData.final_value = { reject_reason: rejectReason }
        }
      }

      const { error } = await supabase
        .from('intelligence_suggestions')
        .update(updateData)
        .eq('id', suggestionId)

      if (error) throw error

      return new Response(JSON.stringify({ success: true, action: 'rejected', rejectReason }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // action === 'approve' - Apply the suggestion

    // Handle timeline_event suggestions
    if (suggestion.suggestion_type === 'timeline_event') {
      const timelineData = (finalValue ?? suggestion.suggested_value) as {
        title: string
        description: string
        event_type: string
        event_date?: string
        session_id?: string | null
        location?: string
        is_major?: boolean
        character_names?: string[]
        character_ids?: string[]
      }

      // Use provided character_ids if available, otherwise look up from names
      let characterIds: string[] = timelineData.character_ids || []

      if (characterIds.length === 0 && timelineData.character_names && timelineData.character_names.length > 0) {
        const { data: characters } = await supabase
          .from('characters')
          .select('id, name')
          .eq('campaign_id', suggestion.campaign_id)

        if (characters) {
          characterIds = timelineData.character_names
            .map(name => {
              const char = characters.find(c =>
                c.name.toLowerCase() === name.toLowerCase() ||
                c.name.toLowerCase().includes(name.toLowerCase()) ||
                name.toLowerCase().includes(c.name.toLowerCase())
              )
              return char?.id
            })
            .filter((id): id is string => !!id)
        }
      }

      // Create the timeline event with all fields
      const { data: newEvent, error: eventError } = await supabase
        .from('timeline_events')
        .insert({
          campaign_id: suggestion.campaign_id,
          title: timelineData.title,
          description: timelineData.description,
          event_type: timelineData.event_type || 'other',
          event_date: timelineData.event_date || new Date().toISOString().split('T')[0],
          session_id: timelineData.session_id || null,
          location: timelineData.location || null,
          is_major: timelineData.is_major || false,
          character_ids: characterIds.length > 0 ? characterIds : null,
          character_id: characterIds.length > 0 ? characterIds[0] : null, // backward compat
        })
        .select('id')
        .single()

      if (eventError) throw eventError

      // Mark suggestion as applied with correction tracking
      const suggestedData = suggestion.suggested_value as Record<string, unknown>
      const trackedFinalValue = finalValue
        ? trackCorrection(suggestedData, { ...timelineData, timeline_event_id: newEvent.id }, 'timeline_event')
        : { ...timelineData, timeline_event_id: newEvent.id }

      const { error } = await supabase
        .from('intelligence_suggestions')
        .update({
          status: 'applied',
          final_value: trackedFinalValue
        })
        .eq('id', suggestionId)

      if (error) throw error

      return new Response(JSON.stringify({
        success: true,
        action: 'applied',
        message: 'Timeline event created',
        timelineEventId: newEvent.id
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Handle location_detected suggestions
    if (suggestion.suggestion_type === 'location_detected') {
      const locationData = (finalValue ?? suggestion.suggested_value) as {
        name: string
        location_type?: string
        description?: string
        parent_location_name?: string
      }

      // Look up parent location if specified
      let parentId: string | null = null
      if (locationData.parent_location_name) {
        const { data: parentLocation } = await supabase
          .from('locations')
          .select('id')
          .eq('campaign_id', suggestion.campaign_id)
          .ilike('name', locationData.parent_location_name)
          .maybeSingle()

        parentId = parentLocation?.id || null
      }

      // Check if location already exists (by name, case-insensitive)
      const { data: existingLocation } = await supabase
        .from('locations')
        .select('id')
        .eq('campaign_id', suggestion.campaign_id)
        .ilike('name', locationData.name)
        .maybeSingle()

      if (existingLocation) {
        // Location already exists - mark as applied but don't create duplicate
        const { error } = await supabase
          .from('intelligence_suggestions')
          .update({
            status: 'applied',
            final_value: { ...locationData, existing_location_id: existingLocation.id, note: 'Location already existed' }
          })
          .eq('id', suggestionId)

        if (error) throw error

        return new Response(JSON.stringify({
          success: true,
          action: 'applied',
          message: 'Location already exists',
          locationId: existingLocation.id
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Create the location
      const { data: newLocation, error: locationError } = await supabase
        .from('locations')
        .insert({
          campaign_id: suggestion.campaign_id,
          name: locationData.name,
          location_type: locationData.location_type || 'other',
          description: locationData.description || null,
          parent_id: parentId,
          is_visited: false,
          is_known: true, // Default to known since it was mentioned in sessions
        })
        .select('id')
        .single()

      if (locationError) throw locationError

      // Mark suggestion as applied with correction tracking
      const suggestedLocData = suggestion.suggested_value as Record<string, unknown>
      const trackedLocFinalValue = finalValue
        ? trackCorrection(suggestedLocData, { ...locationData, location_id: newLocation.id }, 'location_detected')
        : { ...locationData, location_id: newLocation.id }

      const { error } = await supabase
        .from('intelligence_suggestions')
        .update({
          status: 'applied',
          final_value: trackedLocFinalValue
        })
        .eq('id', suggestionId)

      if (error) throw error

      return new Response(JSON.stringify({
        success: true,
        action: 'applied',
        message: 'Location created',
        locationId: newLocation.id
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Handle quest_detected suggestions
    if (suggestion.suggestion_type === 'quest_detected') {
      const questData = (finalValue ?? suggestion.suggested_value) as {
        name: string
        quest_type?: string
        description?: string
        status?: string
        quest_giver_name?: string
        location_name?: string
      }

      // Look up quest giver if specified
      let questGiverId: string | null = null
      if (questData.quest_giver_name) {
        const { data: questGiver } = await supabase
          .from('characters')
          .select('id')
          .eq('campaign_id', suggestion.campaign_id)
          .ilike('name', questData.quest_giver_name)
          .maybeSingle()

        questGiverId = questGiver?.id || null
      }

      // Look up objective location if specified
      let objectiveLocationId: string | null = null
      if (questData.location_name) {
        const { data: location } = await supabase
          .from('locations')
          .select('id')
          .eq('campaign_id', suggestion.campaign_id)
          .ilike('name', questData.location_name)
          .maybeSingle()

        objectiveLocationId = location?.id || null
      }

      // Check if quest already exists (by name, case-insensitive)
      const { data: existingQuest } = await supabase
        .from('quests')
        .select('id')
        .eq('campaign_id', suggestion.campaign_id)
        .ilike('name', questData.name)
        .maybeSingle()

      if (existingQuest) {
        // Quest already exists - mark as applied but don't create duplicate
        const { error } = await supabase
          .from('intelligence_suggestions')
          .update({
            status: 'applied',
            final_value: { ...questData, existing_quest_id: existingQuest.id, note: 'Quest already existed' }
          })
          .eq('id', suggestionId)

        if (error) throw error

        return new Response(JSON.stringify({
          success: true,
          action: 'applied',
          message: 'Quest already exists',
          questId: existingQuest.id
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Create the quest
      const { data: newQuest, error: questError } = await supabase
        .from('quests')
        .insert({
          campaign_id: suggestion.campaign_id,
          name: questData.name,
          type: questData.quest_type || 'side_quest',
          description: questData.description || null,
          status: questData.status || 'available',
          quest_giver_id: questGiverId,
          objective_location_id: objectiveLocationId,
          visibility: 'party', // Default to party visible since it was in session notes
        })
        .select('id')
        .single()

      if (questError) throw questError

      // Mark suggestion as applied with correction tracking
      const suggestedQuestData = suggestion.suggested_value as Record<string, unknown>
      const trackedQuestFinalValue = finalValue
        ? trackCorrection(suggestedQuestData, { ...questData, quest_id: newQuest.id }, 'quest_detected')
        : { ...questData, quest_id: newQuest.id }

      const { error } = await supabase
        .from('intelligence_suggestions')
        .update({
          status: 'applied',
          final_value: trackedQuestFinalValue
        })
        .eq('id', suggestionId)

      if (error) throw error

      return new Response(JSON.stringify({
        success: true,
        action: 'applied',
        message: 'Quest created',
        questId: newQuest.id
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Handle encounter_detected suggestions
    if (suggestion.suggestion_type === 'encounter_detected') {
      const encounterData = (finalValue ?? suggestion.suggested_value) as {
        name: string
        encounter_type?: string
        description?: string
        status?: string
        difficulty?: string
        location_name?: string
        quest_name?: string
      }

      // Look up location if specified
      let locationId: string | null = null
      if (encounterData.location_name) {
        const { data: location } = await supabase
          .from('locations')
          .select('id')
          .eq('campaign_id', suggestion.campaign_id)
          .ilike('name', encounterData.location_name)
          .maybeSingle()

        locationId = location?.id || null
      }

      // Look up quest if specified
      let questId: string | null = null
      if (encounterData.quest_name) {
        const { data: quest } = await supabase
          .from('quests')
          .select('id')
          .eq('campaign_id', suggestion.campaign_id)
          .ilike('name', encounterData.quest_name)
          .maybeSingle()

        questId = quest?.id || null
      }

      // Check if encounter already exists (by name, case-insensitive)
      const { data: existingEncounter } = await supabase
        .from('encounters')
        .select('id')
        .eq('campaign_id', suggestion.campaign_id)
        .ilike('name', encounterData.name)
        .maybeSingle()

      if (existingEncounter) {
        // Encounter already exists - mark as applied but don't create duplicate
        const { error } = await supabase
          .from('intelligence_suggestions')
          .update({
            status: 'applied',
            final_value: { ...encounterData, existing_encounter_id: existingEncounter.id, note: 'Encounter already existed' }
          })
          .eq('id', suggestionId)

        if (error) throw error

        return new Response(JSON.stringify({
          success: true,
          action: 'applied',
          message: 'Encounter already exists',
          encounterId: existingEncounter.id
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Create the encounter
      const { data: newEncounter, error: encounterError } = await supabase
        .from('encounters')
        .insert({
          campaign_id: suggestion.campaign_id,
          name: encounterData.name,
          type: encounterData.encounter_type || 'combat',
          description: encounterData.description || null,
          status: encounterData.status || 'used',
          difficulty: encounterData.difficulty || null,
          location_id: locationId,
          quest_id: questId,
          visibility: 'dm', // Default to DM-only since it was extracted from session notes
        })
        .select('id')
        .single()

      if (encounterError) throw encounterError

      // Mark suggestion as applied with correction tracking
      const suggestedEncData = suggestion.suggested_value as Record<string, unknown>
      const trackedEncFinalValue = finalValue
        ? trackCorrection(suggestedEncData, { ...encounterData, encounter_id: newEncounter.id }, 'encounter_detected')
        : { ...encounterData, encounter_id: newEncounter.id }

      const { error } = await supabase
        .from('intelligence_suggestions')
        .update({
          status: 'applied',
          final_value: trackedEncFinalValue
        })
        .eq('id', suggestionId)

      if (error) throw error

      return new Response(JSON.stringify({
        success: true,
        action: 'applied',
        message: 'Encounter created',
        encounterId: newEncounter.id
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Handle faction_detected suggestions
    if (suggestion.suggestion_type === 'faction_detected') {
      const factionData = (finalValue ?? suggestion.suggested_value) as {
        name: string
        faction_type?: string
        description?: string
        is_known_to_party?: boolean
        hq_location_name?: string
      }

      // Check if faction already exists (by name, case-insensitive)
      const { data: existingFaction } = await supabase
        .from('campaign_factions')
        .select('id')
        .eq('campaign_id', suggestion.campaign_id)
        .ilike('name', factionData.name)
        .maybeSingle()

      if (existingFaction) {
        // Faction already exists - mark as applied but don't create duplicate
        const { error } = await supabase
          .from('intelligence_suggestions')
          .update({
            status: 'applied',
            final_value: { ...factionData, existing_faction_id: existingFaction.id, note: 'Faction already existed' }
          })
          .eq('id', suggestionId)

        if (error) throw error

        return new Response(JSON.stringify({
          success: true,
          action: 'applied',
          message: 'Faction already exists',
          factionId: existingFaction.id
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Look up HQ location if specified
      let hqLocationId: string | null = null
      if (factionData.hq_location_name) {
        const { data: location } = await supabase
          .from('locations')
          .select('id')
          .eq('campaign_id', suggestion.campaign_id)
          .ilike('name', factionData.hq_location_name)
          .maybeSingle()

        hqLocationId = location?.id || null
      }

      // Create the faction
      const { data: newFaction, error: factionError } = await supabase
        .from('campaign_factions')
        .insert({
          campaign_id: suggestion.campaign_id,
          name: factionData.name,
          faction_type: factionData.faction_type || 'guild',
          description: factionData.description || null,
          is_known_to_party: factionData.is_known_to_party ?? true,
          hq_location_id: hqLocationId,
          status: 'active',
          color: '#8B5CF6', // Default purple
          icon: 'shield',
        })
        .select('id')
        .single()

      if (factionError) throw factionError

      // Mark suggestion as applied
      const { error } = await supabase
        .from('intelligence_suggestions')
        .update({
          status: 'applied',
          final_value: { ...factionData, faction_id: newFaction.id }
        })
        .eq('id', suggestionId)

      if (error) throw error

      return new Response(JSON.stringify({
        success: true,
        action: 'applied',
        message: 'Faction created',
        factionId: newFaction.id
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Handle npc_detected suggestions - create new NPC character
    if (suggestion.suggestion_type === 'npc_detected') {
      const npcData = (finalValue ?? suggestion.suggested_value) as {
        name: string
        description?: string
        role?: string
        race?: string
        class?: string
        location_name?: string
        faction_name?: string
      }

      // Check if character already exists (by name, case-insensitive)
      const { data: existingChar } = await supabase
        .from('characters')
        .select('id')
        .eq('campaign_id', suggestion.campaign_id)
        .ilike('name', npcData.name)
        .maybeSingle()

      if (existingChar) {
        // Character already exists - mark as applied but don't create duplicate
        const { error } = await supabase
          .from('intelligence_suggestions')
          .update({
            status: 'applied',
            final_value: { ...npcData, existing_character_id: existingChar.id, note: 'Character already existed' }
          })
          .eq('id', suggestionId)

        if (error) throw error

        return new Response(JSON.stringify({
          success: true,
          action: 'applied',
          message: 'Character already exists',
          characterId: existingChar.id
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Create the NPC character
      const { data: newCharacter, error: charError } = await supabase
        .from('characters')
        .insert({
          campaign_id: suggestion.campaign_id,
          name: npcData.name,
          type: 'npc',
          summary: npcData.description || npcData.role || null,
          race: npcData.race || null,
          class: npcData.class || null,
          status: 'alive',
        })
        .select('id')
        .single()

      if (charError) throw charError

      // If faction specified, add to faction
      if (npcData.faction_name) {
        const { data: faction } = await supabase
          .from('campaign_factions')
          .select('id')
          .eq('campaign_id', suggestion.campaign_id)
          .ilike('name', npcData.faction_name)
          .maybeSingle()

        if (faction) {
          await supabase
            .from('faction_memberships')
            .insert({
              faction_id: faction.id,
              character_id: newCharacter.id,
              role: npcData.role || null,
              is_active: true,
              is_public: true,
            })
        }
      }

      // Mark suggestion as applied with correction tracking
      const suggestedNpcData = suggestion.suggested_value as Record<string, unknown>
      const trackedNpcFinalValue = finalValue
        ? trackCorrection(suggestedNpcData, { ...npcData, character_id: newCharacter.id }, 'npc_detected')
        : { ...npcData, character_id: newCharacter.id }

      const { error } = await supabase
        .from('intelligence_suggestions')
        .update({
          status: 'applied',
          final_value: trackedNpcFinalValue
        })
        .eq('id', suggestionId)

      if (error) throw error

      return new Response(JSON.stringify({
        success: true,
        action: 'applied',
        message: 'NPC character created',
        characterId: newCharacter.id
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Handle relationship suggestions - create canvas_relationships
    if (suggestion.suggestion_type === 'relationship') {
      const relationshipData = (finalValue ?? suggestion.suggested_value) as {
        from_character_name: string
        to_character_name: string
        relationship_type?: string
        description?: string
        is_known_to_party?: boolean
      }

      // Look up both characters
      const { data: characters } = await supabase
        .from('characters')
        .select('id, name')
        .eq('campaign_id', suggestion.campaign_id)

      const fromChar = characters?.find(c =>
        c.name.toLowerCase() === relationshipData.from_character_name?.toLowerCase() ||
        c.name.toLowerCase().includes(relationshipData.from_character_name?.toLowerCase() || '')
      )
      const toChar = characters?.find(c =>
        c.name.toLowerCase() === relationshipData.to_character_name?.toLowerCase() ||
        c.name.toLowerCase().includes(relationshipData.to_character_name?.toLowerCase() || '')
      )

      if (!fromChar || !toChar) {
        // Characters not found - mark as rejected
        const { error } = await supabase
          .from('intelligence_suggestions')
          .update({
            status: 'rejected',
            final_value: { ...relationshipData, note: `Character not found: ${!fromChar ? relationshipData.from_character_name : relationshipData.to_character_name}` }
          })
          .eq('id', suggestionId)

        if (error) throw error

        return new Response(JSON.stringify({
          success: false,
          action: 'rejected',
          message: `Character not found: ${!fromChar ? relationshipData.from_character_name : relationshipData.to_character_name}`
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Check if relationship already exists
      const { data: existingRel } = await supabase
        .from('canvas_relationships')
        .select('id')
        .eq('campaign_id', suggestion.campaign_id)
        .eq('from_character_id', fromChar.id)
        .eq('to_character_id', toChar.id)
        .maybeSingle()

      if (existingRel) {
        // Relationship already exists
        const { error } = await supabase
          .from('intelligence_suggestions')
          .update({
            status: 'applied',
            final_value: { ...relationshipData, existing_relationship_id: existingRel.id, note: 'Relationship already existed' }
          })
          .eq('id', suggestionId)

        if (error) throw error

        return new Response(JSON.stringify({
          success: true,
          action: 'applied',
          message: 'Relationship already exists',
          relationshipId: existingRel.id
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Create the relationship
      const { data: newRelationship, error: relError } = await supabase
        .from('canvas_relationships')
        .insert({
          campaign_id: suggestion.campaign_id,
          from_character_id: fromChar.id,
          to_character_id: toChar.id,
          custom_label: relationshipData.relationship_type || 'Connected',
          description: relationshipData.description || null,
          is_known_to_party: relationshipData.is_known_to_party ?? true,
          is_primary: true,
          status: 'active',
        })
        .select('id')
        .single()

      if (relError) throw relError

      // Mark suggestion as applied
      const { error } = await supabase
        .from('intelligence_suggestions')
        .update({
          status: 'applied',
          final_value: { ...relationshipData, relationship_id: newRelationship.id }
        })
        .eq('id', suggestionId)

      if (error) throw error

      return new Response(JSON.stringify({
        success: true,
        action: 'applied',
        message: 'Relationship created',
        relationshipId: newRelationship.id
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Handle quest_session_link suggestions
    if (suggestion.suggestion_type === 'quest_session_link') {
      const linkData = (finalValue ?? suggestion.suggested_value) as {
        quest_name: string
        progress_type: string
      }

      // Look up quest by name
      const { data: quest } = await supabase
        .from('quests')
        .select('id')
        .eq('campaign_id', suggestion.campaign_id)
        .ilike('name', linkData.quest_name)
        .maybeSingle()

      if (!quest) {
        // Quest not found - mark as rejected with note
        const { error } = await supabase
          .from('intelligence_suggestions')
          .update({
            status: 'rejected',
            final_value: { ...linkData, note: `Quest "${linkData.quest_name}" not found` }
          })
          .eq('id', suggestionId)

        if (error) throw error

        return new Response(JSON.stringify({
          success: false,
          action: 'rejected',
          message: `Quest "${linkData.quest_name}" not found`
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Get the session_id from the suggestion (should be stored when suggestion was created)
      const sessionId = suggestion.session_id

      if (!sessionId) {
        const { error } = await supabase
          .from('intelligence_suggestions')
          .update({
            status: 'rejected',
            final_value: { ...linkData, note: 'No session ID associated with this suggestion' }
          })
          .eq('id', suggestionId)

        if (error) throw error

        return new Response(JSON.stringify({
          success: false,
          action: 'rejected',
          message: 'No session ID associated with this suggestion'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Check if link already exists
      const { data: existingLink } = await supabase
        .from('session_quests')
        .select('id')
        .eq('session_id', sessionId)
        .eq('quest_id', quest.id)
        .maybeSingle()

      if (existingLink) {
        // Link already exists - update progress type if different
        const { error } = await supabase
          .from('session_quests')
          .update({ progress_type: linkData.progress_type })
          .eq('id', existingLink.id)

        if (error) throw error

        // Mark suggestion as applied
        await supabase
          .from('intelligence_suggestions')
          .update({
            status: 'applied',
            final_value: { ...linkData, session_quest_id: existingLink.id, note: 'Updated existing link' }
          })
          .eq('id', suggestionId)

        return new Response(JSON.stringify({
          success: true,
          action: 'applied',
          message: 'Session-quest link updated',
          sessionQuestId: existingLink.id
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Create new session_quest link
      const { data: newLink, error: linkError } = await supabase
        .from('session_quests')
        .insert({
          session_id: sessionId,
          quest_id: quest.id,
          progress_type: linkData.progress_type,
        })
        .select('id')
        .single()

      if (linkError) throw linkError

      // Mark suggestion as applied
      const { error } = await supabase
        .from('intelligence_suggestions')
        .update({
          status: 'applied',
          final_value: { ...linkData, session_quest_id: newLink.id }
        })
        .eq('id', suggestionId)

      if (error) throw error

      return new Response(JSON.stringify({
        success: true,
        action: 'applied',
        message: 'Session-quest link created',
        sessionQuestId: newLink.id
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Handle item_detected suggestions - store as timeline event with item details
    // Items don't have their own table yet, so we record them as informational suggestions
    if (suggestion.suggestion_type === 'item_detected') {
      const itemData = (finalValue ?? suggestion.suggested_value) as {
        name: string
        item_type?: string
        rarity?: string
        description?: string
        owner_name?: string
        location_name?: string
      }

      // Look up owner character if specified
      let ownerId: string | null = null
      if (itemData.owner_name) {
        const { data: owner } = await supabase
          .from('characters')
          .select('id')
          .eq('campaign_id', suggestion.campaign_id)
          .ilike('name', itemData.owner_name)
          .maybeSingle()

        ownerId = owner?.id || null
      }

      // Look up location if specified
      let locationId: string | null = null
      if (itemData.location_name) {
        const { data: location } = await supabase
          .from('locations')
          .select('id')
          .eq('campaign_id', suggestion.campaign_id)
          .ilike('name', itemData.location_name)
          .maybeSingle()

        locationId = location?.id || null
      }

      // Create a timeline event for the item acquisition/discovery
      const { data: newEvent, error: eventError } = await supabase
        .from('timeline_events')
        .insert({
          campaign_id: suggestion.campaign_id,
          title: `Item: ${itemData.name}`,
          description: [
            itemData.description,
            itemData.item_type ? `Type: ${itemData.item_type}` : null,
            itemData.rarity ? `Rarity: ${itemData.rarity}` : null,
            itemData.owner_name ? `Owner: ${itemData.owner_name}` : null,
            itemData.location_name ? `Location: ${itemData.location_name}` : null,
          ].filter(Boolean).join('\n'),
          event_type: 'discovery',
          event_date: new Date().toISOString().split('T')[0],
          character_id: ownerId,
          location: itemData.location_name || null,
          is_major: itemData.rarity === 'legendary' || itemData.rarity === 'artifact',
        })
        .select('id')
        .single()

      if (eventError) throw eventError

      // Mark suggestion as applied
      const { error } = await supabase
        .from('intelligence_suggestions')
        .update({
          status: 'applied',
          final_value: { ...itemData, timeline_event_id: newEvent.id, owner_id: ownerId, location_id: locationId }
        })
        .eq('id', suggestionId)

      if (error) throw error

      return new Response(JSON.stringify({
        success: true,
        action: 'applied',
        message: 'Item recorded as timeline event',
        timelineEventId: newEvent.id
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Handle combat_outcome suggestions - update character status and create timeline event
    if (suggestion.suggestion_type === 'combat_outcome') {
      const combatData = (finalValue ?? suggestion.suggested_value) as {
        outcome_type: string
        character_name?: string
        description?: string
        is_pc?: boolean
      }

      // Look up the affected character
      let characterId: string | null = null
      if (combatData.character_name) {
        const { data: character } = await supabase
          .from('characters')
          .select('id')
          .eq('campaign_id', suggestion.campaign_id)
          .ilike('name', combatData.character_name)
          .maybeSingle()

        characterId = character?.id || null

        // If death or injury, update character status
        if (character && (combatData.outcome_type === 'death' || combatData.outcome_type === 'injury')) {
          const newStatus = combatData.outcome_type === 'death' ? 'dead' : 'injured'
          await supabase
            .from('characters')
            .update({ status: newStatus })
            .eq('id', character.id)
        }
      }

      // Create a timeline event for the combat outcome
      const eventType = combatData.outcome_type === 'death' ? 'death' : 'combat'
      const { data: newEvent, error: eventError } = await supabase
        .from('timeline_events')
        .insert({
          campaign_id: suggestion.campaign_id,
          title: `${combatData.outcome_type.charAt(0).toUpperCase() + combatData.outcome_type.slice(1)}${combatData.character_name ? `: ${combatData.character_name}` : ''}`,
          description: combatData.description || `Combat outcome: ${combatData.outcome_type}`,
          event_type: eventType,
          event_date: new Date().toISOString().split('T')[0],
          character_id: characterId,
          is_major: combatData.outcome_type === 'death' || combatData.is_pc,
        })
        .select('id')
        .single()

      if (eventError) throw eventError

      // Mark suggestion as applied
      const { error } = await supabase
        .from('intelligence_suggestions')
        .update({
          status: 'applied',
          final_value: { ...combatData, timeline_event_id: newEvent.id, character_id: characterId }
        })
        .eq('id', suggestionId)

      if (error) throw error

      return new Response(JSON.stringify({
        success: true,
        action: 'applied',
        message: `Combat outcome recorded${characterId ? ' and character status updated' : ''}`,
        timelineEventId: newEvent.id
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!suggestion.character_id) {
      // New character suggestion - just mark as applied for now
      // TODO: Could auto-create the character
      const { error } = await supabase
        .from('intelligence_suggestions')
        .update({
          status: 'applied',
          final_value: finalValue ?? suggestion.suggested_value
        })
        .eq('id', suggestionId)

      if (error) throw error

      return new Response(JSON.stringify({
        success: true,
        action: 'applied',
        message: 'Suggestion marked as applied (new character)'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get current character data
    const { data: character } = await supabase
      .from('characters')
      .select('*')
      .eq('id', suggestion.character_id)
      .single()

    if (!character) {
      return new Response(JSON.stringify({ error: 'Character not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Apply the update based on suggestion type
    const valueToApply = finalValue ?? suggestion.suggested_value
    const fieldName = suggestion.field_name

    // Handle different field types
    let updateData: Record<string, unknown> = {}

    if (fieldName === 'status') {
      // Status is a direct string field
      updateData = { status: typeof valueToApply === 'object' && valueToApply !== null && 'status' in valueToApply
        ? (valueToApply as { status: string }).status
        : valueToApply }
    } else if (['story_hooks', 'important_people', 'quotes'].includes(fieldName)) {
      // Array fields - append to existing
      const currentArray = (character[fieldName as keyof typeof character] as unknown[]) || []
      updateData = { [fieldName]: [...currentArray, valueToApply] }
    } else if (fieldName === 'secrets' || fieldName === 'notes') {
      // Text fields - append
      const currentText = (character[fieldName as keyof typeof character] as string) || ''
      const newText = typeof valueToApply === 'string' ? valueToApply : JSON.stringify(valueToApply)
      updateData = { [fieldName]: currentText ? `${currentText}\n\n${newText}` : newText }
    } else {
      // Direct update for other fields
      updateData = { [fieldName]: valueToApply }
    }

    // Update the character
    const { error: updateError } = await supabase
      .from('characters')
      .update(updateData)
      .eq('id', suggestion.character_id)

    if (updateError) throw updateError

    // Mark suggestion as applied
    const { error: statusError } = await supabase
      .from('intelligence_suggestions')
      .update({
        status: 'applied',
        final_value: valueToApply,
        current_value: character[fieldName as keyof typeof character] ?? null
      })
      .eq('id', suggestionId)

    if (statusError) throw statusError

    return new Response(JSON.stringify({
      success: true,
      action: 'applied',
      characterId: suggestion.character_id,
      field: fieldName,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Update suggestion error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to update suggestion',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// DELETE /api/ai/suggestions - Delete a suggestion
export async function DELETE(req: Request) {
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

    // Tier check - only standard and premium tiers can use AI
    const { data: settings } = await supabase
      .from('user_settings')
      .select('tier')
      .eq('user_id', user.id)
      .single()
    if ((settings?.tier || 'free') === 'free') {
      return new Response(JSON.stringify({ error: 'AI features require a paid plan' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
    }

    // Delete with ownership check via RLS
    const { error } = await supabase
      .from('intelligence_suggestions')
      .delete()
      .eq('id', suggestionId)

    if (error) throw error

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Delete suggestion error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to delete suggestion',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
