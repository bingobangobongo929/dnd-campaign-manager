/**
 * AI Image Generation API
 *
 * Generates images using Google's Imagen 3 (Nano Banana 2)
 * Supports text-to-image generation with feedback/regeneration flow
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 120 // 2 minutes for image generation

// Available image models
type ImageModel = 'imagen-3.0-generate-002' | 'imagen-3.0-fast-generate-001'

interface GenerateImageRequest {
  prompt: string
  model?: ImageModel
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9'
  numberOfImages?: number
  feedback?: string // User feedback for regeneration
  previousPrompt?: string // For regeneration context
  negativePrompt?: string // Things to avoid
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: GenerateImageRequest = await req.json()
    const {
      prompt,
      model = 'imagen-3.0-generate-002',
      aspectRatio = '1:1',
      numberOfImages = 1,
      feedback,
      previousPrompt,
      negativePrompt
    } = body

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'Google AI API key not configured' }, { status: 500 })
    }

    // Build the full prompt with any feedback
    let fullPrompt = prompt
    if (feedback && previousPrompt) {
      fullPrompt = `${previousPrompt}

User feedback for improvement: ${feedback}

Updated prompt: ${prompt}`
    }

    // Imagen 3 uses the predict endpoint with a different request format
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: fullPrompt,
            },
          ],
          parameters: {
            sampleCount: numberOfImages,
            aspectRatio: aspectRatio,
            personGeneration: 'allow_adult',
            ...(negativePrompt && { negativePrompt }),
          },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Imagen API error:', response.status, errorData)

      // Handle specific error cases
      if (response.status === 400) {
        const errorMessage = errorData.error?.message || ''
        if (errorMessage.includes('safety') || errorMessage.includes('blocked')) {
          return NextResponse.json({
            error: 'Image generation blocked',
            details: 'The prompt was blocked by content safety filters. Please modify your prompt.',
          }, { status: 422 })
        }
        return NextResponse.json({
          error: 'Invalid request to image generation API',
          details: errorMessage || 'The prompt may have been rejected',
        }, { status: 400 })
      }

      if (response.status === 429) {
        return NextResponse.json({
          error: 'Rate limit exceeded',
          details: 'Too many image generation requests. Please try again in a few minutes.',
        }, { status: 429 })
      }

      if (response.status === 404) {
        return NextResponse.json({
          error: 'Image generation model not available',
          details: 'Imagen 3 model not available. Check your API key has access to Imagen.',
        }, { status: 404 })
      }

      return NextResponse.json({
        error: 'Image generation failed',
        details: errorData.error?.message || `API returned status ${response.status}`,
      }, { status: 500 })
    }

    const data = await response.json()

    // Imagen 3 returns predictions array with bytesBase64Encoded images
    const predictions = data.predictions || []
    if (predictions.length === 0) {
      return NextResponse.json({
        error: 'No image generated',
        details: 'The model did not return any images. Try a different prompt.',
      }, { status: 422 })
    }

    // Get the first generated image
    const prediction = predictions[0]
    const imageData = prediction.bytesBase64Encoded
    const mimeType = prediction.mimeType || 'image/png'

    if (!imageData) {
      return NextResponse.json({
        error: 'No image data',
        details: 'The model response did not contain image data.',
      }, { status: 422 })
    }

    // Return the base64 image data
    return NextResponse.json({
      success: true,
      image: {
        data: imageData,
        mimeType,
        dataUrl: `data:${mimeType};base64,${imageData}`,
      },
      model,
      prompt: fullPrompt,
      // Include all images if multiple were generated
      allImages: predictions.map((p: { bytesBase64Encoded: string; mimeType?: string }) => ({
        data: p.bytesBase64Encoded,
        mimeType: p.mimeType || 'image/png',
        dataUrl: `data:${p.mimeType || 'image/png'};base64,${p.bytesBase64Encoded}`,
      })),
    })
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json({
      error: 'Failed to generate image',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
