import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

// GET /api/ai/suggestions?campaignId=X&status=pending
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams
    const campaignId = searchParams.get('campaignId')
    const status = searchParams.get('status') // 'pending', 'applied', 'rejected', or null for all

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

    // Build query
    let query = supabase
      .from('intelligence_suggestions')
      .select('*')
      .eq('campaign_id', campaignId)
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

      // Mark suggestion as applied
      const { error } = await supabase
        .from('intelligence_suggestions')
        .update({
          status: 'applied',
          final_value: { ...timelineData, timeline_event_id: newEvent.id }
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
