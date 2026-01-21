import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface PublishRequest {
  contentType: 'campaign' | 'character' | 'oneshot'
  contentId: string
  versionName?: string
  versionNotes?: string
  allowSave?: boolean
  attributionName?: string
  templateDescription?: string
  templateTags?: string[]
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: PublishRequest = await request.json()
    const {
      contentType,
      contentId,
      versionName,
      versionNotes,
      allowSave = false,
      attributionName,
      templateDescription,
      templateTags,
    } = body

    if (!contentType || !contentId) {
      return NextResponse.json({ error: 'Content type and ID required' }, { status: 400 })
    }

    // Verify ownership and get content based on type
    let content: any = null
    let relatedData: any = null

    if (contentType === 'campaign') {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', contentId)
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
      }
      content = data

      // Fetch related data for campaigns
      const [
        { data: characters },
        { data: tags },
        { data: characterTags },
        { data: canvasGroups },
        { data: relationships },
        { data: worldMaps },
        { data: mediaGallery },
        { data: lore },
      ] = await Promise.all([
        supabase.from('characters').select('*').eq('campaign_id', contentId),
        supabase.from('tags').select('*').eq('campaign_id', contentId),
        supabase.from('character_tags').select('*').in(
          'character_id',
          characters?.map(c => c.id) || []
        ),
        supabase.from('canvas_groups').select('*').eq('campaign_id', contentId),
        supabase.from('character_relationships').select('*').eq('campaign_id', contentId),
        supabase.from('world_maps').select('*').eq('campaign_id', contentId),
        supabase.from('media_gallery').select('*').eq('campaign_id', contentId),
        supabase.from('campaign_lore').select('*').eq('campaign_id', contentId),
      ])

      relatedData = {
        characters: characters || [],
        tags: tags || [],
        characterTags: characterTags || [],
        canvasGroups: canvasGroups || [],
        relationships: relationships || [],
        worldMaps: worldMaps || [],
        mediaGallery: mediaGallery || [],
        lore: lore || [],
      }

    } else if (contentType === 'character') {
      const { data, error } = await supabase
        .from('vault_characters')
        .select('*')
        .eq('id', contentId)
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Character not found' }, { status: 404 })
      }
      content = data

      // Fetch related data for characters
      const [
        { data: images },
        { data: relationships },
        { data: spells },
        { data: writings },
        { data: locations },
      ] = await Promise.all([
        supabase.from('vault_character_images').select('*').eq('character_id', contentId),
        supabase.from('vault_character_relationships').select('*').eq('character_id', contentId),
        supabase.from('vault_character_spells').select('*').eq('character_id', contentId),
        supabase.from('vault_character_writings').select('*').eq('character_id', contentId),
        supabase.from('vault_character_locations').select('*').eq('character_id', contentId),
      ])

      relatedData = {
        images: images || [],
        relationships: relationships || [],
        spells: spells || [],
        writings: writings || [],
        locations: locations || [],
      }

    } else if (contentType === 'oneshot') {
      const { data, error } = await supabase
        .from('oneshots')
        .select('*')
        .eq('id', contentId)
        .eq('user_id', user.id)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Oneshot not found' }, { status: 404 })
      }
      content = data
      relatedData = {} // Oneshots don't have much related data to copy
    }

    // Get the current highest version for this content
    const { data: existingSnapshots } = await supabase
      .from('template_snapshots')
      .select('version')
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .order('version', { ascending: false })
      .limit(1)

    const nextVersion = existingSnapshots && existingSnapshots.length > 0
      ? existingSnapshots[0].version + 1
      : 1

    // Create the snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from('template_snapshots')
      .insert({
        user_id: user.id,
        content_type: contentType,
        content_id: contentId,
        version: nextVersion,
        version_name: versionName,
        version_notes: versionNotes,
        snapshot_data: content,
        related_data: relatedData,
        allow_save: allowSave,
        attribution_name: attributionName,
        template_description: templateDescription,
        template_tags: templateTags,
      })
      .select()
      .single()

    if (snapshotError) {
      console.error('Snapshot creation error:', snapshotError)
      return NextResponse.json({ error: 'Failed to create snapshot' }, { status: 500 })
    }

    // Update the content to template mode and set published fields
    const updateData: any = {
      content_mode: 'template',
      template_version: nextVersion,
      published_at: content.published_at || new Date().toISOString(),
      is_session0_ready: true,
      allow_save: allowSave,
      attribution_name: attributionName,
      template_description: templateDescription,
      template_tags: templateTags,
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
      // Don't fail - snapshot is already created
    }

    // Clean up old unused snapshots (those with 0 saves, keeping the latest)
    if (nextVersion > 1) {
      const { data: oldSnapshots } = await supabase
        .from('template_snapshots')
        .select('id, version, save_count')
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .lt('version', nextVersion)
        .eq('save_count', 0)

      if (oldSnapshots && oldSnapshots.length > 0) {
        for (const oldSnapshot of oldSnapshots) {
          await supabase
            .from('template_snapshots')
            .delete()
            .eq('id', oldSnapshot.id)
        }
      }
    }

    return NextResponse.json({
      success: true,
      snapshot: {
        id: snapshot.id,
        version: snapshot.version,
        published_at: snapshot.published_at,
      },
    })
  } catch (error) {
    console.error('Publish error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
