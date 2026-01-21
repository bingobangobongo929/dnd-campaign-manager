import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/recycle-bin/empty
 * Permanently deletes ALL items from the user's recycle bin
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete all soft-deleted campaigns
    const { error: campaignsError } = await supabase
      .from('campaigns')
      .delete()
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)

    if (campaignsError) {
      console.error('Error emptying campaigns:', campaignsError)
    }

    // Delete all soft-deleted vault characters
    const { error: charactersError } = await supabase
      .from('vault_characters')
      .delete()
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)

    if (charactersError) {
      console.error('Error emptying characters:', charactersError)
    }

    // Delete all soft-deleted oneshots
    const { error: oneshotsError } = await supabase
      .from('oneshots')
      .delete()
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)

    if (oneshotsError) {
      console.error('Error emptying oneshots:', oneshotsError)
    }

    // Check if any errors occurred
    if (campaignsError || charactersError || oneshotsError) {
      return NextResponse.json({
        error: 'Some items could not be deleted',
        partial: true
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Empty recycle bin error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
