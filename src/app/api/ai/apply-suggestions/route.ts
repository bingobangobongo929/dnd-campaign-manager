import { createClient } from '@/lib/supabase/server'
import { SuggestionType, ConfidenceLevel } from '@/types/database'

export const runtime = 'edge'

interface AppliedSuggestion {
  suggestion_type: SuggestionType
  character_id: string
  character_name: string
  field_name: string
  suggested_value: unknown
  final_value?: unknown // If edited before applying
  source_excerpt: string
  ai_reasoning?: string
  confidence: ConfidenceLevel
}

interface ApplyRequest {
  campaignId: string
  sessionId: string
  suggestions: AppliedSuggestion[]
}

// Status colors for common statuses
const STATUS_COLORS: Record<string, string> = {
  alive: '#10B981',
  dead: '#EF4444',
  missing: '#F59E0B',
  captured: '#8B5CF6',
  unknown: '#6B7280',
}

export async function POST(req: Request) {
  try {
    const { campaignId, sessionId, suggestions } = await req.json() as ApplyRequest

    if (!campaignId || !sessionId || !suggestions || suggestions.length === 0) {
      return new Response(JSON.stringify({ error: 'Campaign ID, Session ID, and suggestions are required' }), {
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

    // Verify user owns this campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .single()

    if (campaignError || !campaign || campaign.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Campaign not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const results: Array<{
      success: boolean
      suggestion_type: SuggestionType
      character_name: string
      field_name: string
      error?: string
    }> = []

    // Group suggestions by character for batch operations
    const byCharacter = new Map<string, AppliedSuggestion[]>()
    for (const suggestion of suggestions) {
      if (!suggestion.character_id) continue
      const existing = byCharacter.get(suggestion.character_id) || []
      existing.push(suggestion)
      byCharacter.set(suggestion.character_id, existing)
    }

    // Process each character's suggestions
    for (const [characterId, charSuggestions] of byCharacter) {
      // Load current character data
      const { data: character, error: charError } = await supabase
        .from('characters')
        .select('*')
        .eq('id', characterId)
        .eq('campaign_id', campaignId)
        .single()

      if (charError || !character) {
        for (const s of charSuggestions) {
          results.push({
            success: false,
            suggestion_type: s.suggestion_type,
            character_name: s.character_name,
            field_name: s.field_name,
            error: 'Character not found'
          })
        }
        continue
      }

      // Build update object
      const updates: Record<string, unknown> = {}

      for (const suggestion of charSuggestions) {
        const value = suggestion.final_value ?? suggestion.suggested_value

        try {
          switch (suggestion.suggestion_type) {
            case 'status_change': {
              const statusValue = value as { status?: string; status_color?: string }
              if (statusValue.status) {
                updates.status = statusValue.status
                updates.status_color = statusValue.status_color || STATUS_COLORS[statusValue.status.toLowerCase()] || '#6B7280'
              }
              break
            }

            case 'secret_revealed': {
              // Append to notes or secrets field
              const currentNotes = character.notes || ''
              const newNote = typeof value === 'string' ? value : JSON.stringify(value)
              updates.notes = currentNotes
                ? `${currentNotes}\n\n[Session ${suggestion.source_excerpt ? 'Update' : 'Revelation'}]: ${newNote}`
                : `[Revelation]: ${newNote}`
              break
            }

            case 'important_person': {
              // Append to important_people array
              const currentPeople = (character.important_people as Array<{ name: string; relationship: string; notes?: string }>) || []
              const newPerson = value as { name: string; relationship: string; notes?: string }

              // Check if person already exists
              const exists = currentPeople.some(p =>
                p.name.toLowerCase() === newPerson.name.toLowerCase()
              )

              if (!exists) {
                updates.important_people = [...currentPeople, newPerson]
              }
              break
            }

            case 'story_hook': {
              const currentHooks = (character.story_hooks as Array<{ hook: string; notes?: string; resolved?: boolean }>) || []
              const hookValue = value as { hook: string; notes?: string; resolved?: boolean; resolve_hook?: string }

              if (hookValue.resolve_hook) {
                // Mark existing hook as resolved
                updates.story_hooks = currentHooks.map(h =>
                  h.hook.toLowerCase().includes(hookValue.resolve_hook!.toLowerCase())
                    ? { ...h, resolved: true, notes: `Resolved in session. ${h.notes || ''}`.trim() }
                    : h
                )
              } else if (hookValue.hook) {
                // Add new hook
                const exists = currentHooks.some(h =>
                  h.hook.toLowerCase() === hookValue.hook.toLowerCase()
                )
                if (!exists) {
                  updates.story_hooks = [...currentHooks, { hook: hookValue.hook, notes: hookValue.notes }]
                }
              }
              break
            }

            case 'quote': {
              const currentQuotes = (character.quotes as string[]) || []
              const newQuote = typeof value === 'string' ? value : (value as { quote: string }).quote

              // Check if quote already exists (fuzzy match)
              const exists = currentQuotes.some(q =>
                q.toLowerCase().includes(newQuote.toLowerCase().slice(0, 20))
              )

              if (!exists && newQuote) {
                updates.quotes = [...currentQuotes, newQuote]
              }
              break
            }

            case 'relationship': {
              // Create a character relationship record
              const relValue = value as {
                related_character_id?: string
                related_character_name?: string
                relationship_type: string
                relationship_label?: string
                notes?: string
              }

              // Try to find the related character by name if ID not provided
              let relatedId = relValue.related_character_id
              if (!relatedId && relValue.related_character_name) {
                const { data: relatedChar } = await supabase
                  .from('characters')
                  .select('id')
                  .eq('campaign_id', campaignId)
                  .ilike('name', `%${relValue.related_character_name}%`)
                  .single()
                relatedId = relatedChar?.id
              }

              if (relatedId) {
                await supabase
                  .from('character_relationships')
                  .upsert({
                    campaign_id: campaignId,
                    character_id: characterId,
                    related_character_id: relatedId,
                    relationship_type: relValue.relationship_type || 'other',
                    relationship_label: relValue.relationship_label,
                    is_known_to_party: true,
                    notes: relValue.notes || `Discovered in session`,
                  }, {
                    onConflict: 'character_id,related_character_id,relationship_type'
                  })
              }
              break
            }
          }

          results.push({
            success: true,
            suggestion_type: suggestion.suggestion_type,
            character_name: suggestion.character_name,
            field_name: suggestion.field_name,
          })

        } catch (err) {
          results.push({
            success: false,
            suggestion_type: suggestion.suggestion_type,
            character_name: suggestion.character_name,
            field_name: suggestion.field_name,
            error: err instanceof Error ? err.message : 'Unknown error'
          })
        }
      }

      // Apply all updates to the character
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('characters')
          .update(updates)
          .eq('id', characterId)

        if (updateError) {
          console.error('Failed to update character:', updateError)
        }
      }

      // Save to audit table
      for (const suggestion of charSuggestions) {
        await supabase
          .from('intelligence_suggestions')
          .insert({
            campaign_id: campaignId,
            session_id: sessionId,
            character_id: characterId,
            suggestion_type: suggestion.suggestion_type,
            field_name: suggestion.field_name,
            current_value: character[suggestion.field_name as keyof typeof character] ?? null,
            suggested_value: suggestion.suggested_value,
            source_excerpt: suggestion.source_excerpt,
            ai_reasoning: suggestion.ai_reasoning,
            confidence: suggestion.confidence,
            status: 'applied',
            final_value: suggestion.final_value ?? suggestion.suggested_value,
          })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return new Response(JSON.stringify({
      success: true,
      applied: successCount,
      failed: failCount,
      results,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Apply suggestions error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to apply suggestions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
