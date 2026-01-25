import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkCooldown } from '@/lib/ai/cooldowns'
import type { CooldownType } from '@/types/database'

// GET - Check cooldown status for campaign or character intelligence
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as CooldownType | null
    const entityId = searchParams.get('entityId')

    if (!type || !['campaign_intelligence', 'character_intelligence'].includes(type)) {
      return NextResponse.json({ error: 'Invalid cooldown type' }, { status: 400 })
    }

    const status = await checkCooldown(user.id, type, entityId || undefined)

    return NextResponse.json({
      isOnCooldown: status.isOnCooldown,
      availableAt: status.availableAt?.toISOString() || null,
      remainingMs: status.remainingMs,
      remainingFormatted: status.remainingFormatted,
    })
  } catch (error) {
    console.error('Cooldown check error:', error)
    return NextResponse.json({ error: 'Failed to check cooldown' }, { status: 500 })
  }
}
