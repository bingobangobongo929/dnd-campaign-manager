/**
 * AI Image Generation API
 *
 * Generates images using Google's Gemini 3 Pro Image Preview (gemini-3-pro-image-preview)
 * Also known as "Nano Banana Pro"
 * Uses the generateContent method for multimodal image generation
 * Best for: Images requiring deep reasoning, adhering to complex instructions
 * Supports text-to-image generation with feedback/regeneration flow
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { recordAPIUsage } from '@/lib/api-usage'

export const runtime = 'nodejs'
export const maxDuration = 120 // 2 minutes for image generation

// Available image models
type ImageModel = 'gemini-3-pro-image-preview' | 'imagen-3.0-generate-002' | 'imagen-3.0-fast-generate-001'

interface GenerateImageRequest {
  prompt: string
  model?: ImageModel
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '9:16' | '16:9'
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

    // Tier check - only standard and premium tiers can use AI
    const { data: settings } = await supabase
      .from('user_settings')
      .select('tier')
      .eq('user_id', user.id)
      .single()
    if ((settings?.tier || 'free') === 'free') {
      return NextResponse.json({ error: 'AI features require a paid plan' }, { status: 403 })
    }

    const body: GenerateImageRequest = await req.json()
    const {
      prompt,
      model = 'gemini-3-pro-image-preview',
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

    // Add negative prompt if provided
    if (negativePrompt) {
      fullPrompt = `${fullPrompt}

Avoid: ${negativePrompt}`
    }

    // Add aspect ratio guidance to prompt
    const aspectRatioGuide: Record<string, string> = {
      '1:1': 'square format',
      '2:3': 'portrait format (2:3 vertical)',
      '3:2': 'landscape format (3:2 horizontal)',
      '3:4': 'portrait format (3:4)',
      '4:3': 'landscape format (4:3)',
      '9:16': 'tall portrait format (9:16)',
      '16:9': 'wide landscape format (16:9)'
    }

    const imagePrompt = `Generate an image: ${fullPrompt}. Use ${aspectRatioGuide[aspectRatio]}.`

    // Use Gemini model based on selection
    const useGemini = model === 'gemini-3-pro-image-preview'

    if (useGemini) {
      // Gemini 3 Pro Image Preview (Nano Banana Pro) with multimodal image generation
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: imagePrompt
              }]
            }],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
            },
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Gemini API error:', response.status, errorData)

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
            details: 'Gemini 3 Pro Image Preview model not available. Check your API key has access to this model.',
          }, { status: 404 })
        }

        return NextResponse.json({
          error: 'Image generation failed',
          details: errorData.error?.message || `API returned status ${response.status}`,
        }, { status: 500 })
      }

      const data = await response.json()

      // Gemini returns candidates with parts that may contain images
      const candidates = data.candidates || []
      if (candidates.length === 0) {
        return NextResponse.json({
          error: 'No response generated',
          details: 'The model did not return any content. Try a different prompt.',
        }, { status: 422 })
      }

      // Look for image parts in the response
      const parts = candidates[0]?.content?.parts || []
      const imagePart = parts.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData?.mimeType?.startsWith('image/'))

      if (!imagePart?.inlineData) {
        // Model may have returned text instead of image
        const textPart = parts.find((p: { text?: string }) => p.text)
        return NextResponse.json({
          error: 'No image generated',
          details: textPart?.text || 'The model did not return an image. Try rephrasing your prompt to be more visual.',
        }, { status: 422 })
      }

      const imageData = imagePart.inlineData.data
      const mimeType = imagePart.inlineData.mimeType || 'image/png'

      // Record API usage for Google
      await recordAPIUsage({
        provider: 'google',
        model,
        endpoint: '/api/ai/generate-image',
        operation_type: 'image_generation',
        images_generated: 1,
        user_id: user.id,
      })

      return NextResponse.json({
        success: true,
        image: {
          data: imageData,
          mimeType,
          dataUrl: `data:${mimeType};base64,${imageData}`,
        },
        model,
        prompt: fullPrompt,
        allImages: [{
          data: imageData,
          mimeType,
          dataUrl: `data:${mimeType};base64,${imageData}`,
        }],
      })
    } else {
      // Fallback to Imagen 3 for older model selections
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
            details: 'Imagen 3 model not available. The API may need Gemini image generation access.',
          }, { status: 404 })
        }

        return NextResponse.json({
          error: 'Image generation failed',
          details: errorData.error?.message || `API returned status ${response.status}`,
        }, { status: 500 })
      }

      const data = await response.json()

      const predictions = data.predictions || []
      if (predictions.length === 0) {
        return NextResponse.json({
          error: 'No image generated',
          details: 'The model did not return any images. Try a different prompt.',
        }, { status: 422 })
      }

      const prediction = predictions[0]
      const imageData = prediction.bytesBase64Encoded
      const mimeType = prediction.mimeType || 'image/png'

      if (!imageData) {
        return NextResponse.json({
          error: 'No image data',
          details: 'The model response did not contain image data.',
        }, { status: 422 })
      }

      // Record API usage for Imagen
      await recordAPIUsage({
        provider: 'google',
        model,
        endpoint: '/api/ai/generate-image',
        operation_type: 'image_generation',
        images_generated: predictions.length,
        user_id: user.id,
      })

      return NextResponse.json({
        success: true,
        image: {
          data: imageData,
          mimeType,
          dataUrl: `data:${mimeType};base64,${imageData}`,
        },
        model,
        prompt: fullPrompt,
        allImages: predictions.map((p: { bytesBase64Encoded: string; mimeType?: string }) => ({
          data: p.bytesBase64Encoded,
          mimeType: p.mimeType || 'image/png',
          dataUrl: `data:${p.mimeType || 'image/png'};base64,${p.bytesBase64Encoded}`,
        })),
      })
    }
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json({
      error: 'Failed to generate image',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
