import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface ReactivateRequest {
  contentType: 'campaign' | 'character' | 'oneshot'
  contentId: string
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ReactivateRequest = await request.json()
    const { contentType, contentId } = body

    if (!contentType || !contentId) {
      return NextResponse.json({ error: 'Content type and ID required' }, { status: 400 })
    }

    const updateData = {
      content_mode: 'active',
      inactive_reason: null,
    }

    let error: any = null
    if (contentType === 'campaign') {
      const result = await supabase
        .from('campaigns')
        .update(updateData)
        .eq('id', contentId)
        .eq('user_id', user.id)
        .eq('content_mode', 'inactive') // Only reactivate if currently inactive
      error = result.error
    } else if (contentType === 'character') {
      const result = await supabase
        .from('vault_characters')
        .update(updateData)
        .eq('id', contentId)
        .eq('user_id', user.id)
        .eq('content_mode', 'inactive')
      error = result.error
    } else if (contentType === 'oneshot') {
      const result = await supabase
        .from('oneshots')
        .update(updateData)
        .eq('id', contentId)
        .eq('user_id', user.id)
        .eq('content_mode', 'inactive')
      error = result.error
    }

    if (error) {
      console.error('Reactivate error:', error)
      return NextResponse.json({ error: 'Failed to reactivate' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reactivate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
