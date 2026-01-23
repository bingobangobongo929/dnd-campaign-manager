import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Get all secrets for a campaign (or filtered by entity)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')

    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is owner or co_dm (only they can see secrets)
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

    const isCoGm = membership?.role === 'co_dm'

    if (!isOwner && !isCoGm) {
      return NextResponse.json({ error: 'Only DMs can view secrets' }, { status: 403 })
    }

    // Build query
    let query = supabase
      .from('entity_secrets')
      .select('*')
      .eq('campaign_id', campaignId)

    if (entityType) {
      query = query.eq('entity_type', entityType)
    }

    if (entityId) {
      query = query.eq('entity_id', entityId)
    }

    const { data: secrets, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch secrets:', error)
      return NextResponse.json({ error: 'Failed to fetch secrets' }, { status: 500 })
    }

    return NextResponse.json({ secrets })
  } catch (error) {
    console.error('Get secrets error:', error)
    return NextResponse.json({ error: 'Failed to get secrets' }, { status: 500 })
  }
}

// POST - Create a new secret
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is owner or co_dm
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

    const isCoGm = membership?.role === 'co_dm'

    if (!isOwner && !isCoGm) {
      return NextResponse.json({ error: 'Only DMs can create secrets' }, { status: 403 })
    }

    const body = await request.json()
    const { entityType, entityId, fieldName, content, visibility } = body as {
      entityType: 'character' | 'session' | 'timeline_event' | 'lore' | 'faction' | 'location' | 'artifact'
      entityId: string
      fieldName?: string
      content: string
      visibility?: 'dm_only' | 'party' | 'public'
    }

    if (!entityType || !entityId || !content) {
      return NextResponse.json({ error: 'entityType, entityId, and content are required' }, { status: 400 })
    }

    const validEntityTypes = ['character', 'session', 'timeline_event', 'lore', 'faction', 'location', 'artifact']
    if (!validEntityTypes.includes(entityType)) {
      return NextResponse.json({ error: 'Invalid entityType' }, { status: 400 })
    }

    const secretData = {
      campaign_id: campaignId,
      entity_type: entityType,
      entity_id: entityId,
      field_name: fieldName || null,
      content,
      visibility: visibility || 'dm_only',
    }

    const { data: secret, error } = await supabase
      .from('entity_secrets')
      .insert(secretData)
      .select()
      .single()

    if (error) {
      console.error('Failed to create secret:', error)
      return NextResponse.json({ error: 'Failed to create secret' }, { status: 500 })
    }

    return NextResponse.json({ secret })
  } catch (error) {
    console.error('Create secret error:', error)
    return NextResponse.json({ error: 'Failed to create secret' }, { status: 500 })
  }
}

// PATCH - Update a secret (including revealing it)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is owner or co_dm
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

    const isCoGm = membership?.role === 'co_dm'

    if (!isOwner && !isCoGm) {
      return NextResponse.json({ error: 'Only DMs can update secrets' }, { status: 403 })
    }

    const body = await request.json()
    const { secretId, content, visibility, reveal, revealInSessionId } = body as {
      secretId: string
      content?: string
      visibility?: 'dm_only' | 'party' | 'public'
      reveal?: boolean
      revealInSessionId?: string
    }

    if (!secretId) {
      return NextResponse.json({ error: 'secretId is required' }, { status: 400 })
    }

    // Verify secret belongs to this campaign
    const { data: existingSecret } = await supabase
      .from('entity_secrets')
      .select('id')
      .eq('id', secretId)
      .eq('campaign_id', campaignId)
      .single()

    if (!existingSecret) {
      return NextResponse.json({ error: 'Secret not found' }, { status: 404 })
    }

    const updateData: {
      content?: string
      visibility?: 'dm_only' | 'party' | 'public'
      revealed_at?: string
      revealed_in_session_id?: string
    } = {}

    if (content !== undefined) updateData.content = content
    if (visibility) updateData.visibility = visibility

    if (reveal) {
      updateData.revealed_at = new Date().toISOString()
      if (revealInSessionId) {
        updateData.revealed_in_session_id = revealInSessionId
      }
      // When revealing, typically change visibility to party or public
      if (!visibility) {
        updateData.visibility = 'party'
      }
    }

    const { data: secret, error } = await supabase
      .from('entity_secrets')
      .update(updateData)
      .eq('id', secretId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update secret:', error)
      return NextResponse.json({ error: 'Failed to update secret' }, { status: 500 })
    }

    return NextResponse.json({ secret })
  } catch (error) {
    console.error('Update secret error:', error)
    return NextResponse.json({ error: 'Failed to update secret' }, { status: 500 })
  }
}

// DELETE - Delete a secret
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params
    const { searchParams } = new URL(request.url)
    const secretId = searchParams.get('secretId')

    if (!secretId) {
      return NextResponse.json({ error: 'secretId is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is owner or co_dm
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

    const isCoGm = membership?.role === 'co_dm'

    if (!isOwner && !isCoGm) {
      return NextResponse.json({ error: 'Only DMs can delete secrets' }, { status: 403 })
    }

    // Delete the secret
    const { error } = await supabase
      .from('entity_secrets')
      .delete()
      .eq('id', secretId)
      .eq('campaign_id', campaignId)

    if (error) {
      console.error('Failed to delete secret:', error)
      return NextResponse.json({ error: 'Failed to delete secret' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Secret deleted' })
  } catch (error) {
    console.error('Delete secret error:', error)
    return NextResponse.json({ error: 'Failed to delete secret' }, { status: 500 })
  }
}
