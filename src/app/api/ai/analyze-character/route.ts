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

const ANALYSIS_PROMPT = `You are an expert D&D/TTRPG character analyst. Perform a COMPREHENSIVE analysis of this character profile.

## ANALYSIS CATEGORIES

### 1. SUMMARY GENERATION/UPDATE
- If the summary field is empty or weak, generate a compelling 1-2 sentence summary
- If the summary exists but doesn't reflect the character well, suggest an improved version
- The summary should capture the essence: who they are, what drives them, what makes them interesting
- Example: "A disgraced noble paladin seeking redemption after failing to protect her sworn charge"

### 2. COMPLETENESS
- Missing important fields (appearance, personality, goals, fears, secrets)
- Empty sections that should have content
- Partial information that needs expansion

### 2. CONSISTENCY & LORE
- Timeline contradictions (age vs events, dates that don't align)
- Factual contradictions within the character's story
- Lore conflicts (e.g., claiming to be from a destroyed city after it was rebuilt)
- Relationship inconsistencies (NPC described differently in different places)

### 3. GRAMMAR & WRITING
- Spelling errors and typos
- Grammar issues that affect readability
- Awkward phrasing that could be improved
- Inconsistent tense usage

### 4. FORMATTING & STYLE
- Inconsistent bullet point styles (mixing -, *, •, etc.)
- Inconsistent capitalization in lists
- Paragraph vs bullet point inconsistency
- Heading style inconsistencies

### 5. QUOTE EXTRACTION
- Memorable lines that reveal character voice
- Dialogue that defines personality
- Catchphrases or verbal tics

### 6. NPC & LOCATION DETECTION
- Named characters in backstory not in relationships list
- Locations mentioned but not tracked
- Organizations or factions referenced

### 7. PLOT HOOKS & STORY OPPORTUNITIES
- Unresolved conflicts that could become quests
- Secrets that could be revealed
- Relationships that could develop
- Vengeance or redemption arcs

### 8. RELATIONSHIP ANALYSIS
- NPCs mentioned in backstory but not in relationships
- Relationships with missing reciprocal connections
- Family members implied but not listed
- Gaps in relationship network (e.g., no mentor, no enemies)

### 9. VOICE & CHARACTER CONSISTENCY
- Personality described vs demonstrated in quotes/writing
- Alignment vs actions described
- Class/background vs actual skills/knowledge shown

### 10. REDUNDANCY & CLEANUP
- Repeated information in multiple places
- Duplicate NPCs with slightly different names
- Content that could be consolidated

### 11. CROSS-REFERENCES
- NPCs mentioned in backstory that should link to existing relationships
- Events that should be reflected in multiple sections
- Session notes that should update character status

### 12. SECRET OPPORTUNITIES
- Hidden information that could be expanded into secrets
- Backstory elements that NPCs might know
- Information asymmetry opportunities for DM

## SUGGESTION TYPES
Use these exact types:
- summary: Generate or improve the character summary
- completeness: Missing or incomplete fields
- consistency: Factual or timeline contradictions
- grammar: Spelling, grammar, or phrasing fixes
- formatting: Style and formatting unification
- quote: Extractable memorable quotes
- npc_detected: NPCs that should be tracked
- location_detected: Locations to track
- plot_hook: Story opportunities
- enrichment: Content that could be expanded
- timeline_issue: Chronological problems
- lore_conflict: World/setting contradictions
- redundancy: Duplicate or repeated content
- voice_inconsistency: Character voice/behavior mismatches
- relationship_gap: Missing relationship connections
- secret_opportunity: Potential secrets to develop
- cross_reference: Content that should link together

## OUTPUT FORMAT

Return ONLY valid JSON:
{
  "suggestions": [
    {
      "suggestion_type": "grammar",
      "field_name": "backstory",
      "current_value": "She was borned in a small village",
      "suggested_value": "She was born in a small village",
      "source_excerpt": "borned in a small village",
      "ai_reasoning": "Grammar error: 'borned' should be 'born'",
      "confidence": "high"
    },
    {
      "suggestion_type": "formatting",
      "field_name": "personality",
      "current_value": "- Kind\\n* Brave\\n• Stubborn",
      "suggested_value": "- Kind\\n- Brave\\n- Stubborn",
      "source_excerpt": "- Kind\\n* Brave\\n• Stubborn",
      "ai_reasoning": "Inconsistent bullet point styles should be unified",
      "confidence": "high"
    },
    {
      "suggestion_type": "lore_conflict",
      "field_name": "backstory",
      "current_value": null,
      "suggested_value": "Potential conflict: Character claims to be 25 but describes events 30 years ago as childhood memories",
      "source_excerpt": "I remember when the war started 30 years ago... I was just a child",
      "ai_reasoning": "Timeline math doesn't add up - needs clarification",
      "confidence": "medium"
    }
  ]
}

## IMPORTANT RULES
1. Be thorough - check EVERY field for issues
2. Prioritize high-impact suggestions (grammar errors, major conflicts)
3. Include source_excerpt for EVERY suggestion
4. Be specific in suggested_value - provide exact fixes
5. If no issues found, return {"suggestions": []}`

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

    // Load existing pending suggestions to avoid duplicates
    const { data: existingSuggestions } = await supabase
      .from('intelligence_suggestions')
      .select('suggestion_type, field_name, suggested_value')
      .eq('vault_character_id', characterId)
      .eq('status', 'pending')

    const existingSet = new Set(
      (existingSuggestions || []).map(s =>
        `${s.suggestion_type}|${s.field_name}|${JSON.stringify(s.suggested_value)}`
      )
    )

    // Save suggestions to database (skip duplicates)
    let savedCount = 0
    let skippedCount = 0
    for (const suggestion of suggestions) {
      // Check if this suggestion already exists
      const key = `${suggestion.suggestion_type}|${suggestion.field_name}|${JSON.stringify(suggestion.suggested_value)}`
      if (existingSet.has(key)) {
        skippedCount++
        continue
      }

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

        if (!insertError) {
          savedCount++
          existingSet.add(key) // Add to set to prevent duplicates within same batch
        }
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
      suggestionsSkipped: skippedCount,
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
