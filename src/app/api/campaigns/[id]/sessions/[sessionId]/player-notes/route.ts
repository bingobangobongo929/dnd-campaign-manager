import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { PlayerSessionNoteInsert } from '@/types/database'

// GET - Get all player notes for a session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: campaignId, sessionId } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check campaign access and get role
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id, collaboration_settings')
      .eq('id', campaignId)
      .single()

    const isOwner = campaign?.user_id === user.id

    const { data: membership } = await supabase
      .from('campaign_members')
      .select('role, character_id')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (!isOwner && !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const isDm = isOwner || membership?.role === 'co_dm'
    const collaborationSettings = campaign?.collaboration_settings as Record<string, boolean> | null

    // Build query
    let query = supabase
      .from('player_session_notes')
      .select(`
        *,
        character:characters(id, name, image_url),
        added_by_user:user_settings!player_session_notes_added_by_user_id_fkey(username, avatar_url)
      `)
      .eq('session_id', sessionId)

    // If not DM, only show notes shared with party (or user's own)
    if (!isDm) {
      const canSeePlayerNotes = collaborationSettings?.players_can_see_other_notes !== false
      if (!canSeePlayerNotes) {
        // Only show own notes
        query = query.eq('added_by_user_id', user.id)
      } else {
        // Show all shared notes
        query = query.eq('is_shared_with_party', true)
      }
    }

    const { data: notes, error } = await query.order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to fetch player notes:', error)
      return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
    }

    return NextResponse.json({
      notes,
      isDm,
      canAddNotes: isDm || membership?.role === 'player' || membership?.role === 'contributor',
      userCharacterId: membership?.character_id
    })
  } catch (error) {
    console.error('Get player notes error:', error)
    return NextResponse.json({ error: 'Failed to get notes' }, { status: 500 })
  }
}

// POST - Add a player note
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: campaignId, sessionId } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check campaign access
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id, collaboration_settings')
      .eq('id', campaignId)
      .single()

    const isOwner = campaign?.user_id === user.id

    const { data: membership } = await supabase
      .from('campaign_members')
      .select('role, character_id')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (!isOwner && !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const isDm = isOwner || membership?.role === 'co_dm'
    const collaborationSettings = campaign?.collaboration_settings as Record<string, boolean> | null

    // Check if players can add notes
    if (!isDm && collaborationSettings?.players_can_add_notes === false) {
      return NextResponse.json({ error: 'Players cannot add notes in this campaign' }, { status: 403 })
    }

    const body = await request.json()
    const {
      notes,
      characterId,
      attributedToUserId,
      source = 'manual',
      isSharedWithParty = true
    } = body as {
      notes: string
      characterId?: string
      attributedToUserId?: string
      source?: 'manual' | 'discord_import' | 'player_submitted'
      isSharedWithParty?: boolean
    }

    if (!notes?.trim()) {
      return NextResponse.json({ error: 'Notes content is required' }, { status: 400 })
    }

    // Verify session exists
    const { data: session } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('campaign_id', campaignId)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Use player's linked character if not specified
    const finalCharacterId = characterId || membership?.character_id || null

    const noteData: PlayerSessionNoteInsert = {
      session_id: sessionId,
      character_id: finalCharacterId,
      added_by_user_id: user.id,
      attributed_to_user_id: attributedToUserId || null,
      notes,
      source,
      is_shared_with_party: isSharedWithParty,
    }

    const { data: note, error } = await supabase
      .from('player_session_notes')
      .insert(noteData)
      .select(`
        *,
        character:characters(id, name, image_url),
        added_by_user:user_settings!player_session_notes_added_by_user_id_fkey(username, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Failed to create note:', error)
      return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
    }

    return NextResponse.json({ note })
  } catch (error) {
    console.error('Create note error:', error)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}

// PATCH - Update a player note
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: campaignId, sessionId } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { noteId, notes, isSharedWithParty } = body as {
      noteId: string
      notes?: string
      isSharedWithParty?: boolean
    }

    if (!noteId) {
      return NextResponse.json({ error: 'noteId is required' }, { status: 400 })
    }

    // Get the note
    const { data: existingNote } = await supabase
      .from('player_session_notes')
      .select('added_by_user_id')
      .eq('id', noteId)
      .eq('session_id', sessionId)
      .single()

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Check permissions - only the user who added it or DM can edit
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    const isOwner = campaign?.user_id === user.id

    const { data: membership } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    const isDm = isOwner || membership?.role === 'co_dm'
    const isAuthor = existingNote.added_by_user_id === user.id

    if (!isDm && !isAuthor) {
      return NextResponse.json({ error: 'You can only edit your own notes' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (notes !== undefined) updateData.notes = notes
    if (isSharedWithParty !== undefined) updateData.is_shared_with_party = isSharedWithParty

    const { data: note, error } = await supabase
      .from('player_session_notes')
      .update(updateData)
      .eq('id', noteId)
      .select(`
        *,
        character:characters(id, name, image_url),
        added_by_user:user_settings!player_session_notes_added_by_user_id_fkey(username, avatar_url)
      `)
      .single()

    if (error) {
      console.error('Failed to update note:', error)
      return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
    }

    return NextResponse.json({ note })
  } catch (error) {
    console.error('Update note error:', error)
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 })
  }
}

// DELETE - Delete a player note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: campaignId, sessionId } = await params
    const { searchParams } = new URL(request.url)
    const noteId = searchParams.get('noteId')

    if (!noteId) {
      return NextResponse.json({ error: 'noteId is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the note
    const { data: existingNote } = await supabase
      .from('player_session_notes')
      .select('added_by_user_id')
      .eq('id', noteId)
      .eq('session_id', sessionId)
      .single()

    if (!existingNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    // Check permissions
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    const isOwner = campaign?.user_id === user.id

    const { data: membership } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    const isDm = isOwner || membership?.role === 'co_dm'
    const isAuthor = existingNote.added_by_user_id === user.id

    if (!isDm && !isAuthor) {
      return NextResponse.json({ error: 'You can only delete your own notes' }, { status: 403 })
    }

    const { error } = await supabase
      .from('player_session_notes')
      .delete()
      .eq('id', noteId)

    if (error) {
      console.error('Failed to delete note:', error)
      return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Note deleted' })
  } catch (error) {
    console.error('Delete note error:', error)
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 })
  }
}
