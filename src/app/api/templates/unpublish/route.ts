import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface UnpublishRequest {
  contentType: 'campaign' | 'character' | 'oneshot'
  contentId: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: UnpublishRequest = await request.json()
    const { contentType, contentId } = body

    if (!contentType || !contentId) {
      return NextResponse.json({ error: 'Content type and ID required' }, { status: 400 })
    }

    // Verify ownership
    let verifyError: any = null
    if (contentType === 'campaign') {
      const { error } = await supabase
        .from('campaigns')
        .select('id')
        .eq('id', contentId)
        .eq('user_id', user.id)
        .single()
      verifyError = error
    } else if (contentType === 'character') {
      const { error } = await supabase
        .from('vault_characters')
        .select('id')
        .eq('id', contentId)
        .eq('user_id', user.id)
        .single()
      verifyError = error
    } else if (contentType === 'oneshot') {
      const { error } = await supabase
        .from('oneshots')
        .select('id')
        .eq('id', contentId)
        .eq('user_id', user.id)
        .single()
      verifyError = error
    }

    if (verifyError) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    // Check if any snapshots have saves - warn the user
    const { data: snapshotsWithSaves } = await supabase
      .from('template_snapshots')
      .select('id, version, save_count')
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .gt('save_count', 0)

    if (snapshotsWithSaves && snapshotsWithSaves.length > 0) {
      const totalSaves = snapshotsWithSaves.reduce((sum, s) => sum + s.save_count, 0)
      return NextResponse.json({
        error: 'Cannot unpublish - this template has been saved by others',
        details: {
          saveCount: totalSaves,
          versions: snapshotsWithSaves.map(s => ({ version: s.version, saves: s.save_count })),
        },
      }, { status: 400 })
    }

    // Delete all snapshots for this content (they have no saves)
    const { error: deleteError } = await supabase
      .from('template_snapshots')
      .delete()
      .eq('content_type', contentType)
      .eq('content_id', contentId)

    if (deleteError) {
      console.error('Snapshot deletion error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete snapshots' }, { status: 500 })
    }

    // Update the content back to active mode
    const updateData = {
      content_mode: 'active',
      template_version: 1,
      published_at: null,
      is_session0_ready: false,
      allow_save: false,
    }

    let updateError: any = null
    if (contentType === 'campaign') {
      const { error } = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', contentId)
      updateError = error
    } else if (contentType === 'character') {
      const { error } = await supabase
        .from('vault_characters')
        .update(updateData)
        .eq('id', contentId)
      updateError = error
    } else if (contentType === 'oneshot') {
      const { error } = await supabase
        .from('oneshots')
        .update(updateData)
        .eq('id', contentId)
      updateError = error
    }

    if (updateError) {
      console.error('Content update error:', updateError)
      return NextResponse.json({ error: 'Failed to update content' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unpublish error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
