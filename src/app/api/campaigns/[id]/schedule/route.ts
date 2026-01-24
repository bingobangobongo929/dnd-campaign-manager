import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { ScheduleSettings, SchedulePattern, ScheduleException } from '@/lib/schedule-utils'

// GET - Get campaign schedule settings
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

    // Check if user has access to this campaign
    const { data: membership } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    // Also check if user is the campaign owner
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id, schedule_settings, schedule_pattern, schedule_exceptions, next_session_date, next_session_time, next_session_location, next_session_notes')
      .eq('id', campaignId)
      .single()

    const isOwner = campaign?.user_id === user.id
    const isMember = !!membership

    if (!isOwner && !isMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json({
      settings: campaign?.schedule_settings || { mode: 'simple', attendance_mode: 'assumed', minimum_players: 3 },
      pattern: campaign?.schedule_pattern || null,
      exceptions: campaign?.schedule_exceptions || [],
      nextSessionDate: campaign?.next_session_date || null,
      nextSessionTime: campaign?.next_session_time || null,
      nextSessionLocation: campaign?.next_session_location || null,
      nextSessionNotes: campaign?.next_session_notes || null,
    })
  } catch (error) {
    console.error('Get schedule error:', error)
    return NextResponse.json({ error: 'Failed to get schedule' }, { status: 500 })
  }
}

// PATCH - Update campaign schedule settings
export async function PATCH(
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

    // Check if user is owner or co_dm
    const { data: membership } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    const isOwner = campaign?.user_id === user.id
    const isCoGm = membership?.role === 'co_dm'

    if (!isOwner && !isCoGm) {
      return NextResponse.json({ error: 'Only owners and co-DMs can update schedule' }, { status: 403 })
    }

    const body = await request.json()
    const { settings, pattern, exceptions, nextDate, nextTime, nextLocation, nextNotes } = body as {
      settings?: ScheduleSettings
      pattern?: SchedulePattern | null
      exceptions?: ScheduleException[]
      nextDate?: string | null
      nextTime?: string | null
      nextLocation?: string | null
      nextNotes?: string | null
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (settings !== undefined) updateData.schedule_settings = settings
    if (pattern !== undefined) updateData.schedule_pattern = pattern
    if (exceptions !== undefined) updateData.schedule_exceptions = exceptions
    if (nextDate !== undefined) updateData.next_session_date = nextDate
    if (nextTime !== undefined) updateData.next_session_time = nextTime
    if (nextLocation !== undefined) updateData.next_session_location = nextLocation
    if (nextNotes !== undefined) updateData.next_session_notes = nextNotes

    const { data: updated, error } = await supabase
      .from('campaigns')
      .update(updateData)
      .eq('id', campaignId)
      .select('schedule_settings, schedule_pattern, schedule_exceptions, next_session_date, next_session_time, next_session_location, next_session_notes')
      .single()

    if (error) {
      console.error('Failed to update schedule:', error)
      return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 })
    }

    return NextResponse.json({
      settings: updated?.schedule_settings,
      pattern: updated?.schedule_pattern,
      exceptions: updated?.schedule_exceptions,
      nextSessionDate: updated?.next_session_date,
      nextSessionTime: updated?.next_session_time,
      nextSessionLocation: updated?.next_session_location,
      nextSessionNotes: updated?.next_session_notes,
    })
  } catch (error) {
    console.error('Update schedule error:', error)
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 })
  }
}

// POST - Update player's session availability
export async function POST(
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

    // Get user's membership
    const { data: membership } = await supabase
      .from('campaign_members')
      .select('id, role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this campaign' }, { status: 403 })
    }

    const body = await request.json()
    const { status, note } = body as {
      status: 'attending' | 'unavailable' | 'late'
      note?: string
    }

    // Map our status to database status
    const dbStatus = status === 'attending' ? 'confirmed' :
                     status === 'unavailable' ? 'unavailable' : 'maybe'

    const { error } = await supabase
      .from('campaign_members')
      .update({
        next_session_status: dbStatus,
        next_session_note: note || null,
      })
      .eq('id', membership.id)

    if (error) {
      console.error('Failed to update availability:', error)
      return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Availability updated', status: dbStatus })
  } catch (error) {
    console.error('Update availability error:', error)
    return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 })
  }
}
