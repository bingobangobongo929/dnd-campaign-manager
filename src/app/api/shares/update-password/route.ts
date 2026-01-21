import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import bcrypt from 'bcryptjs'

interface UpdatePasswordRequest {
  shareCode: string
  newPassword: string | null // null to remove password
}

/**
 * POST /api/shares/update-password
 *
 * Updates or removes the password on a share link.
 * Only the owner of the share can update the password.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: UpdatePasswordRequest = await request.json()
    const { shareCode, newPassword } = body

    if (!shareCode) {
      return NextResponse.json({ error: 'Share code is required' }, { status: 400 })
    }

    // Find the share across all share tables
    const tables = ['campaign_shares', 'character_shares', 'oneshot_shares'] as const
    let shareTable: string | null = null
    let share: { id: string; user_id: string } | null = null

    for (const table of tables) {
      const { data } = await supabase
        .from(table)
        .select('id, user_id')
        .eq('share_code', shareCode)
        .single()

      if (data) {
        shareTable = table
        share = data
        break
      }
    }

    if (!share || !shareTable) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 })
    }

    // Verify ownership
    if (share.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Hash new password or set to null
    let passwordHash: string | null = null
    if (newPassword && newPassword.trim()) {
      passwordHash = await bcrypt.hash(newPassword.trim(), 10)
    }

    // Update the share
    const { error: updateError } = await supabase
      .from(shareTable)
      .update({ password_hash: passwordHash })
      .eq('share_code', shareCode)

    if (updateError) {
      console.error('Update password error:', updateError)
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      hasPassword: !!passwordHash,
    })
  } catch (error) {
    console.error('Update password error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
