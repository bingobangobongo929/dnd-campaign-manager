import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { oneshotId, includedSections, expiresInDays, note } = body

    // Verify user owns this oneshot
    const { data: oneshot } = await supabase
      .from('oneshots')
      .select('id, user_id')
      .eq('id', oneshotId)
      .single()

    if (!oneshot || oneshot.user_id !== user.id) {
      return NextResponse.json({ error: 'Oneshot not found' }, { status: 404 })
    }

    // Generate unique share code
    const shareCode = nanoid(10)

    // Calculate expiration
    let expiresAt = null
    if (expiresInDays) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresInDays)
    }

    // Create share record
    const { data: share, error } = await supabase
      .from('oneshot_shares')
      .insert({
        share_code: shareCode,
        oneshot_id: oneshotId,
        included_sections: includedSections,
        expires_at: expiresAt?.toISOString() || null,
        note: note || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Share creation error:', error)
      return NextResponse.json({ error: 'Failed to create share' }, { status: 500 })
    }

    return NextResponse.json({
      shareCode,
      shareUrl: `/share/oneshot/${shareCode}`,
    })
  } catch (error) {
    console.error('Share error:', error)
    return NextResponse.json({ error: 'Failed to create share' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json({ error: 'Share code required' }, { status: 400 })
    }

    // Get the share to verify ownership
    const { data: share } = await supabase
      .from('oneshot_shares')
      .select('*, oneshots!inner(user_id)')
      .eq('share_code', code)
      .single()

    if (!share || (share.oneshots as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 })
    }

    // Delete the share
    await supabase
      .from('oneshot_shares')
      .delete()
      .eq('share_code', code)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete share error:', error)
    return NextResponse.json({ error: 'Failed to delete share' }, { status: 500 })
  }
}
