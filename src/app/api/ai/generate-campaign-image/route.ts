/**
 * AI Campaign Image Prompt Generation
 *
 * Generates a copyable prompt for image AI tools (Midjourney, DALL-E, etc.)
 * Optimized for 16:9 widescreen format.
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

    // Determine base art style from game system - THIS IS THE PRIMARY DETECTION
    let artStyle = 'epic fantasy'
    let isSciF = false
    let isHorror = false
    let isModern = false

    if (game_system) {
      const sys = game_system.toLowerCase()
      // Sci-fi systems - MUST generate space/futuristic imagery, never fantasy
      if (sys.includes('lancer') || sys.includes('mech') || sys.includes('starfinder') || sys.includes('traveller') || sys.includes('stars without number')) {
        artStyle = 'science fiction, futuristic spacecraft, space opera, mechs'
        isSciF = true
      } else if (sys.includes('call of cthulhu') || sys.includes('coc') || sys.includes('delta green')) {
        artStyle = 'cosmic horror, 1920s era, Lovecraftian'
        isHorror = true
      } else if (sys.includes('vampire') || sys.includes('masquerade') || sys.includes('world of darkness')) {
        artStyle = 'gothic modern urban fantasy, dark nightlife'
        isModern = true
      } else if (sys.includes('cyberpunk') || sys.includes('shadowrun')) {
        artStyle = 'cyberpunk dystopia, neon-lit streets, high tech low life'
        isSciF = true
        isModern = true
      } else if (sys.includes('pathfinder') || sys.includes('d&d') || sys.includes('5e')) {
        artStyle = 'high fantasy adventure'
      }
    }

    const lowerTitle = (title || '').toLowerCase()
    const lowerSetting = (setting || '').toLowerCase()
    const lowerSummary = (summary || '').toLowerCase()
    const themesText = (themes || []).join(' ').toLowerCase()
    const combinedText = lowerTitle + ' ' + lowerSetting + ' ' + lowerSummary + ' ' + themesText

    // Fallback sci-fi detection from content keywords (only if game_system didn't set it)
    if (!isSciF && (
      combinedText.includes('mech') || combinedText.includes('starship') ||
      combinedText.includes('spaceship') || combinedText.includes('spacecraft') ||
      combinedText.includes('space pirate') || combinedText.includes('space station') ||
      combinedText.includes('galactic') || combinedText.includes('interstellar') ||
      combinedText.includes('hyperspace') || combinedText.includes('warp') ||
      combinedText.includes('alien') || combinedText.includes('android')
    )) {
      isSciF = true
      artStyle = 'science fiction, futuristic spacecraft, space opera'
    }

    // Determine style based on setting keywords - RESPECTING the isSciF flag
    let styleGuide: string
    let moodGuide: string

    // For sci-fi, ALWAYS use space/futuristic themes regardless of keywords
    if (isSciF) {
      // Check for specific sci-fi sub-themes
      if (combinedText.includes('pirate') || combinedText.includes('treasure') || combinedText.includes('smuggler') || combinedText.includes('outlaw')) {
        styleGuide = `${artStyle}, space pirate mothership, asteroid hideout, stolen cargo, neon-lit hangar bays, rogues and outlaws in a lawless frontier of space, NO sailing ships, NO ocean, NO water`
        moodGuide = 'adventurous, lawless, futuristic rogues, gritty space western'
      } else if (combinedText.includes('horror') || combinedText.includes('dark') || combinedText.includes('dead')) {
        styleGuide = `${artStyle}, derelict space station, abandoned spacecraft, alien ruins, eerie void of space`
        moodGuide = 'foreboding, tense, cosmic dread'
      } else if (combinedText.includes('war') || combinedText.includes('battle') || combinedText.includes('military')) {
        styleGuide = `${artStyle}, massive mech battle, orbital warfare, energy weapons, capital ships exchanging fire`
        moodGuide = 'intense, epic, military sci-fi'
      } else if (combinedText.includes('city') || combinedText.includes('urban')) {
        styleGuide = `${artStyle}, futuristic megacity, towering spires reaching into clouds, flying vehicles, neon advertisements`
        moodGuide = 'bustling, high-tech, metropolitan'
      } else {
        // Default sci-fi scene
        styleGuide = `${artStyle}, vast space vista, distant planets, starships, cosmic scale, futuristic technology`
        moodGuide = 'vast, awe-inspiring, adventurous'
      }
    } else if (isHorror) {
      styleGuide = `${artStyle}, ominous atmosphere, fog and shadows, ancient architecture`
      moodGuide = 'foreboding, tense, unsettling'
    } else if (isModern) {
      styleGuide = `${artStyle}, contemporary setting with supernatural elements`
      moodGuide = 'mysterious, urban, nocturnal'
    } else {
      // Fantasy - check for sub-themes
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
        styleGuide = `${artStyle} seascape, sailing ships, stormy skies, coastal fortresses`
        moodGuide = 'adventurous, wild, maritime'
      } else if (combinedText.includes('hell') || combinedText.includes('demon') || combinedText.includes('infernal')) {
        styleGuide = `${artStyle} hellscape, fire and brimstone, demonic architecture`
        moodGuide = 'apocalyptic, dangerous, fiery'
      } else if (combinedText.includes('forest') || combinedText.includes('nature') || combinedText.includes('druid')) {
        styleGuide = `enchanted ${artStyle} forest, ancient trees, magical atmosphere`
        moodGuide = 'mystical, serene yet dangerous, natural'
      } else if (combinedText.includes('war') || combinedText.includes('battle') || combinedText.includes('military')) {
        styleGuide = `${artStyle} battlefield, armies clashing, dramatic action`
        moodGuide = 'intense, epic, conflict-driven'
      } else {
        styleGuide = `${artStyle} landscape, dramatic vistas, cinematic composition`
        moodGuide = 'dramatic, adventurous, mysterious'
      }
    }

    // Build visual elements based on themes and character count
    const visualElements: string[] = []
    if (character_names && character_names.length > 0) {
      if (character_names.length <= 4) {
        const heroType = isSciF ? 'pilots or space adventurers' : 'heroes'
        visualElements.push(`silhouettes of ${character_names.length} ${heroType} in dramatic poses`)
      } else {
        const groupType = isSciF ? 'crew members' : 'adventurers'
        visualElements.push(`group of ${groupType} silhouetted against the ${isSciF ? 'starfield' : 'horizon'}`)
      }
    }
    if (themes && themes.length > 0) {
      themes.slice(0, 3).forEach(theme => {
        const t = theme.toLowerCase()
        if (t.includes('redemption')) visualElements.push(isSciF ? 'a lone ship emerging from darkness into light' : 'rays of light breaking through darkness')
        if (t.includes('betrayal')) visualElements.push('shadowy figures, divided loyalties')
        if (t.includes('discovery')) visualElements.push(isSciF ? 'ancient alien ruins, mysterious technology' : 'ancient ruins or mysterious artifacts')
        if (t.includes('survival')) visualElements.push(isSciF ? 'damaged spacecraft, hostile environment' : 'harsh environment, rugged terrain')
      })
    }

    // Build the prompt - clean cinematic style without composition restrictions
    const promptParts = [
      `Dramatic widescreen cinematic scene`,
      `Genre: ${artStyle}`,
      summaryContext ? `Scene context: ${summaryContext}` : null,
      setting ? `World setting: ${setting}` : null,
      visualElements.length > 0 ? `Visual elements: ${visualElements.join(', ')}` : null,
      `Style: ${styleGuide}`,
      `Mood: ${moodGuide}`,
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
