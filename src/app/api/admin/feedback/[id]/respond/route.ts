import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// POST - Add response to feedback
export async function POST(
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
    const { content, is_internal } = body

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Response content is required' }, { status: 400 })
    }

    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()

    // Verify feedback exists
    const { data: feedback, error: feedbackError } = await adminSupabase
      .from('feedback')
      .select('id, first_response_at')
      .eq('id', id)
      .single()

    if (feedbackError || !feedback) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
    }

    // Create response
    const { data: response, error } = await adminSupabase
      .from('feedback_responses')
      .insert({
        feedback_id: id,
        user_id: user.id,
        content: content.trim(),
        is_internal: is_internal || false,
        is_status_change: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create response:', error)
      return NextResponse.json({ error: 'Failed to create response' }, { status: 500 })
    }

    // Update first_response_at if this is the first non-internal response
    if (!feedback.first_response_at && !is_internal) {
      await adminSupabase
        .from('feedback')
        .update({ first_response_at: new Date().toISOString() })
        .eq('id', id)
    }

    return NextResponse.json({ response })
  } catch (error) {
    console.error('Add response error:', error)
    return NextResponse.json({ error: 'Failed to add response' }, { status: 500 })
  }
}
