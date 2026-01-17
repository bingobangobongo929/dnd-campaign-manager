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
    // CRITICAL: This is meant to be a simple UPSCALE - do not change the image content
    const enhancementPrompts: Record<string, string> = {
      upscale: `UPSCALE this image to higher resolution. This is a simple upscale operation.

STRICT REQUIREMENTS:
- Do NOT change the subject, pose, expression, or composition AT ALL
- Do NOT add, remove, or modify any elements in the image
- Do NOT change the art style or reinterpret the image
- ONLY increase resolution and sharpen existing details
- The output must be pixel-for-pixel recognizable as the same image, just higher quality

The ONLY modification allowed: If the background is bright white, shift it to a darker tone (dark gray, dark blue, or muted color) while keeping the subject EXACTLY the same.

Output in 16:9 landscape format. This is an UPSCALE, not a reimagining.`,

      detail: `UPSCALE this image with enhanced sharpness. Simple upscale operation only.

STRICT REQUIREMENTS:
- Keep EVERYTHING exactly the same - subject, pose, composition, colors, style
- Do NOT reinterpret or recreate the image
- Do NOT add new details that weren't in the original
- ONLY sharpen existing details and increase resolution

The ONLY modification allowed: If background is pure white, darken it to a muted tone.

Output in 16:9 landscape format.`,

      quality: `UPSCALE this image. Do NOT change it - only improve resolution.

CRITICAL - DO NOT:
- Change the subject or pose
- Alter the art style
- Add or remove any elements
- Reinterpret or reimagine the image
- Change colors or lighting

ONLY DO:
- Increase resolution
- Sharpen existing details
- If background is bright white, shift to dark gray/muted tone

The result must look like the EXACT same image at higher resolution. Output in 16:9 landscape.`,
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
