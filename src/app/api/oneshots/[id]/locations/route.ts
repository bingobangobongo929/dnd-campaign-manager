import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { OneshotLocationInsert, OneshotLocationUpdate } from '@/types/database'

// GET - Get all locations for a oneshot
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: oneshotId } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns the oneshot
    const { data: oneshot } = await supabase
      .from('oneshots')
      .select('user_id')
      .eq('id', oneshotId)
      .single()

    if (!oneshot || oneshot.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data: locations, error } = await supabase
      .from('oneshot_locations')
      .select('*')
      .eq('oneshot_id', oneshotId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Failed to fetch locations:', error)
      return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 })
    }

    return NextResponse.json({ locations })
  } catch (error) {
    console.error('Get locations error:', error)
    return NextResponse.json({ error: 'Failed to get locations' }, { status: 500 })
  }
}

// POST - Create a new location
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: oneshotId } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns the oneshot
    const { data: oneshot } = await supabase
      .from('oneshots')
      .select('user_id')
      .eq('id', oneshotId)
      .single()

    if (!oneshot || oneshot.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      description,
      features,
      connectedLocations,
      mapId,
      sortOrder = 0,
    } = body as {
      name: string
      description?: string
      features?: string
      connectedLocations?: string[]
      mapId?: string
      sortOrder?: number
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const locationData: OneshotLocationInsert = {
      oneshot_id: oneshotId,
      name,
      description: description || null,
      features: features || null,
      connected_locations: connectedLocations || [],
      map_id: mapId || null,
      sort_order: sortOrder,
    }

    const { data: location, error } = await supabase
      .from('oneshot_locations')
      .insert(locationData)
      .select()
      .single()

    if (error) {
      console.error('Failed to create location:', error)
      return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
    }

    // Update oneshot flag
    await supabase
      .from('oneshots')
      .update({ has_structured_locations: true })
      .eq('id', oneshotId)

    return NextResponse.json({ location })
  } catch (error) {
    console.error('Create location error:', error)
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 })
  }
}

// PATCH - Update a location
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: oneshotId } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns the oneshot
    const { data: oneshot } = await supabase
      .from('oneshots')
      .select('user_id')
      .eq('id', oneshotId)
      .single()

    if (!oneshot || oneshot.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await request.json()
    const { locationId, ...updates } = body as {
      locationId: string
      name?: string
      description?: string
      features?: string
      connectedLocations?: string[]
      mapId?: string
      sortOrder?: number
    }

    if (!locationId) {
      return NextResponse.json({ error: 'locationId is required' }, { status: 400 })
    }

    const updateData: OneshotLocationUpdate = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.features !== undefined) updateData.features = updates.features
    if (updates.connectedLocations !== undefined) updateData.connected_locations = updates.connectedLocations
    if (updates.mapId !== undefined) updateData.map_id = updates.mapId
    if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder

    const { data: location, error } = await supabase
      .from('oneshot_locations')
      .update(updateData)
      .eq('id', locationId)
      .eq('oneshot_id', oneshotId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update location:', error)
      return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
    }

    return NextResponse.json({ location })
  } catch (error) {
    console.error('Update location error:', error)
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
  }
}

// DELETE - Delete a location
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: oneshotId } = await params
    const { searchParams } = new URL(request.url)
    const locationId = searchParams.get('locationId')

    if (!locationId) {
      return NextResponse.json({ error: 'locationId is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user owns the oneshot
    const { data: oneshot } = await supabase
      .from('oneshots')
      .select('user_id')
      .eq('id', oneshotId)
      .single()

    if (!oneshot || oneshot.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { error } = await supabase
      .from('oneshot_locations')
      .delete()
      .eq('id', locationId)
      .eq('oneshot_id', oneshotId)

    if (error) {
      console.error('Failed to delete location:', error)
      return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 })
    }

    // Check if there are any remaining locations
    const { count } = await supabase
      .from('oneshot_locations')
      .select('*', { count: 'exact', head: true })
      .eq('oneshot_id', oneshotId)

    if (count === 0) {
      await supabase
        .from('oneshots')
        .update({ has_structured_locations: false })
        .eq('id', oneshotId)
    }

    return NextResponse.json({ message: 'Location deleted' })
  } catch (error) {
    console.error('Delete location error:', error)
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 })
  }
}
