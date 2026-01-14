/**
 * AI Campaign Image Prompt Generation
 *
 * Generates a copyable prompt for image AI tools (Midjourney, DALL-E, etc.)
 * Optimized for 16:9 widescreen format with text overlay considerations.
 */

import { NextResponse } from 'next/server'

export const runtime = 'edge'

interface GenerateCampaignPromptRequest {
  title: string
  summary?: string | null
  setting?: string | null
}

export async function POST(req: Request) {
  try {
    const { title, summary, setting }: GenerateCampaignPromptRequest = await req.json()

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Extract context from summary (first 300 chars)
    const summaryContext = summary
      ? summary.split('\n\n')[0].slice(0, 300)
      : ''

    // Determine style based on setting keywords
    let styleGuide = 'epic fantasy landscape, cinematic'
    let moodGuide = 'dramatic, adventurous, mysterious'

    const lowerSetting = (setting || '').toLowerCase()
    const lowerSummary = (summary || '').toLowerCase()
    const combinedText = lowerSetting + ' ' + lowerSummary

    if (combinedText.includes('horror') || combinedText.includes('undead') || combinedText.includes('dark')) {
      styleGuide = 'dark fantasy landscape, gothic architecture, ominous atmosphere'
      moodGuide = 'foreboding, tense, dark'
    } else if (combinedText.includes('steampunk') || combinedText.includes('industrial')) {
      styleGuide = 'steampunk fantasy, brass and copper machinery, Victorian architecture'
      moodGuide = 'industrial, inventive, smoky'
    } else if (combinedText.includes('urban') || combinedText.includes('city')) {
      styleGuide = 'fantasy cityscape, towering spires, busy streets'
      moodGuide = 'bustling, mysterious, grand'
    } else if (combinedText.includes('ocean') || combinedText.includes('sea') || combinedText.includes('pirate')) {
      styleGuide = 'fantasy seascape, ships and harbors, stormy skies'
      moodGuide = 'adventurous, wild, maritime'
    } else if (combinedText.includes('hell') || combinedText.includes('demon') || combinedText.includes('infernal')) {
      styleGuide = 'hellscape fantasy, fire and brimstone, demonic architecture'
      moodGuide = 'apocalyptic, dangerous, fiery'
    } else if (combinedText.includes('forest') || combinedText.includes('nature') || combinedText.includes('druid')) {
      styleGuide = 'enchanted forest, ancient trees, magical atmosphere'
      moodGuide = 'mystical, serene yet dangerous, natural'
    }

    // Build the prompt - optimized for 16:9 with text overlay on bottom
    const promptParts = [
      `Dramatic widescreen fantasy scene`,
      `IMPORTANT COMPOSITION: Main focal point and action should be in the UPPER TWO-THIRDS of the image. The bottom third should be darker, atmospheric, or have subtle elements - this area will have text/title overlay`,
      summaryContext ? `Scene context: ${summaryContext}` : null,
      setting ? `World setting: ${setting}` : null,
      `Style: ${styleGuide}`,
      `Mood: ${moodGuide}`,
      `The bottom portion should naturally fade darker or have atmospheric haze/fog for text legibility`,
      `Cinematic wide angle, dramatic lighting, concept art quality, highly detailed environment`,
      `No text, no letters, no words, no title anywhere in the image`,
      `16:9 aspect ratio, horizontal widescreen composition`,
    ].filter(Boolean)

    const prompt = promptParts.join('. ')

    // Shorter version for tools with character limits
    const shortPrompt = [
      `Fantasy scene for "${title}"`,
      styleGuide,
      'main focus in upper 2/3, dark atmospheric bottom for text overlay',
      'cinematic wide angle, dramatic lighting, no text, 16:9 widescreen',
    ].join(', ')

    return NextResponse.json({
      prompt,
      shortPrompt,
      title,
    })
  } catch (error) {
    console.error('Prompt generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate prompt' },
      { status: 500 }
    )
  }
}
