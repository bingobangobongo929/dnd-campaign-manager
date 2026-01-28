import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkPermission, isDmRole } from '@/lib/permissions'
import type {
  SessionPhase,
  SessionSection,
  SessionState,
  PrepChecklistItem,
  SessionTimerState,
  PinnedReference,
  SessionAttendee,
  PrepModule,
  MemberPermissions,
  CampaignMemberRole,
} from '@/types/database'

// PATCH - Update session workflow
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

    // Check campaign access and permissions
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    const isOwner = campaign?.user_id === user.id

    const { data: membership } = await supabase
      .from('campaign_members')
      .select('role, permissions')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    const role = (membership?.role || (isOwner ? 'owner' : null)) as CampaignMemberRole | null
    const permissions = membership?.permissions as MemberPermissions | null
    const isDm = isDmRole(isOwner, role)

    // Check edit permission - DMs always have access, others need explicit permission
    if (!isDm && !checkPermission(permissions, isOwner, 'sessions', 'edit')) {
      return NextResponse.json({ error: 'No permission to edit sessions' }, { status: 403 })
    }

    // Verify session belongs to campaign
    const { data: existingSession } = await supabase
      .from('sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('campaign_id', campaignId)
      .single()

    if (!existingSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      phase,
      prepNotes,
      prepChecklist,
      thoughtsForNext,
      enabledSections,
      enabledPrepModules,
      sessionTimer,
      pinnedReferences,
      attendees,
      state,
      shareNotesWithPlayers,
    } = body as {
      phase?: SessionPhase
      prepNotes?: string
      prepChecklist?: PrepChecklistItem[]
      thoughtsForNext?: string
      enabledSections?: SessionSection[]
      enabledPrepModules?: PrepModule[]
      sessionTimer?: SessionTimerState | null
      pinnedReferences?: PinnedReference[]
      attendees?: SessionAttendee[]
      state?: SessionState
      shareNotesWithPlayers?: boolean | null
    }

    const updateData: Record<string, unknown> = {}

    if (phase !== undefined) updateData.phase = phase
    if (prepNotes !== undefined) updateData.prep_notes = prepNotes
    if (prepChecklist !== undefined) updateData.prep_checklist = prepChecklist
    if (thoughtsForNext !== undefined) updateData.thoughts_for_next = thoughtsForNext
    if (enabledSections !== undefined) updateData.enabled_sections = enabledSections
    if (enabledPrepModules !== undefined) updateData.enabled_prep_modules = enabledPrepModules
    if (sessionTimer !== undefined) updateData.session_timer = sessionTimer
    if (pinnedReferences !== undefined) updateData.pinned_references = pinnedReferences
    if (attendees !== undefined) updateData.attendees = attendees
    if (state !== undefined) updateData.state = state
    if (shareNotesWithPlayers !== undefined) updateData.share_notes_with_players = shareNotesWithPlayers

    const { data: session, error } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update session workflow:', error)
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('Update session workflow error:', error)
    return NextResponse.json({ error: 'Failed to update session workflow' }, { status: 500 })
  }
}
