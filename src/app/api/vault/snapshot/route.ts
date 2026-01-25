import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// GET /api/vault/snapshot - Get Session 0 or other snapshot for a vault character
export async function GET(request: NextRequest) {
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

  const searchParams = request.nextUrl.searchParams
  const vaultCharacterId = searchParams.get('vaultCharacterId')
  const campaignId = searchParams.get('campaignId')
  const snapshotType = searchParams.get('type') || 'session_0'

  if (!vaultCharacterId) {
    return NextResponse.json(
      { error: 'vaultCharacterId is required' },
      { status: 400 }
    )
  }

  try {
    // Verify user owns this vault character
    const { data: vaultCharacter, error: vaultError } = await supabase
      .from('vault_characters')
      .select('id, user_id')
      .eq('id', vaultCharacterId)
      .single()

    if (vaultError || !vaultCharacter || vaultCharacter.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Vault character not found or access denied' },
        { status: 404 }
      )
    }

    // Build the query
    let query = supabase
      .from('character_snapshots')
      .select('*')
      .eq('vault_character_id', vaultCharacterId)
      .eq('snapshot_type', snapshotType)

    // If campaign is specified, filter by it
    if (campaignId) {
      query = query.eq('campaign_id', campaignId)
    }

    // Order by created_at descending to get the most recent
    query = query.order('created_at', { ascending: false }).limit(1)

    const { data: snapshot, error: snapshotError } = await query.single()

    if (snapshotError) {
      // No snapshot found
      return NextResponse.json(
        { snapshot: null, message: 'No snapshot found' },
        { status: 200 }
      )
    }

    return NextResponse.json({ snapshot })

  } catch (error) {
    console.error('Snapshot fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch snapshot' },
      { status: 500 }
    )
  }
}
