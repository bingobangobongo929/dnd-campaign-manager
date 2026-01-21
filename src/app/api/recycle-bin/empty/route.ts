import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
 * POST /api/recycle-bin/empty
 * Permanently deletes ALL items from the user's recycle bin, including all associated media
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allMediaUrls: string[] = []

    // Get all deleted campaigns and their media
    const { data: deletedCampaigns } = await supabase
      .from('campaigns')
      .select('id, image_url')
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)

    if (deletedCampaigns) {
      // Collect campaign cover images
      allMediaUrls.push(...deletedCampaigns.map(c => c.image_url).filter(Boolean))

      const campaignIds = deletedCampaigns.map(c => c.id)

      if (campaignIds.length > 0) {
        // Media gallery
        const { data: gallery } = await supabase
          .from('media_gallery')
          .select('url')
          .in('campaign_id', campaignIds)
        if (gallery) allMediaUrls.push(...gallery.map(g => g.url).filter(Boolean))

        // World maps
        const { data: maps } = await supabase
          .from('world_maps')
          .select('image_url')
          .in('campaign_id', campaignIds)
        if (maps) allMediaUrls.push(...maps.map(m => m.image_url).filter(Boolean))

        // Campaign NPCs
        const { data: npcs } = await supabase
          .from('characters')
          .select('image_url')
          .in('campaign_id', campaignIds)
        if (npcs) allMediaUrls.push(...npcs.map(n => n.image_url).filter(Boolean))
      }
    }

    // Get all deleted vault characters and their media
    const { data: deletedCharacters } = await supabase
      .from('vault_characters')
      .select('id, image_url, detail_image_url')
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)

    if (deletedCharacters) {
      allMediaUrls.push(...deletedCharacters.map(c => c.image_url).filter(Boolean))
      allMediaUrls.push(...deletedCharacters.map(c => c.detail_image_url).filter(Boolean))

      const characterIds = deletedCharacters.map(c => c.id)

      if (characterIds.length > 0) {
        // Additional character images
        const { data: images } = await supabase
          .from('vault_character_images')
          .select('image_url')
          .in('character_id', characterIds)
        if (images) allMediaUrls.push(...images.map(i => i.image_url).filter(Boolean))
      }
    }

    // Get all deleted oneshots and their media
    const { data: deletedOneshots } = await supabase
      .from('oneshots')
      .select('id, image_url')
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)

    if (deletedOneshots) {
      allMediaUrls.push(...deletedOneshots.map(o => o.image_url).filter(Boolean))
    }

    // Parse all URLs to get storage paths
    const storageFiles = allMediaUrls
      .map(parseStorageUrl)
      .filter((f): f is { bucket: string; path: string } => f !== null)

    // Delete all storage files first
    if (storageFiles.length > 0) {
      await deleteStorageFiles(supabase, storageFiles)
    }

    // Now delete all database records
    const { error: campaignsError } = await supabase
      .from('campaigns')
      .delete()
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)

    if (campaignsError) {
      console.error('Error emptying campaigns:', campaignsError)
    }

    const { error: charactersError } = await supabase
      .from('vault_characters')
      .delete()
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)

    if (charactersError) {
      console.error('Error emptying characters:', charactersError)
    }

    const { error: oneshotsError } = await supabase
      .from('oneshots')
      .delete()
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)

    if (oneshotsError) {
      console.error('Error emptying oneshots:', oneshotsError)
    }

    if (campaignsError || charactersError || oneshotsError) {
      return NextResponse.json({
        error: 'Some items could not be deleted',
        partial: true,
        deletedFiles: storageFiles.length
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      deletedFiles: storageFiles.length
    })
  } catch (error) {
    console.error('Empty recycle bin error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
