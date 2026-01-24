import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface FogRegion {
  id: string
  x: number
  y: number
  radius: number
  revealed: boolean
}

// GET: Fetch fog of war data for a map
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

    // Fetch map with fog data
    const { data: map, error } = await supabase
      .from('world_maps')
      .select('terrain_data')
      .eq('id', mapId)
      .single()

    if (error) {
      console.error('Error fetching map fog:', error)
      return NextResponse.json({ error: 'Failed to fetch fog data' }, { status: 500 })
    }

    // Extract fog regions from terrain_data (stored under 'fog' key)
    const terrainData = (map?.terrain_data as Record<string, unknown>) || {}
    const fogRegions = (terrainData.fog as FogRegion[]) || []

    // For non-DMs, only return revealed regions (they just see the fog effect)
    // The actual fog rendering is handled client-side based on these regions
    return NextResponse.json({
      fogRegions,
      isDm,
    })
  } catch (error) {
    console.error('Fog GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Save fog of war data for a map (DM only)
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
      return NextResponse.json({ error: 'Only DMs can modify fog of war' }, { status: 403 })
    }

    const body = await request.json()
    const { fogRegions } = body as { fogRegions: FogRegion[] }

    if (!Array.isArray(fogRegions)) {
      return NextResponse.json({ error: 'fogRegions must be an array' }, { status: 400 })
    }

    // Get current terrain_data
    const { data: currentMap } = await supabase
      .from('world_maps')
      .select('terrain_data')
      .eq('id', mapId)
      .single()

    const currentTerrainData = (currentMap?.terrain_data as Record<string, unknown>) || {}

    // Update terrain_data with new fog regions
    const updatedTerrainData = {
      ...currentTerrainData,
      fog: fogRegions,
    }

    const { error } = await supabase
      .from('world_maps')
      .update({ terrain_data: updatedTerrainData })
      .eq('id', mapId)

    if (error) {
      console.error('Error saving fog:', error)
      return NextResponse.json({ error: 'Failed to save fog data' }, { status: 500 })
    }

    return NextResponse.json({ success: true, fogRegions })
  } catch (error) {
    console.error('Fog POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: Clear all fog of war for a map (DM only)
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
      return NextResponse.json({ error: 'Only DMs can clear fog of war' }, { status: 403 })
    }

    // Get current terrain_data
    const { data: currentMap } = await supabase
      .from('world_maps')
      .select('terrain_data')
      .eq('id', mapId)
      .single()

    const currentTerrainData = (currentMap?.terrain_data as Record<string, unknown>) || {}

    // Remove fog from terrain_data
    const { fog, ...restTerrainData } = currentTerrainData

    const { error } = await supabase
      .from('world_maps')
      .update({ terrain_data: restTerrainData })
      .eq('id', mapId)

    if (error) {
      console.error('Error clearing fog:', error)
      return NextResponse.json({ error: 'Failed to clear fog data' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Fog DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
