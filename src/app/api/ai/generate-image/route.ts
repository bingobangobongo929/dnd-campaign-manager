/**
 * AI Image Generation Endpoint
 *
 * STATUS: INACTIVE - Requires REPLICATE_API_TOKEN in .env.local
 *
 * To enable:
 * 1. Sign up at https://replicate.com
 * 2. Get your API token from account settings
 * 3. Add REPLICATE_API_TOKEN=r8_xxxxx to .env.local
 * 4. Set AI_IMAGE_GENERATION_ENABLED = true in character-image-upload.tsx
 */

import Replicate from 'replicate'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60 // Allow up to 60 seconds for image generation

interface GenerateImageRequest {
  characterName: string
  characterType: 'pc' | 'npc'
  description?: string | null
  summary?: string | null
}

export async function POST(req: Request) {
  try {
    const { characterName, characterType, description, summary }: GenerateImageRequest = await req.json()

    if (!characterName) {
      return NextResponse.json({ error: 'Character name is required' }, { status: 400 })
    }

    const apiKey = process.env.REPLICATE_API_TOKEN
    if (!apiKey) {
      return NextResponse.json({ error: 'Image generation not configured' }, { status: 503 })
    }

    const replicate = new Replicate({ auth: apiKey })

    // Build a descriptive prompt for the character portrait
    const characterInfo = [
      description,
      summary,
    ].filter(Boolean).join('. ')

    const typeDescription = characterType === 'pc'
      ? 'heroic adventurer'
      : 'fantasy character'

    const prompt = characterInfo
      ? `Fantasy character portrait of ${characterName}, a ${typeDescription}. ${characterInfo}. Detailed digital art, dramatic lighting, painterly style, high quality character portrait suitable for a tabletop RPG.`
      : `Fantasy character portrait of ${characterName}, a ${typeDescription}. Detailed digital art, dramatic lighting, painterly style, high quality character portrait suitable for a tabletop RPG.`

    // Use Flux Schnell for fast generation (or Flux Dev for higher quality)
    const output = await replicate.run(
      'black-forest-labs/flux-schnell',
      {
        input: {
          prompt,
          num_outputs: 1,
          aspect_ratio: '3:4', // Portrait orientation
          output_format: 'webp',
          output_quality: 90,
        }
      }
    )

    // Flux returns an array of URLs
    const imageUrls = output as string[]

    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json({ error: 'No image generated' }, { status: 500 })
    }

    return NextResponse.json({
      imageUrl: imageUrls[0],
      prompt // Return prompt for transparency
    })
  } catch (error) {
    console.error('AI image generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    )
  }
}
