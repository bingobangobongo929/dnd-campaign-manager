/**
 * Recent Items API
 *
 * GET: Fetch user's recent items (campaigns, characters, oneshots)
 * POST: Add/update a recent item (upsert on access)
 * DELETE: Clear all recent items for user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const { data: items, error } = await supabase
      .from('recent_items')
      .select('*')
      .eq('user_id', user.id)
      .order('accessed_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Recent items fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch recent items' }, { status: 500 })
    }

    return NextResponse.json({
      items: items || [],
    })
  } catch (error) {
    console.error('Recent items API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { itemType, itemId, itemName, itemSubtitle, itemImageUrl } = body

    // Validate required fields
    if (!itemType || !itemId || !itemName) {
      return NextResponse.json(
        { error: 'Missing required fields: itemType, itemId, itemName' },
        { status: 400 }
      )
    }

    // Validate item type
    if (!['campaign', 'character', 'oneshot'].includes(itemType)) {
      return NextResponse.json(
        { error: 'Invalid itemType. Must be campaign, character, or oneshot' },
        { status: 400 }
      )
    }

    // Upsert the recent item
    const { data, error } = await supabase
      .from('recent_items')
      .upsert(
        {
          user_id: user.id,
          item_type: itemType,
          item_id: itemId,
          item_name: itemName,
          item_subtitle: itemSubtitle || null,
          item_image_url: itemImageUrl || null,
          accessed_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,item_type,item_id',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Recent items upsert error:', error)
      return NextResponse.json({ error: 'Failed to update recent items' }, { status: 500 })
    }

    return NextResponse.json({ item: data })
  } catch (error) {
    console.error('Recent items API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const itemId = searchParams.get('itemId')
    const itemType = searchParams.get('itemType')

    if (itemId && itemType) {
      // Delete specific item
      const { error } = await supabase
        .from('recent_items')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', itemId)
        .eq('item_type', itemType)

      if (error) {
        console.error('Recent item delete error:', error)
        return NextResponse.json({ error: 'Failed to delete recent item' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'Item removed' })
    } else {
      // Clear all recent items for user
      const { error } = await supabase
        .from('recent_items')
        .delete()
        .eq('user_id', user.id)

      if (error) {
        console.error('Recent items clear error:', error)
        return NextResponse.json({ error: 'Failed to clear recent items' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'All recent items cleared' })
    }
  } catch (error) {
    console.error('Recent items API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
