import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { OneshotEncounterInsert, OneshotEncounterUpdate } from '@/types/database'

// GET - Get all encounters for a oneshot
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

    const { data: encounters, error } = await supabase
      .from('oneshot_encounters')
      .select('*')
      .eq('oneshot_id', oneshotId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Failed to fetch encounters:', error)
      return NextResponse.json({ error: 'Failed to fetch encounters' }, { status: 500 })
    }

    return NextResponse.json({ encounters })
  } catch (error) {
    console.error('Get encounters error:', error)
    return NextResponse.json({ error: 'Failed to get encounters' }, { status: 500 })
  }
}

// POST - Create a new encounter
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
      difficulty,
      enemies,
      tactics,
      terrain,
      rewards,
      mapId,
      sortOrder = 0,
    } = body as {
      name: string
      description?: string
      difficulty?: 'easy' | 'medium' | 'hard' | 'deadly'
      enemies?: Array<{ name: string; count: number; hp?: number; ac?: number; notes?: string }>
      tactics?: string
      terrain?: string
      rewards?: string
      mapId?: string
      sortOrder?: number
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const encounterData: OneshotEncounterInsert = {
      oneshot_id: oneshotId,
      name,
      description: description || null,
      difficulty: difficulty || 'medium',
      enemies: enemies || [],
      tactics: tactics || null,
      terrain: terrain || null,
      rewards: rewards || null,
      map_id: mapId || null,
      sort_order: sortOrder,
    }

    const { data: encounter, error } = await supabase
      .from('oneshot_encounters')
      .insert(encounterData)
      .select()
      .single()

    if (error) {
      console.error('Failed to create encounter:', error)
      return NextResponse.json({ error: 'Failed to create encounter' }, { status: 500 })
    }

    // Update oneshot flag
    await supabase
      .from('oneshots')
      .update({ has_structured_encounters: true })
      .eq('id', oneshotId)

    return NextResponse.json({ encounter })
  } catch (error) {
    console.error('Create encounter error:', error)
    return NextResponse.json({ error: 'Failed to create encounter' }, { status: 500 })
  }
}

// PATCH - Update an encounter
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
    const { encounterId, ...updates } = body as {
      encounterId: string
      name?: string
      description?: string
      difficulty?: 'easy' | 'medium' | 'hard' | 'deadly'
      enemies?: Array<{ name: string; count: number; hp?: number; ac?: number; notes?: string }>
      tactics?: string
      terrain?: string
      rewards?: string
      mapId?: string
      sortOrder?: number
    }

    if (!encounterId) {
      return NextResponse.json({ error: 'encounterId is required' }, { status: 400 })
    }

    const updateData: OneshotEncounterUpdate = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.difficulty !== undefined) updateData.difficulty = updates.difficulty
    if (updates.enemies !== undefined) updateData.enemies = updates.enemies
    if (updates.tactics !== undefined) updateData.tactics = updates.tactics
    if (updates.terrain !== undefined) updateData.terrain = updates.terrain
    if (updates.rewards !== undefined) updateData.rewards = updates.rewards
    if (updates.mapId !== undefined) updateData.map_id = updates.mapId
    if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder

    const { data: encounter, error } = await supabase
      .from('oneshot_encounters')
      .update(updateData)
      .eq('id', encounterId)
      .eq('oneshot_id', oneshotId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update encounter:', error)
      return NextResponse.json({ error: 'Failed to update encounter' }, { status: 500 })
    }

    return NextResponse.json({ encounter })
  } catch (error) {
    console.error('Update encounter error:', error)
    return NextResponse.json({ error: 'Failed to update encounter' }, { status: 500 })
  }
}

// DELETE - Delete an encounter
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: oneshotId } = await params
    const { searchParams } = new URL(request.url)
    const encounterId = searchParams.get('encounterId')

    if (!encounterId) {
      return NextResponse.json({ error: 'encounterId is required' }, { status: 400 })
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
      .from('oneshot_encounters')
      .delete()
      .eq('id', encounterId)
      .eq('oneshot_id', oneshotId)

    if (error) {
      console.error('Failed to delete encounter:', error)
      return NextResponse.json({ error: 'Failed to delete encounter' }, { status: 500 })
    }

    // Check if there are any remaining encounters
    const { count } = await supabase
      .from('oneshot_encounters')
      .select('*', { count: 'exact', head: true })
      .eq('oneshot_id', oneshotId)

    if (count === 0) {
      await supabase
        .from('oneshots')
        .update({ has_structured_encounters: false })
        .eq('id', oneshotId)
    }

    return NextResponse.json({ message: 'Encounter deleted' })
  } catch (error) {
    console.error('Delete encounter error:', error)
    return NextResponse.json({ error: 'Failed to delete encounter' }, { status: 500 })
  }
}
