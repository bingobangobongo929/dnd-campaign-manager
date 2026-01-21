import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - List all saved templates for the current user
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const contentType = searchParams.get('type') // 'campaign', 'character', 'oneshot', or null for all

    // Build query
    let query = supabase
      .from('content_saves')
      .select(`
        *,
        snapshot:template_snapshots(
          id,
          content_type,
          content_id,
          version,
          version_name,
          allow_save,
          attribution_name,
          template_description,
          template_tags,
          published_at
        )
      `)
      .eq('user_id', user.id)
      .order('saved_at', { ascending: false })

    if (contentType) {
      query = query.eq('source_type', contentType)
    }

    const { data: saves, error } = await query

    if (error) {
      console.error('Fetch saves error:', error)
      return NextResponse.json({ error: 'Failed to fetch saved templates' }, { status: 500 })
    }

    // Group by type for easier frontend consumption
    const grouped = {
      campaigns: saves?.filter(s => s.source_type === 'campaign') || [],
      characters: saves?.filter(s => s.source_type === 'character') || [],
      oneshots: saves?.filter(s => s.source_type === 'oneshot') || [],
    }

    return NextResponse.json({
      saves: saves || [],
      grouped,
      counts: {
        campaigns: grouped.campaigns.length,
        characters: grouped.characters.length,
        oneshots: grouped.oneshots.length,
        total: saves?.length || 0,
      },
    })
  } catch (error) {
    console.error('Fetch saves error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
