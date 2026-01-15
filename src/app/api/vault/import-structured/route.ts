import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

// Types for the structured import data
interface BackstoryPhase {
  title: string
  content: string
}

interface NPC {
  name: string
  nickname?: string | null
  relationship_type: string
  relationship_label?: string | null
  faction_affiliations?: string[]
  location?: string | null
  occupation?: string | null
  origin?: string | null
  needs?: string | null
  can_provide?: string | null
  goals?: string | null
  secrets?: string | null
  personality_traits?: string[]
  full_notes: string
  relationship_status?: string
  image_url?: string | null
}

interface Companion {
  name: string
  companion_type: string
  companion_species: string
  description?: string | null
  abilities?: string | null
  image_url?: string | null
}

interface SessionNote {
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

interface Writing {
  title: string
  writing_type: string
  content: string
  recipient?: string | null
  in_universe_date?: string | null
}

interface CharacterData {
  name: string
  type?: 'pc' | 'npc'
  race?: string | null
  class?: string | null
  subclass?: string | null
  level?: number | null
  background?: string | null
  alignment?: string | null
  age?: string | null
  pronouns?: string | null
  backstory?: string | null
  backstory_phases?: BackstoryPhase[] | null
  tldr?: string[] | null
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
  possessions?: { name: string; quantity: number; notes?: string }[]
  gold?: number | null
  rumors?: { statement: string; is_true: boolean }[]
  dm_qa?: { question: string; answer: string }[]
  gameplay_tips?: string[]
  image_url?: string | null
}

interface SecondaryCharacter {
  name: string
  concept: string
  notes?: string | null
}

interface ReferenceTable {
  title: string
  headers: string[]
  rows: string[][]
}

interface StructuredImportRequest {
  character: CharacterData
  npcs?: NPC[]
  companions?: Companion[]
  session_notes?: SessionNote[]
  writings?: Writing[]
  secondary_characters?: SecondaryCharacter[]
  reference_tables?: ReferenceTable[]
  raw_document_text?: string
  unclassified_content?: string | null
  sourceFile?: string
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data: StructuredImportRequest = await req.json()

    if (!data.character?.name) {
      return NextResponse.json({ error: 'Character name is required' }, { status: 400 })
    }

    // Step 1: Create the vault_character record
    // If there's unclassified content, append it to backstory to ensure zero data loss
    let finalBackstory = data.character.backstory || null
    if (data.unclassified_content) {
      const separator = finalBackstory ? '\n\n---\n\n## Unclassified Content\n\n' : ''
      finalBackstory = (finalBackstory || '') + separator + data.unclassified_content
    }

    const characterInsert = {
      user_id: user.id,
      name: data.character.name,
      type: data.character.type || 'pc',
      race: data.character.race || null,
      class: data.character.class || null,
      subclass: data.character.subclass || null,
      level: data.character.level || null,
      background: data.character.background || null,
      alignment: data.character.alignment || null,
      age: data.character.age || null,
      pronouns: data.character.pronouns || null,
      backstory: finalBackstory,
      backstory_phases: data.character.backstory_phases || null,
      tldr: data.character.tldr || null,
      appearance: data.character.appearance || null,
      personality: data.character.personality || null,
      ideals: data.character.ideals || null,
      bonds: data.character.bonds || null,
      flaws: data.character.flaws || null,
      goals: data.character.goals || null,
      secrets: data.character.secrets || null,
      fears: data.character.fears || null,
      quotes: data.character.quotes || null,
      plot_hooks: data.character.plot_hooks || null,
      pre_session_hook: data.character.pre_session_hook || null,
      theme_music_url: data.character.theme_music_url || null,
      character_sheet_url: data.character.character_sheet_url || null,
      external_links: data.character.external_links || null,
      player_discord: data.character.player_discord || null,
      player_timezone: data.character.player_timezone || null,
      player_experience: data.character.player_experience || null,
      possessions: data.character.possessions || null,
      gold: data.character.gold || null,
      rumors: data.character.rumors || null,
      dm_qa: data.character.dm_qa || null,
      gameplay_tips: data.character.gameplay_tips || null,
      secondary_characters: data.secondary_characters || null,
      reference_tables: data.reference_tables || null,
      image_url: data.character.image_url || null,
      raw_document_text: data.raw_document_text || null,
      source_file: data.character.name + '.docx',
      imported_at: new Date().toISOString(),
      status: 'Concept',
      status_color: '#8B5CF6',
    }

    const { data: createdCharacter, error: characterError } = await supabase
      .from('vault_characters')
      .insert(characterInsert)
      .select()
      .single()

    if (characterError) {
      console.error('Character insert error:', characterError)
      return NextResponse.json({
        error: 'Failed to create character',
        details: characterError.message
      }, { status: 500 })
    }

    const characterId = createdCharacter.id
    const results = {
      character_id: characterId,
      npcs_created: 0,
      companions_created: 0,
      sessions_created: 0,
      writings_created: 0,
      errors: [] as string[],
    }

    // Step 2: Create NPCs (vault_character_relationships with is_companion = false)
    if (data.npcs && data.npcs.length > 0) {
      for (let i = 0; i < data.npcs.length; i++) {
        const npc = data.npcs[i]
        const npcInsert = {
          user_id: user.id,
          character_id: characterId,
          related_name: npc.name,
          related_image_url: npc.image_url || null,
          relationship_type: npc.relationship_type || 'other',
          relationship_label: npc.relationship_label || null,
          nickname: npc.nickname || null,
          faction_affiliations: npc.faction_affiliations || null,
          location: npc.location || null,
          occupation: npc.occupation || null,
          origin: npc.origin || null,
          needs: npc.needs || null,
          can_provide: npc.can_provide || null,
          goals: npc.goals || null,
          secrets: npc.secrets || null,
          personality_traits: npc.personality_traits || null,
          full_notes: npc.full_notes || null,
          relationship_status: npc.relationship_status || 'active',
          is_companion: false,
          display_order: i,
        }

        const { error: npcError } = await supabase
          .from('vault_character_relationships')
          .insert(npcInsert)

        if (npcError) {
          results.errors.push(`NPC ${npc.name}: ${npcError.message}`)
        } else {
          results.npcs_created++
        }
      }
    }

    // Step 3: Create Companions (vault_character_relationships with is_companion = true)
    if (data.companions && data.companions.length > 0) {
      for (let i = 0; i < data.companions.length; i++) {
        const companion = data.companions[i]
        const companionInsert = {
          user_id: user.id,
          character_id: characterId,
          related_name: companion.name,
          related_image_url: companion.image_url || null,
          relationship_type: 'companion',
          relationship_label: companion.companion_type,
          is_companion: true,
          companion_type: companion.companion_type,
          companion_species: companion.companion_species,
          companion_abilities: companion.abilities || null,
          description: companion.description || null,
          display_order: i,
        }

        const { error: companionError } = await supabase
          .from('vault_character_relationships')
          .insert(companionInsert)

        if (companionError) {
          results.errors.push(`Companion ${companion.name}: ${companionError.message}`)
        } else {
          results.companions_created++
        }
      }
    }

    // Step 4: Create Session Notes (play_journal)
    if (data.session_notes && data.session_notes.length > 0) {
      for (const session of data.session_notes) {
        const sessionInsert = {
          character_id: characterId,
          session_number: session.session_number,
          session_date: session.session_date || null,
          title: session.title || null,
          campaign_name: session.campaign_name || null,
          summary: session.summary || null,
          notes: session.notes,
          kill_count: session.kill_count || null,
          loot: session.loot || null,
          thoughts_for_next: session.thoughts_for_next || null,
          npcs_met: session.npcs_met || null,
          locations_visited: session.locations_visited || null,
        }

        const { error: sessionError } = await supabase
          .from('play_journal')
          .insert(sessionInsert)

        if (sessionError) {
          results.errors.push(`Session ${session.session_number}: ${sessionError.message}`)
        } else {
          results.sessions_created++
        }
      }
    }

    // Step 5: Create Writings (vault_character_writings)
    if (data.writings && data.writings.length > 0) {
      for (let i = 0; i < data.writings.length; i++) {
        const writing = data.writings[i]
        const writingInsert = {
          user_id: user.id,
          character_id: characterId,
          title: writing.title,
          writing_type: writing.writing_type,
          content: writing.content,
          recipient: writing.recipient || null,
          in_universe_date: writing.in_universe_date || null,
          display_order: i,
        }

        const { error: writingError } = await supabase
          .from('vault_character_writings')
          .insert(writingInsert)

        if (writingError) {
          results.errors.push(`Writing "${writing.title}": ${writingError.message}`)
        } else {
          results.writings_created++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${data.character.name}`,
      results,
    })

  } catch (error) {
    console.error('Structured import error:', error)
    return NextResponse.json(
      {
        error: 'Failed to import character data',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
