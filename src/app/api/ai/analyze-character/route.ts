import { generateText } from 'ai'
import { getAIModel, AIProvider } from '@/lib/ai/config'
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export const maxDuration = 300

interface CharacterSuggestion {
  suggestion_type: string
  field_name: string
  current_value: unknown
  suggested_value: unknown
  source_excerpt: string
  ai_reasoning: string
  confidence: 'high' | 'medium' | 'low'
}

const ANALYSIS_PROMPT = `You are analyzing a D&D/TTRPG character profile for completeness, consistency, and potential improvements.

Analyze this character and generate suggestions for improvements. Look for:

1. **Completeness** - Missing important fields (physical appearance, personality traits, goals, etc.)
2. **Consistency** - Timeline issues, contradictory information
3. **Quote Extraction** - Memorable quotes that could be highlighted
4. **NPC Detection** - Names mentioned that could be tracked as relationships
5. **Location Detection** - Places mentioned that could be tracked
6. **Plot Hooks** - Story opportunities based on backstory
7. **Enrichment** - Details that could be inferred from context

Return a JSON object with a "suggestions" array. Each suggestion must have:
- suggestion_type: One of "completeness", "consistency", "quote", "npc_detected", "location_detected", "plot_hook", "enrichment", "timeline_issue"
- field_name: The field this suggestion relates to (e.g., "personality", "goals", "relationships")
- current_value: What currently exists (can be null if field is empty)
- suggested_value: The suggested content or change
- source_excerpt: The part of the character data that led to this suggestion
- ai_reasoning: Brief explanation of why this suggestion is valuable
- confidence: "high", "medium", or "low"

Focus on actionable, valuable suggestions. Do not suggest obvious things. Prioritize:
- Missing personality details
- Untracked NPCs mentioned in backstory
- Potential plot hooks from backstory events
- Quotes that reveal character voice
- Inconsistencies in timeline or facts

Return ONLY valid JSON with this structure:
{
  "suggestions": [
    {
      "suggestion_type": "npc_detected",
      "field_name": "relationships",
      "current_value": null,
      "suggested_value": { "name": "Lord Blackwood", "relationship_type": "enemy", "description": "The noble who destroyed the character's village" },
      "source_excerpt": "When Lord Blackwood's soldiers burned my village...",
      "ai_reasoning": "Named NPC mentioned in backstory that should be tracked as a relationship",
      "confidence": "high"
    }
  ]
}

If no suggestions are found, return: {"suggestions": []}`

// POST /api/ai/analyze-character - Analyze a vault character
export async function POST(req: NextRequest) {
  try {
    const { characterId, provider = 'anthropic' } = await req.json() as {
      characterId: string
      provider?: AIProvider
    }

    if (!characterId) {
      return new Response(JSON.stringify({ error: 'Character ID required' }), {
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

    // Load the character
    const { data: character, error: charError } = await supabase
      .from('vault_characters')
      .select('*')
      .eq('id', characterId)
      .eq('user_id', user.id)
      .single()

    if (charError || !character) {
      return new Response(JSON.stringify({ error: 'Character not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Load existing relationships
    const { data: relationships } = await supabase
      .from('vault_character_relationships')
      .select('*')
      .eq('character_id', characterId)

    // Build character JSON for analysis
    const characterData = {
      ...character,
      relationships: relationships || [],
    }

    // Remove very long fields to fit context
    const analysisData = { ...characterData }
    if (analysisData.raw_document_text && analysisData.raw_document_text.length > 10000) {
      analysisData.raw_document_text = analysisData.raw_document_text.substring(0, 10000) + '...[truncated]'
    }

    const characterJson = JSON.stringify(analysisData, null, 2)

    // Build the full prompt
    const fullPrompt = `CHARACTER DATA:
${characterJson}

${ANALYSIS_PROMPT}`

    // Generate with selected provider
    const model = getAIModel(provider)

    let result
    try {
      result = await generateText({
        model,
        prompt: fullPrompt,
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
    let suggestions: CharacterSuggestion[] = []
    try {
      let jsonText = result.text

      // Check if response looks like an error
      if (jsonText.toLowerCase().startsWith('an error') || jsonText.toLowerCase().startsWith('i ') || !jsonText.includes('{')) {
        console.error('AI returned non-JSON response:', jsonText.slice(0, 200))
        return new Response(JSON.stringify({
          error: 'AI returned an invalid response',
          details: 'The AI model did not return valid JSON.',
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

    // Save suggestions to database
    let savedCount = 0
    for (const suggestion of suggestions) {
      try {
        const { error: insertError } = await supabase
          .from('intelligence_suggestions')
          .insert({
            vault_character_id: characterId,
            character_name: character.name,
            suggestion_type: suggestion.suggestion_type,
            field_name: suggestion.field_name,
            current_value: suggestion.current_value,
            suggested_value: suggestion.suggested_value,
            source_excerpt: suggestion.source_excerpt,
            ai_reasoning: suggestion.ai_reasoning,
            confidence: suggestion.confidence,
            status: 'pending',
          })

        if (!insertError) savedCount++
      } catch (err) {
        console.error('Failed to save suggestion:', err)
      }
    }

    // Update last_intelligence_run on character
    await supabase
      .from('vault_characters')
      .update({ last_intelligence_run: new Date().toISOString() })
      .eq('id', characterId)

    return new Response(JSON.stringify({
      success: true,
      suggestionsGenerated: suggestions.length,
      suggestionsSaved: savedCount,
      provider,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Character analysis error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to analyze character',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
