import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, accountDeletionReminderEmail, accountDeletedEmail } from '@/lib/email'

// Use service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Extracts storage bucket and path from a Supabase storage URL
 */
function parseStorageUrl(url: string | null): { bucket: string; path: string } | null {
  if (!url) return null

  try {
    const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
    if (match) {
      return { bucket: match[1], path: match[2] }
    }
  } catch {
    // Invalid URL
  }
  return null
}

/**
 * Deletes files from Supabase storage
 */
async function deleteStorageFiles(files: { bucket: string; path: string }[]) {
  const byBucket = files.reduce((acc, file) => {
    if (!acc[file.bucket]) acc[file.bucket] = []
    acc[file.bucket].push(file.path)
    return acc
  }, {} as Record<string, string[]>)

  let totalDeleted = 0

  for (const [bucket, paths] of Object.entries(byBucket)) {
    try {
      const { error } = await supabaseAdmin.storage.from(bucket).remove(paths)
      if (error) {
        console.error(`Error deleting from ${bucket}:`, error)
      } else {
        totalDeleted += paths.length
      }
    } catch (err) {
      console.error(`Error deleting from ${bucket}:`, err)
    }
  }

  return totalDeleted
}

/**
 * Permanently deletes a user and all their data
 */
async function permanentlyDeleteUser(userId: string, userEmail: string) {
  const allMediaUrls: string[] = []

  try {
    // 1. Get all campaign IDs
    const { data: campaigns } = await supabaseAdmin
      .from('campaigns')
      .select('id, image_url')
      .eq('user_id', userId)

    const campaignIds = campaigns?.map(c => c.id) || []

    if (campaignIds.length > 0) {
      // Collect media URLs from campaigns
      if (campaigns) allMediaUrls.push(...campaigns.map(c => c.image_url).filter(Boolean))

      // Media gallery
      const { data: gallery } = await supabaseAdmin
        .from('media_gallery')
        .select('url')
        .in('campaign_id', campaignIds)
      if (gallery) allMediaUrls.push(...gallery.map(g => g.url).filter(Boolean))

      // World maps
      const { data: maps } = await supabaseAdmin
        .from('world_maps')
        .select('image_url')
        .in('campaign_id', campaignIds)
      if (maps) allMediaUrls.push(...maps.map(m => m.image_url).filter(Boolean))

      // Campaign characters/NPCs
      const { data: npcs } = await supabaseAdmin
        .from('characters')
        .select('image_url')
        .in('campaign_id', campaignIds)
      if (npcs) allMediaUrls.push(...npcs.map(n => n.image_url).filter(Boolean))

      // Delete session attendees
      const { data: sessions } = await supabaseAdmin
        .from('sessions')
        .select('id')
        .in('campaign_id', campaignIds)

      if (sessions && sessions.length > 0) {
        await supabaseAdmin
          .from('session_attendees')
          .delete()
          .in('session_id', sessions.map(s => s.id))
      }

      // Delete sessions
      await supabaseAdmin.from('sessions').delete().in('campaign_id', campaignIds)
      // Delete timeline events
      await supabaseAdmin.from('timeline_events').delete().in('campaign_id', campaignIds)
      // Delete character groups
      await supabaseAdmin.from('character_groups').delete().in('campaign_id', campaignIds)
      // Delete campaign characters
      await supabaseAdmin.from('characters').delete().in('campaign_id', campaignIds)
      // Delete campaigns
      await supabaseAdmin.from('campaigns').delete().eq('user_id', userId)
    }

    // 2. Get all vault character IDs
    const { data: vaultCharacters } = await supabaseAdmin
      .from('vault_characters')
      .select('id, image_url, detail_image_url')
      .eq('user_id', userId)

    const vaultCharacterIds = vaultCharacters?.map(vc => vc.id) || []

    if (vaultCharacterIds.length > 0) {
      // Collect media URLs
      if (vaultCharacters) {
        allMediaUrls.push(...vaultCharacters.map(c => c.image_url).filter(Boolean))
        allMediaUrls.push(...vaultCharacters.map(c => c.detail_image_url).filter(Boolean))
      }

      // Additional character images
      const { data: images } = await supabaseAdmin
        .from('vault_character_images')
        .select('image_url')
        .in('character_id', vaultCharacterIds)
      if (images) allMediaUrls.push(...images.map(i => i.image_url).filter(Boolean))

      // Delete character tags
      await supabaseAdmin.from('character_tags').delete().in('character_id', vaultCharacterIds)
      // Delete companions
      await supabaseAdmin.from('companions').delete().in('character_id', vaultCharacterIds)
      // Delete NPCs
      await supabaseAdmin.from('npcs').delete().in('character_id', vaultCharacterIds)
      // Delete vault sessions
      await supabaseAdmin.from('vault_sessions').delete().in('character_id', vaultCharacterIds)
      // Delete vault characters
      await supabaseAdmin.from('vault_characters').delete().eq('user_id', userId)
    }

    // 3. Delete oneshots
    const { data: oneshots } = await supabaseAdmin
      .from('oneshots')
      .select('id, image_url')
      .eq('user_id', userId)

    if (oneshots && oneshots.length > 0) {
      allMediaUrls.push(...oneshots.map(o => o.image_url).filter(Boolean))
      await supabaseAdmin.from('oneshots').delete().eq('user_id', userId)
    }

    // 4. Delete tags
    await supabaseAdmin.from('tags').delete().eq('user_id', userId)

    // 5. Get username for email before deleting settings
    const { data: userSettings } = await supabaseAdmin
      .from('user_settings')
      .select('username')
      .eq('user_id', userId)
      .single()

    const userName = userSettings?.username || userEmail?.split('@')[0] || 'Adventurer'

    // 6. Orphan template snapshots (preserve for users who saved them)
    // Update attribution to show "Anonymous" since original author is gone
    // Also scrub user_id from snapshot_data and related_data JSONB fields
    const { data: userSnapshots } = await supabaseAdmin
      .from('template_snapshots')
      .select('id, snapshot_data, related_data')
      .eq('user_id', userId)

    if (userSnapshots && userSnapshots.length > 0) {
      for (const snapshot of userSnapshots) {
        // Scrub user_id from snapshot_data (the main content)
        const scrubbedSnapshotData = snapshot.snapshot_data ? {
          ...snapshot.snapshot_data,
          user_id: null,
        } : null

        // Scrub user_id from related_data items (characters, etc.)
        let scrubbedRelatedData = snapshot.related_data
        if (scrubbedRelatedData && typeof scrubbedRelatedData === 'object') {
          scrubbedRelatedData = { ...scrubbedRelatedData }
          for (const key of Object.keys(scrubbedRelatedData)) {
            if (Array.isArray(scrubbedRelatedData[key])) {
              scrubbedRelatedData[key] = scrubbedRelatedData[key].map((item: Record<string, unknown>) => {
                if (item && typeof item === 'object' && 'user_id' in item) {
                  return { ...item, user_id: null }
                }
                return item
              })
            }
          }
        }

        await supabaseAdmin
          .from('template_snapshots')
          .update({
            attribution_name: 'Anonymous',
            author_deleted_at: new Date().toISOString(),
            snapshot_data: scrubbedSnapshotData,
            related_data: scrubbedRelatedData,
          })
          .eq('id', snapshot.id)
      }
    }

    // Also update content_saves to clear the source_owner_id
    await supabaseAdmin
      .from('content_saves')
      .update({ source_owner_id: null })
      .eq('source_owner_id', userId)

    // 7. Delete user settings
    await supabaseAdmin.from('user_settings').delete().eq('user_id', userId)

    // 8. Delete the user from Supabase Auth
    await supabaseAdmin.auth.admin.deleteUser(userId)

    // 9. Delete all storage files
    const storageFiles = allMediaUrls
      .map(parseStorageUrl)
      .filter((f): f is { bucket: string; path: string } => f !== null)

    let deletedFiles = 0
    if (storageFiles.length > 0) {
      deletedFiles = await deleteStorageFiles(storageFiles)
    }

    // 10. Send final deletion confirmation email
    await sendEmail({
      to: userEmail,
      ...accountDeletedEmail(userName),
    })

    return { success: true, deletedFiles }
  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error)
    return { success: false, error }
  }
}

/**
 * GET /api/user/deletion-cron
 *
 * Handles scheduled account deletions:
 * 1. Sends reminder emails 2 days before deletion
 * 2. Permanently deletes accounts that have passed their scheduled deletion date
 *
 * This endpoint should be called daily by an external cron service.
 * Security: Requires CRON_SECRET header to match environment variable
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const cronSecret = request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace('Bearer ', '')

    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const twoDaysFromNow = new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000))
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000))

    const results = {
      remindersSent: 0,
      accountsDeleted: 0,
      deletedFiles: 0,
      errors: [] as string[],
    }

    // 1. Send reminder emails for accounts scheduled for deletion in ~2 days
    // (between 2 and 3 days from now, to avoid sending multiple times)
    const { data: accountsNeedingReminder } = await supabaseAdmin
      .from('user_settings')
      .select('user_id, username, deletion_scheduled_at, deletion_cancellation_token')
      .not('deletion_scheduled_at', 'is', null)
      .gte('deletion_scheduled_at', twoDaysFromNow.toISOString())
      .lt('deletion_scheduled_at', threeDaysFromNow.toISOString())

    if (accountsNeedingReminder && accountsNeedingReminder.length > 0) {
      for (const account of accountsNeedingReminder) {
        try {
          // Get user email from auth
          const { data: authData } = await supabaseAdmin.auth.admin.getUserById(account.user_id)

          if (authData?.user?.email) {
            const deletionDate = new Date(account.deletion_scheduled_at!)
            const formattedDate = deletionDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })

            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://multiloop.app'
            const cancelUrl = `${baseUrl}/account/cancel-deletion?token=${account.deletion_cancellation_token}&email=${encodeURIComponent(authData.user.email)}`

            await sendEmail({
              to: authData.user.email,
              ...accountDeletionReminderEmail({
                userName: account.username || authData.user.email.split('@')[0],
                deletionDate: formattedDate,
                cancelUrl,
              }),
            })

            results.remindersSent++
          }
        } catch (error) {
          console.error(`Failed to send reminder for user ${account.user_id}:`, error)
          results.errors.push(`Reminder failed for ${account.user_id}`)
        }
      }
    }

    // 2. Permanently delete accounts that have passed their scheduled deletion date
    const { data: accountsToDelete } = await supabaseAdmin
      .from('user_settings')
      .select('user_id')
      .not('deletion_scheduled_at', 'is', null)
      .lt('deletion_scheduled_at', now.toISOString())

    if (accountsToDelete && accountsToDelete.length > 0) {
      for (const account of accountsToDelete) {
        try {
          // Get user email before deletion
          const { data: authData } = await supabaseAdmin.auth.admin.getUserById(account.user_id)
          const userEmail = authData?.user?.email

          if (userEmail) {
            const result = await permanentlyDeleteUser(account.user_id, userEmail)

            if (result.success) {
              results.accountsDeleted++
              results.deletedFiles += result.deletedFiles || 0
            } else {
              results.errors.push(`Deletion failed for ${account.user_id}`)
            }
          }
        } catch (error) {
          console.error(`Failed to delete user ${account.user_id}:`, error)
          results.errors.push(`Deletion failed for ${account.user_id}`)
        }
      }
    }

    console.log('Account deletion cron completed:', results)

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('Account deletion cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
