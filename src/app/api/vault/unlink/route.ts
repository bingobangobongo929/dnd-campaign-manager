import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

interface CampaignLink {
  campaign_id: string
  character_id: string
  joined_at: string
}

// POST /api/vault/unlink - Unlink a vault character from a campaign
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
      vaultCharacterId,
      campaignId,
      action // 'leave' | 'memory' | 'merge'
    } = body

    if (!vaultCharacterId || !campaignId || !action) {
      return NextResponse.json(
        { error: 'vaultCharacterId, campaignId, and action are required' },
        { status: 400 }
      )
    }

    if (!['leave', 'memory', 'merge'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be leave, memory, or merge' },
        { status: 400 }
      )
    }

    // Fetch the vault character
    const { data: vaultCharacter, error: fetchError } = await supabase
      .from('vault_characters')
      .select('*')
      .eq('id', vaultCharacterId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !vaultCharacter) {
      return NextResponse.json(
        { error: 'Vault character not found or access denied' },
        { status: 404 }
      )
    }

    // Get the campaign link
    const campaignLinks = (vaultCharacter.campaign_links as CampaignLink[]) || []
    const link = campaignLinks.find(l => l.campaign_id === campaignId)

    if (!link) {
      return NextResponse.json(
        { error: 'Character is not linked to this campaign' },
        { status: 400 }
      )
    }

    // Get the campaign character (if exists)
    const { data: campaignCharacter } = await supabase
      .from('characters')
      .select('*')
      .eq('id', link.character_id)
      .single()

    switch (action) {
      case 'leave': {
        // Remove from campaign_links, remove membership
        const newLinks = campaignLinks.filter(l => l.campaign_id !== campaignId)

        // Update vault character
        await supabase
          .from('vault_characters')
          .update({ campaign_links: newLinks })
          .eq('id', vaultCharacterId)

        // Remove campaign membership
        await supabase
          .from('campaign_members')
          .delete()
          .eq('user_id', user.id)
          .eq('campaign_id', campaignId)

        // Clear vault_character_id on campaign character if it exists
        if (campaignCharacter) {
          await supabase
            .from('characters')
            .update({ vault_character_id: null })
            .eq('id', link.character_id)
        }

        // If no more campaign links, remove linked_campaign_id
        if (newLinks.length === 0) {
          await supabase
            .from('vault_characters')
            .update({ linked_campaign_id: null })
            .eq('id', vaultCharacterId)
        }

        return NextResponse.json({
          success: true,
          message: 'Left campaign successfully',
          action: 'leave'
        })
      }

      case 'memory': {
        // Stop syncing but keep record - just update content_mode to 'archived'
        // Remove from campaign_links but mark as archived
        const newLinks = campaignLinks.filter(l => l.campaign_id !== campaignId)

        // Get current notes if any
        const privateNotes = (vaultCharacter.private_campaign_notes as Record<string, string>) || {}

        // Update vault character to be a "memory" - archived state
        await supabase
          .from('vault_characters')
          .update({
            campaign_links: newLinks,
            content_mode: 'inactive',
            inactive_reason: `Campaign memory from "${campaignId}" - stopped syncing on ${new Date().toISOString().split('T')[0]}`,
            // Preserve private notes
            private_campaign_notes: privateNotes,
          })
          .eq('id', vaultCharacterId)

        // Update campaign character to not point to vault
        if (campaignCharacter) {
          await supabase
            .from('characters')
            .update({ vault_character_id: null })
            .eq('id', link.character_id)
        }

        // If no more campaign links, remove linked_campaign_id
        if (newLinks.length === 0) {
          await supabase
            .from('vault_characters')
            .update({ linked_campaign_id: null })
            .eq('id', vaultCharacterId)
        }

        return NextResponse.json({
          success: true,
          message: 'Character kept as memory',
          action: 'memory'
        })
      }

      case 'merge': {
        // Copy all campaign character updates back to vault character
        if (!campaignCharacter) {
          return NextResponse.json(
            { error: 'Campaign character not found - cannot merge' },
            { status: 404 }
          )
        }

        // Remove from campaign_links
        const newLinks = campaignLinks.filter(l => l.campaign_id !== campaignId)

        // Merge campaign character data into vault character
        // Only update fields that have values in campaign character
        const mergeData: Record<string, any> = {
          campaign_links: newLinks,
          content_mode: 'active', // Re-activate if it was inactive
          inactive_reason: null,
        }

        // Fields to merge from campaign character
        const fieldsToMerge = [
          'name', 'summary', 'description', 'notes', 'image_url',
          'race', 'class', 'subclass', 'level', 'background',
          'status', 'status_color'
        ]

        fieldsToMerge.forEach(field => {
          if (campaignCharacter[field] !== null && campaignCharacter[field] !== undefined) {
            mergeData[field] = campaignCharacter[field]
          }
        })

        // Update vault character with merged data
        await supabase
          .from('vault_characters')
          .update(mergeData)
          .eq('id', vaultCharacterId)

        // Update campaign character to not point to vault
        await supabase
          .from('characters')
          .update({ vault_character_id: null })
          .eq('id', link.character_id)

        // If no more campaign links, remove linked_campaign_id
        if (newLinks.length === 0) {
          await supabase
            .from('vault_characters')
            .update({ linked_campaign_id: null })
            .eq('id', vaultCharacterId)
        }

        return NextResponse.json({
          success: true,
          message: 'Campaign updates merged to vault character',
          action: 'merge'
        })
      }
    }

  } catch (error) {
    console.error('Unlink error:', error)
    return NextResponse.json(
      { error: 'Failed to unlink character' },
      { status: 500 }
    )
  }
}
