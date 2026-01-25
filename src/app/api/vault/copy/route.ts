import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// POST /api/vault/copy - Copy a character state to a new standalone vault character
export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const {
      source, // 'in_play' | 'session_0'
      vaultCharacterId,
      campaignId,
      newName, // Optional: custom name for the copy
    } = body

    if (!source || !vaultCharacterId) {
      return NextResponse.json(
        { error: 'source and vaultCharacterId are required' },
        { status: 400 }
      )
    }

    // Verify user owns this vault character
    const { data: vaultCharacter, error: vaultError } = await supabase
      .from('vault_characters')
      .select('*')
      .eq('id', vaultCharacterId)
      .eq('user_id', user.id)
      .single()

    if (vaultError || !vaultCharacter) {
      return NextResponse.json(
        { error: 'Vault character not found or access denied' },
        { status: 404 }
      )
    }

    let sourceData: any = null

    if (source === 'session_0') {
      // Get data from Session 0 snapshot
      const { data: snapshot } = await supabase
        .from('character_snapshots')
        .select('snapshot_data')
        .eq('vault_character_id', vaultCharacterId)
        .eq('snapshot_type', 'session_0')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!snapshot) {
        return NextResponse.json(
          { error: 'No Session 0 snapshot found' },
          { status: 404 }
        )
      }

      sourceData = snapshot.snapshot_data
    } else if (source === 'in_play') {
      // Use current in-play character state
      sourceData = vaultCharacter
    } else {
      return NextResponse.json(
        { error: 'Invalid source. Must be "in_play" or "session_0"' },
        { status: 400 }
      )
    }

    if (!sourceData) {
      return NextResponse.json(
        { error: 'No source data found' },
        { status: 404 }
      )
    }

    // Create new standalone vault character
    // Exclude fields that shouldn't be copied
    const {
      id,
      user_id,
      created_at,
      updated_at,
      campaign_links,
      linked_campaign_id,
      private_campaign_notes,
      content_mode,
      inactive_reason,
      ...copyableFields
    } = sourceData

    const timestamp = new Date().toISOString()

    const newCharacterData = {
      ...copyableFields,
      user_id: user.id,
      name: newName || `${sourceData.name} (Copy)`,
      campaign_links: [], // Not linked to any campaign
      linked_campaign_id: null,
      private_campaign_notes: {}, // Fresh notes
      content_mode: 'active', // Active status
      inactive_reason: null,
      created_at: timestamp,
      updated_at: timestamp,
    }

    const { data: newCharacter, error: insertError } = await supabase
      .from('vault_characters')
      .insert(newCharacterData)
      .select()
      .single()

    if (insertError) {
      console.error('Copy insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create character copy' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      character: newCharacter,
      message: `Created "${newCharacter.name}" in your vault`,
    })

  } catch (error) {
    console.error('Copy error:', error)
    return NextResponse.json(
      { error: 'Failed to copy character' },
      { status: 500 }
    )
  }
}
