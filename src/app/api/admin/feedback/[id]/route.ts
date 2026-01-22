import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import type { FeedbackUpdate } from '@/types/database'

export const runtime = 'nodejs'

// GET - Get single feedback item with all details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!settings || !['super_admin', 'moderator'].includes(settings.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()

    const { data: feedback, error } = await adminSupabase
      .from('feedback')
      .select(`
        *,
        feedback_attachments (*),
        feedback_responses (
          *
        )
      `)
      .eq('id', id)
      .single()

    if (error || !feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }

    // Sort responses by created_at
    if (feedback.feedback_responses) {
      feedback.feedback_responses.sort((a: { created_at: string }, b: { created_at: string }) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error('Get feedback error:', error)
    return NextResponse.json({ error: 'Failed to get feedback' }, { status: 500 })
  }
}

// PATCH - Update feedback (status, priority, assigned_to, notes)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!settings || !['super_admin', 'moderator'].includes(settings.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { status, priority, assigned_to, internal_notes, resolution_notes } = body

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()

    // Get current feedback to track status changes
    const { data: currentFeedback } = await adminSupabase
      .from('feedback')
      .select('status')
      .eq('id', id)
      .single()

    // Build update object
    const updateData: FeedbackUpdate = {}

    if (status !== undefined) {
      updateData.status = status
      // Set resolved_at if status is fixed or closed
      if (['fixed', 'closed', 'wont_fix'].includes(status)) {
        updateData.resolved_at = new Date().toISOString()
      }
    }
    if (priority !== undefined) updateData.priority = priority
    if (assigned_to !== undefined) updateData.assigned_to = assigned_to
    if (internal_notes !== undefined) updateData.internal_notes = internal_notes
    if (resolution_notes !== undefined) updateData.resolution_notes = resolution_notes

    // Update feedback
    const { data: feedback, error } = await adminSupabase
      .from('feedback')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update feedback:', error)
      return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 })
    }

    // If status changed, create a status change response
    if (status && currentFeedback && status !== currentFeedback.status) {
      await adminSupabase.from('feedback_responses').insert({
        feedback_id: id,
        user_id: user.id,
        content: `Status changed from ${currentFeedback.status} to ${status}`,
        is_internal: false,
        is_status_change: true,
        old_status: currentFeedback.status,
        new_status: status,
      })

      // Update first_response_at if this is the first response
      if (!feedback.first_response_at) {
        await adminSupabase
          .from('feedback')
          .update({ first_response_at: new Date().toISOString() })
          .eq('id', id)
      }
    }

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error('Update feedback error:', error)
    return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 })
  }
}

// DELETE - Delete feedback
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!settings || !['super_admin', 'moderator'].includes(settings.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()

    // Delete attachments from storage first
    const { data: attachments } = await adminSupabase
      .from('feedback_attachments')
      .select('storage_path')
      .eq('feedback_id', id)

    if (attachments && attachments.length > 0) {
      const paths = attachments.map(a => a.storage_path)
      await adminSupabase.storage.from('feedback-attachments').remove(paths)
    }

    // Delete feedback (cascade will delete attachments and responses)
    const { error } = await adminSupabase
      .from('feedback')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete feedback:', error)
      return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete feedback error:', error)
    return NextResponse.json({ error: 'Failed to delete feedback' }, { status: 500 })
  }
}
