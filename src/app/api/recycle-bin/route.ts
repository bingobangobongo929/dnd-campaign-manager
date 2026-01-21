import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface RecycleBinItem {
  id: string
  type: 'campaign' | 'character' | 'oneshot'
  name: string
  imageUrl: string | null
  deletedAt: string
  daysRemaining: number
}

/**
 * GET /api/recycle-bin
 * Returns all soft-deleted content for the current user
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    // Fetch deleted campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name, image_url, deleted_at')
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })

    if (campaignsError) {
      console.error('Error fetching deleted campaigns:', campaignsError)
    }

    // Fetch deleted vault characters
    const { data: characters, error: charactersError } = await supabase
      .from('vault_characters')
      .select('id, name, image_url, deleted_at')
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })

    if (charactersError) {
      console.error('Error fetching deleted characters:', charactersError)
    }

    // Fetch deleted oneshots
    const { data: oneshots, error: oneshotsError } = await supabase
      .from('oneshots')
      .select('id, title, image_url, deleted_at')
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })

    if (oneshotsError) {
      console.error('Error fetching deleted oneshots:', oneshotsError)
    }

    // Calculate days remaining for each item
    const calculateDaysRemaining = (deletedAt: string): number => {
      const deleted = new Date(deletedAt)
      const purgeDate = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000)
      const remaining = Math.ceil((purgeDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
      return Math.max(0, remaining)
    }

    // Transform to unified format
    const items: RecycleBinItem[] = [
      ...(campaigns || []).map(c => ({
        id: c.id,
        type: 'campaign' as const,
        name: c.name,
        imageUrl: c.image_url,
        deletedAt: c.deleted_at,
        daysRemaining: calculateDaysRemaining(c.deleted_at),
      })),
      ...(characters || []).map(c => ({
        id: c.id,
        type: 'character' as const,
        name: c.name,
        imageUrl: c.image_url,
        deletedAt: c.deleted_at,
        daysRemaining: calculateDaysRemaining(c.deleted_at),
      })),
      ...(oneshots || []).map(o => ({
        id: o.id,
        type: 'oneshot' as const,
        name: o.title,
        imageUrl: o.image_url,
        deletedAt: o.deleted_at,
        daysRemaining: calculateDaysRemaining(o.deleted_at),
      })),
    ]

    // Sort by deleted_at (most recent first)
    items.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime())

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Recycle bin error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
