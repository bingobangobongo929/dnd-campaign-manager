import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

interface ParsedCharacter {
  name: string
  race?: string | null
  class?: string | null
  subclass?: string | null
  level?: number | null
  age?: string | null
  pronouns?: string | null
  background?: string | null
  alignment?: string | null
  backstory?: string | null
  backstory_phases?: { title: string; content: string }[]
  tldr?: string | null
  appearance?: string | null
  personality?: string | null
  ideals?: string | null
  bonds?: string | null
  flaws?: string | null
  goals?: string | null
  secrets?: string | null
  fears?: string[]
  quotes?: string[]
  plot_hooks?: string[]
  pre_session_hook?: string | null
  theme_music_url?: string | null
  character_sheet_url?: string | null
  external_links?: { url: string; label: string; type: string }[]
  player_discord?: string | null
  player_timezone?: string | null
  player_experience?: string | null
  possessions?: { name: string; quantity?: number; notes?: string | null }[]
  gold?: number | null
  rumors?: { statement: string; is_true: boolean }[]
  dm_qa?: { question: string; answer: string }[]
}

interface ParsedNPC {
  name: string
  nickname?: string | null
  relationship_type: string
  relationship_label?: string | null
  image_index?: number | null
  faction_affiliations?: string[]
  location?: string | null
  occupation?: string | null
  origin?: string | null
  needs?: string | null
  can_provide?: string | null
  goals?: string | null
  secrets?: string | null
  personality_traits?: string[]
  full_notes?: string | null
  relationship_status?: string
}

interface ParsedCompanion {
  name: string
  companion_type: string
  companion_species?: string | null
  description?: string | null
  abilities?: string | null
  image_index?: number | null
}

interface ParsedSession {
  session_number: number
  session_date?: string | null
  title?: string | null
  campaign_name?: string | null
  summary?: string | null
  notes: string
  kill_count?: number | null
  loot?: string | null
  thoughts_for_next?: string | null
  npcs_met?: string[]
  locations_visited?: string[]
}

interface ParsedWriting {
  title: string
  writing_type: string
  content: string
  recipient?: string | null
}

interface ImportParsedRequest {
  parsed: {
    character: ParsedCharacter
    npcs?: ParsedNPC[]
    companions?: ParsedCompanion[]
    session_notes?: ParsedSession[]
    writings?: ParsedWriting[]
    secondary_characters?: { name: string; concept: string; notes?: string | null }[]
  }
  sourceFile?: string
  rawDocumentText?: string
  imageUrls?: { index: number; url: string }[]
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      parsed,
      sourceFile,
      rawDocumentText,
      imageUrls = [],
    }: ImportParsedRequest = await req.json()

    if (!parsed?.character?.name) {
      return NextResponse.json({ error: 'Character name is required' }, { status: 400 })
    }

    const char = parsed.character

    // Build the vault_characters record
    const characterData = {
      user_id: user.id,
      name: char.name,
      type: 'pc' as const,
      race: char.race || null,
      class: char.class || null,
      subclass: char.subclass || null,
      level: char.level || null,
      age: char.age || null,
      pronouns: char.pronouns || null,
      background: char.background || null,
      alignment: char.alignment || null,
      backstory: char.backstory || null,
      backstory_phases: char.backstory_phases?.length ? char.backstory_phases : null,
      summary: char.tldr || null,
      tldr: char.tldr || null,
      appearance: char.appearance || null,
      personality: char.personality || null,
      ideals: char.ideals || null,
      bonds: char.bonds || null,
      flaws: char.flaws || null,
      goals: char.goals || null,
      secrets: char.secrets || null,
      fears: char.fears?.length ? char.fears : null,
      quotes: char.quotes?.length ? char.quotes : null,
      plot_hooks: char.plot_hooks?.length ? char.plot_hooks : null,
      pre_session_hook: char.pre_session_hook || null,
      theme_music_url: char.theme_music_url || null,
      character_sheet_url: char.character_sheet_url || null,
      external_links: char.external_links?.length ? char.external_links : null,
      player_discord: char.player_discord || null,
      player_timezone: char.player_timezone || null,
      player_experience: char.player_experience || null,
      possessions: char.possessions?.length ? char.possessions : null,
      rumors: char.rumors?.length ? char.rumors : null,
      dm_qa: char.dm_qa?.length ? char.dm_qa : null,
      secondary_characters: parsed.secondary_characters?.length ? parsed.secondary_characters : null,
      source_file: sourceFile || null,
      raw_document_text: rawDocumentText?.substring(0, 50000) || null, // Limit size
      imported_at: new Date().toISOString(),
    }

    // Check if character already exists (by name)
    const { data: existingChar } = await supabase
      .from('vault_characters')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', char.name)
      .single()

    let characterId: string

    if (existingChar) {
      // Update existing character
      const { error: updateError } = await supabase
        .from('vault_characters')
        .update(characterData)
        .eq('id', existingChar.id)

      if (updateError) {
        console.error('Error updating character:', updateError)
        return NextResponse.json({ error: 'Failed to update character' }, { status: 500 })
      }

      characterId = existingChar.id

      // Delete existing relationships to replace with new ones
      await supabase
        .from('vault_character_relationships')
        .delete()
        .eq('character_id', characterId)

      // Delete existing journal entries
      await supabase
        .from('play_journal')
        .delete()
        .eq('character_id', characterId)

      // Delete existing writings
      await supabase
        .from('vault_character_writings')
        .delete()
        .eq('character_id', characterId)
    } else {
      // Create new character
      const { data: newChar, error: insertError } = await supabase
        .from('vault_characters')
        .insert(characterData)
        .select('id')
        .single()

      if (insertError || !newChar) {
        console.error('Error creating character:', insertError)
        return NextResponse.json({ error: 'Failed to create character' }, { status: 500 })
      }

      characterId = newChar.id
    }

    // Helper to find image URL by index
    const getImageUrl = (index?: number | null): string | null => {
      if (index == null) return null
      const img = imageUrls.find(i => i.index === index)
      return img?.url || null
    }

    // Insert NPCs into vault_character_relationships
    const npcsToInsert = parsed.npcs?.map((npc, idx) => ({
      user_id: user.id,
      character_id: characterId,
      related_name: npc.name,
      related_image_url: getImageUrl(npc.image_index),
      relationship_type: npc.relationship_type || 'other',
      relationship_label: npc.relationship_label || npc.relationship_type || 'other',
      nickname: npc.nickname || null,
      faction_affiliations: npc.faction_affiliations?.length ? npc.faction_affiliations : null,
      location: npc.location || null,
      occupation: npc.occupation || null,
      origin: npc.origin || null,
      needs: npc.needs || null,
      can_provide: npc.can_provide || null,
      goals: npc.goals || null,
      secrets: npc.secrets || null,
      personality_traits: npc.personality_traits?.length ? npc.personality_traits : null,
      full_notes: npc.full_notes || null,
      relationship_status: npc.relationship_status || 'active',
      is_companion: false,
      display_order: idx,
    })) || []

    // Insert Companions into vault_character_relationships
    const companionsToInsert = parsed.companions?.map((comp, idx) => ({
      user_id: user.id,
      character_id: characterId,
      related_name: comp.name,
      related_image_url: getImageUrl(comp.image_index),
      relationship_type: 'companion',
      relationship_label: comp.companion_type || 'companion',
      is_companion: true,
      companion_type: comp.companion_type || null,
      companion_species: comp.companion_species || null,
      companion_abilities: comp.abilities || null,
      description: comp.description || null,
      display_order: npcsToInsert.length + idx,
    })) || []

    const allRelationships = [...npcsToInsert, ...companionsToInsert]

    if (allRelationships.length > 0) {
      const { error: relError } = await supabase
        .from('vault_character_relationships')
        .insert(allRelationships)

      if (relError) {
        console.error('Error inserting relationships:', relError)
      }
    }

    // Insert Session Notes into play_journal
    if (parsed.session_notes?.length) {
      const sessionsToInsert = parsed.session_notes.map(session => ({
        character_id: characterId,
        session_number: session.session_number,
        session_date: session.session_date || null,
        title: session.title || `Session ${session.session_number}`,
        campaign_name: session.campaign_name || null,
        summary: session.summary || null,
        notes: session.notes,
        kill_count: session.kill_count || null,
        loot: session.loot || null,
        thoughts_for_next: session.thoughts_for_next || null,
        npcs_met: session.npcs_met?.length ? session.npcs_met : null,
        locations_visited: session.locations_visited?.length ? session.locations_visited : null,
      }))

      const { error: sessionError } = await supabase
        .from('play_journal')
        .insert(sessionsToInsert)

      if (sessionError) {
        console.error('Error inserting sessions:', sessionError)
      }
    }

    // Insert Character Writings
    if (parsed.writings?.length) {
      const writingsToInsert = parsed.writings.map((writing, idx) => ({
        user_id: user.id,
        character_id: characterId,
        title: writing.title,
        writing_type: writing.writing_type || 'other',
        content: writing.content,
        recipient: writing.recipient || null,
        display_order: idx,
      }))

      const { error: writingError } = await supabase
        .from('vault_character_writings')
        .insert(writingsToInsert)

      if (writingError) {
        console.error('Error inserting writings:', writingError)
      }
    }

    // Return success with import stats
    return NextResponse.json({
      success: true,
      characterId,
      isUpdate: !!existingChar,
      stats: {
        npcsImported: npcsToInsert.length,
        companionsImported: companionsToInsert.length,
        sessionsImported: parsed.session_notes?.length || 0,
        writingsImported: parsed.writings?.length || 0,
        quotesImported: char.quotes?.length || 0,
        plotHooksImported: char.plot_hooks?.length || 0,
      },
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import character' },
      { status: 500 }
    )
  }
}
