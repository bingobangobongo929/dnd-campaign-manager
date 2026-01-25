import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch recent player notes for a campaign (for dashboard widget)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is campaign owner or co-DM
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const { data: membership } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    const isOwner = campaign.user_id === user.id
    const isCoGm = membership?.role === 'co_dm'

    if (!isOwner && !isCoGm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get limit from query params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    // Fetch recent player notes
    const { data: notes, error } = await supabase
      .from('player_session_notes')
      .select(`
        *,
        session:sessions!session_id(id, session_number, title, session_date),
        character:characters!character_id(id, name, image_url)
      `)
      .eq('sessions.campaign_id', campaignId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      // Fallback: fetch notes and join manually if the nested query fails
      const { data: sessionIds } = await supabase
        .from('sessions')
        .select('id')
        .eq('campaign_id', campaignId)

      if (!sessionIds || sessionIds.length === 0) {
        return NextResponse.json({ notes: [] })
      }

      const { data: rawNotes } = await supabase
        .from('player_session_notes')
        .select('*')
        .in('session_id', sessionIds.map(s => s.id))
        .order('created_at', { ascending: false })
        .limit(limit)

      if (!rawNotes || rawNotes.length === 0) {
        return NextResponse.json({ notes: [] })
      }

      // Fetch sessions and characters for context
      const sessionIdsForNotes = [...new Set(rawNotes.map(n => n.session_id).filter(Boolean))]
      const characterIdsForNotes = [...new Set(rawNotes.map(n => n.character_id).filter(Boolean))]

      const [sessionsResult, charactersResult] = await Promise.all([
        sessionIdsForNotes.length > 0
          ? supabase.from('sessions').select('id, session_number, title, session_date').in('id', sessionIdsForNotes)
          : Promise.resolve({ data: [] }),
        characterIdsForNotes.length > 0
          ? supabase.from('characters').select('id, name, image_url').in('id', characterIdsForNotes)
          : Promise.resolve({ data: [] }),
      ])

      const sessionsMap = new Map((sessionsResult.data || []).map(s => [s.id, s]))
      const charactersMap = new Map((charactersResult.data || []).map(c => [c.id, c]))

      const notesWithContext = rawNotes.map(note => ({
        note,
        session: note.session_id ? sessionsMap.get(note.session_id) : undefined,
        character: note.character_id ? charactersMap.get(note.character_id) : undefined,
      }))

      return NextResponse.json({ notes: notesWithContext })
    }

    // Transform the nested query result
    const notesWithContext = (notes || []).map(note => ({
      note: {
        id: note.id,
        session_id: note.session_id,
        character_id: note.character_id,
        notes: note.notes,
        source: note.source,
        is_shared_with_party: note.is_shared_with_party,
        created_at: note.created_at,
        updated_at: note.updated_at,
      },
      session: note.session,
      character: note.character,
    }))

    return NextResponse.json({ notes: notesWithContext })
  } catch (error) {
    console.error('Failed to fetch player notes:', error)
    return NextResponse.json({ error: 'Failed to fetch player notes' }, { status: 500 })
  }
}
