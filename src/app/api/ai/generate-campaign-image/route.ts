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
  game_system?: string | null
  character_names?: string[] | null
  themes?: string[] | null
}

export async function POST(req: Request) {
  try {
    const { title, summary, setting, game_system, character_names, themes }: GenerateCampaignPromptRequest = await req.json()

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Extract context from summary (first 400 chars for richer context)
    const summaryContext = summary
      ? summary.split('\n\n')[0].slice(0, 400)
      : ''

    // Determine base art style from game system
    let artStyle = 'epic fantasy'
    if (game_system) {
      const sys = game_system.toLowerCase()
      if (sys.includes('lancer') || sys.includes('mech')) {
        artStyle = 'sci-fi mecha, futuristic spacecraft and mechs'
      } else if (sys.includes('call of cthulhu') || sys.includes('coc')) {
        artStyle = 'cosmic horror, 1920s era, Lovecraftian'
      } else if (sys.includes('vampire') || sys.includes('masquerade')) {
        artStyle = 'gothic modern urban fantasy, dark nightlife'
      } else if (sys.includes('cyberpunk')) {
        artStyle = 'cyberpunk dystopia, neon-lit streets'
      } else if (sys.includes('pathfinder') || sys.includes('d&d') || sys.includes('5e')) {
        artStyle = 'high fantasy adventure'
      }
    }

    // Determine style based on setting keywords
    let styleGuide = `${artStyle} landscape, cinematic`
    let moodGuide = 'dramatic, adventurous, mysterious'

    const lowerSetting = (setting || '').toLowerCase()
    const lowerSummary = (summary || '').toLowerCase()
    const themesText = (themes || []).join(' ').toLowerCase()
    const combinedText = lowerSetting + ' ' + lowerSummary + ' ' + themesText

    if (combinedText.includes('horror') || combinedText.includes('undead') || combinedText.includes('dark')) {
      styleGuide = `dark ${artStyle} landscape, gothic architecture, ominous atmosphere`
      moodGuide = 'foreboding, tense, dark'
    } else if (combinedText.includes('steampunk') || combinedText.includes('industrial')) {
      styleGuide = 'steampunk fantasy, brass and copper machinery, Victorian architecture'
      moodGuide = 'industrial, inventive, smoky'
    } else if (combinedText.includes('urban') || combinedText.includes('city')) {
      styleGuide = `${artStyle} cityscape, towering spires, busy streets`
      moodGuide = 'bustling, mysterious, grand'
    } else if (combinedText.includes('ocean') || combinedText.includes('sea') || combinedText.includes('pirate') || combinedText.includes('treasure')) {
      styleGuide = `${artStyle} seascape, ships and harbors, stormy skies`
      moodGuide = 'adventurous, wild, maritime'
    } else if (combinedText.includes('hell') || combinedText.includes('demon') || combinedText.includes('infernal')) {
      styleGuide = `${artStyle} hellscape, fire and brimstone, demonic architecture`
      moodGuide = 'apocalyptic, dangerous, fiery'
    } else if (combinedText.includes('forest') || combinedText.includes('nature') || combinedText.includes('druid')) {
      styleGuide = `enchanted ${artStyle} forest, ancient trees, magical atmosphere`
      moodGuide = 'mystical, serene yet dangerous, natural'
    } else if (combinedText.includes('space') || combinedText.includes('star') || combinedText.includes('planet')) {
      styleGuide = 'sci-fi space vista, planetary landscapes, starships'
      moodGuide = 'vast, awe-inspiring, adventurous'
    } else if (combinedText.includes('war') || combinedText.includes('battle') || combinedText.includes('military')) {
      styleGuide = `${artStyle} battlefield, armies clashing, dramatic action`
      moodGuide = 'intense, epic, conflict-driven'
    }

    // Build visual elements based on themes and character count
    const visualElements: string[] = []
    if (character_names && character_names.length > 0) {
      if (character_names.length <= 4) {
        visualElements.push(`silhouettes of ${character_names.length} heroes in dramatic poses`)
      } else {
        visualElements.push('group of adventurers silhouetted against the horizon')
      }
    }
    if (themes && themes.length > 0) {
      themes.slice(0, 3).forEach(theme => {
        const t = theme.toLowerCase()
        if (t.includes('redemption')) visualElements.push('rays of light breaking through darkness')
        if (t.includes('betrayal')) visualElements.push('shadowy figures, divided loyalties')
        if (t.includes('discovery')) visualElements.push('ancient ruins or mysterious artifacts')
        if (t.includes('survival')) visualElements.push('harsh environment, rugged terrain')
      })
    }

    // Build the prompt - optimized for 16:9 with text overlay on bottom
    const promptParts = [
      `Dramatic widescreen ${artStyle} scene`,
      `IMPORTANT COMPOSITION: Main focal point and action should be in the UPPER TWO-THIRDS of the image. The bottom third should be darker, atmospheric, or have subtle elements - this area will have text/title overlay`,
      summaryContext ? `Scene context: ${summaryContext}` : null,
      setting ? `World setting: ${setting}` : null,
      visualElements.length > 0 ? `Visual elements: ${visualElements.join(', ')}` : null,
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
      `${artStyle} scene for "${title}"`,
      styleGuide,
      visualElements.length > 0 ? visualElements[0] : null,
      'main focus in upper 2/3, dark atmospheric bottom for text overlay',
      'cinematic wide angle, dramatic lighting, no text, 16:9 widescreen',
    ].filter(Boolean).join(', ')

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
