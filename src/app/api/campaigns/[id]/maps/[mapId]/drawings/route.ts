import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

// GET: Fetch all drawings for a map
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mapId: string }> }
) {
  try {
    const { id: campaignId, mapId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check campaign access
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Check membership
    const isOwner = campaign.user_id === user.id
    const { data: membership } = await supabase
      .from('campaign_members')
      .select('role, permissions')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    const isDm = isOwner || membership?.role === 'co_dm'
    const isMember = isOwner || !!membership

    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this campaign' }, { status: 403 })
    }

    // Fetch drawings
    let query = supabase
      .from('map_drawings')
      .select('*')
      .eq('map_id', mapId)
      .order('layer_index', { ascending: true })
      .order('created_at', { ascending: true })

    // Filter by visibility for non-DMs
    if (!isDm) {
      query = query.in('visibility', ['public', 'party'])
    }

    const { data: drawings, error } = await query

    if (error) {
      console.error('Error fetching drawings:', error)
      return NextResponse.json({ error: 'Failed to fetch drawings' }, { status: 500 })
    }

    return NextResponse.json({ drawings: drawings || [] })
  } catch (error) {
    console.error('Drawings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Create a new drawing
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mapId: string }> }
) {
  try {
    const { id: campaignId, mapId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check campaign ownership or DM status
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const isOwner = campaign.user_id === user.id
    const { data: membership } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    const isDm = isOwner || membership?.role === 'co_dm'

    if (!isDm) {
      return NextResponse.json({ error: 'Only DMs can create drawings' }, { status: 403 })
    }

    const body = await request.json()
    const {
      drawing_type,
      points,
      x,
      y,
      width,
      height,
      radius,
      stroke_color,
      stroke_width,
      fill_color,
      fill_opacity,
      text_content,
      font_size,
      font_family,
      layer_index,
      visibility,
    } = body

    // Validate required fields
    if (!drawing_type) {
      return NextResponse.json({ error: 'Drawing type is required' }, { status: 400 })
    }

    const { data: drawing, error } = await supabase
      .from('map_drawings')
      .insert({
        map_id: mapId,
        drawing_type,
        points: points || [],
        x: x ?? null,
        y: y ?? null,
        width: width ?? null,
        height: height ?? null,
        radius: radius ?? null,
        stroke_color: stroke_color || '#ffffff',
        stroke_width: stroke_width || 2,
        fill_color: fill_color || null,
        fill_opacity: fill_opacity ?? 0.3,
        text_content: text_content || null,
        font_size: font_size || 14,
        font_family: font_family || 'sans-serif',
        layer_index: layer_index || 0,
        visibility: visibility || 'public',
        locked: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating drawing:', error)
      return NextResponse.json({ error: 'Failed to create drawing' }, { status: 500 })
    }

    return NextResponse.json({ drawing })
  } catch (error) {
    console.error('Drawings POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: Update a drawing
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mapId: string }> }
) {
  try {
    const { id: campaignId, mapId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check DM status
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const isOwner = campaign.user_id === user.id
    const { data: membership } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    const isDm = isOwner || membership?.role === 'co_dm'

    if (!isDm) {
      return NextResponse.json({ error: 'Only DMs can update drawings' }, { status: 403 })
    }

    const body = await request.json()
    const { drawingId, ...updates } = body

    if (!drawingId) {
      return NextResponse.json({ error: 'Drawing ID is required' }, { status: 400 })
    }

    const { data: drawing, error } = await supabase
      .from('map_drawings')
      .update(updates)
      .eq('id', drawingId)
      .eq('map_id', mapId)
      .select()
      .single()

    if (error) {
      console.error('Error updating drawing:', error)
      return NextResponse.json({ error: 'Failed to update drawing' }, { status: 500 })
    }

    return NextResponse.json({ drawing })
  } catch (error) {
    console.error('Drawings PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Delete a drawing
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mapId: string }> }
) {
  try {
    const { id: campaignId, mapId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check DM status
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, user_id')
      .eq('id', campaignId)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const isOwner = campaign.user_id === user.id
    const { data: membership } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    const isDm = isOwner || membership?.role === 'co_dm'

    if (!isDm) {
      return NextResponse.json({ error: 'Only DMs can delete drawings' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const drawingId = searchParams.get('id')

    if (!drawingId) {
      return NextResponse.json({ error: 'Drawing ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('map_drawings')
      .delete()
      .eq('id', drawingId)
      .eq('map_id', mapId)

    if (error) {
      console.error('Error deleting drawing:', error)
      return NextResponse.json({ error: 'Failed to delete drawing' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Drawings DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
