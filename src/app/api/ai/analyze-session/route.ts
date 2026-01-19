import { generateText } from 'ai'
import { getAIModel, AI_PROMPTS, AIProvider } from '@/lib/ai/config'
import { createClient } from '@/lib/supabase/server'
import { SuggestionType, ConfidenceLevel } from '@/types/database'

export const runtime = 'edge'
export const maxDuration = 60

interface GeneratedSuggestion {
  suggestion_type: SuggestionType
  character_name: string
  field_name: string
  suggested_value: unknown
  source_excerpt: string
  ai_reasoning: string
  confidence: ConfidenceLevel
}

interface AnalyzeRequest {
  campaignId: string
  sessionId: string
  provider?: AIProvider
}

export async function POST(req: Request) {
  try {
    const { campaignId, sessionId, provider } = await req.json() as AnalyzeRequest

    if (!campaignId || !sessionId) {
      return new Response(JSON.stringify({ error: 'Campaign ID and Session ID are required' }), {
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

    // Verify user owns this campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name, user_id')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign || campaign.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Campaign not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Load the target session
    const { data: targetSession, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('campaign_id', campaignId)
      .single()

    if (sessionError || !targetSession) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (!targetSession.notes || targetSession.notes.trim().length === 0) {
      return new Response(JSON.stringify({
        error: 'Session has no notes to analyze',
        suggestions: []
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Load all characters with full details
    const { data: characters } = await supabase
      .from('characters')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('type', { ascending: true }) // PCs first
      .order('name')

    // Load recent sessions for context (last 5 before this one)
    const { data: recentSessions } = await supabase
      .from('sessions')
      .select('id, title, session_number, summary, notes')
      .eq('campaign_id', campaignId)
      .lt('session_number', targetSession.session_number)
      .order('session_number', { ascending: false })
      .limit(5)

    // Load existing relationships
    const { data: relationships } = await supabase
      .from('character_relationships')
      .select(`
        id,
        character_id,
        related_character_id,
        relationship_type,
        relationship_label,
        notes
      `)
      .eq('campaign_id', campaignId)

    // Build comprehensive context
    const characterContext = (characters || []).map(c => {
      const parts = [
        `### ${c.name} (${c.type.toUpperCase()})`,
        `- Status: ${c.status || 'alive'}`,
      ]
      if (c.race) parts.push(`- Race: ${c.race}`)
      if (c.class) parts.push(`- Class: ${c.class}`)
      if (c.summary) parts.push(`- Summary: ${c.summary}`)
      if (c.goals) parts.push(`- Goals: ${c.goals}`)
      if (c.secrets) parts.push(`- Known Secrets (DM): ${c.secrets}`)

      const storyHooks = c.story_hooks as Array<{ hook: string; notes?: string }> | null
      if (storyHooks && storyHooks.length > 0) {
        parts.push(`- Story Hooks: ${storyHooks.map(h => h.hook).join('; ')}`)
      }

      const importantPeople = c.important_people as Array<{ name: string; relationship: string; notes?: string }> | null
      if (importantPeople && importantPeople.length > 0) {
        parts.push(`- Important People: ${importantPeople.map(p => `${p.name} (${p.relationship})`).join('; ')}`)
      }

      const quotes = c.quotes as string[] | null
      if (quotes && quotes.length > 0) {
        parts.push(`- Known Quotes: ${quotes.length} recorded`)
      }

      return parts.join('\n')
    }).join('\n\n')

    // Build relationship context
    const relationshipContext = (relationships || []).map(r => {
      const char1 = characters?.find(c => c.id === r.character_id)
      const char2 = characters?.find(c => c.id === r.related_character_id)
      if (char1 && char2) {
        return `${char1.name} → ${char2.name}: ${r.relationship_label || r.relationship_type}`
      }
      return null
    }).filter(Boolean).join('\n')

    // Build recent session context
    const sessionHistoryContext = (recentSessions || []).reverse().map(s => {
      const content = s.summary || (s.notes ? s.notes.slice(0, 500) + '...' : 'No notes')
      return `**Session ${s.session_number}: ${s.title || 'Untitled'}**\n${content}`
    }).join('\n\n---\n\n')

    // Construct the full prompt
    const fullContext = `# Campaign: ${campaign.name}

## EXISTING CHARACTERS (check before suggesting updates)
${characterContext || 'No characters recorded yet.'}

## KNOWN RELATIONSHIPS
${relationshipContext || 'No relationships recorded.'}

## RECENT SESSION HISTORY (for context)
${sessionHistoryContext || 'No previous sessions.'}

---

## SESSION TO ANALYZE
**Session ${targetSession.session_number}: ${targetSession.title || 'Untitled'}**
Date: ${targetSession.date || 'Unknown'}

### NOTES:
${targetSession.notes}

---

Analyze the above session notes and extract any character updates, status changes, revelations, new relationships, quotes, or story hook changes. Remember:
- ONLY extract what is EXPLICITLY stated
- ALWAYS quote the source text
- Check existing character data before suggesting - don't duplicate what's already recorded
- Focus on changes that occurred IN THIS SESSION`

    const model = getAIModel(provider || 'anthropic')

    const result = await generateText({
      model,
      system: AI_PROMPTS.analyzeSession,
      prompt: fullContext,
    })

    // Parse the JSON response
    let suggestions: GeneratedSuggestion[] = []
    try {
      let jsonText = result.text
      // Handle potential markdown code blocks
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim()
      }

      const parsed = JSON.parse(jsonText)
      suggestions = parsed.suggestions || []
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      return new Response(JSON.stringify({
        error: 'Failed to parse AI response',
        raw: result.text
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Map character names to IDs and include current values
    const suggestionsWithIds = suggestions.map(suggestion => {
      const character = characters?.find(c =>
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
      }
    })

    return new Response(JSON.stringify({
      success: true,
      suggestions: suggestionsWithIds,
      session: {
        id: targetSession.id,
        title: targetSession.title || `Session ${targetSession.session_number}`,
        session_number: targetSession.session_number,
      },
      stats: {
        charactersAnalyzed: characters?.length || 0,
        sessionsForContext: (recentSessions?.length || 0) + 1,
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Session analysis error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to analyze session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
