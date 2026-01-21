import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { nanoid } from 'nanoid'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { characterId, includedSections, expiresInDays, note, password, shareType } = await request.json()

    if (!characterId) {
      return NextResponse.json({ error: 'Character ID required' }, { status: 400 })
    }

    // Verify ownership
    const { data: character, error: fetchError } = await supabase
      .from('vault_characters')
      .select('id')
      .eq('id', characterId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    // Generate unique share code
    const shareCode = nanoid(12)

    // Calculate expiration
    let expiresAt = null
    if (expiresInDays) {
      expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + expiresInDays)
    }

    // Default included sections if not specified
    const sections = includedSections || {
      summary: true,
      backstory: true,
      appearance: true,
      personality: true,
      goals: false,
      secrets: false,
      quotes: true,
      storyCharacters: true,
      journal: false,
    }

    // Hash password if provided
    let passwordHash: string | null = null
    if (password && password.trim()) {
      passwordHash = await bcrypt.hash(password.trim(), 10)
    }

    // Create share record
    const { data: share, error: shareError } = await supabase
      .from('character_shares')
      .insert({
        share_code: shareCode,
        character_id: characterId,
        included_sections: sections,
        expires_at: expiresAt,
        note: note || null,
        password_hash: passwordHash,
        share_type: shareType || 'party',
      })
      .select()
      .single()

    if (shareError) {
      console.error('Share creation error:', shareError)
      return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
    }

    return NextResponse.json({
      shareCode,
      shareUrl: `/share/c/${shareCode}`,
      expiresAt,
      hasPassword: !!passwordHash,
      shareType: shareType || 'party',
    })
  } catch (error) {
    console.error('Share error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const shareCode = searchParams.get('code')

    if (!shareCode) {
      return NextResponse.json({ error: 'Share code required' }, { status: 400 })
    }

    // Verify ownership via character
    const { data: share } = await supabase
      .from('character_shares')
      .select(`
        id,
        character_id,
        vault_characters!inner(user_id)
      `)
      .eq('share_code', shareCode)
      .single()

    if (!share || (share.vault_characters as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 })
    }

    await supabase
      .from('character_shares')
      .delete()
      .eq('share_code', shareCode)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete share error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
