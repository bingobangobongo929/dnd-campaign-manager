import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PATCH - Update session workflow (phase, prep_checklist, thoughts_for_next)
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

    // Check if user is owner or co_dm
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

    const isCoGm = membership?.role === 'co_dm'

    if (!isOwner && !isCoGm) {
      return NextResponse.json({ error: 'Only DMs can update session workflow' }, { status: 403 })
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
    const { phase, prepChecklist, thoughtsForNext } = body as {
      phase?: 'planned' | 'prep' | 'active' | 'recap' | 'complete'
      prepChecklist?: Array<{ text: string; completed: boolean }>
      thoughtsForNext?: string
    }

    const updateData: Record<string, unknown> = {}
    if (phase !== undefined) updateData.phase = phase
    if (prepChecklist !== undefined) updateData.prep_checklist = prepChecklist
    if (thoughtsForNext !== undefined) updateData.thoughts_for_next = thoughtsForNext

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
