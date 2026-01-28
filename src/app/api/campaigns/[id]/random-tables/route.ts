import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isDmRole } from '@/lib/permissions'
import type { CampaignMemberRole, RandomTableEntry, RandomTableCategory, RandomTableDieType } from '@/types/database'

// GET - List all random tables for a campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
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

    // Fetch tables
    const { data: tables, error } = await supabase
      .from('random_tables')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('name')

    if (error) {
      console.error('Failed to fetch random tables:', error)
      return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 })
    }

    return NextResponse.json({ tables })
  } catch (error) {
    console.error('Random tables GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new random table
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
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
      return NextResponse.json({ error: 'Only DMs can create random tables' }, { status: 403 })
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
    } = body as {
      name: string
      description?: string
      category?: RandomTableCategory
      entries: RandomTableEntry[]
      roll_type?: RandomTableDieType
      custom_die_size?: number
      tags?: string[]
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!entries?.length) {
      return NextResponse.json({ error: 'At least one entry is required' }, { status: 400 })
    }

    const { data: table, error } = await supabase
      .from('random_tables')
      .insert({
        campaign_id: campaignId,
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        category: category || 'general',
        entries,
        roll_type: roll_type || 'd20',
        custom_die_size: roll_type === 'custom' ? custom_die_size : null,
        tags: tags || [],
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create random table:', error)
      return NextResponse.json({ error: 'Failed to create table' }, { status: 500 })
    }

    return NextResponse.json({ table }, { status: 201 })
  } catch (error) {
    console.error('Random tables POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
