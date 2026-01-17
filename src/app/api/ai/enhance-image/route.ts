/**
 * AI Image Enhancement API
 *
 * Uses Google's Gemini 3 Pro Image Preview for image enhancement/upscaling
 * Takes an existing image and generates a higher quality version
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recordAPIUsage } from '@/lib/api-usage'

export const runtime = 'nodejs'
export const maxDuration = 120 // 2 minutes for enhancement

interface EnhanceImageRequest {
  image_url: string
  character_id?: string
  enhancement_type?: 'upscale' | 'detail' | 'quality'
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: EnhanceImageRequest = await req.json()
    const { image_url, character_id, enhancement_type = 'quality' } = body

    if (!image_url) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Google AI API key not configured' }, { status: 500 })
    }

    // Fetch the original image and convert to base64
    let imageBase64: string
    let imageMimeType: string

    try {
      const imageResponse = await fetch(image_url)
      if (!imageResponse.ok) {
        return NextResponse.json({
          error: 'Failed to fetch original image',
          details: `Could not download image from URL: ${imageResponse.status}`,
        }, { status: 400 })
      }

      const contentType = imageResponse.headers.get('content-type') || 'image/png'
      imageMimeType = contentType.split(';')[0]

      const imageBuffer = await imageResponse.arrayBuffer()
      imageBase64 = Buffer.from(imageBuffer).toString('base64')
    } catch (fetchError) {
      return NextResponse.json({
        error: 'Failed to fetch original image',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown error',
      }, { status: 400 })
    }

    // Build enhancement prompt based on type
    // Important: Output should have dark/moody backgrounds suitable for a dark-themed fantasy app
    const enhancementPrompts: Record<string, string> = {
      upscale: `Look at this image carefully. Generate a new version of this EXACT image at higher resolution with more detail.
Keep the EXACT same composition, subject, pose, colors, lighting, and style.
The output should look like a higher-quality version of the input - same image, just clearer and more detailed.
Do NOT change the subject, add new elements, or alter the artistic style.
IMPORTANT: Ensure the background remains dark/moody (no bright white backgrounds). This will be displayed on a dark-themed fantasy website.
Output in wide landscape format (16:9).`,

      detail: `Analyze this image and recreate it with enhanced detail and clarity.
Preserve the EXACT same composition, characters, colors, and artistic style.
Add subtle detail improvements like sharper textures, clearer edges, and refined lighting.
The enhanced version should be immediately recognizable as the same image.
IMPORTANT: Ensure the background remains dark/moody (no bright white backgrounds). This will be displayed on a dark-themed fantasy website.
Output in wide landscape format (16:9).`,

      quality: `Create a higher quality version of this exact image.
Requirements:
- SAME subject, pose, and composition
- SAME color palette and lighting
- SAME artistic style
- Enhanced clarity and detail
- Sharper textures and edges
- Dark/moody background tones (NO bright white backgrounds - this is for a dark fantasy website)
- Output in wide landscape format (16:9)
Do not change or reinterpret the image - only enhance quality while keeping backgrounds dark and suitable for a dark-themed UI.`,
    }

    const prompt = enhancementPrompts[enhancement_type] || enhancementPrompts.quality

    // Use Gemini 3 Pro Image Preview with multimodal input
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType: imageMimeType,
                  data: imageBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Gemini enhancement API error:', response.status, errorData)

      if (response.status === 400) {
        const errorMessage = errorData.error?.message || ''
        if (errorMessage.includes('safety') || errorMessage.includes('blocked')) {
          return NextResponse.json({
            error: 'Enhancement blocked',
            details: 'The image was blocked by content safety filters.',
          }, { status: 422 })
        }
        return NextResponse.json({
          error: 'Invalid request',
          details: errorMessage || 'The image may have been rejected',
        }, { status: 400 })
      }

      if (response.status === 429) {
        return NextResponse.json({
          error: 'Rate limit exceeded',
          details: 'Too many requests. Please try again in a few minutes.',
        }, { status: 429 })
      }

      return NextResponse.json({
        error: 'Enhancement failed',
        details: errorData.error?.message || `API returned status ${response.status}`,
      }, { status: 500 })
    }

    const data = await response.json()

    // Extract the enhanced image from response
    const candidates = data.candidates || []
    if (candidates.length === 0) {
      return NextResponse.json({
        error: 'No response generated',
        details: 'The model did not return any content.',
      }, { status: 422 })
    }

    const parts = candidates[0]?.content?.parts || []
    const imagePart = parts.find((p: { inlineData?: { mimeType: string; data: string } }) =>
      p.inlineData?.mimeType?.startsWith('image/')
    )

    if (!imagePart?.inlineData) {
      const textPart = parts.find((p: { text?: string }) => p.text)
      return NextResponse.json({
        error: 'No enhanced image generated',
        details: textPart?.text || 'The model did not return an image. The original image may not be suitable for enhancement.',
      }, { status: 422 })
    }

    const enhancedImageData = imagePart.inlineData.data
    const enhancedMimeType = imagePart.inlineData.mimeType || 'image/png'

    // Record API usage
    await recordAPIUsage({
      provider: 'google',
      model: 'gemini-3-pro-image-preview',
      endpoint: '/api/ai/enhance-image',
      operation_type: 'image_enhancement',
      images_generated: 1,
      user_id: user.id,
    })

    return NextResponse.json({
      success: true,
      original_url: image_url,
      enhanced_image: {
        data: enhancedImageData,
        mimeType: enhancedMimeType,
        dataUrl: `data:${enhancedMimeType};base64,${enhancedImageData}`,
      },
      character_id,
      enhancement_type,
    })
  } catch (error) {
    console.error('Image enhancement error:', error)
    return NextResponse.json({
      error: 'Failed to enhance image',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
