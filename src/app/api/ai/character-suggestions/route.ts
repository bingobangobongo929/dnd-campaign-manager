import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

// GET /api/ai/character-suggestions?characterId=X&status=pending
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const characterId = searchParams.get('characterId')
    const status = searchParams.get('status') // 'pending', 'applied', 'rejected', or null for all

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

    // Verify character ownership
    const { data: character, error: charError } = await supabase
      .from('vault_characters')
      .select('id, name, last_intelligence_run')
      .eq('id', characterId)
      .eq('user_id', user.id)
      .single()

    if (charError || !character) {
      return new Response(JSON.stringify({ error: 'Character not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Build query
    let query = supabase
      .from('intelligence_suggestions')
      .select('*')
      .eq('vault_character_id', characterId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: suggestions, error } = await query

    if (error) throw error

    // Get counts by status
    const { data: countData } = await supabase
      .from('intelligence_suggestions')
      .select('status')
      .eq('vault_character_id', characterId)

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
      characterName: character.name,
      lastAnalysis: character.last_intelligence_run,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Get character suggestions error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to load suggestions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

// PATCH /api/ai/character-suggestions - Update suggestion status (approve/reject)
export async function PATCH(req: Request) {
  try {
    const { suggestionId, action, finalValue } = await req.json() as {
      suggestionId: string
      action: 'approve' | 'reject'
      finalValue?: unknown
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

    // Get the suggestion and verify ownership
    const { data: suggestion, error: fetchError } = await supabase
      .from('intelligence_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .single()

    if (fetchError || !suggestion) {
      return new Response(JSON.stringify({ error: 'Suggestion not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Verify character ownership
    const { data: character, error: charError } = await supabase
      .from('vault_characters')
      .select('*')
      .eq('id', suggestion.vault_character_id)
      .eq('user_id', user.id)
      .single()

    if (charError || !character) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (action === 'reject') {
      // Just update status
      const { error } = await supabase
        .from('intelligence_suggestions')
        .update({ status: 'rejected' })
        .eq('id', suggestionId)

      if (error) throw error

      return new Response(JSON.stringify({ success: true, action: 'rejected' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // action === 'approve' - Apply the suggestion to vault_characters
    const valueToApply = finalValue ?? suggestion.suggested_value
    const fieldName = suggestion.field_name

    // Handle different field types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let updateData: Record<string, any> = {}

    // Array fields - append to existing
    const arrayFields = ['quotes', 'tldr', 'plot_hooks', 'fears', 'weaknesses', 'open_questions', 'character_tags']
    // JSONB array fields - append to existing
    const jsonbArrayFields = ['backstory_phases', 'companions', 'possessions', 'story_arcs', 'factions', 'art_references']
    // Text fields - append
    const textFields = ['backstory', 'description', 'personality', 'goals', 'secrets', 'notes', 'dm_notes']

    if (arrayFields.includes(fieldName)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentArray = (character[fieldName as keyof typeof character] as any[]) || []
      if (Array.isArray(valueToApply)) {
        updateData = { [fieldName]: [...currentArray, ...valueToApply] }
      } else {
        updateData = { [fieldName]: [...currentArray, valueToApply] }
      }
    } else if (jsonbArrayFields.includes(fieldName)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentArray = (character[fieldName as keyof typeof character] as any[]) || []
      if (Array.isArray(valueToApply)) {
        updateData = { [fieldName]: [...currentArray, ...valueToApply] }
      } else {
        updateData = { [fieldName]: [...currentArray, valueToApply] }
      }
    } else if (textFields.includes(fieldName)) {
      const currentText = (character[fieldName as keyof typeof character] as string) || ''
      const newText = typeof valueToApply === 'string' ? valueToApply : JSON.stringify(valueToApply)
      updateData = { [fieldName]: currentText ? `${currentText}\n\n${newText}` : newText }
    } else if (suggestion.suggestion_type === 'npc_detected') {
      // Create a relationship instead
      const npcData = valueToApply as { name: string; relationship_type?: string; description?: string }

      const { error: relError } = await supabase
        .from('vault_character_relationships')
        .insert({
          user_id: user.id,
          character_id: suggestion.vault_character_id,
          related_name: npcData.name,
          relationship_type: npcData.relationship_type || 'other',
          description: npcData.description || suggestion.ai_reasoning,
        })

      if (relError) throw relError

      // Mark suggestion as applied
      await supabase
        .from('intelligence_suggestions')
        .update({ status: 'applied', final_value: valueToApply })
        .eq('id', suggestionId)

      return new Response(JSON.stringify({
        success: true,
        action: 'applied',
        message: 'Relationship created',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } else {
      // Direct update for other fields
      updateData = { [fieldName]: valueToApply }
    }

    // Update the character
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('vault_characters')
        .update(updateData)
        .eq('id', suggestion.vault_character_id)

      if (updateError) throw updateError
    }

    // Mark suggestion as applied
    const { error: statusError } = await supabase
      .from('intelligence_suggestions')
      .update({
        status: 'applied',
        final_value: valueToApply,
      })
      .eq('id', suggestionId)

    if (statusError) throw statusError

    return new Response(JSON.stringify({
      success: true,
      action: 'applied',
      characterId: suggestion.vault_character_id,
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

// DELETE /api/ai/character-suggestions - Delete a suggestion
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

    // Get suggestion and verify ownership through character
    const { data: suggestion } = await supabase
      .from('intelligence_suggestions')
      .select('vault_character_id')
      .eq('id', suggestionId)
      .single()

    if (suggestion?.vault_character_id) {
      const { data: character } = await supabase
        .from('vault_characters')
        .select('id')
        .eq('id', suggestion.vault_character_id)
        .eq('user_id', user.id)
        .single()

      if (!character) {
        return new Response(JSON.stringify({ error: 'Access denied' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }

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
