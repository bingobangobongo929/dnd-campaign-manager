import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface PurgeRequest {
  contentType: 'campaign' | 'character' | 'oneshot'
  contentId: string
}

/**
 * POST /api/recycle-bin/purge
 * Permanently deletes a single item from recycle bin
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: PurgeRequest = await request.json()
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

    // Only delete if already soft-deleted (in recycle bin)
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', contentId)
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)

    if (error) {
      console.error('Purge error:', error)
      return NextResponse.json({ error: 'Failed to permanently delete content' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Purge error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
