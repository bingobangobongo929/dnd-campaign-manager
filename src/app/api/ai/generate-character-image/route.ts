/**
 * AI Character Image Prompt Generation
 *
 * Generates a copyable prompt for image AI tools (Midjourney, DALL-E, etc.)
 * Optimized for character portraits that work with both 1:1 avatar and 2:3 detail crops.
 */

import { NextResponse } from 'next/server'

export const runtime = 'edge'

interface GenerateCharacterPromptRequest {
  name: string
  type?: 'pc' | 'npc'
  race?: string | null
  class?: string | null
  backstory?: string | null
  personality?: string | null
}

export async function POST(req: Request) {
  try {
    const { name, type, race, class: charClass, backstory, personality }: GenerateCharacterPromptRequest = await req.json()

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Extract brief context from backstory
    const backstoryContext = backstory
      ? backstory.split('\n')[0].slice(0, 200)
      : ''

    // Build character description
    const characterDesc = [
      race || 'human',
      charClass ? `${charClass}` : null,
      type === 'npc' ? 'NPC' : 'adventurer',
    ].filter(Boolean).join(' ')

    // Determine style based on personality/backstory
    let moodGuide = 'heroic, determined'
    const combinedText = ((backstory || '') + ' ' + (personality || '')).toLowerCase()

    if (combinedText.includes('dark') || combinedText.includes('brooding') || combinedText.includes('tragic')) {
      moodGuide = 'mysterious, brooding, shadowed'
    } else if (combinedText.includes('cheerful') || combinedText.includes('happy') || combinedText.includes('jovial')) {
      moodGuide = 'warm, friendly, approachable'
    } else if (combinedText.includes('cunning') || combinedText.includes('rogue') || combinedText.includes('thief')) {
      moodGuide = 'sly, clever, mischievous'
    } else if (combinedText.includes('noble') || combinedText.includes('royal') || combinedText.includes('paladin')) {
      moodGuide = 'regal, noble, dignified'
    } else if (combinedText.includes('wild') || combinedText.includes('barbarian') || combinedText.includes('fierce')) {
      moodGuide = 'fierce, untamed, powerful'
    }

    // Build the prompt - optimized for portrait/bust with centered face
    const promptParts = [
      `Fantasy character portrait of ${name}, a ${characterDesc}`,
      `IMPORTANT COMPOSITION: Head and shoulders portrait, face centered in frame, suitable for both square avatar crop and 2:3 vertical crop`,
      backstoryContext ? `Character context: ${backstoryContext}` : null,
      personality ? `Personality: ${personality.slice(0, 100)}` : null,
      `Expression and mood: ${moodGuide}`,
      `Style: High fantasy character portrait, painterly digital art, dramatic lighting`,
      `Professional character art quality, detailed face, expressive eyes`,
      `Soft background gradient, focus on the character`,
      `No text, no letters, no watermarks`,
    ].filter(Boolean)

    const prompt = promptParts.join('. ')

    // Shorter version
    const shortPrompt = [
      `Fantasy portrait of ${name}`,
      characterDesc,
      moodGuide,
      'head and shoulders, centered face, painterly, dramatic lighting, no text',
    ].join(', ')

    return NextResponse.json({
      prompt,
      shortPrompt,
      name,
    })
  } catch (error) {
    console.error('Prompt generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate prompt' },
      { status: 500 }
    )
  }
}
