import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - List all published versions of a template
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { searchParams } = new URL(request.url)
    const contentType = searchParams.get('type')
    const contentId = searchParams.get('id')

    if (!contentType || !contentId) {
      return NextResponse.json({ error: 'Content type and ID required' }, { status: 400 })
    }

    // Get all versions
    const { data: versions, error } = await supabase
      .from('template_snapshots')
      .select('id, version, version_name, version_notes, save_count, published_at, allow_save')
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .order('version', { ascending: false })

    if (error) {
      console.error('Fetch versions error:', error)
      return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 })
    }

    // Check if user is the owner (for showing more details)
    let isOwner = false
    if (user) {
      if (contentType === 'campaign') {
        const { data } = await supabase
          .from('campaigns')
          .select('user_id')
          .eq('id', contentId)
          .single()
        isOwner = data?.user_id === user.id
      } else if (contentType === 'character') {
        const { data } = await supabase
          .from('vault_characters')
          .select('user_id')
          .eq('id', contentId)
          .single()
        isOwner = data?.user_id === user.id
      } else if (contentType === 'oneshot') {
        const { data } = await supabase
          .from('oneshots')
          .select('user_id')
          .eq('id', contentId)
          .single()
        isOwner = data?.user_id === user.id
      }
    }

    return NextResponse.json({
      versions: versions || [],
      isOwner,
      latestVersion: versions && versions.length > 0 ? versions[0].version : null,
    })
  } catch (error) {
    console.error('Fetch versions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
