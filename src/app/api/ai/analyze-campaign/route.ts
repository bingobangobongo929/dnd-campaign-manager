import { generateText } from 'ai'
import { getAIModel, AI_PROMPTS, AIProvider } from '@/lib/ai/config'
import { createClient } from '@/lib/supabase/server'
import { SuggestionType, ConfidenceLevel } from '@/types/database'

export const runtime = 'edge'
export const maxDuration = 300 // 5 minutes for large campaigns

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

    // Build concise context for characters (limit to essential info to reduce tokens)
    const fullCharacterContext = (allCharacters || []).slice(0, 50).map(c => {
      const parts = [
        `### ${c.name} (${c.type.toUpperCase()})`,
        `Status: ${c.status || 'alive'}`,
      ]
      if (c.race) parts.push(`Race: ${c.race}`)
      if (c.class) parts.push(`Class: ${c.class}`)
      if (c.summary) parts.push(`Summary: ${c.summary.slice(0, 200)}`)

      const storyHooks = c.story_hooks as Array<{ hook: string; notes?: string }> | string[] | null
      if (storyHooks && storyHooks.length > 0) {
        const hooks = Array.isArray(storyHooks)
          ? storyHooks.slice(0, 3).map(h => typeof h === 'string' ? h : h.hook)
          : []
        if (hooks.length > 0) {
          parts.push(`Hooks: ${hooks.join('; ')}`)
        }
      }

      return parts.join(' | ')
    }).join('\n')

    // Build relationship context
    const relationshipContext = (relationships || []).map(r => {
      const char1 = allCharacters?.find(c => c.id === r.character_id)
      const char2 = allCharacters?.find(c => c.id === r.related_character_id)
      if (char1 && char2) {
        return `${char1.name} → ${char2.name}: ${r.relationship_label || r.relationship_type}`
      }
      return null
    }).filter(Boolean).join('\n')

    // Build NEW content to analyze (limit session notes to prevent timeout)
    const sessionsToAnalyze = (updatedSessions || []).slice(0, 10) // Max 10 sessions at a time
    const newSessionContent = sessionsToAnalyze.map(s => {
      const notes = s.notes || ''
      const truncatedNotes = notes.length > 3000 ? notes.slice(0, 3000) + '... [truncated]' : notes
      return `## Session ${s.session_number}: ${s.title || 'Untitled'}
${s.summary ? `Summary: ${s.summary}` : ''}
Notes: ${truncatedNotes}`
    }).join('\n\n---\n\n')

    const newCharacterContent = (updatedCharacters || []).slice(0, 20).map(c => {
      return `## ${c.name} (${c.type.toUpperCase()}) - Updated
${c.summary || c.description || 'No summary'}`
    }).join('\n\n')

    // Construct the full prompt (optimized for token efficiency)
    const fullContext = `# Campaign: ${campaign.name}

## EXISTING CHARACTERS
${fullCharacterContext || 'None.'}

## RELATIONSHIPS
${relationshipContext || 'None.'}

---

# NEW CONTENT TO ANALYZE

## SESSIONS (${sessionsToAnalyze.length})
${newSessionContent || 'None.'}

## CHARACTER UPDATES (${updatedCharacters?.length || 0})
${newCharacterContent || 'None.'}

---

Extract: status changes, secrets revealed, new NPCs, story hooks, quotes, relationships.
Cite exact source text for each suggestion.`

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

    // Map character names to IDs and include current values
    const suggestionsWithIds = suggestions.map(suggestion => {
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
        ...suggestion,
        character_id: character?.id || null,
        current_value: currentValue,
        is_new_character: !character && suggestion.suggestion_type !== 'relationship',
      }
    })

    // Update last intelligence run timestamp
    await supabase
      .from('campaigns')
      .update({ last_intelligence_run: new Date().toISOString() })
      .eq('id', campaignId)

    return new Response(JSON.stringify({
      success: true,
      suggestions: suggestionsWithIds,
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
