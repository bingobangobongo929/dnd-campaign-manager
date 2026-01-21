import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Get template stats for the creator
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const contentType = searchParams.get('type')
    const contentId = searchParams.get('id')

    // If specific content requested
    if (contentType && contentId) {
      // Verify ownership
      let isOwner = false
      if (contentType === 'campaign') {
        const { data } = await supabase
          .from('campaigns')
          .select('user_id, template_save_count')
          .eq('id', contentId)
          .single()
        isOwner = data?.user_id === user.id
        if (!isOwner) {
          return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }
      } else if (contentType === 'character') {
        const { data } = await supabase
          .from('vault_characters')
          .select('user_id, template_save_count')
          .eq('id', contentId)
          .single()
        isOwner = data?.user_id === user.id
        if (!isOwner) {
          return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }
      } else if (contentType === 'oneshot') {
        const { data } = await supabase
          .from('oneshots')
          .select('user_id, template_save_count')
          .eq('id', contentId)
          .single()
        isOwner = data?.user_id === user.id
        if (!isOwner) {
          return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }
      }

      // Get all snapshot IDs for this content first
      const { data: snapshots } = await supabase
        .from('template_snapshots')
        .select('id')
        .eq('content_type', contentType)
        .eq('content_id', contentId)

      const snapshotIds = (snapshots || []).map(s => s.id)

      // Get saves for this specific template
      const { data: saves, error } = snapshotIds.length > 0
        ? await supabase
            .from('content_saves')
            .select('id, saved_at, started_playing_at')
            .eq('source_owner_id', user.id)
            .in('snapshot_id', snapshotIds)
        : { data: [], error: null }

      // Get version stats
      const { data: versions } = await supabase
        .from('template_snapshots')
        .select('version, save_count, published_at')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .order('version', { ascending: false })

      const totalSaves = versions?.reduce((sum, v) => sum + v.save_count, 0) || 0
      const totalStarted = saves?.filter(s => s.started_playing_at).length || 0

      return NextResponse.json({
        totalSaves,
        totalStarted,
        versions: versions || [],
        recentSaves: saves?.slice(0, 10) || [],
      })
    }

    // Get overall stats for all user's templates
    const { data: campaignSaves } = await supabase
      .from('campaigns')
      .select('template_save_count')
      .eq('user_id', user.id)
      .eq('content_mode', 'template')

    const { data: characterSaves } = await supabase
      .from('vault_characters')
      .select('template_save_count')
      .eq('user_id', user.id)
      .eq('content_mode', 'template')

    const { data: oneshotSaves } = await supabase
      .from('oneshots')
      .select('template_save_count')
      .eq('user_id', user.id)
      .eq('content_mode', 'template')

    const campaignTotal = campaignSaves?.reduce((sum, c) => sum + (c.template_save_count || 0), 0) || 0
    const characterTotal = characterSaves?.reduce((sum, c) => sum + (c.template_save_count || 0), 0) || 0
    const oneshotTotal = oneshotSaves?.reduce((sum, c) => sum + (c.template_save_count || 0), 0) || 0

    return NextResponse.json({
      totalSaves: campaignTotal + characterTotal + oneshotTotal,
      byType: {
        campaigns: campaignTotal,
        characters: characterTotal,
        oneshots: oneshotTotal,
      },
      templateCounts: {
        campaigns: campaignSaves?.length || 0,
        characters: characterSaves?.length || 0,
        oneshots: oneshotSaves?.length || 0,
      },
    })
  } catch (error) {
    console.error('Stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
