import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface UpdateSavedRequest {
  saveId: string
  newSnapshotId: string
}

// POST - Update a saved reference to a newer snapshot version
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: UpdateSavedRequest = await request.json()
    const { saveId, newSnapshotId } = body

    if (!saveId || !newSnapshotId) {
      return NextResponse.json({ error: 'Save ID and new snapshot ID required' }, { status: 400 })
    }

    // Verify the save belongs to the user
    const { data: existingSave, error: saveError } = await supabase
      .from('content_saves')
      .select('*')
      .eq('id', saveId)
      .eq('user_id', user.id)
      .single()

    if (saveError || !existingSave) {
      return NextResponse.json({ error: 'Save not found' }, { status: 404 })
    }

    // Get the new snapshot and verify it's for the same content
    const { data: newSnapshot, error: snapshotError } = await supabase
      .from('template_snapshots')
      .select('*')
      .eq('id', newSnapshotId)
      .single()

    if (snapshotError || !newSnapshot) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 })
    }

    // Get the old snapshot to verify same content
    const { data: oldSnapshot } = await supabase
      .from('template_snapshots')
      .select('content_type, content_id')
      .eq('id', existingSave.snapshot_id)
      .single()

    if (oldSnapshot && (
      oldSnapshot.content_type !== newSnapshot.content_type ||
      oldSnapshot.content_id !== newSnapshot.content_id
    )) {
      return NextResponse.json({ error: 'New snapshot must be for the same content' }, { status: 400 })
    }

    // Update the save to point to the new snapshot
    const { error: updateError } = await supabase
      .from('content_saves')
      .update({
        snapshot_id: newSnapshotId,
        saved_version: newSnapshot.version,
        latest_available_version: newSnapshot.version,
        update_available: false,
      })
      .eq('id', saveId)

    if (updateError) {
      console.error('Update save error:', updateError)
      return NextResponse.json({ error: 'Failed to update save' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      newVersion: newSnapshot.version,
    })
  } catch (error) {
    console.error('Update saved error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
