import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
  // Group files by bucket
  const byBucket = files.reduce((acc, file) => {
    if (!acc[file.bucket]) acc[file.bucket] = []
    acc[file.bucket].push(file.path)
    return acc
  }, {} as Record<string, string[]>)

  let totalDeleted = 0

  // Delete from each bucket
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
 * GET /api/recycle-bin/auto-purge
 *
 * Automatically purges items that have been in recycle bin for more than 30 days.
 * This endpoint should be called by an external cron service (Vercel cron, cron-job.org, etc.)
 *
 * Security: Requires CRON_SECRET header to match environment variable
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret for security
    const cronSecret = request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace('Bearer ', '')

    if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoffDate = thirtyDaysAgo.toISOString()

    const allMediaUrls: string[] = []
    let purgedCampaigns = 0
    let purgedCharacters = 0
    let purgedOneshots = 0

    // Get expired campaigns and their media
    const { data: expiredCampaigns } = await supabaseAdmin
      .from('campaigns')
      .select('id, image_url')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', cutoffDate)

    if (expiredCampaigns && expiredCampaigns.length > 0) {
      allMediaUrls.push(...expiredCampaigns.map(c => c.image_url).filter(Boolean))

      const campaignIds = expiredCampaigns.map(c => c.id)

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

      // Campaign NPCs
      const { data: npcs } = await supabaseAdmin
        .from('characters')
        .select('image_url')
        .in('campaign_id', campaignIds)
      if (npcs) allMediaUrls.push(...npcs.map(n => n.image_url).filter(Boolean))

      // Delete campaigns
      const { error } = await supabaseAdmin
        .from('campaigns')
        .delete()
        .in('id', campaignIds)

      if (!error) {
        purgedCampaigns = campaignIds.length
      } else {
        console.error('Error purging campaigns:', error)
      }
    }

    // Get expired vault characters and their media
    const { data: expiredCharacters } = await supabaseAdmin
      .from('vault_characters')
      .select('id, image_url, detail_image_url')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', cutoffDate)

    if (expiredCharacters && expiredCharacters.length > 0) {
      allMediaUrls.push(...expiredCharacters.map(c => c.image_url).filter(Boolean))
      allMediaUrls.push(...expiredCharacters.map(c => c.detail_image_url).filter(Boolean))

      const characterIds = expiredCharacters.map(c => c.id)

      // Additional character images
      const { data: images } = await supabaseAdmin
        .from('vault_character_images')
        .select('image_url')
        .in('character_id', characterIds)
      if (images) allMediaUrls.push(...images.map(i => i.image_url).filter(Boolean))

      // Delete characters
      const { error } = await supabaseAdmin
        .from('vault_characters')
        .delete()
        .in('id', characterIds)

      if (!error) {
        purgedCharacters = characterIds.length
      } else {
        console.error('Error purging characters:', error)
      }
    }

    // Get expired oneshots and their media
    const { data: expiredOneshots } = await supabaseAdmin
      .from('oneshots')
      .select('id, image_url')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', cutoffDate)

    if (expiredOneshots && expiredOneshots.length > 0) {
      allMediaUrls.push(...expiredOneshots.map(o => o.image_url).filter(Boolean))

      const oneshotIds = expiredOneshots.map(o => o.id)

      // Delete oneshots
      const { error } = await supabaseAdmin
        .from('oneshots')
        .delete()
        .in('id', oneshotIds)

      if (!error) {
        purgedOneshots = oneshotIds.length
      } else {
        console.error('Error purging oneshots:', error)
      }
    }

    // Delete all storage files
    const storageFiles = allMediaUrls
      .map(parseStorageUrl)
      .filter((f): f is { bucket: string; path: string } => f !== null)

    let deletedFiles = 0
    if (storageFiles.length > 0) {
      deletedFiles = await deleteStorageFiles(storageFiles)
    }

    const result = {
      success: true,
      purged: {
        campaigns: purgedCampaigns,
        characters: purgedCharacters,
        oneshots: purgedOneshots,
        total: purgedCampaigns + purgedCharacters + purgedOneshots
      },
      deletedFiles,
      timestamp: new Date().toISOString()
    }

    console.log('Auto-purge completed:', result)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Auto-purge error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
