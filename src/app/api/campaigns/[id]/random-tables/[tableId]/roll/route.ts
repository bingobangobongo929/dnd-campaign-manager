import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { RandomTableEntry } from '@/types/database'

// POST - Roll on a table and optionally log the result
export async function POST(
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
    const { data: table, error: tableError } = await supabase
      .from('random_tables')
      .select('*')
      .eq('id', tableId)
      .eq('campaign_id', campaignId)
      .single()

    if (tableError || !table) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 })
    }

    const entries = table.entries as RandomTableEntry[]
    if (!entries || entries.length === 0) {
      return NextResponse.json({ error: 'Table has no entries' }, { status: 400 })
    }

    // Calculate die size
    const dieSize = table.roll_type === 'custom'
      ? table.custom_die_size || 20
      : parseInt(table.roll_type.slice(1))

    // Roll the die
    const rollValue = Math.floor(Math.random() * dieSize) + 1

    // Select entry (simple index-based for now, could add weighted selection)
    const entryIndex = (rollValue - 1) % entries.length
    const selectedEntry = entries[entryIndex]

    // Parse request body for optional session_id and log_roll flag
    const body = await request.json().catch(() => ({}))
    const { session_id, log_roll = false, note } = body as {
      session_id?: string
      log_roll?: boolean
      note?: string
    }

    // Log the roll if requested
    if (log_roll) {
      await supabase.from('random_table_rolls').insert({
        table_id: tableId,
        session_id: session_id || null,
        user_id: user.id,
        roll_value: rollValue,
        entry_id: selectedEntry.id,
        entry_text: selectedEntry.text,
        note: note || null,
      })
    }

    return NextResponse.json({
      roll_value: rollValue,
      die_type: table.roll_type === 'custom' ? `d${table.custom_die_size}` : table.roll_type,
      entry: selectedEntry,
      table_name: table.name,
    })
  } catch (error) {
    console.error('Random table roll error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Get roll history for a table
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

    // Fetch roll history
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const sessionId = searchParams.get('session_id')

    let query = supabase
      .from('random_table_rolls')
      .select('*')
      .eq('table_id', tableId)
      .order('rolled_at', { ascending: false })
      .limit(limit)

    if (sessionId) {
      query = query.eq('session_id', sessionId)
    }

    const { data: rolls, error } = await query

    if (error) {
      console.error('Failed to fetch roll history:', error)
      return NextResponse.json({ error: 'Failed to fetch roll history' }, { status: 500 })
    }

    return NextResponse.json({ rolls })
  } catch (error) {
    console.error('Roll history GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
