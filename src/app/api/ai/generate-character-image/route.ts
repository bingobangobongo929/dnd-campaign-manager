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
  summary?: string | null
  status?: string | null
  secrets?: string | null
  important_people?: string[] | null
  story_hooks?: string[] | null
  quotes?: string[] | null
  game_system?: string | null
}

export async function POST(req: Request) {
  try {
    const {
      name,
      type,
      race,
      class: charClass,
      backstory,
      personality,
      summary,
      status,
      secrets,
      important_people,
      story_hooks,
      quotes,
      game_system,
    }: GenerateCharacterPromptRequest = await req.json()

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Gather all context text for mood analysis
    const allContext = [
      backstory || '',
      personality || '',
      summary || '',
      secrets || '',
      ...(story_hooks || []),
      ...(quotes || []),
    ].join(' ').toLowerCase()

    // Extract key character details from backstory/summary for visual hints
    const contextSnippets: string[] = []
    if (backstory) {
      // Get first meaningful paragraph
      const firstPara = backstory.split('\n').find(p => p.trim().length > 50)
      if (firstPara) contextSnippets.push(firstPara.slice(0, 250))
    }
    if (summary && summary.length > 20) {
      contextSnippets.push(summary.slice(0, 150))
    }

    // Build character description
    const characterDesc = [
      race || null,
      charClass || null,
      type === 'npc' ? 'NPC character' : 'adventurer',
    ].filter(Boolean).join(' ')

    // Determine art style based on game system
    let artStyle = 'high fantasy'
    if (game_system) {
      const sys = game_system.toLowerCase()
      if (sys.includes('lancer') || sys.includes('mech')) {
        artStyle = 'sci-fi mecha anime style'
      } else if (sys.includes('call of cthulhu') || sys.includes('coc')) {
        artStyle = 'cosmic horror, 1920s aesthetic'
      } else if (sys.includes('vampire') || sys.includes('masquerade')) {
        artStyle = 'gothic modern, dark urban fantasy'
      } else if (sys.includes('cyberpunk')) {
        artStyle = 'cyberpunk, neon-lit, high tech'
      } else if (sys.includes('pathfinder') || sys.includes('d&d') || sys.includes('5e')) {
        artStyle = 'high fantasy'
      }
    }

    // Determine mood based on all available context
    let moodGuide = 'heroic, determined'
    let visualHints: string[] = []

    // Character status affects mood
    if (status) {
      const st = status.toLowerCase()
      if (st.includes('dead') || st.includes('deceased')) {
        moodGuide = 'ghostly, ethereal, faded'
        visualHints.push('spectral glow')
      } else if (st.includes('missing') || st.includes('lost')) {
        moodGuide = 'mysterious, distant, searching'
      } else if (st.includes('captured') || st.includes('prisoner')) {
        moodGuide = 'defiant, weary, resolute'
        visualHints.push('subtle signs of hardship')
      } else if (st.includes('corrupted') || st.includes('turned')) {
        moodGuide = 'dark, conflicted, ominous'
        visualHints.push('subtle dark energy')
      }
    }

    // Override/refine mood based on personality/backstory keywords
    if (allContext.includes('dark') || allContext.includes('brooding') || allContext.includes('tragic') || allContext.includes('haunted')) {
      moodGuide = 'mysterious, brooding, shadowed'
    } else if (allContext.includes('cheerful') || allContext.includes('happy') || allContext.includes('jovial') || allContext.includes('optimist')) {
      moodGuide = 'warm, friendly, approachable'
    } else if (allContext.includes('cunning') || allContext.includes('rogue') || allContext.includes('thief') || allContext.includes('trickster')) {
      moodGuide = 'sly, clever, mischievous'
    } else if (allContext.includes('noble') || allContext.includes('royal') || allContext.includes('paladin') || allContext.includes('knight')) {
      moodGuide = 'regal, noble, dignified'
    } else if (allContext.includes('wild') || allContext.includes('barbarian') || allContext.includes('fierce') || allContext.includes('warrior')) {
      moodGuide = 'fierce, untamed, powerful'
    } else if (allContext.includes('scholar') || allContext.includes('wizard') || allContext.includes('sage') || allContext.includes('learned')) {
      moodGuide = 'wise, contemplative, knowing'
    } else if (allContext.includes('priest') || allContext.includes('cleric') || allContext.includes('divine') || allContext.includes('holy')) {
      moodGuide = 'serene, devoted, radiant'
    }

    // Extract visual hints from important relationships
    if (important_people && important_people.length > 0) {
      const people = important_people.slice(0, 3).join(', ')
      if (people.toLowerCase().includes('mentor')) visualHints.push('wise eyes')
      if (people.toLowerCase().includes('rival')) visualHints.push('competitive stance')
      if (people.toLowerCase().includes('lover') || people.toLowerCase().includes('spouse')) visualHints.push('hint of warmth')
    }

    // Extract personality from quotes
    if (quotes && quotes.length > 0) {
      const quotesText = quotes.join(' ').toLowerCase()
      if (quotesText.includes('honor') || quotesText.includes('duty')) visualHints.push('honorable bearing')
      if (quotesText.includes('revenge') || quotesText.includes('vengeance')) visualHints.push('intense gaze')
      if (quotesText.includes('freedom') || quotesText.includes('free')) visualHints.push('untamed spirit')
    }

    // Build the prompt - optimized for portrait/bust with centered face
    const promptParts = [
      `${artStyle} character portrait of ${name}${characterDesc ? `, a ${characterDesc}` : ''}`,
      `IMPORTANT COMPOSITION: Head and shoulders portrait, face centered in frame, suitable for both square avatar crop and 2:3 vertical crop`,
      contextSnippets.length > 0 ? `Character essence: ${contextSnippets[0]}` : null,
      personality ? `Personality: ${personality.slice(0, 150)}` : null,
      `Expression and mood: ${moodGuide}`,
      visualHints.length > 0 ? `Visual details: ${visualHints.join(', ')}` : null,
      `Style: ${artStyle} character portrait, painterly digital art, dramatic lighting`,
      `Professional character art quality, detailed face, expressive eyes`,
      `Soft background gradient, focus on the character`,
      `No text, no letters, no watermarks`,
    ].filter(Boolean)

    const prompt = promptParts.join('. ')

    // Shorter version
    const shortPrompt = [
      `${artStyle} portrait of ${name}`,
      characterDesc || 'fantasy character',
      moodGuide,
      visualHints.length > 0 ? visualHints.slice(0, 2).join(', ') : null,
      'head and shoulders, centered face, painterly, dramatic lighting, no text',
    ].filter(Boolean).join(', ')

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
