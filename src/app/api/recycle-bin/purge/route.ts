import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface PurgeRequest {
  contentType: 'campaign' | 'character' | 'oneshot'
  contentId: string
}

/**
 * Extracts storage bucket and path from a Supabase storage URL
 * URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
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
async function deleteStorageFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  files: { bucket: string; path: string }[]
) {
  // Group files by bucket
  const byBucket = files.reduce((acc, file) => {
    if (!acc[file.bucket]) acc[file.bucket] = []
    acc[file.bucket].push(file.path)
    return acc
  }, {} as Record<string, string[]>)

  // Delete from each bucket
  for (const [bucket, paths] of Object.entries(byBucket)) {
    try {
      const { error } = await supabase.storage.from(bucket).remove(paths)
      if (error) {
        console.error(`Error deleting from ${bucket}:`, error)
      }
    } catch (err) {
      console.error(`Error deleting from ${bucket}:`, err)
    }
  }
}

/**
 * Collects all media URLs for a campaign
 */
async function getCampaignMedia(
  supabase: Awaited<ReturnType<typeof createClient>>,
  campaignId: string
): Promise<string[]> {
  const urls: string[] = []

  // Campaign cover image
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('image_url')
    .eq('id', campaignId)
    .single()

  if (campaign?.image_url) urls.push(campaign.image_url)

  // Media gallery
  const { data: gallery } = await supabase
    .from('media_gallery')
    .select('url')
    .eq('campaign_id', campaignId)

  if (gallery) urls.push(...gallery.map(g => g.url).filter(Boolean))

  // World maps
  const { data: maps } = await supabase
    .from('world_maps')
    .select('image_url')
    .eq('campaign_id', campaignId)

  if (maps) urls.push(...maps.map(m => m.image_url).filter(Boolean))

  // Campaign NPCs (characters table)
  const { data: npcs } = await supabase
    .from('characters')
    .select('image_url')
    .eq('campaign_id', campaignId)

  if (npcs) urls.push(...npcs.map(n => n.image_url).filter(Boolean))

  return urls
}

/**
 * Collects all media URLs for a vault character
 */
async function getCharacterMedia(
  supabase: Awaited<ReturnType<typeof createClient>>,
  characterId: string
): Promise<string[]> {
  const urls: string[] = []

  // Main character images
  const { data: character } = await supabase
    .from('vault_characters')
    .select('image_url, detail_image_url')
    .eq('id', characterId)
    .single()

  if (character?.image_url) urls.push(character.image_url)
  if (character?.detail_image_url) urls.push(character.detail_image_url)

  // Additional character images
  const { data: images } = await supabase
    .from('vault_character_images')
    .select('image_url')
    .eq('character_id', characterId)

  if (images) urls.push(...images.map(i => i.image_url).filter(Boolean))

  return urls
}

/**
 * Collects all media URLs for a oneshot
 */
async function getOneshotMedia(
  supabase: Awaited<ReturnType<typeof createClient>>,
  oneshotId: string
): Promise<string[]> {
  const urls: string[] = []

  const { data: oneshot } = await supabase
    .from('oneshots')
    .select('image_url')
    .eq('id', oneshotId)
    .single()

  if (oneshot?.image_url) urls.push(oneshot.image_url)

  return urls
}

/**
 * POST /api/recycle-bin/purge
 * Permanently deletes a single item from recycle bin, including all associated media
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: PurgeRequest = await request.json()
    const { contentType, contentId } = body

    if (!contentType || !contentId) {
      return NextResponse.json({ error: 'Content type and ID required' }, { status: 400 })
    }

    // Verify ownership and that it's in recycle bin
    let tableName: string
    let mediaUrls: string[] = []

    switch (contentType) {
      case 'campaign':
        tableName = 'campaigns'
        mediaUrls = await getCampaignMedia(supabase, contentId)
        break
      case 'character':
        tableName = 'vault_characters'
        mediaUrls = await getCharacterMedia(supabase, contentId)
        break
      case 'oneshot':
        tableName = 'oneshots'
        mediaUrls = await getOneshotMedia(supabase, contentId)
        break
      default:
        return NextResponse.json({ error: 'Invalid content type' }, { status: 400 })
    }

    // Parse URLs to get storage paths
    const storageFiles = mediaUrls
      .map(parseStorageUrl)
      .filter((f): f is { bucket: string; path: string } => f !== null)

    // Delete storage files first (before DB records are gone)
    if (storageFiles.length > 0) {
      await deleteStorageFiles(supabase, storageFiles)
    }

    // Delete from database (only if in recycle bin)
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', contentId)
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)

    if (error) {
      console.error('Purge error:', error)
      return NextResponse.json({ error: 'Failed to permanently delete content' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deletedFiles: storageFiles.length
    })
  } catch (error) {
    console.error('Purge error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
