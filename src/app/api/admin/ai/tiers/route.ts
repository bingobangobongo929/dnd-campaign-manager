import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin } from '@/lib/admin'
import type { UserRole } from '@/types/database'

// GET - Get all tier settings
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!userSettings || !isAdmin(userSettings.role as UserRole)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { data: tiers, error } = await supabase
      .from('ai_tier_settings')
      .select('*')
      .order('tier')

    if (error) {
      console.error('Failed to fetch tier settings:', error)
      return NextResponse.json({ error: 'Failed to fetch tier settings' }, { status: 500 })
    }

    return NextResponse.json({ tiers })
  } catch (error) {
    console.error('Get tier settings error:', error)
    return NextResponse.json({ error: 'Failed to get tier settings' }, { status: 500 })
  }
}

// PATCH - Update a tier's settings
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!userSettings || !isAdmin(userSettings.role as UserRole)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const {
      tier,
      campaignIntelligenceCooldownHours,
      characterIntelligenceCooldownHours,
      importLimitPerDay,
    } = body as {
      tier: string
      campaignIntelligenceCooldownHours?: number
      characterIntelligenceCooldownHours?: number
      importLimitPerDay?: number | null
    }

    if (!tier) {
      return NextResponse.json({ error: 'tier is required' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }

    if (campaignIntelligenceCooldownHours !== undefined) {
      updateData.campaign_intelligence_cooldown_hours = campaignIntelligenceCooldownHours
    }
    if (characterIntelligenceCooldownHours !== undefined) {
      updateData.character_intelligence_cooldown_hours = characterIntelligenceCooldownHours
    }
    if (importLimitPerDay !== undefined) {
      updateData.import_limit_per_day = importLimitPerDay
    }

    const { data: updatedTier, error } = await supabase
      .from('ai_tier_settings')
      .update(updateData)
      .eq('tier', tier)
      .select()
      .single()

    if (error) {
      console.error('Failed to update tier settings:', error)
      return NextResponse.json({ error: 'Failed to update tier settings' }, { status: 500 })
    }

    return NextResponse.json({ tier: updatedTier })
  } catch (error) {
    console.error('Update tier settings error:', error)
    return NextResponse.json({ error: 'Failed to update tier settings' }, { status: 500 })
  }
}

// POST - Create or reset tier settings (for initial setup)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!userSettings || !isAdmin(userSettings.role as UserRole)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Default tier settings
    const defaultTiers = [
      {
        tier: 'free',
        campaign_intelligence_cooldown_hours: 24,
        character_intelligence_cooldown_hours: 24,
        import_limit_per_day: 5,
        updated_by: user.id,
      },
      {
        tier: 'adventurer',
        campaign_intelligence_cooldown_hours: 24,
        character_intelligence_cooldown_hours: 24,
        import_limit_per_day: null, // unlimited
        updated_by: user.id,
      },
      {
        tier: 'hero',
        campaign_intelligence_cooldown_hours: 12,
        character_intelligence_cooldown_hours: 12,
        import_limit_per_day: null,
        updated_by: user.id,
      },
      {
        tier: 'legend',
        campaign_intelligence_cooldown_hours: 12,
        character_intelligence_cooldown_hours: 12,
        import_limit_per_day: null,
        updated_by: user.id,
      },
    ]

    const { data, error } = await supabase
      .from('ai_tier_settings')
      .upsert(defaultTiers, { onConflict: 'tier' })
      .select()

    if (error) {
      console.error('Failed to create tier settings:', error)
      return NextResponse.json({ error: 'Failed to create tier settings' }, { status: 500 })
    }

    return NextResponse.json({ tiers: data, message: 'Tier settings initialized' })
  } catch (error) {
    console.error('Create tier settings error:', error)
    return NextResponse.json({ error: 'Failed to create tier settings' }, { status: 500 })
  }
}
