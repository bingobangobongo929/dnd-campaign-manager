import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { MapPinInsert, MapPinUpdate } from '@/types/database'

// GET - Get all pins for a map
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mapId: string }> }
) {
  try {
    const { id: campaignId, mapId } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check campaign access
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    const isOwner = campaign?.user_id === user.id

    const { data: membership } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (!isOwner && !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const isDm = isOwner || membership?.role === 'co_dm'

    // Build query for pins
    let query = supabase
      .from('map_pins')
      .select('*')
      .eq('map_id', mapId)
      .order('sort_order', { ascending: true })

    // If not DM, filter by visibility
    if (!isDm) {
      query = query.in('visibility', ['public', 'party'])
    }

    const { data: pins, error } = await query

    if (error) {
      console.error('Failed to fetch pins:', error)
      return NextResponse.json({ error: 'Failed to fetch pins' }, { status: 500 })
    }

    return NextResponse.json({ pins, isDm })
  } catch (error) {
    console.error('Get pins error:', error)
    return NextResponse.json({ error: 'Failed to get pins' }, { status: 500 })
  }
}

// POST - Create a new pin
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mapId: string }> }
) {
  try {
    const { id: campaignId, mapId } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is owner or co_dm
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    const isOwner = campaign?.user_id === user.id

    const { data: membership } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    const isCoGm = membership?.role === 'co_dm'

    if (!isOwner && !isCoGm) {
      return NextResponse.json({ error: 'Only DMs can add pins' }, { status: 403 })
    }

    const body = await request.json()
    const {
      x,
      y,
      label,
      description,
      icon,
      color,
      linkedEntityType,
      linkedEntityId,
      visibility = 'public',
      sortOrder = 0,
    } = body as {
      x: number
      y: number
      label: string
      description?: string
      icon?: string
      color?: string
      linkedEntityType?: string
      linkedEntityId?: string
      visibility?: 'public' | 'party' | 'dm_only'
      sortOrder?: number
    }

    if (typeof x !== 'number' || typeof y !== 'number' || !label) {
      return NextResponse.json({ error: 'x, y, and label are required' }, { status: 400 })
    }

    const pinData: MapPinInsert = {
      map_id: mapId,
      map_type: 'campaign',
      x,
      y,
      label,
      description: description || null,
      icon: icon || 'MapPin',
      color: color || '#9333ea',
      linked_entity_type: linkedEntityType || null,
      linked_entity_id: linkedEntityId || null,
      visibility,
      sort_order: sortOrder,
    }

    const { data: pin, error } = await supabase
      .from('map_pins')
      .insert(pinData)
      .select()
      .single()

    if (error) {
      console.error('Failed to create pin:', error)
      return NextResponse.json({ error: 'Failed to create pin' }, { status: 500 })
    }

    return NextResponse.json({ pin })
  } catch (error) {
    console.error('Create pin error:', error)
    return NextResponse.json({ error: 'Failed to create pin' }, { status: 500 })
  }
}

// PATCH - Update a pin
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mapId: string }> }
) {
  try {
    const { id: campaignId, mapId } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is owner or co_dm
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    const isOwner = campaign?.user_id === user.id

    const { data: membership } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    const isCoGm = membership?.role === 'co_dm'

    if (!isOwner && !isCoGm) {
      return NextResponse.json({ error: 'Only DMs can update pins' }, { status: 403 })
    }

    const body = await request.json()
    const { pinId, ...updates } = body as {
      pinId: string
      x?: number
      y?: number
      label?: string
      description?: string
      icon?: string
      color?: string
      linkedEntityType?: string
      linkedEntityId?: string
      visibility?: 'public' | 'party' | 'dm_only'
      sortOrder?: number
    }

    if (!pinId) {
      return NextResponse.json({ error: 'pinId is required' }, { status: 400 })
    }

    // Verify pin belongs to this map
    const { data: existingPin } = await supabase
      .from('map_pins')
      .select('id')
      .eq('id', pinId)
      .eq('map_id', mapId)
      .single()

    if (!existingPin) {
      return NextResponse.json({ error: 'Pin not found' }, { status: 404 })
    }

    const updateData: MapPinUpdate = {}
    if (updates.x !== undefined) updateData.x = updates.x
    if (updates.y !== undefined) updateData.y = updates.y
    if (updates.label !== undefined) updateData.label = updates.label
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.icon !== undefined) updateData.icon = updates.icon
    if (updates.color !== undefined) updateData.color = updates.color
    if (updates.linkedEntityType !== undefined) updateData.linked_entity_type = updates.linkedEntityType
    if (updates.linkedEntityId !== undefined) updateData.linked_entity_id = updates.linkedEntityId
    if (updates.visibility !== undefined) updateData.visibility = updates.visibility
    if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder

    const { data: pin, error } = await supabase
      .from('map_pins')
      .update(updateData)
      .eq('id', pinId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update pin:', error)
      return NextResponse.json({ error: 'Failed to update pin' }, { status: 500 })
    }

    return NextResponse.json({ pin })
  } catch (error) {
    console.error('Update pin error:', error)
    return NextResponse.json({ error: 'Failed to update pin' }, { status: 500 })
  }
}

// DELETE - Delete a pin
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mapId: string }> }
) {
  try {
    const { id: campaignId, mapId } = await params
    const { searchParams } = new URL(request.url)
    const pinId = searchParams.get('pinId')

    if (!pinId) {
      return NextResponse.json({ error: 'pinId is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is owner or co_dm
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('user_id')
      .eq('id', campaignId)
      .single()

    const isOwner = campaign?.user_id === user.id

    const { data: membership } = await supabase
      .from('campaign_members')
      .select('role')
      .eq('campaign_id', campaignId)
      .eq('user_id', user.id)
      .single()

    const isCoGm = membership?.role === 'co_dm'

    if (!isOwner && !isCoGm) {
      return NextResponse.json({ error: 'Only DMs can delete pins' }, { status: 403 })
    }

    const { error } = await supabase
      .from('map_pins')
      .delete()
      .eq('id', pinId)
      .eq('map_id', mapId)

    if (error) {
      console.error('Failed to delete pin:', error)
      return NextResponse.json({ error: 'Failed to delete pin' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Pin deleted' })
  } catch (error) {
    console.error('Delete pin error:', error)
    return NextResponse.json({ error: 'Failed to delete pin' }, { status: 500 })
  }
}
