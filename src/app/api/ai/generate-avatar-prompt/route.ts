/**
 * AI Avatar Prompt Generation
 *
 * Generates a copyable prompt for image AI tools (Midjourney, DALL-E, etc.)
 * Optimized for 1:1 avatar / 2:3 portrait format for NPCs, companions, and characters.
 */

import { NextResponse } from 'next/server'

export const runtime = 'edge'

interface AvatarPromptRequest {
  type: 'npc' | 'companion' | 'character'
  name: string
  // NPC/Character fields
  relationship_type?: string
  relationship_label?: string
  occupation?: string
  location?: string
  personality_traits?: string[]
  description?: string
  full_notes?: string
  // Companion fields
  companion_type?: string
  companion_species?: string
  companion_abilities?: string
  // Character fields
  race?: string
  class?: string
  subclass?: string
  appearance?: string
  hair?: string
  eyes?: string
  skin?: string
  typical_attire?: string
  distinguishing_marks?: string
  background?: string
  // Parent character context (for NPCs)
  parentCharacter?: {
    name?: string
    race?: string
    class?: string
    setting?: string
  }
}

export async function POST(req: Request) {
  try {
    const data: AvatarPromptRequest = await req.json()

    if (!data.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const isCompanion = data.type === 'companion'
    const isCharacter = data.type === 'character'
    const isNPC = data.type === 'npc'

    // Build subject description
    let subject = ''
    let visualStyle = ''
    let mood = ''
    let details: string[] = []

    if (isCompanion) {
      // Animal/creature portrait
      const species = data.companion_species || 'magical creature'
      const compType = data.companion_type || 'familiar'

      subject = `${species} ${compType}`

      if (data.description) {
        details.push(data.description.slice(0, 200))
      }

      if (data.companion_abilities) {
        const abilities = data.companion_abilities.toLowerCase()
        if (abilities.includes('magic') || abilities.includes('arcane')) {
          details.push('mystical aura, glowing eyes')
        }
        if (abilities.includes('fire') || abilities.includes('flame')) {
          details.push('ember highlights, warm glow')
        }
        if (abilities.includes('shadow') || abilities.includes('dark')) {
          details.push('shadowy wisps, mysterious presence')
        }
      }

      visualStyle = 'fantasy creature portrait, detailed fur/scales/feathers, expressive eyes'
      mood = 'intelligent, loyal, magical'

    } else if (isCharacter) {
      // Player character portrait
      const race = data.race || 'human'
      const charClass = data.class || 'adventurer'

      subject = `${race} ${charClass}`

      if (data.appearance) {
        details.push(data.appearance.slice(0, 300))
      }
      if (data.hair) details.push(`${data.hair} hair`)
      if (data.eyes) details.push(`${data.eyes} eyes`)
      if (data.skin) details.push(`${data.skin} skin`)
      if (data.typical_attire) details.push(data.typical_attire)
      if (data.distinguishing_marks) details.push(data.distinguishing_marks)

      // Class-based styling
      const classLower = charClass.toLowerCase()
      if (classLower.includes('wizard') || classLower.includes('sorcerer') || classLower.includes('warlock')) {
        visualStyle = 'mystical lighting, arcane symbols, magical atmosphere'
        mood = 'powerful, mysterious'
      } else if (classLower.includes('paladin') || classLower.includes('cleric')) {
        visualStyle = 'divine radiance, holy symbols, noble bearing'
        mood = 'righteous, devoted'
      } else if (classLower.includes('rogue') || classLower.includes('assassin')) {
        visualStyle = 'dramatic shadows, cunning expression, hidden daggers'
        mood = 'sly, dangerous'
      } else if (classLower.includes('barbarian') || classLower.includes('fighter')) {
        visualStyle = 'battle-worn, imposing presence, warrior scars'
        mood = 'fierce, intimidating'
      } else if (classLower.includes('ranger') || classLower.includes('druid')) {
        visualStyle = 'natural elements, earthy tones, wild spirit'
        mood = 'connected to nature, vigilant'
      } else if (classLower.includes('bard')) {
        visualStyle = 'charismatic pose, musical instrument hints, colorful attire'
        mood = 'charming, expressive'
      } else {
        visualStyle = 'heroic lighting, adventurer aesthetic'
        mood = 'determined, capable'
      }

    } else {
      // NPC portrait
      const relationship = data.relationship_label || data.relationship_type || 'acquaintance'
      const occupation = data.occupation || ''

      subject = occupation ? `${occupation}` : `${relationship}`

      if (data.description) {
        details.push(data.description.slice(0, 200))
      }

      // Extract visual cues from notes
      if (data.full_notes) {
        const notes = data.full_notes.toLowerCase()
        if (notes.includes('scar') || notes.includes('scarred')) details.push('notable scars')
        if (notes.includes('old') || notes.includes('elderly') || notes.includes('aged')) details.push('aged, weathered features')
        if (notes.includes('young') || notes.includes('youth')) details.push('youthful appearance')
        if (notes.includes('beautiful') || notes.includes('handsome')) details.push('attractive features')
        if (notes.includes('ugly') || notes.includes('grotesque')) details.push('unsettling features')
        if (notes.includes('kind') || notes.includes('warm')) details.push('warm, kind expression')
        if (notes.includes('cruel') || notes.includes('cold')) details.push('cold, calculating expression')
      }

      // Relationship-based styling
      const relType = (data.relationship_type || '').toLowerCase()
      if (relType === 'enemy' || relType === 'rival') {
        visualStyle = 'menacing lighting, sharp features, antagonistic presence'
        mood = 'threatening, cunning'
      } else if (relType === 'family') {
        visualStyle = 'warm lighting, familiar features, family resemblance hints'
        mood = 'loving, protective'
      } else if (relType === 'mentor') {
        visualStyle = 'wise lighting, experienced bearing, teaching presence'
        mood = 'wise, patient'
      } else if (relType === 'love_interest') {
        visualStyle = 'romantic lighting, attractive features, warm presence'
        mood = 'charming, alluring'
      } else if (relType === 'patron') {
        visualStyle = 'powerful presence, wealthy attire, commanding stance'
        mood = 'authoritative, influential'
      } else {
        visualStyle = 'atmospheric lighting, detailed features'
        mood = 'interesting, memorable'
      }

      // Personality-based additions
      if (data.personality_traits && data.personality_traits.length > 0) {
        const traits = data.personality_traits.join(' ').toLowerCase()
        if (traits.includes('mysterious')) details.push('enigmatic expression')
        if (traits.includes('jovial') || traits.includes('happy')) details.push('warm smile')
        if (traits.includes('stern') || traits.includes('serious')) details.push('serious demeanor')
        if (traits.includes('cunning') || traits.includes('clever')) details.push('intelligent, calculating look')
      }
    }

    // Build the full prompt
    const promptParts = [
      `Fantasy character portrait of ${data.name}`,
      subject ? `A ${subject}` : null,
      details.length > 0 ? details.join(', ') : null,
      visualStyle,
      `Mood: ${mood}`,
      'Centered portrait composition, face and upper body visible',
      'High detail on face and expression',
      'Professional fantasy art, digital painting style',
      'Painterly brushwork, rich colors, dramatic lighting',
      'No text, no words, no watermarks',
      isCompanion ? '1:1 square format, creature portrait' : '2:3 portrait format, head and shoulders',
    ].filter(Boolean)

    const prompt = promptParts.join('. ')

    // Shorter version
    const shortPromptParts = [
      `Fantasy portrait of ${data.name}`,
      subject ? `(${subject})` : null,
      details[0] || null,
      visualStyle.split(',')[0],
      'detailed face, digital painting, no text',
    ].filter(Boolean)

    const shortPrompt = shortPromptParts.join(', ')

    return NextResponse.json({
      prompt,
      shortPrompt,
      name: data.name,
    })
  } catch (error) {
    console.error('Generate avatar prompt error:', error)
    return NextResponse.json(
      { error: 'Failed to generate avatar prompt' },
      { status: 500 }
    )
  }
}
