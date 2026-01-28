import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isDmRole } from '@/lib/permissions'
import type { CampaignMemberRole, RandomTableEntry, RandomTableCategory, RandomTableDieType } from '@/types/database'

// GET - Get a single random table
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tableId: string }> }
) {
  try {
    const { id: campaignId, tableId } = await params
    const supabase = await createClient()

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
      return NextResponse.json({ error: 'No access to this campaign' }, { status: 403 })
    }

    // Fetch table
    const { data: table, error } = await supabase
      .from('random_tables')
      .select('*')
      .eq('id', tableId)
      .eq('campaign_id', campaignId)
      .single()

    if (error || !table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    return NextResponse.json({ table })
  } catch (error) {
    console.error('Random table GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update a random table
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tableId: string }> }
) {
  try {
    const { id: campaignId, tableId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check DM permission
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

    const role = (membership?.role || (isOwner ? 'owner' : null)) as CampaignMemberRole | null
    const isDm = isDmRole(isOwner, role)

    if (!isDm) {
      return NextResponse.json({ error: 'Only DMs can update random tables' }, { status: 403 })
    }

    // Verify table exists
    const { data: existingTable } = await supabase
      .from('random_tables')
      .select('id')
      .eq('id', tableId)
      .eq('campaign_id', campaignId)
      .single()

    if (!existingTable) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      name,
      description,
      category,
      entries,
      roll_type,
      custom_die_size,
      tags,
      is_archived,
    } = body as {
      name?: string
      description?: string
      category?: RandomTableCategory
      entries?: RandomTableEntry[]
      roll_type?: RandomTableDieType
      custom_die_size?: number
      tags?: string[]
      is_archived?: boolean
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name.trim()
    if (description !== undefined) updateData.description = description?.trim() || null
    if (category !== undefined) updateData.category = category
    if (entries !== undefined) updateData.entries = entries
    if (roll_type !== undefined) updateData.roll_type = roll_type
    if (custom_die_size !== undefined) updateData.custom_die_size = roll_type === 'custom' ? custom_die_size : null
    if (tags !== undefined) updateData.tags = tags
    if (is_archived !== undefined) updateData.is_archived = is_archived

    const { data: table, error } = await supabase
      .from('random_tables')
      .update(updateData)
      .eq('id', tableId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update random table:', error)
      return NextResponse.json({ error: 'Failed to update table' }, { status: 500 })
    }

    return NextResponse.json({ table })
  } catch (error) {
    console.error('Random table PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete a random table
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tableId: string }> }
) {
  try {
    const { id: campaignId, tableId } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check DM permission
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

    const role = (membership?.role || (isOwner ? 'owner' : null)) as CampaignMemberRole | null
    const isDm = isDmRole(isOwner, role)

    if (!isDm) {
      return NextResponse.json({ error: 'Only DMs can delete random tables' }, { status: 403 })
    }

    const { error } = await supabase
      .from('random_tables')
      .delete()
      .eq('id', tableId)
      .eq('campaign_id', campaignId)

    if (error) {
      console.error('Failed to delete random table:', error)
      return NextResponse.json({ error: 'Failed to delete table' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Random table DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
