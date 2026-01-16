/**
 * AI Image Generation API
 *
 * Generates images using Google's Gemini image generation models (Nano Banana)
 * Supports text-to-image generation with feedback/regeneration flow
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 120 // 2 minutes for image generation

// Available image models
type ImageModel = 'imagen-3.0-generate-002' | 'gemini-2.0-flash-exp'

interface GenerateImageRequest {
  prompt: string
  model?: ImageModel
  aspectRatio?: '1:1' | '2:3' | '16:9' | '3:2' | '9:16' | '3:4' | '4:3'
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

    // Use Imagen 3 for high quality image generation
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: fullPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
            // Note: Gemini handles aspect ratios automatically based on prompt
          },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Gemini API error:', response.status, errorData)

      // Handle specific error cases
      if (response.status === 400) {
        return NextResponse.json({
          error: 'Invalid request to image generation API',
          details: errorData.error?.message || 'The prompt may have been rejected by content filters',
        }, { status: 400 })
      }

      if (response.status === 429) {
        return NextResponse.json({
          error: 'Rate limit exceeded',
          details: 'Too many image generation requests. Please try again in a few minutes.',
        }, { status: 429 })
      }

      if (response.status === 404) {
        // Model not available, try fallback
        return NextResponse.json({
          error: 'Image generation model not available',
          details: 'The selected model is not available. Please try a different model.',
        }, { status: 404 })
      }

      return NextResponse.json({
        error: 'Image generation failed',
        details: errorData.error?.message || `API returned status ${response.status}`,
      }, { status: 500 })
    }

    const data = await response.json()

    // Extract the generated image from the response
    const parts = data.candidates?.[0]?.content?.parts || []
    let imageData: string | null = null
    let mimeType: string = 'image/png'
    let textResponse: string | null = null

    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/')) {
        imageData = part.inlineData.data // Base64 encoded image
        mimeType = part.inlineData.mimeType
      } else if (part.text) {
        textResponse = part.text
      }
    }

    if (!imageData) {
      // Check for safety blocks
      const blockReason = data.candidates?.[0]?.finishReason
      if (blockReason === 'SAFETY') {
        return NextResponse.json({
          error: 'Image generation blocked',
          details: 'The request was blocked by content safety filters. Please modify your prompt.',
        }, { status: 422 })
      }

      return NextResponse.json({
        error: 'No image generated',
        details: textResponse || 'The model did not return an image. Try a different prompt.',
        blockReason,
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
      textResponse, // Any text the model returned alongside the image
    })
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json({
      error: 'Failed to generate image',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
