/**
 * AI One-Shot Poster Prompt Generation
 *
 * Generates a copyable prompt for image AI tools (Midjourney, DALL-E, etc.)
 * Creates unique, specific prompts based on the one-shot's content.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

interface GenerateOneshotPromptRequest {
  title: string
  tagline?: string | null
  genreTags?: string[]
  introduction?: string | null
  settingNotes?: string | null
}

// Extract key visual elements from text
function extractVisualElements(text: string): string[] {
  const elements: string[] = []
  const lower = text.toLowerCase()

  // Locations
  if (lower.includes('castle') || lower.includes('fortress')) elements.push('imposing castle silhouette')
  if (lower.includes('forest') || lower.includes('woods')) elements.push('dark enchanted forest')
  if (lower.includes('dungeon') || lower.includes('crypt')) elements.push('ominous dungeon entrance')
  if (lower.includes('tavern') || lower.includes('inn')) elements.push('cozy tavern with warm light')
  if (lower.includes('ship') || lower.includes('vessel')) elements.push('majestic sailing ship')
  if (lower.includes('cave') || lower.includes('cavern')) elements.push('mysterious cave mouth')
  if (lower.includes('temple') || lower.includes('shrine')) elements.push('ancient temple ruins')
  if (lower.includes('city') || lower.includes('town')) elements.push('sprawling medieval city')
  if (lower.includes('mountain') || lower.includes('peak')) elements.push('towering mountain peaks')
  if (lower.includes('swamp') || lower.includes('marsh')) elements.push('eerie misty swamp')
  if (lower.includes('desert') || lower.includes('sand')) elements.push('vast desert dunes')
  if (lower.includes('ocean') || lower.includes('sea')) elements.push('stormy ocean waves')
  if (lower.includes('island')) elements.push('mysterious island on the horizon')
  if (lower.includes('volcano')) elements.push('erupting volcano with lava')
  if (lower.includes('tower')) elements.push('twisted wizard tower')
  if (lower.includes('graveyard') || lower.includes('cemetery')) elements.push('haunted graveyard')
  if (lower.includes('library')) elements.push('vast arcane library')
  if (lower.includes('arena') || lower.includes('colosseum')) elements.push('grand battle arena')

  // Sci-fi locations
  if (lower.includes('space station')) elements.push('orbital space station')
  if (lower.includes('starship') || lower.includes('spacecraft')) elements.push('massive starship')
  if (lower.includes('planet')) elements.push('alien planet vista')
  if (lower.includes('asteroid')) elements.push('asteroid field')
  if (lower.includes('colony')) elements.push('futuristic colony dome')
  if (lower.includes('mech') || lower.includes('robot')) elements.push('towering battle mech')

  // Creatures
  if (lower.includes('dragon')) elements.push('dragon shadow in the sky')
  if (lower.includes('undead') || lower.includes('zombie')) elements.push('shambling undead horde')
  if (lower.includes('demon') || lower.includes('devil')) elements.push('demonic presence')
  if (lower.includes('vampire')) elements.push('pale vampire lord')
  if (lower.includes('werewolf') || lower.includes('lycanthrope')) elements.push('werewolf howling at moon')
  if (lower.includes('giant')) elements.push('massive giant looming')
  if (lower.includes('goblin')) elements.push('goblin raiders')
  if (lower.includes('orc')) elements.push('orcish war band')
  if (lower.includes('ghost') || lower.includes('spirit')) elements.push('ethereal ghostly figure')
  if (lower.includes('lich')) elements.push('skeletal lich with glowing eyes')
  if (lower.includes('kraken') || lower.includes('tentacle')) elements.push('kraken tentacles rising')
  if (lower.includes('witch') || lower.includes('hag')) elements.push('cackling witch silhouette')
  if (lower.includes('cultist')) elements.push('hooded cultists in ritual')

  // Atmosphere
  if (lower.includes('storm') || lower.includes('thunder')) elements.push('lightning-filled storm clouds')
  if (lower.includes('fire') || lower.includes('flame')) elements.push('raging flames')
  if (lower.includes('ice') || lower.includes('frozen') || lower.includes('snow')) elements.push('frozen icy landscape')
  if (lower.includes('blood') || lower.includes('gore')) elements.push('blood-red accents')
  if (lower.includes('magic') || lower.includes('arcane')) elements.push('swirling magical energy')
  if (lower.includes('treasure') || lower.includes('gold')) elements.push('glinting treasure hoard')
  if (lower.includes('war') || lower.includes('battle')) elements.push('battlefield chaos')
  if (lower.includes('plague') || lower.includes('disease')) elements.push('sickly green miasma')

  return elements.slice(0, 4) // Limit to 4 elements to avoid cluttering
}

// Get unique color palette based on content
function getColorPalette(genres: string[], text: string): string {
  const lower = text.toLowerCase()

  if (genres.some(g => g.toLowerCase().includes('horror'))) {
    if (lower.includes('blood') || lower.includes('gore')) return 'blood red and shadow black color palette'
    if (lower.includes('ghost') || lower.includes('spirit')) return 'pale blue and ethereal white color palette'
    return 'dark greens and sickly yellows color palette'
  }

  if (genres.some(g => g.toLowerCase().includes('mystery'))) {
    return 'deep purples and midnight blue color palette with golden highlights'
  }

  if (genres.some(g => g.toLowerCase().includes('cyberpunk'))) {
    return 'neon pink and electric blue against dark chrome color palette'
  }

  if (genres.some(g => g.toLowerCase().includes('sci-fi') || g.toLowerCase().includes('space'))) {
    return 'cosmic blues, starlight white, and nebula purple color palette'
  }

  if (lower.includes('fire') || lower.includes('volcano') || lower.includes('demon')) {
    return 'fiery oranges and hellish reds color palette'
  }

  if (lower.includes('ice') || lower.includes('frozen') || lower.includes('winter')) {
    return 'icy blues and arctic white color palette'
  }

  if (lower.includes('forest') || lower.includes('nature') || lower.includes('druid')) {
    return 'deep forest greens and earthy browns color palette'
  }

  if (lower.includes('ocean') || lower.includes('sea') || lower.includes('water')) {
    return 'ocean blues and seafoam greens color palette'
  }

  if (lower.includes('desert') || lower.includes('sand')) {
    return 'warm sand gold and burnt orange color palette'
  }

  // Default epic fantasy palette
  return 'rich golds, deep crimsons, and royal purples color palette'
}

export async function POST(req: Request) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, tagline, genreTags, introduction, settingNotes }: GenerateOneshotPromptRequest = await req.json()

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Combine all text for analysis
    const allText = [title, tagline, introduction, settingNotes].filter(Boolean).join(' ')

    // Extract genre context
    const genres = genreTags || []
    const genreContext = genres.length ? genres.join(', ').toLowerCase() : 'fantasy adventure'

    // Check for sci-fi
    const isSciF = genres.some(g => {
      const lower = g.toLowerCase()
      return lower.includes('sci-fi') || lower.includes('scifi') || lower.includes('science fiction') ||
             lower.includes('cyberpunk') || lower.includes('space') || lower.includes('mecha') ||
             lower.includes('futuristic') || lower.includes('starship')
    })

    // Determine base style
    let styleGuide: string
    let moodGuide: string

    if (genres.some(g => g.toLowerCase().includes('horror'))) {
      styleGuide = isSciF
        ? 'sci-fi horror movie poster, Alien/Event Horizon aesthetic, cosmic dread'
        : 'dark horror movie poster, gothic horror aesthetic, Hammer Horror inspired'
      moodGuide = 'dread, terror, ominous, unsettling'
    } else if (genres.some(g => g.toLowerCase().includes('mystery'))) {
      styleGuide = isSciF
        ? 'sci-fi noir mystery poster, Blade Runner aesthetic, neon-lit shadows'
        : 'noir mystery poster, detective noir aesthetic, moody shadows'
      moodGuide = 'mysterious, intriguing, suspenseful'
    } else if (genres.some(g => g.toLowerCase().includes('comedy') || g.toLowerCase().includes('humour'))) {
      styleGuide = 'whimsical adventure poster, colorful and dynamic, Pixar-inspired lighting'
      moodGuide = 'fun, adventurous, lighthearted'
    } else if (genres.some(g => g.toLowerCase().includes('survival'))) {
      styleGuide = isSciF
        ? 'sci-fi survival thriller poster, The Martian/Gravity aesthetic, isolation and danger'
        : 'survival thriller poster, gritty realism, harsh environment'
      moodGuide = 'desperate, tense, raw survival'
    } else if (genres.some(g => g.toLowerCase().includes('dark fantasy'))) {
      styleGuide = 'dark fantasy movie poster, Dark Souls/Witcher aesthetic, gothic grandeur'
      moodGuide = 'brooding, epic, morally ambiguous'
    } else if (genres.some(g => g.toLowerCase().includes('cyberpunk'))) {
      styleGuide = 'cyberpunk movie poster, Blade Runner/Ghost in the Shell aesthetic, neon and chrome'
      moodGuide = 'gritty, rebellious, neon-soaked'
    } else if (genres.some(g => g.toLowerCase().includes('heist') || g.toLowerCase().includes('crime'))) {
      styleGuide = 'heist thriller poster, Ocean\'s Eleven aesthetic, sleek and stylish'
      moodGuide = 'slick, tense, clever'
    } else if (genres.some(g => g.toLowerCase().includes('political') || g.toLowerCase().includes('intrigue'))) {
      styleGuide = 'political drama poster, Game of Thrones aesthetic, power and shadows'
      moodGuide = 'tense, scheming, dramatic'
    } else if (isSciF) {
      styleGuide = 'sci-fi adventure poster, Star Wars/Guardians aesthetic, epic space opera'
      moodGuide = 'epic, adventurous, awe-inspiring'
    } else {
      styleGuide = 'epic fantasy movie poster, Lord of the Rings aesthetic, painterly grandeur'
      moodGuide = 'epic, heroic, adventurous'
    }

    // Extract visual elements from content
    const visualElements = extractVisualElements(allText)

    // Get color palette
    const colorPalette = getColorPalette(genres, allText)

    // Build context from setting and intro
    const settingContext = settingNotes ? settingNotes.slice(0, 200) : ''
    const introContext = introduction ? introduction.split('\n\n')[0].slice(0, 200) : ''
    const contextText = [settingContext, introContext].filter(Boolean).join('. ')

    // Create a unique focal point description based on title
    const titleLower = title.toLowerCase()
    let focalPoint = ''
    if (titleLower.includes('hunt') || titleLower.includes('hunter')) focalPoint = 'A hunter stalking prey in dramatic silhouette'
    else if (titleLower.includes('curse')) focalPoint = 'Dark magical energy swirling around a cursed artifact'
    else if (titleLower.includes('tomb') || titleLower.includes('crypt')) focalPoint = 'Ancient tomb entrance with ominous glow within'
    else if (titleLower.includes('siege') || titleLower.includes('war')) focalPoint = 'Armies clashing before fortress walls'
    else if (titleLower.includes('murder') || titleLower.includes('death')) focalPoint = 'Mysterious figure in shadows with a hidden weapon'
    else if (titleLower.includes('lost') || titleLower.includes('forgotten')) focalPoint = 'Explorers discovering ancient ruins'
    else if (titleLower.includes('escape') || titleLower.includes('flee')) focalPoint = 'Desperate figures running from pursuing threat'
    else if (titleLower.includes('heist') || titleLower.includes('theft')) focalPoint = 'Skilled thieves executing a daring plan'
    else if (titleLower.includes('ritual') || titleLower.includes('sacrifice')) focalPoint = 'Dark ritual circle with magical energy'
    else if (titleLower.includes('feast') || titleLower.includes('wedding')) focalPoint = 'Grand celebration with hidden danger'
    else if (titleLower.includes('trial')) focalPoint = 'Dramatic courtroom or arena scene'
    else if (titleLower.includes('night') || titleLower.includes('darkness')) focalPoint = 'Moonlit scene with lurking shadows'

    // Build the unique prompt
    const promptParts = [
      `Dramatic vertical movie poster for "${title}"`,
      tagline ? `capturing the essence: "${tagline}"` : null,
      `Genre: ${genreContext}`,
      `Style: ${styleGuide}`,
      focalPoint ? `Central image: ${focalPoint}` : null,
      visualElements.length > 0 ? `Key visual elements: ${visualElements.join(', ')}` : null,
      contextText ? `Scene context: ${contextText}` : null,
      `Color palette: ${colorPalette}`,
      `Mood: ${moodGuide}`,
      `COMPOSITION: All characters and focal points in UPPER TWO-THIRDS. Bottom third fades to darkness for text overlay`,
      `Cinematic composition, dramatic lighting, painterly digital art, highly detailed, professional movie poster quality`,
      `No text, no letters, no words, no title anywhere in the image`,
      `2:3 aspect ratio, vertical poster orientation`,
    ].filter(Boolean)

    const prompt = promptParts.join('. ')

    // Shorter version
    const shortPrompt = [
      `"${title}" ${genreContext} movie poster`,
      focalPoint || visualElements[0] || 'dramatic hero shot',
      styleGuide.split(',')[0],
      colorPalette.split(' ')[0] + ' tones',
      'upper 2/3 focus, dark bottom, no text, 2:3 vertical',
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
