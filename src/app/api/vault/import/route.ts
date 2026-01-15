import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

// Comprehensive interface for imported characters with ALL new fields
interface ImportedCharacter {
  name: string
  type?: 'pc' | 'npc'

  // Core text fields
  description?: string | null
  backstory?: string | null
  summary?: string | null
  notes?: string | null

  // Basic info
  game_system?: string | null
  race?: string | null
  class?: string | null
  subclass?: string | null
  level?: number | null
  background?: string | null
  alignment?: string | null
  deity?: string | null

  // Demographics
  age?: string | null
  pronouns?: string | null

  // Physical appearance
  height?: string | null
  weight?: string | null
  hair?: string | null
  eyes?: string | null
  skin?: string | null
  voice?: string | null
  distinguishing_marks?: string | null
  typical_attire?: string | null
  appearance?: string | null

  // Creative references
  faceclaim?: string | null
  voice_claim?: string | null

  // Personality
  personality?: string | null
  ideals?: string | null
  bonds?: string | null
  flaws?: string | null
  mannerisms?: string | null
  speech_patterns?: string | null
  motivations?: string | null

  // Goals and secrets
  goals?: string | null
  secrets?: string | null

  // Status
  status?: string | null

  // Arrays
  quotes?: string[] | null
  common_phrases?: string[] | null
  weaknesses?: string[] | null
  fears?: string[] | null
  plot_hooks?: string[] | null
  tldr?: string[] | null
  open_questions?: string[] | null
  character_tags?: string[] | null
  languages?: string[] | null
  saving_throws?: string[] | null
  resistances?: string[] | null
  immunities?: string[] | null
  vulnerabilities?: string[] | null
  aesthetic_tags?: string[] | null
  color_palette?: string[] | null

  // Media links
  theme_music_url?: string | null
  theme_music_title?: string | null
  character_sheet_url?: string | null
  spotify_playlist?: string | null
  pinterest_board?: string | null

  // Campaign context
  external_campaign?: string | null
  party_name?: string | null
  party_role?: string | null
  player_name?: string | null
  dm_name?: string | null
  campaign_started?: string | null
  joined_session?: number | null
  retired_session?: number | null

  // JSON fields (legacy)
  quick_stats?: unknown | null
  inventory?: unknown | null
  important_people?: unknown[] | null
  session_journal?: unknown[] | null
  signature_items?: unknown[] | null
  family?: unknown[] | null

  // New structured JSONB
  backstory_phases?: { title: string; content: string }[] | null
  story_arcs?: { title: string; status: string; description: string }[] | null
  factions?: { name: string; rank?: string; status: string }[] | null
  companions?: { name: string; type: string; description?: string; abilities?: string; image_url?: string }[] | null
  possessions?: { name: string; type: string; description?: string; significance?: string; acquired?: string; image_url?: string }[] | null
  art_references?: { url: string; description?: string; artist?: string }[] | null

  // Game mechanics
  ability_scores?: { str?: number; dex?: number; con?: number; int?: number; wis?: number; cha?: number } | null
  hit_points?: { current?: number; max?: number; temp?: number } | null
  armor_class?: number | null
  speed?: string | null
  proficiencies?: { skills?: string[]; tools?: string[]; weapons?: string[]; armor?: string[]; saving_throws?: string[] } | null

  // Organization
  folder?: string | null
  is_archived?: boolean
  is_favorite?: boolean
  display_order?: number

  // Privacy
  visibility?: string | null
  dm_notes?: string | null
  is_public?: boolean

  // Backstory
  origin_location?: string | null

  // NPC-specific
  npc_role?: string | null
  first_appearance?: string | null
  location?: string | null
  disposition?: string | null
  occupation?: string | null

  // Tracking
  gold?: number | null
  source_file?: string | null
  imported_at?: string | null
  raw_document_text?: string | null

  // ===== NEW FIELDS FROM MIGRATION 018 =====
  // Character writings (letters, stories, poems, diary entries)
  character_writings?: { title: string; type: string; content: string; recipient?: string; date_written?: string }[] | null
  // Rumors about the character
  rumors?: { statement: string; is_true: boolean }[] | null
  // DM Q&A responses
  dm_qa?: { question: string; answer: string }[] | null
  // Player meta info (OOC)
  player_discord?: string | null
  player_timezone?: string | null
  player_experience?: string | null
  player_preferences?: { fun_in_dnd?: string; annoys_me?: string; ideal_party?: string; ideal_dm?: string } | null
  // Gameplay tips and combat reminders
  gameplay_tips?: string[] | null
  // Relations with party members
  party_relations?: { name: string; notes: string; relationship?: string }[] | null
  // Combat statistics
  combat_stats?: { kills?: number; deaths?: number; unconscious?: number; last_updated_session?: number } | null

  // Related data (for creating relationships/images separately)
  relationships?: {
    related_name: string
    relationship_type: string
    relationship_label?: string
    description?: string
    related_image_url?: string
  }[] | null
  images?: {
    image_url: string
    image_type?: string
    caption?: string
    artist_credit?: string
    is_primary?: boolean
  }[] | null
}

// Helper to conditionally add fields
function addIfPresent<T>(obj: Record<string, unknown>, key: string, value: T | null | undefined) {
  if (value !== null && value !== undefined && value !== '') {
    obj[key] = value
  }
}

// POST /api/vault/import - Bulk import vault characters
export async function POST(req: NextRequest) {
  try {
    const { characters } = await req.json() as { characters: ImportedCharacter[] }

    if (!characters || !Array.isArray(characters) || characters.length === 0) {
      return new Response(JSON.stringify({ error: 'No characters provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const results = {
      imported: 0,
      updated: 0,
      relationships_created: 0,
      images_created: 0,
      errors: [] as string[]
    }

    for (const char of characters) {
      try {
        // Check if character with same name already exists
        const { data: existing } = await supabase
          .from('vault_characters')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', char.name)
          .single()

        // Build character data - only include fields that have values
        const characterData: Record<string, unknown> = {
          user_id: user.id,
          name: char.name,
          type: char.type || 'pc',
        }

        // Core text fields
        addIfPresent(characterData, 'description', char.description)
        addIfPresent(characterData, 'backstory', char.backstory || char.description) // Use description as backstory if not provided
        addIfPresent(characterData, 'summary', char.summary)
        addIfPresent(characterData, 'notes', char.notes)

        // Basic info
        addIfPresent(characterData, 'game_system', char.game_system)
        addIfPresent(characterData, 'race', char.race)
        addIfPresent(characterData, 'class', char.class)
        addIfPresent(characterData, 'subclass', char.subclass)
        addIfPresent(characterData, 'level', char.level)
        addIfPresent(characterData, 'background', char.background)
        addIfPresent(characterData, 'alignment', char.alignment)
        addIfPresent(characterData, 'deity', char.deity)

        // Demographics
        addIfPresent(characterData, 'age', char.age)
        addIfPresent(characterData, 'pronouns', char.pronouns)

        // Physical appearance
        addIfPresent(characterData, 'height', char.height)
        addIfPresent(characterData, 'weight', char.weight)
        addIfPresent(characterData, 'hair', char.hair)
        addIfPresent(characterData, 'eyes', char.eyes)
        addIfPresent(characterData, 'skin', char.skin)
        addIfPresent(characterData, 'voice', char.voice)
        addIfPresent(characterData, 'distinguishing_marks', char.distinguishing_marks)
        addIfPresent(characterData, 'typical_attire', char.typical_attire)
        addIfPresent(characterData, 'appearance', char.appearance)

        // Creative references
        addIfPresent(characterData, 'faceclaim', char.faceclaim)
        addIfPresent(characterData, 'voice_claim', char.voice_claim)

        // Personality
        addIfPresent(characterData, 'personality', char.personality)
        addIfPresent(characterData, 'ideals', char.ideals)
        addIfPresent(characterData, 'bonds', char.bonds)
        addIfPresent(characterData, 'flaws', char.flaws)
        addIfPresent(characterData, 'mannerisms', char.mannerisms)
        addIfPresent(characterData, 'speech_patterns', char.speech_patterns)
        addIfPresent(characterData, 'motivations', char.motivations)

        // Goals and secrets
        addIfPresent(characterData, 'goals', char.goals)
        addIfPresent(characterData, 'secrets', char.secrets)

        // Status
        addIfPresent(characterData, 'status', char.status)

        // Arrays
        addIfPresent(characterData, 'quotes', char.quotes)
        addIfPresent(characterData, 'common_phrases', char.common_phrases)
        addIfPresent(characterData, 'weaknesses', char.weaknesses)
        addIfPresent(characterData, 'fears', char.fears)
        addIfPresent(characterData, 'plot_hooks', char.plot_hooks)
        addIfPresent(characterData, 'tldr', char.tldr)
        addIfPresent(characterData, 'open_questions', char.open_questions)
        addIfPresent(characterData, 'character_tags', char.character_tags)
        addIfPresent(characterData, 'languages', char.languages)
        addIfPresent(characterData, 'saving_throws', char.saving_throws)
        addIfPresent(characterData, 'resistances', char.resistances)
        addIfPresent(characterData, 'immunities', char.immunities)
        addIfPresent(characterData, 'vulnerabilities', char.vulnerabilities)
        addIfPresent(characterData, 'aesthetic_tags', char.aesthetic_tags)
        addIfPresent(characterData, 'color_palette', char.color_palette)

        // Media links
        addIfPresent(characterData, 'theme_music_url', char.theme_music_url)
        addIfPresent(characterData, 'theme_music_title', char.theme_music_title)
        addIfPresent(characterData, 'character_sheet_url', char.character_sheet_url)
        addIfPresent(characterData, 'spotify_playlist', char.spotify_playlist)
        addIfPresent(characterData, 'pinterest_board', char.pinterest_board)

        // Campaign context
        addIfPresent(characterData, 'external_campaign', char.external_campaign)
        addIfPresent(characterData, 'party_name', char.party_name)
        addIfPresent(characterData, 'party_role', char.party_role)
        addIfPresent(characterData, 'player_name', char.player_name)
        addIfPresent(characterData, 'dm_name', char.dm_name)
        addIfPresent(characterData, 'campaign_started', char.campaign_started)
        addIfPresent(characterData, 'joined_session', char.joined_session)
        addIfPresent(characterData, 'retired_session', char.retired_session)

        // JSON fields (legacy)
        addIfPresent(characterData, 'quick_stats', char.quick_stats)
        addIfPresent(characterData, 'inventory', char.inventory)
        addIfPresent(characterData, 'important_people', char.important_people)
        addIfPresent(characterData, 'session_journal', char.session_journal)
        addIfPresent(characterData, 'signature_items', char.signature_items)
        addIfPresent(characterData, 'family', char.family)

        // New structured JSONB
        addIfPresent(characterData, 'backstory_phases', char.backstory_phases)
        addIfPresent(characterData, 'story_arcs', char.story_arcs)
        addIfPresent(characterData, 'factions', char.factions)
        addIfPresent(characterData, 'companions', char.companions)
        addIfPresent(characterData, 'possessions', char.possessions)
        addIfPresent(characterData, 'art_references', char.art_references)

        // Game mechanics
        addIfPresent(characterData, 'ability_scores', char.ability_scores)
        addIfPresent(characterData, 'hit_points', char.hit_points)
        addIfPresent(characterData, 'armor_class', char.armor_class)
        addIfPresent(characterData, 'speed', char.speed)
        addIfPresent(characterData, 'proficiencies', char.proficiencies)

        // Organization
        addIfPresent(characterData, 'folder', char.folder)
        if (char.is_archived !== undefined) characterData.is_archived = char.is_archived
        if (char.is_favorite !== undefined) characterData.is_favorite = char.is_favorite
        addIfPresent(characterData, 'display_order', char.display_order)

        // Privacy
        addIfPresent(characterData, 'visibility', char.visibility)
        addIfPresent(characterData, 'dm_notes', char.dm_notes)
        if (char.is_public !== undefined) characterData.is_public = char.is_public

        // Backstory
        addIfPresent(characterData, 'origin_location', char.origin_location)

        // NPC-specific
        addIfPresent(characterData, 'npc_role', char.npc_role)
        addIfPresent(characterData, 'first_appearance', char.first_appearance)
        addIfPresent(characterData, 'location', char.location)
        addIfPresent(characterData, 'disposition', char.disposition)
        addIfPresent(characterData, 'occupation', char.occupation)

        // Tracking
        addIfPresent(characterData, 'gold', char.gold)
        addIfPresent(characterData, 'source_file', char.source_file)
        addIfPresent(characterData, 'imported_at', char.imported_at)
        addIfPresent(characterData, 'raw_document_text', char.raw_document_text)

        // New fields from migration 018
        addIfPresent(characterData, 'character_writings', char.character_writings)
        addIfPresent(characterData, 'rumors', char.rumors)
        addIfPresent(characterData, 'dm_qa', char.dm_qa)
        addIfPresent(characterData, 'player_discord', char.player_discord)
        addIfPresent(characterData, 'player_timezone', char.player_timezone)
        addIfPresent(characterData, 'player_experience', char.player_experience)
        addIfPresent(characterData, 'player_preferences', char.player_preferences)
        addIfPresent(characterData, 'gameplay_tips', char.gameplay_tips)
        addIfPresent(characterData, 'party_relations', char.party_relations)
        addIfPresent(characterData, 'combat_stats', char.combat_stats)

        let characterId: string

        if (existing) {
          // Update existing character
          const { error } = await supabase
            .from('vault_characters')
            .update(characterData)
            .eq('id', existing.id)

          if (error) throw error
          characterId = existing.id
          results.updated++
        } else {
          // Insert new character
          const { data: newChar, error } = await supabase
            .from('vault_characters')
            .insert(characterData)
            .select('id')
            .single()

          if (error) throw error
          characterId = newChar.id
          results.imported++
        }

        // Create relationships if provided - insert into story_characters table (used by UI)
        if (char.relationships && char.relationships.length > 0) {
          // Map relationship types to allowed values in story_characters table
          const mapRelType = (type: string): string => {
            const mapping: Record<string, string> = {
              'companion': 'familiar',
              'contact': 'other',
              'criminal_contact': 'criminal_contact',
              'patron': 'employer',
              // These map directly
              'mentor': 'mentor',
              'father': 'father',
              'mother': 'mother',
              'sibling': 'sibling',
              'rival': 'rival',
              'familiar': 'familiar',
              'love_interest': 'love_interest',
              'friend': 'friend',
              'enemy': 'enemy',
              'employer': 'employer',
              'family': 'family',
              'other': 'other',
            }
            return mapping[type.toLowerCase()] || 'other'
          }

          for (let i = 0; i < char.relationships.length; i++) {
            const rel = char.relationships[i]
            try {
              const { error: relError } = await supabase
                .from('story_characters')
                .insert({
                  character_id: characterId,
                  name: rel.related_name,
                  relationship: mapRelType(rel.relationship_type),
                  tagline: rel.relationship_label || null,
                  notes: rel.description || null,
                  image_url: rel.related_image_url || null,
                  sort_order: i,
                })

              if (!relError) results.relationships_created++
            } catch (relErr) {
              console.error(`Failed to create relationship for ${char.name}:`, relErr)
            }
          }
        }

        // Create images if provided
        if (char.images && char.images.length > 0) {
          for (let i = 0; i < char.images.length; i++) {
            const img = char.images[i]
            try {
              const { error: imgError } = await supabase
                .from('vault_character_images')
                .insert({
                  user_id: user.id,
                  character_id: characterId,
                  image_url: img.image_url,
                  image_type: img.image_type || 'portrait',
                  caption: img.caption,
                  artist_credit: img.artist_credit,
                  is_primary: img.is_primary ?? (i === 0),
                  display_order: i,
                })

              if (!imgError) results.images_created++
            } catch (imgErr) {
              console.error(`Failed to create image for ${char.name}:`, imgErr)
            }
          }
        }

      } catch (charError: unknown) {
        // Handle Supabase errors which have a different structure
        let errorMsg = 'Unknown error'
        if (charError && typeof charError === 'object') {
          if ('message' in charError && typeof charError.message === 'string') {
            errorMsg = charError.message
          } else if ('error' in charError && typeof charError.error === 'string') {
            errorMsg = charError.error
          } else if ('details' in charError && typeof charError.details === 'string') {
            errorMsg = charError.details
          } else if ('code' in charError) {
            errorMsg = `DB Error: ${String(charError.code)}`
          }
        }
        results.errors.push(`${char.name}: ${errorMsg}`)
        console.error(`Import error for ${char.name}:`, charError)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      ...results,
      total: characters.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Vault import error:', error)
    return new Response(JSON.stringify({
      error: 'Failed to import characters',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
