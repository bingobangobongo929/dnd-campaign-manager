import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ToggleVisibilityRequest {
  snapshotId: string
  isPublic: boolean
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ToggleVisibilityRequest = await request.json()
    const { snapshotId, isPublic } = body

    if (!snapshotId) {
      return NextResponse.json({ error: 'Snapshot ID required' }, { status: 400 })
    }

    // Get user settings for username (required for public templates)
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('username')
      .eq('user_id', user.id)
      .single()

    // Require username for making templates public
    if (isPublic && !userSettings?.username) {
      return NextResponse.json({
        error: 'You must set a username before making templates public',
        code: 'USERNAME_REQUIRED'
      }, { status: 400 })
    }

    // Verify ownership of the snapshot
    const { data: snapshot, error: fetchError } = await supabase
      .from('template_snapshots')
      .select('id, user_id, is_public, content_type, content_id')
      .eq('id', snapshotId)
      .single()

    if (fetchError || !snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
    }

    if (snapshot.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to modify this template' }, { status: 403 })
    }

    // Update the snapshot visibility
    const { error: updateError } = await supabase
      .from('template_snapshots')
      .update({
        is_public: isPublic,
        allow_save: isPublic, // Public templates can be saved by others
        attribution_name: isPublic ? userSettings?.username : null,
      })
      .eq('id', snapshotId)

    if (updateError) {
      console.error('Snapshot update error:', updateError)
      return NextResponse.json({ error: 'Failed to update visibility' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      isPublic,
      message: isPublic
        ? 'Template is now public and can be discovered by others'
        : 'Template is now private (link-only access)',
    })
  } catch (error) {
    console.error('Toggle visibility error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
