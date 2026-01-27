import { generateText } from 'ai'
import { getAIModel, AI_PROMPTS, AIProvider, AI_PROVIDERS } from '@/lib/ai/config'
import { createClient } from '@/lib/supabase/server'
import { SuggestionType, ConfidenceLevel, UserTier } from '@/types/database'
import { recordAPIUsage } from '@/lib/api-usage'
import { checkCooldown, setCooldown } from '@/lib/ai/cooldowns'

export const maxDuration = 300 // Vercel Pro plan allows up to 300 seconds

interface GeneratedSuggestion {
  suggestion_type: SuggestionType
  character_name: string | null  // null for timeline_event suggestions
  field_name: string
  suggested_value: unknown
  source_excerpt: string
  source_type?: 'session' | 'character' | 'relationship'
  source_id?: string
  ai_reasoning: string
  confidence: ConfidenceLevel
}

interface AnalyzeCampaignRequest {
  campaignId: string
  provider?: AIProvider
}

export async function POST(req: Request) {
  try {
    const { campaignId, provider } = await req.json() as AnalyzeCampaignRequest

    if (!campaignId) {
      return new Response(JSON.stringify({ error: 'Campaign ID is required' }), {
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

    // Tier and role check
    const { data: settings } = await supabase
      .from('user_settings')
      .select('tier, role')
      .eq('user_id', user.id)
      .single()
    const userTier = (settings?.tier || 'free') as UserTier | 'free'
    const userRole = settings?.role || 'user'
    const isModOrAbove = userRole === 'moderator' || userRole === 'super_admin'

    if (userTier === 'free' && !isModOrAbove) {
      return new Response(JSON.stringify({ error: 'AI features require a paid plan' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
    }

    // Check cooldown before proceeding with expensive operations
    // Mods and above bypass cooldown
    if (!isModOrAbove) {
      const cooldownStatus = await checkCooldown(user.id, 'campaign_intelligence', campaignId)
      if (cooldownStatus.isOnCooldown) {
        return new Response(JSON.stringify({
          error: 'Intelligence is on cooldown',
          cooldown: {
            availableAt: cooldownStatus.availableAt?.toISOString(),
            remainingMs: cooldownStatus.remainingMs,
            remainingFormatted: cooldownStatus.remainingFormatted,
          },
          message: `Campaign Intelligence is on cooldown. Available again in ${cooldownStatus.remainingFormatted}.`
        }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

    // Load campaign with last intelligence run time
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, user_id, last_intelligence_run, created_at')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign || campaign.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Campaign not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Use last run time or campaign creation if never run
    const lastRunTime = campaign.last_intelligence_run || campaign.created_at

    // Load ALL characters (for full context)
    const { data: allCharacters } = await supabase
      .from('characters')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('type', { ascending: true })
      .order('name')

    // Load characters updated since last run
    const { data: updatedCharacters } = await supabase
      .from('characters')
      .select('*')
      .eq('campaign_id', campaignId)
      .gt('updated_at', lastRunTime)
      .order('updated_at', { ascending: false })

    // Load sessions updated since last run
    const { data: updatedSessions } = await supabase
      .from('sessions')
      .select('*')
      .eq('campaign_id', campaignId)
      .gt('updated_at', lastRunTime)
      .order('session_number', { ascending: true })

    // Load ALL canvas relationships for context (new relationship system)
    const { data: canvasRelationships } = await supabase
      .from('canvas_relationships')
      .select(`
        id,
        from_character_id,
        to_character_id,
        custom_label,
        description,
        is_known_to_party,
        status,
        template:relationship_templates(name, category, relationship_mode)
      `)
      .eq('campaign_id', campaignId)
      .eq('is_primary', true)

    // Load faction memberships for all characters
    const characterIds = (allCharacters || []).map(c => c.id)
    const { data: factionMemberships } = characterIds.length > 0
      ? await supabase
          .from('faction_memberships')
          .select(`
            character_id,
            role,
            title,
            is_public,
            faction:campaign_factions(id, name, faction_type, status)
          `)
          .in('character_id', characterIds)
          .eq('is_active', true)
      : { data: [] }

    // Load campaign factions
    const { data: campaignFactions } = await supabase
      .from('campaign_factions')
      .select('id, name, description, faction_type, status, is_known_to_party')
      .eq('campaign_id', campaignId)

    // Load character labels/tags
    const { data: characterTags } = characterIds.length > 0
      ? await supabase
          .from('character_tags')
          .select(`
            character_id,
            tag:tags(name, color, category, description)
          `)
          .in('character_id', characterIds)
      : { data: [] }

    // Load ALL timeline events for context (so AI doesn't suggest duplicates)
    const { data: timelineEvents } = await supabase
      .from('timeline_events')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('event_date', { ascending: true })

    // Load ALL locations for context (so AI doesn't suggest duplicates)
    const { data: existingLocations } = await supabase
      .from('locations')
      .select('id, name, location_type, parent_id, description')
      .eq('campaign_id', campaignId)
      .order('name')

    // Load ALL quests for context (so AI doesn't suggest duplicates)
    const { data: existingQuests } = await supabase
      .from('quests')
      .select('id, name, type, status, description, quest_giver_id, objective_location_id')
      .eq('campaign_id', campaignId)
      .order('name')

    // Load ALL encounters for context (so AI doesn't suggest duplicates)
    const { data: existingEncounters } = await supabase
      .from('encounters')
      .select('id, name, type, status, description, difficulty, location_id, quest_id')
      .eq('campaign_id', campaignId)
      .order('name')

    // Load recent corrections (suggestions that were edited before applying) to learn from user preferences
    const { data: recentCorrections } = await supabase
      .from('intelligence_suggestions')
      .select('suggestion_type, suggested_value, final_value')
      .eq('campaign_id', campaignId)
      .eq('status', 'applied')
      .not('final_value->_correction_metadata', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20)

    // Check if there's anything new to analyze
    const hasNewContent = (updatedSessions?.length ?? 0) > 0 ||
                         (updatedCharacters?.length ?? 0) > 0

    if (!hasNewContent) {
      return new Response(JSON.stringify({
        success: true,
        suggestions: [],
        message: 'No new content since last analysis',
        lastRunTime,
        stats: {
          sessionsAnalyzed: 0,
          charactersUpdated: 0,
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Build comprehensive context for ALL characters
    const fullCharacterContext = (allCharacters || []).map(c => {
      const parts = [
        `### ${c.name} (${c.type.toUpperCase()})`,
        `- Status: ${c.status || 'alive'}`,
      ]
      if (c.race) parts.push(`- Race: ${c.race}`)
      if (c.class) parts.push(`- Class: ${c.class}`)
      if (c.summary) parts.push(`- Summary: ${c.summary}`)
      if (c.goals) parts.push(`- Goals: ${c.goals}`)
      if (c.secrets) parts.push(`- Known Secrets (DM): ${c.secrets}`)

      // Add faction memberships
      const charFactions = (factionMemberships || []).filter((fm: any) => fm.character_id === c.id)
      if (charFactions.length > 0) {
        const factionInfo = charFactions.map((fm: any) => {
          const faction = fm.faction as any
          let info = faction?.name || 'Unknown Faction'
          if (fm.title) info += ` (${fm.title})`
          if (fm.role) info += ` - ${fm.role}`
          if (!fm.is_public) info += ' [SECRET]'
          return info
        }).join('; ')
        parts.push(`- Faction Memberships: ${factionInfo}`)
      }

      // Add labels/tags
      const charTags = (characterTags || []).filter((ct: any) => ct.character_id === c.id)
      if (charTags.length > 0) {
        const tagNames = charTags
          .map((ct: any) => ct.tag?.name)
          .filter(Boolean)
          .join(', ')
        if (tagNames) {
          parts.push(`- Labels: ${tagNames}`)
        }
      }

      const storyHooks = c.story_hooks as Array<{ hook: string; notes?: string }> | string[] | null
      if (storyHooks && storyHooks.length > 0) {
        const hooks = Array.isArray(storyHooks)
          ? storyHooks.map(h => typeof h === 'string' ? h : h.hook)
          : []
        if (hooks.length > 0) {
          parts.push(`- Story Hooks: ${hooks.join('; ')}`)
        }
      }

      const importantPeople = c.important_people as Array<{ name: string; relationship: string; notes?: string }> | string[] | null
      if (importantPeople && importantPeople.length > 0) {
        const people = Array.isArray(importantPeople)
          ? importantPeople.map(p => typeof p === 'string' ? p : `${p.name} (${p.relationship})`)
          : []
        if (people.length > 0) {
          parts.push(`- Important People: ${people.join('; ')}`)
        }
      }

      const quotes = c.quotes as string[] | null
      if (quotes && quotes.length > 0) {
        parts.push(`- Known Quotes: ${quotes.length} recorded`)
      }

      return parts.join('\n')
    }).join('\n\n')

    // Build relationship context from canvas relationships
    const relationshipContext = (canvasRelationships || []).map((r: any) => {
      const char1 = allCharacters?.find(c => c.id === r.from_character_id)
      const char2 = allCharacters?.find(c => c.id === r.to_character_id)
      if (char1 && char2) {
        const template = r.template as any
        const label = r.custom_label || template?.name || 'Related'
        const category = template?.category ? ` [${template.category}]` : ''
        const visibility = !r.is_known_to_party ? ' [SECRET]' : ''
        const status = r.status && r.status !== 'active' ? ` (${r.status})` : ''
        let line = `${char1.name} → ${char2.name}: ${label}${category}${status}${visibility}`
        if (r.description) line += ` - "${r.description}"`
        return line
      }
      return null
    }).filter(Boolean).join('\n')

    // Build factions context
    const factionsContext = (campaignFactions || []).map((f: any) => {
      const visibility = !f.is_known_to_party ? ' [SECRET]' : ''
      const memberCount = (factionMemberships || []).filter((fm: any) => (fm.faction as any)?.id === f.id).length
      return `- ${f.name} (${f.faction_type || 'organization'}, ${f.status || 'active'})${visibility}: ${memberCount} members${f.description ? ` - ${f.description}` : ''}`
    }).join('\n')

    // Build timeline context (so AI can avoid duplicates)
    const timelineContext = (timelineEvents || []).map(e => {
      const charNames = e.character_ids?.map((id: string) =>
        allCharacters?.find(c => c.id === id)?.name
      ).filter(Boolean).join(', ')
      return `- ${e.event_date || 'Unknown date'}: ${e.title} (${e.event_type})${charNames ? ` - Involving: ${charNames}` : ''}`
    }).join('\n')

    // Build locations context (so AI can avoid duplicates and suggest hierarchy)
    const locationsContext = (existingLocations || []).map(loc => {
      const parent = loc.parent_id ? existingLocations?.find(l => l.id === loc.parent_id) : null
      const parentInfo = parent ? ` (in ${parent.name})` : ''
      return `- ${loc.name} [${loc.location_type}]${parentInfo}`
    }).join('\n')

    // Build quests context (so AI can avoid duplicates)
    const questsContext = (existingQuests || []).map(quest => {
      const questGiver = quest.quest_giver_id
        ? allCharacters?.find(c => c.id === quest.quest_giver_id)?.name
        : null
      const giverInfo = questGiver ? ` from ${questGiver}` : ''
      return `- ${quest.name} [${quest.type}, ${quest.status}]${giverInfo}`
    }).join('\n')

    // Build encounters context (so AI can avoid duplicates)
    const encountersContext = (existingEncounters || []).map(encounter => {
      const location = encounter.location_id
        ? existingLocations?.find(l => l.id === encounter.location_id)?.name
        : null
      const locationInfo = location ? ` at ${location}` : ''
      const difficultyInfo = encounter.difficulty ? ` (${encounter.difficulty})` : ''
      return `- ${encounter.name} [${encounter.type}, ${encounter.status}]${difficultyInfo}${locationInfo}`
    }).join('\n')

    // Build corrections context (to learn from user preferences)
    type CorrectionMetadata = {
      was_edited: boolean
      suggestion_type: string
      corrections: Array<{ field: string; original: unknown; corrected: unknown }>
    }
    const correctionsContext = (recentCorrections || [])
      .filter(c => c.final_value && (c.final_value as { _correction_metadata?: CorrectionMetadata })._correction_metadata?.was_edited)
      .map(c => {
        const meta = (c.final_value as { _correction_metadata: CorrectionMetadata })._correction_metadata
        const corrections = meta.corrections.map(corr => {
          const origStr = typeof corr.original === 'string' ? corr.original : JSON.stringify(corr.original)
          const newStr = typeof corr.corrected === 'string' ? corr.corrected : JSON.stringify(corr.corrected)
          return `  - "${corr.field}": "${origStr}" → "${newStr}"`
        }).join('\n')
        return `- Type: ${meta.suggestion_type}\n${corrections}`
      }).join('\n\n')

    // Build NEW content to analyze
    const newSessionContent = (updatedSessions || []).map(s => {
      return `## Session ${s.session_number}: ${s.title || 'Untitled'}
Date: ${s.date || 'Unknown'}
${s.summary ? `Summary: ${s.summary}` : ''}

Notes:
${s.notes || 'No notes'}`
    }).join('\n\n---\n\n')

    const newCharacterContent = (updatedCharacters || []).map(c => {
      return `## Character Updated: ${c.name} (${c.type.toUpperCase()})
Updated fields may include new backstory, notes, or other details.
Current state: ${c.summary || c.description || 'No summary'}`
    }).join('\n\n')

    // Construct the full prompt
    const timelineIsEmpty = !timelineEvents || timelineEvents.length === 0
    const fullContext = `# Campaign: ${campaign.name}
# Analysis Since: ${new Date(lastRunTime).toLocaleDateString()}

## ALL EXISTING CHARACTERS (for context and cross-referencing)
${fullCharacterContext || 'No characters recorded yet.'}

## FACTIONS & ORGANIZATIONS (${campaignFactions?.length || 0} factions)
${factionsContext || 'No factions recorded.'}

## CHARACTER RELATIONSHIPS (${canvasRelationships?.length || 0} relationships)
${relationshipContext || 'No relationships recorded.'}

## EXISTING TIMELINE EVENTS (${timelineEvents?.length || 0} events)
${timelineContext || 'No timeline events recorded yet.'}
${timelineIsEmpty ? '\n⚠️ THE TIMELINE IS EMPTY - Please suggest significant events from the session notes that should be added to build out the campaign timeline.' : ''}

## EXISTING LOCATIONS (${existingLocations?.length || 0} locations)
${locationsContext || 'No locations recorded yet.'}
${!existingLocations?.length ? '\n⚠️ NO LOCATIONS RECORDED - Please extract all locations mentioned in session notes (cities, towns, taverns, dungeons, regions, etc.).' : ''}

## EXISTING QUESTS (${existingQuests?.length || 0} quests)
${questsContext || 'No quests recorded yet.'}
${!existingQuests?.length ? '\n⚠️ NO QUESTS RECORDED - Please extract all quests, missions, tasks, and objectives mentioned in session notes (explicit requests, promises, rumors, character goals, etc.).' : ''}

## EXISTING ENCOUNTERS (${existingEncounters?.length || 0} encounters)
${encountersContext || 'No encounters recorded yet.'}
${correctionsContext ? `

## LEARNED CORRECTIONS (User Preferences)
The following corrections were made by the user to previous suggestions. Learn from these patterns and apply similar naming conventions, formatting, or preferences in your new suggestions:

${correctionsContext}

⚠️ IMPORTANT: When making similar suggestions, follow the user's preferred patterns shown above. For example, if they consistently change "The Thieves Guild" to "Shadow Thieves", use "Shadow Thieves" in your suggestions.` : ''}

---

# NEW CONTENT TO ANALYZE

## NEW/UPDATED SESSIONS (${updatedSessions?.length || 0})
${newSessionContent || 'No new sessions.'}

## RECENTLY UPDATED CHARACTERS (${updatedCharacters?.length || 0})
${newCharacterContent || 'No character updates.'}

---

IMPORTANT INSTRUCTIONS:
1. Analyze ALL new content above for character updates, status changes, new relationships, quotes, story hooks, etc.
2. Cross-reference with existing character data - don't suggest duplicates
3. For EACH suggestion, cite the exact source text
4. Consider connections between characters mentioned in sessions
5. Look for status changes (dead, missing, corrupted, etc.)
6. Extract memorable quotes from session notes
7. NPCs: Identify new NPCs that should be added as characters. Use suggestion_type "npc_detected" with suggested_value containing: name, description (role/title/purpose), race if mentioned, class if mentioned, location_name if they're associated with a place, faction_name if they belong to an organization. ${!allCharacters?.length ? 'NO CHARACTERS EXIST YET - extract all NPCs from sessions.' : 'Check existing characters above to avoid duplicates.'}
8. Note any revealed secrets or plot developments
9. RELATIONSHIPS: For new or changed relationships between characters, use suggestion_type "relationship" with suggested_value containing: from_character_name, to_character_name, relationship_type (e.g., "ally", "enemy", "family", "employer", "rival", "friend", "mentor"), description of the relationship, is_known_to_party (boolean). Check existing relationships to avoid duplicates.
10. FACTIONS: Extract organizations, guilds, groups, governments, cults, or any named factions mentioned. Use suggestion_type "faction_detected" with suggested_value containing: name, faction_type (guild, kingdom, military, criminal, religious, merchant, academic, family, cult, other), description, is_known_to_party (boolean), hq_location_name if mentioned. ${!campaignFactions?.length ? 'NO FACTIONS EXIST YET - extract all organizations from sessions.' : 'Check existing factions above to avoid duplicates.'}
11. TIMELINE EVENTS: Suggest significant events for the timeline (battles, discoveries, deaths, alliances, quest milestones). ${timelineIsEmpty ? 'The timeline is currently EMPTY so please suggest key events from the sessions to populate it.' : 'Check existing timeline events above to avoid duplicates.'}
12. LOCATIONS: Extract ALL places mentioned in session notes - cities, towns, villages, taverns, dungeons, temples, regions, landmarks, camps, buildings, etc. ${!existingLocations?.length ? 'NO LOCATIONS EXIST YET - please extract all locations from the session history.' : 'Check existing locations above to avoid duplicates.'} Include location_type and parent_location_name if nested (e.g., a tavern inside a city).
13. QUESTS: Extract ALL quests, missions, tasks, and objectives from session notes - explicit requests from NPCs, promises the party made, rumors heard, character-driven goals, plot threads. ${!existingQuests?.length ? 'NO QUESTS EXIST YET - please extract all quests from the session history.' : 'Check existing quests above to avoid duplicates.'} Include quest_type (main_quest, side_quest, personal, faction, plot_thread, rumor), status (available or active), quest_giver_name if known, and location_name if a destination is mentioned.
14. ENCOUNTERS: Extract combat encounters, social encounters, exploration encounters, traps, puzzles, and skill challenges from session notes. ${!existingEncounters?.length ? 'NO ENCOUNTERS EXIST YET - please extract all encounters from the session history.' : 'Check existing encounters above to avoid duplicates.'} Include encounter_type (combat, social, exploration, trap, skill_challenge, puzzle, mixed), status (used if it happened, prepared if mentioned for future), difficulty if discernible (trivial, easy, medium, hard, deadly), location_name if known, and quest_name if tied to a quest.
15. ITEMS/LOOT: Extract significant items mentioned in session notes - magic items, artifacts, special equipment, quest items, treasure, keys, maps, and notable mundane items. Use suggestion_type "item_detected" with suggested_value containing: name, item_type (weapon, armor, potion, scroll, wondrous_item, artifact, treasure, quest_item, key, map, tool, other), rarity (common, uncommon, rare, very_rare, legendary, artifact) if discernible, description, owner_name if someone possesses it, location_name if found somewhere. Only suggest items that are noteworthy to the story - not every copper piece.
16. COMBAT OUTCOMES: Extract significant combat results - deaths, injuries, near-death experiences, victories, defeats, surrenders, escapes. Use suggestion_type "combat_outcome" with suggested_value containing: outcome_type (death, injury, near_death, victory, defeat, surrender, escape, capture), character_name (who was affected), description (what happened), is_pc (boolean, true if a player character). Track PC deaths and significant NPC deaths especially.

SESSION CHRONOLOGY NOTE: Sessions are numbered chronologically. Higher session numbers = more recent events. If there are conflicts between sessions, the higher-numbered session represents the current truth. For example, if a location is called "The Old Mill" in session 2 but "The Abandoned Mill" in session 8, use the session 8 name.`

    const selectedProvider = provider || 'anthropic'
    const model = getAIModel(selectedProvider)

    let result
    const startTime = Date.now()
    try {
      result = await generateText({
        model,
        system: AI_PROMPTS.analyzeSession, // Reuse the same prompt structure
        prompt: fullContext,
      })

      // Record API usage
      const elapsed = Date.now() - startTime
      await recordAPIUsage({
        provider: selectedProvider,
        model: AI_PROVIDERS[selectedProvider]?.model || 'unknown',
        endpoint: '/api/ai/analyze-campaign',
        operation_type: 'analyze_campaign',
        input_tokens: result.usage?.inputTokens || 0,
        output_tokens: result.usage?.outputTokens || 0,
        campaign_id: campaignId,
        response_time_ms: elapsed,
        success: true,
        user_id: user.id,
      })
    } catch (aiError) {
      console.error('AI generation error:', aiError)
      // Record failed API usage
      await recordAPIUsage({
        provider: selectedProvider,
        model: AI_PROVIDERS[selectedProvider]?.model || 'unknown',
        endpoint: '/api/ai/analyze-campaign',
        operation_type: 'analyze_campaign',
        response_time_ms: Date.now() - startTime,
        success: false,
        error_message: aiError instanceof Error ? aiError.message : 'Unknown error',
        user_id: user.id,
      })
      return new Response(JSON.stringify({
        error: 'AI model failed to generate response',
        details: aiError instanceof Error ? aiError.message : 'Unknown AI error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Parse the JSON response
    let suggestions: GeneratedSuggestion[] = []
    try {
      let jsonText = result.text

      // Check if response looks like an error
      if (jsonText.toLowerCase().startsWith('an error') || jsonText.toLowerCase().startsWith('i ') || !jsonText.includes('{')) {
        console.error('AI returned non-JSON response:', jsonText.slice(0, 200))
        return new Response(JSON.stringify({
          error: 'AI returned an invalid response',
          details: 'The AI model did not return valid JSON. This may be a temporary issue.',
          raw: jsonText.slice(0, 500)
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      // Handle potential markdown code blocks
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim()
      }

      // Try to extract JSON if it's mixed with other text
      const jsonStartIndex = jsonText.indexOf('{')
      const jsonEndIndex = jsonText.lastIndexOf('}')
      if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
        jsonText = jsonText.slice(jsonStartIndex, jsonEndIndex + 1)
      }

      const parsed = JSON.parse(jsonText)
      suggestions = parsed.suggestions || []
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      console.error('Raw response:', result.text?.slice(0, 500))
      return new Response(JSON.stringify({
        error: 'Failed to parse AI response',
        details: parseError instanceof Error ? parseError.message : 'JSON parse error',
        raw: result.text?.slice(0, 500)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Map character names to IDs and prepare for database insertion
    const suggestionsToInsert = suggestions.map(suggestion => {
      // For timeline events, character_name may be null
      const characterName = suggestion.character_name
      const character = characterName ? allCharacters?.find(c =>
        c.name.toLowerCase() === characterName.toLowerCase() ||
        c.name.toLowerCase().includes(characterName.toLowerCase()) ||
        characterName.toLowerCase().includes(c.name.toLowerCase())
      ) : null

      // Get current value for the field (only for character-related suggestions)
      let currentValue: unknown = null
      if (character && suggestion.field_name && suggestion.suggestion_type !== 'timeline_event') {
        const fieldName = suggestion.field_name as keyof typeof character
        currentValue = character[fieldName] ?? null
      }

      return {
        campaign_id: campaignId,
        character_id: character?.id || null,
        character_name: suggestion.character_name || null,
        suggestion_type: suggestion.suggestion_type,
        field_name: suggestion.field_name,
        current_value: currentValue,
        suggested_value: suggestion.suggested_value,
        source_excerpt: suggestion.source_excerpt,
        ai_reasoning: suggestion.ai_reasoning,
        confidence: suggestion.confidence,
        status: 'pending' as const,
      }
    })

    // Insert suggestions into database
    let insertedCount = 0
    if (suggestionsToInsert.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('intelligence_suggestions')
        .insert(suggestionsToInsert)
        .select('id')

      if (insertError) {
        console.error('Failed to insert suggestions:', insertError)
        // Don't fail the whole request, just log it
      } else {
        insertedCount = inserted?.length || 0
      }
    }

    // Update last intelligence run timestamp
    await supabase
      .from('campaigns')
      .update({ last_intelligence_run: new Date().toISOString() })
      .eq('id', campaignId)

    // Set cooldown after successful analysis (skip for mods+)
    if (!isModOrAbove) {
      await setCooldown(user.id, 'campaign_intelligence', userTier as UserTier, campaignId)
    }

    return new Response(JSON.stringify({
      success: true,
      suggestionsCreated: insertedCount,
      analyzedSince: lastRunTime,
      stats: {
        sessionsAnalyzed: updatedSessions?.length || 0,
        charactersUpdated: updatedCharacters?.length || 0,
        totalCharacters: allCharacters?.length || 0,
        totalRelationships: canvasRelationships?.length || 0,
        totalFactions: campaignFactions?.length || 0,
        totalFactionMemberships: factionMemberships?.length || 0,
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Campaign analysis error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to analyze campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
