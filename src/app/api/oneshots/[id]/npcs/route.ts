import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { OneshotNpcInsert, OneshotNpcUpdate } from '@/types/database'

// GET - Get all NPCs for a oneshot
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

    const { data: npcs, error } = await supabase
      .from('oneshot_npcs')
      .select('*')
      .eq('oneshot_id', oneshotId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Failed to fetch NPCs:', error)
      return NextResponse.json({ error: 'Failed to fetch NPCs' }, { status: 500 })
    }

    return NextResponse.json({ npcs })
  } catch (error) {
    console.error('Get NPCs error:', error)
    return NextResponse.json({ error: 'Failed to get NPCs' }, { status: 500 })
  }
}

// POST - Create a new NPC
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
      appearance,
      personality,
      motivation,
      statBlock,
      externalLink,
      imageUrl,
      sortOrder = 0,
    } = body as {
      name: string
      description?: string
      appearance?: string
      personality?: string
      motivation?: string
      statBlock?: string
      externalLink?: string
      imageUrl?: string
      sortOrder?: number
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const npcData: OneshotNpcInsert = {
      oneshot_id: oneshotId,
      name,
      description: description || null,
      appearance: appearance || null,
      personality: personality || null,
      motivation: motivation || null,
      stat_block: statBlock || null,
      external_link: externalLink || null,
      image_url: imageUrl || null,
      sort_order: sortOrder,
    }

    const { data: npc, error } = await supabase
      .from('oneshot_npcs')
      .insert(npcData)
      .select()
      .single()

    if (error) {
      console.error('Failed to create NPC:', error)
      return NextResponse.json({ error: 'Failed to create NPC' }, { status: 500 })
    }

    // Update oneshot flag
    await supabase
      .from('oneshots')
      .update({ has_structured_npcs: true })
      .eq('id', oneshotId)

    return NextResponse.json({ npc })
  } catch (error) {
    console.error('Create NPC error:', error)
    return NextResponse.json({ error: 'Failed to create NPC' }, { status: 500 })
  }
}

// PATCH - Update an NPC
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
    const { npcId, ...updates } = body as {
      npcId: string
      name?: string
      description?: string
      appearance?: string
      personality?: string
      motivation?: string
      statBlock?: string
      externalLink?: string
      imageUrl?: string
      sortOrder?: number
    }

    if (!npcId) {
      return NextResponse.json({ error: 'npcId is required' }, { status: 400 })
    }

    const updateData: OneshotNpcUpdate = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.appearance !== undefined) updateData.appearance = updates.appearance
    if (updates.personality !== undefined) updateData.personality = updates.personality
    if (updates.motivation !== undefined) updateData.motivation = updates.motivation
    if (updates.statBlock !== undefined) updateData.stat_block = updates.statBlock
    if (updates.externalLink !== undefined) updateData.external_link = updates.externalLink
    if (updates.imageUrl !== undefined) updateData.image_url = updates.imageUrl
    if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder

    const { data: npc, error } = await supabase
      .from('oneshot_npcs')
      .update(updateData)
      .eq('id', npcId)
      .eq('oneshot_id', oneshotId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update NPC:', error)
      return NextResponse.json({ error: 'Failed to update NPC' }, { status: 500 })
    }

    return NextResponse.json({ npc })
  } catch (error) {
    console.error('Update NPC error:', error)
    return NextResponse.json({ error: 'Failed to update NPC' }, { status: 500 })
  }
}

// DELETE - Delete an NPC
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: oneshotId } = await params
    const { searchParams } = new URL(request.url)
    const npcId = searchParams.get('npcId')

    if (!npcId) {
      return NextResponse.json({ error: 'npcId is required' }, { status: 400 })
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
      .from('oneshot_npcs')
      .delete()
      .eq('id', npcId)
      .eq('oneshot_id', oneshotId)

    if (error) {
      console.error('Failed to delete NPC:', error)
      return NextResponse.json({ error: 'Failed to delete NPC' }, { status: 500 })
    }

    // Check if there are any remaining NPCs
    const { count } = await supabase
      .from('oneshot_npcs')
      .select('*', { count: 'exact', head: true })
      .eq('oneshot_id', oneshotId)

    if (count === 0) {
      await supabase
        .from('oneshots')
        .update({ has_structured_npcs: false })
        .eq('id', oneshotId)
    }

    return NextResponse.json({ message: 'NPC deleted' })
  } catch (error) {
    console.error('Delete NPC error:', error)
    return NextResponse.json({ error: 'Failed to delete NPC' }, { status: 500 })
  }
}
