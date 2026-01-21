import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SetInactiveRequest {
  contentType: 'campaign' | 'character' | 'oneshot'
  contentId: string
  reason: string // 'completed', 'on_hiatus', 'retired', 'deceased', 'archived'
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: SetInactiveRequest = await request.json()
    const { contentType, contentId, reason } = body

    if (!contentType || !contentId || !reason) {
      return NextResponse.json({ error: 'Content type, ID, and reason required' }, { status: 400 })
    }

    // Validate reason based on content type
    const validReasons: Record<string, string[]> = {
      campaign: ['completed', 'on_hiatus', 'retired'],
      character: ['retired', 'deceased', 'on_hiatus'],
      oneshot: ['completed', 'archived'],
    }

    if (!validReasons[contentType]?.includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason for content type' }, { status: 400 })
    }

    const updateData = {
      content_mode: 'inactive',
      inactive_reason: reason,
    }

    let error: any = null
    if (contentType === 'campaign') {
      const result = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', contentId)
        .eq('user_id', user.id)
      error = result.error
    } else if (contentType === 'character') {
      const result = await supabase
        .from('vault_characters')
        .update(updateData)
        .eq('id', contentId)
        .eq('user_id', user.id)
      error = result.error
    } else if (contentType === 'oneshot') {
      const result = await supabase
        .from('oneshots')
        .update(updateData)
        .eq('id', contentId)
        .eq('user_id', user.id)
      error = result.error
    }

    if (error) {
      console.error('Set inactive error:', error)
      return NextResponse.json({ error: 'Failed to set inactive' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Set inactive error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
