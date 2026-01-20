/**
 * Admin endpoint to generate demo content images
 * Uses Google's Gemini 3 Pro Image Preview for generation
 * Uploads to Supabase storage and updates demo records
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes for multiple image generations

// Demo content IDs from migration
const DEMO_CAMPAIGN_ID = '00000000-0000-0000-0001-000000000001'
const DEMO_CHARACTER_ID = '00000000-0000-0000-0002-000000000001'
const DEMO_ONESHOT_ID = '00000000-0000-0000-0003-000000000001'

interface ImagePrompt {
  id: string
  type: 'campaign' | 'character' | 'oneshot' | 'npc'
  name: string
  prompt: string
  aspectRatio: '1:1' | '16:9' | '3:4'
}

const DEMO_IMAGE_PROMPTS: ImagePrompt[] = [
  {
    id: DEMO_CAMPAIGN_ID,
    type: 'campaign',
    name: 'The Sunken Citadel',
    prompt: 'Dark fantasy illustration of an ancient stone fortress partially buried and tilted in the earth, covered in vines and moss. A deep ravine surrounds it with stairs carved into the rock leading down. Eerie green magical lights flicker from windows. Dramatic storm clouds overhead. Epic fantasy art style, detailed architecture, mysterious atmosphere.',
    aspectRatio: '16:9',
  },
  {
    id: DEMO_CHARACTER_ID,
    type: 'character',
    name: 'Lyra Silvervane',
    prompt: 'Portrait of a half-elf ranger woman in her late twenties. She has weathered features, silver-streaked dark hair pulled back, and striking eyes that seem to gleam faintly silver. She wears practical leather armor with a forest green cloak. A longbow is slung over her shoulder. Her expression is watchful and guarded. A giant owl perches partially visible behind her. Fantasy character portrait, detailed, dramatic lighting.',
    aspectRatio: '3:4',
  },
  {
    id: DEMO_ONESHOT_ID,
    type: 'oneshot',
    name: 'The Night Market',
    prompt: 'A mystical night market in a moonless plaza, filled with colorful tents and stalls lit by floating luminescent moths. Mysterious cloaked merchants sell impossible wares - bottled lights, shadows in jars, keys to nowhere. Cobblestone streets reflect strange colors. Other-worldly customers browse. Dark fantasy illustration with vibrant magical lighting against deep shadows.',
    aspectRatio: '16:9',
  },
  // Campaign NPCs
  {
    id: 'npc-kerowyn',
    type: 'npc',
    name: 'Kerowyn Hucrele',
    prompt: 'Portrait of a wealthy human merchant woman in her fifties. Silver-streaked auburn hair pulled back severely. Expensive but practical dark clothing. Lined face showing exhaustion and worry. Strong jaw and determined eyes despite her distress. Fantasy character portrait, noble bearing, worried expression.',
    aspectRatio: '1:1',
  },
  {
    id: 'npc-meepo',
    type: 'npc',
    name: 'Meepo',
    prompt: 'Portrait of a pathetic-looking kobold with scraggly brown scales. Large watery eyes and a perpetually runny snout. Wearing an oversized makeshift uniform. Expression of desperate hope. Small reptilian creature, fantasy art style, sympathetic appearance.',
    aspectRatio: '1:1',
  },
  {
    id: 'npc-belak',
    type: 'npc',
    name: 'Belak the Outcast',
    prompt: 'Portrait of a corrupted human druid. Gaunt and pale with bark-like patches spreading across his skin. Eyes glow with faint green luminescence. Robes made of woven vines that seem to move on their own. Unsettling calm expression. Dark fantasy villain portrait, ominous atmosphere.',
    aspectRatio: '1:1',
  },
  {
    id: 'npc-calcryx',
    type: 'npc',
    name: 'Calcryx',
    prompt: 'Illustration of a young white dragon wyrmling with pristine white scales and icy blue eyes. Eight-foot wingspan partially spread. Imperious expression despite small size. Frost crystals form around it. Fantasy creature art, regal bearing, detailed scales.',
    aspectRatio: '1:1',
  },
]

async function generateImage(prompt: string, aspectRatio: string): Promise<{ data: string; mimeType: string } | null> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!apiKey) {
    console.error('Google AI API key not configured')
    return null
  }

  const aspectRatioGuide: Record<string, string> = {
    '1:1': 'square format',
    '3:4': 'portrait format (3:4)',
    '16:9': 'wide landscape format (16:9)',
  }

  const fullPrompt = `Generate an image: ${prompt}. Use ${aspectRatioGuide[aspectRatio]}.`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
      }
    )

    if (!response.ok) {
      console.error('Gemini API error:', response.status)
      return null
    }

    const data = await response.json()
    const parts = data.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find((p: { inlineData?: { mimeType: string; data: string } }) =>
      p.inlineData?.mimeType?.startsWith('image/')
    )

    if (!imagePart?.inlineData) {
      console.error('No image in response')
      return null
    }

    return {
      data: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType || 'image/png',
    }
  } catch (error) {
    console.error('Image generation error:', error)
    return null
  }
}

async function uploadToStorage(
  supabase: ReturnType<typeof createAdminClient>,
  imageData: string,
  mimeType: string,
  filename: string
): Promise<string | null> {
  try {
    // Convert base64 to buffer
    const buffer = Buffer.from(imageData, 'base64')

    // Upload to demo-images bucket
    const { data, error } = await supabase.storage
      .from('demo-images')
      .upload(filename, buffer, {
        contentType: mimeType,
        upsert: true,
      })

    if (error) {
      console.error('Upload error:', error)
      return null
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('demo-images')
      .getPublicUrl(data.path)

    return publicUrl
  } catch (error) {
    console.error('Upload error:', error)
    return null
  }
}

export async function POST(req: Request) {
  try {
    // Verify admin access
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!settings || !isAdmin(settings.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const adminSupabase = createAdminClient()
    const results: { name: string; success: boolean; url?: string; error?: string }[] = []

    // Parse request body to see if we should generate specific images
    const body = await req.json().catch(() => ({}))
    const targetIds = body.ids as string[] | undefined
    const promptsToGenerate = targetIds
      ? DEMO_IMAGE_PROMPTS.filter(p => targetIds.includes(p.id))
      : DEMO_IMAGE_PROMPTS

    for (const item of promptsToGenerate) {
      console.log(`Generating image for: ${item.name}`)

      const image = await generateImage(item.prompt, item.aspectRatio)

      if (!image) {
        results.push({ name: item.name, success: false, error: 'Generation failed' })
        continue
      }

      // Create filename
      const ext = image.mimeType.split('/')[1] || 'png'
      const filename = `${item.type}-${item.id}.${ext}`

      // Upload to storage
      const url = await uploadToStorage(adminSupabase, image.data, image.mimeType, filename)

      if (!url) {
        results.push({ name: item.name, success: false, error: 'Upload failed' })
        continue
      }

      // Update the relevant record
      let updateError = null

      if (item.type === 'campaign') {
        const { error } = await adminSupabase
          .from('campaigns')
          .update({ image_url: url })
          .eq('id', item.id)
        updateError = error
      } else if (item.type === 'character') {
        const { error } = await adminSupabase
          .from('vault_characters')
          .update({ image_url: url })
          .eq('id', item.id)
        updateError = error
      } else if (item.type === 'oneshot') {
        const { error } = await adminSupabase
          .from('oneshots')
          .update({ image_url: url })
          .eq('id', item.id)
        updateError = error
      } else if (item.type === 'npc') {
        // NPCs are in the characters table, need to find by name
        const { error } = await adminSupabase
          .from('characters')
          .update({ image_url: url })
          .eq('campaign_id', DEMO_CAMPAIGN_ID)
          .eq('name', item.name)
        updateError = error
      }

      if (updateError) {
        results.push({ name: item.name, success: false, url, error: 'Database update failed' })
      } else {
        results.push({ name: item.name, success: true, url })
      }

      // Small delay between generations to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Generated ${successCount} images, ${failCount} failed`,
      results,
    })
  } catch (error) {
    console.error('Demo image generation error:', error)
    return NextResponse.json({
      error: 'Failed to generate demo images',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

// GET to check current demo image status
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings } = await supabase
      .from('user_settings')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!settings || !isAdmin(settings.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const adminSupabase = createAdminClient()

    // Check current image status
    const [campaign, character, oneshot, npcs] = await Promise.all([
      adminSupabase.from('campaigns').select('id, name, image_url').eq('id', DEMO_CAMPAIGN_ID).single(),
      adminSupabase.from('vault_characters').select('id, name, image_url').eq('id', DEMO_CHARACTER_ID).single(),
      adminSupabase.from('oneshots').select('id, title, image_url').eq('id', DEMO_ONESHOT_ID).single(),
      adminSupabase.from('characters').select('id, name, image_url').eq('campaign_id', DEMO_CAMPAIGN_ID),
    ])

    return NextResponse.json({
      campaign: { ...campaign.data, hasImage: !!campaign.data?.image_url },
      character: { ...character.data, hasImage: !!character.data?.image_url },
      oneshot: { ...oneshot.data, hasImage: !!oneshot.data?.image_url },
      npcs: npcs.data?.map(npc => ({ ...npc, hasImage: !!npc.image_url })) || [],
    })
  } catch (error) {
    console.error('Error checking demo images:', error)
    return NextResponse.json({ error: 'Failed to check demo images' }, { status: 500 })
  }
}
