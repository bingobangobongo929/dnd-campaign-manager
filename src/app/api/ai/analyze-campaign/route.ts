import { generateText } from 'ai'
import { getAIModel, AI_PROMPTS, AIProvider } from '@/lib/ai/config'
import { createClient } from '@/lib/supabase/server'
import { SuggestionType, ConfidenceLevel } from '@/types/database'

export const maxDuration = 300 // Vercel Pro plan allows up to 300 seconds

interface GeneratedSuggestion {
  suggestion_type: SuggestionType
  character_name: string
  field_name: string
  suggested_value: unknown
  source_excerpt: string
  source_type: 'session' | 'character' | 'relationship'
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

    // Load ALL relationships for context
    const { data: relationships } = await supabase
      .from('character_relationships')
      .select(`
        id,
        character_id,
        related_character_id,
        relationship_type,
        relationship_label,
        notes,
        updated_at
      `)
      .eq('campaign_id', campaignId)

    // Load ALL timeline events for context (so AI doesn't suggest duplicates)
    const { data: timelineEvents } = await supabase
      .from('timeline_events')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('event_date', { ascending: true })

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

    // Build relationship context
    const relationshipContext = (relationships || []).map(r => {
      const char1 = allCharacters?.find(c => c.id === r.character_id)
      const char2 = allCharacters?.find(c => c.id === r.related_character_id)
      if (char1 && char2) {
        return `${char1.name} → ${char2.name}: ${r.relationship_label || r.relationship_type}`
      }
      return null
    }).filter(Boolean).join('\n')

    // Build timeline context (so AI can avoid duplicates)
    const timelineContext = (timelineEvents || []).map(e => {
      const charNames = e.character_ids?.map((id: string) =>
        allCharacters?.find(c => c.id === id)?.name
      ).filter(Boolean).join(', ')
      return `- ${e.event_date || 'Unknown date'}: ${e.title} (${e.event_type})${charNames ? ` - Involving: ${charNames}` : ''}`
    }).join('\n')

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

## KNOWN RELATIONSHIPS
${relationshipContext || 'No relationships recorded.'}

## EXISTING TIMELINE EVENTS (${timelineEvents?.length || 0} events)
${timelineContext || 'No timeline events recorded yet.'}
${timelineIsEmpty ? '\n⚠️ THE TIMELINE IS EMPTY - Please suggest significant events from the session notes that should be added to build out the campaign timeline.' : ''}

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
7. Identify new NPCs that should be added
8. Note any revealed secrets or plot developments
9. TIMELINE EVENTS: Suggest significant events for the timeline (battles, discoveries, deaths, alliances, quest milestones). ${timelineIsEmpty ? 'The timeline is currently EMPTY so please suggest key events from the sessions to populate it.' : 'Check existing timeline events above to avoid duplicates.'}`

    const model = getAIModel(provider || 'anthropic')

    let result
    try {
      result = await generateText({
        model,
        system: AI_PROMPTS.analyzeSession, // Reuse the same prompt structure
        prompt: fullContext,
      })
    } catch (aiError) {
      console.error('AI generation error:', aiError)
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
      const character = allCharacters?.find(c =>
        c.name.toLowerCase() === suggestion.character_name.toLowerCase() ||
        c.name.toLowerCase().includes(suggestion.character_name.toLowerCase()) ||
        suggestion.character_name.toLowerCase().includes(c.name.toLowerCase())
      )

      // Get current value for the field
      let currentValue: unknown = null
      if (character && suggestion.field_name) {
        const fieldName = suggestion.field_name as keyof typeof character
        currentValue = character[fieldName] ?? null
      }

      return {
        campaign_id: campaignId,
        character_id: character?.id || null,
        character_name: suggestion.character_name,
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

    return new Response(JSON.stringify({
      success: true,
      suggestionsCreated: insertedCount,
      analyzedSince: lastRunTime,
      stats: {
        sessionsAnalyzed: updatedSessions?.length || 0,
        charactersUpdated: updatedCharacters?.length || 0,
        totalCharacters: allCharacters?.length || 0,
        totalRelationships: relationships?.length || 0,
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
