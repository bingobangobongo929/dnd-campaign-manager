/**
 * AI One-Shot Poster Prompt Generation
 *
 * Generates a copyable prompt for image AI tools (Midjourney, DALL-E, etc.)
 * No API costs - just builds an optimized prompt from the one-shot details.
 */

import { NextResponse } from 'next/server'

export const runtime = 'edge'

interface GenerateOneshotPromptRequest {
  title: string
  tagline?: string | null
  genreTags?: string[]
  introduction?: string | null
  settingNotes?: string | null
}

export async function POST(req: Request) {
  try {
    const { title, tagline, genreTags, introduction, settingNotes }: GenerateOneshotPromptRequest = await req.json()

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Extract key themes from genres
    const genreContext = genreTags?.length
      ? genreTags.join(', ').toLowerCase()
      : ''

    // Extract first paragraph of intro for context (avoid spoilers)
    const introContext = introduction
      ? introduction.split('\n\n')[0].slice(0, 250)
      : ''

    // Determine style based on genres
    let styleGuide = 'epic fantasy movie poster style'
    let moodGuide = 'dramatic and atmospheric'

    if (genreTags?.some(g => g.toLowerCase().includes('horror'))) {
      styleGuide = 'dark horror movie poster style, ominous shadows'
      moodGuide = 'dread, tension, foreboding'
    } else if (genreTags?.some(g => g.toLowerCase().includes('mystery'))) {
      styleGuide = 'noir mystery poster style, moody lighting'
      moodGuide = 'mysterious, atmospheric, intriguing'
    } else if (genreTags?.some(g => g.toLowerCase().includes('survival'))) {
      styleGuide = 'gritty survival thriller poster, harsh lighting'
      moodGuide = 'desperate, tense, visceral'
    } else if (genreTags?.some(g => g.toLowerCase().includes('dark fantasy'))) {
      styleGuide = 'dark fantasy movie poster, gothic aesthetic'
      moodGuide = 'brooding, epic, morally complex'
    }

    // Build the prompt parts - optimized for text overlay in bottom third
    const promptParts = [
      `Dramatic vertical movie poster artwork`,
      `IMPORTANT COMPOSITION: Place all characters, focal points, and key details in the UPPER TWO-THIRDS of the image. Leave the bottom third relatively empty, darker, or with subtle background elements only - this area will have text overlay`,
      tagline ? `Theme: "${tagline}"` : null,
      genreContext ? `Genre: ${genreContext}` : null,
      introContext ? `Setting context: ${introContext}` : null,
      `Style: ${styleGuide}`,
      `Mood: ${moodGuide}`,
      `The bottom 30% should fade to darkness or have a natural dark gradient/vignette - perfect for text legibility`,
      `Cinematic composition, dramatic lighting, painterly digital art, highly detailed`,
      `No text, no letters, no words, no title anywhere in the image`,
      `2:3 aspect ratio, vertical poster orientation`,
    ].filter(Boolean)

    const prompt = promptParts.join('. ')

    // Also create a shorter version for tools with character limits
    const shortPrompt = [
      `Movie poster for "${title}"`,
      genreContext || 'fantasy adventure',
      styleGuide,
      'main subject in upper 2/3, dark/empty bottom third for text',
      'cinematic lighting, no text, 2:3 vertical',
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
