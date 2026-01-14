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
    let isSciF = false

    // Check for sci-fi genres first to set the flag
    if (genreTags?.some(g => {
      const lower = g.toLowerCase()
      return lower.includes('sci-fi') || lower.includes('scifi') || lower.includes('science fiction') ||
             lower.includes('cyberpunk') || lower.includes('space') || lower.includes('mecha') ||
             lower.includes('futuristic') || lower.includes('starship')
    })) {
      isSciF = true
      styleGuide = 'sci-fi movie poster style, futuristic aesthetic, space opera'
      moodGuide = 'epic, futuristic, adventurous'
    }

    if (genreTags?.some(g => g.toLowerCase().includes('horror'))) {
      styleGuide = isSciF
        ? 'sci-fi horror movie poster, cosmic dread, alien terror'
        : 'dark horror movie poster style, ominous shadows'
      moodGuide = 'dread, tension, foreboding'
    } else if (genreTags?.some(g => g.toLowerCase().includes('mystery'))) {
      styleGuide = isSciF
        ? 'sci-fi noir mystery poster, neon-lit shadows, futuristic detective'
        : 'noir mystery poster style, moody lighting'
      moodGuide = 'mysterious, atmospheric, intriguing'
    } else if (genreTags?.some(g => g.toLowerCase().includes('survival'))) {
      styleGuide = isSciF
        ? 'sci-fi survival thriller poster, hostile alien environment, desperate astronauts'
        : 'gritty survival thriller poster, harsh lighting'
      moodGuide = 'desperate, tense, visceral'
    } else if (genreTags?.some(g => g.toLowerCase().includes('dark fantasy'))) {
      styleGuide = 'dark fantasy movie poster, gothic aesthetic'
      moodGuide = 'brooding, epic, morally complex'
    } else if (genreTags?.some(g => g.toLowerCase().includes('cyberpunk'))) {
      styleGuide = 'cyberpunk movie poster, neon-lit streets, chrome and leather, high tech low life'
      moodGuide = 'gritty, neon-soaked, rebellious'
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
