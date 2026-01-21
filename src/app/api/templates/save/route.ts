import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SaveRequest {
  snapshotId: string
}

// POST - Save a template to collection
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SaveRequest = await request.json()
    const { snapshotId } = body

    if (!snapshotId) {
      return NextResponse.json({ error: 'Snapshot ID required' }, { status: 400 })
    }

    // Get the snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from('template_snapshots')
      .select('*')
      .eq('id', snapshotId)
      .single()

    if (snapshotError || !snapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
    }

    // Check if saving is allowed
    if (!snapshot.allow_save) {
      return NextResponse.json({ error: 'This template does not allow saving' }, { status: 403 })
    }

    // Don't allow users to save their own content
    if (snapshot.user_id === user.id) {
      return NextResponse.json({ error: 'Cannot save your own template' }, { status: 400 })
    }

    // Check if already saved
    const { data: existingSave } = await supabase
      .from('content_saves')
      .select('id')
      .eq('user_id', user.id)
      .eq('snapshot_id', snapshotId)
      .single()

    if (existingSave) {
      return NextResponse.json({ error: 'Already saved to collection' }, { status: 400 })
    }

    // Get content name and image from snapshot
    const snapshotData = snapshot.snapshot_data as any
    const sourceName = snapshotData.name || snapshotData.title || 'Untitled'
    const sourceImageUrl = snapshotData.image_url || null

    // Create the save record
    const { data: save, error: saveError } = await supabase
      .from('content_saves')
      .insert({
        user_id: user.id,
        snapshot_id: snapshotId,
        source_type: snapshot.content_type,
        source_name: sourceName,
        source_image_url: sourceImageUrl,
        source_owner_id: snapshot.user_id,
        saved_version: snapshot.version,
        latest_available_version: snapshot.version,
        update_available: false,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Save error:', saveError)
      return NextResponse.json({ error: 'Failed to save to collection' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      save: {
        id: save.id,
        source_type: save.source_type,
        source_name: save.source_name,
        saved_version: save.saved_version,
      },
    })
  } catch (error) {
    console.error('Save error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove a save from collection
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const saveId = searchParams.get('saveId')
    const snapshotId = searchParams.get('snapshotId')

    if (!saveId && !snapshotId) {
      return NextResponse.json({ error: 'Save ID or Snapshot ID required' }, { status: 400 })
    }

    let deleteQuery = supabase
      .from('content_saves')
      .delete()
      .eq('user_id', user.id)

    if (saveId) {
      deleteQuery = deleteQuery.eq('id', saveId)
    } else if (snapshotId) {
      deleteQuery = deleteQuery.eq('snapshot_id', snapshotId)
    }

    const { error: deleteError } = await deleteQuery

    if (deleteError) {
      console.error('Delete save error:', deleteError)
      return NextResponse.json({ error: 'Failed to remove from collection' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete save error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
