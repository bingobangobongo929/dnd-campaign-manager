import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RestoreRequest {
  contentType: 'campaign' | 'character' | 'oneshot'
  contentId: string
}

/**
 * POST /api/recycle-bin/restore
 * Restores a soft-deleted item
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: RestoreRequest = await request.json()
    const { contentType, contentId } = body

    if (!contentType || !contentId) {
      return NextResponse.json({ error: 'Content type and ID required' }, { status: 400 })
    }

    let tableName: string
    switch (contentType) {
      case 'campaign':
        tableName = 'campaigns'
        break
      case 'character':
        tableName = 'vault_characters'
        break
      case 'oneshot':
        tableName = 'oneshots'
        break
      default:
        return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
    }

    // Restore by setting deleted_at to null
    const { error } = await supabase
      .from(tableName)
      .update({ deleted_at: null })
      .eq('id', contentId)
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)

    if (error) {
      console.error('Restore error:', error)
      return NextResponse.json({ error: 'Failed to restore content' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Restore error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
