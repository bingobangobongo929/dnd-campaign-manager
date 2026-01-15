import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

interface ImportedCharacter {
  name: string
  type?: 'pc' | 'npc'
  game_system?: string | null
  race?: string | null
  class?: string | null
  background?: string | null
  pronouns?: string | null
  age?: number | null
  description?: string | null
  summary?: string | null
  personality?: string | null
  goals?: string | null
  secrets?: string | null
  notes?: string | null
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
  // JSON fields
  important_people?: unknown[] | null
  family?: unknown[] | null
  signature_items?: unknown[] | null
  session_journal?: unknown[] | null
  // URLs
  character_sheet_url?: string | null
  theme_music_url?: string | null
  theme_music_title?: string | null
  // Metadata
  gold?: number | null
  source_file?: string | null
  imported_at?: string | null
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const characterData: Record<string, any> = {
          user_id: user.id,
          name: char.name,
          type: char.type || 'pc',
        }

        // Core fields (original schema)
        if (char.game_system) characterData.game_system = char.game_system
        if (char.race) characterData.race = char.race
        if (char.class) characterData.class = char.class
        if (char.background) characterData.background = char.background
        if (char.description) characterData.description = char.description
        if (char.summary) characterData.summary = char.summary
        if (char.personality) characterData.personality = char.personality
        if (char.goals) characterData.goals = char.goals
        if (char.secrets) characterData.secrets = char.secrets
        if (char.notes) characterData.notes = char.notes
        if (char.status) characterData.status = char.status
        if (char.quotes) characterData.quotes = char.quotes
        if (char.common_phrases) characterData.common_phrases = char.common_phrases
        if (char.weaknesses) characterData.weaknesses = char.weaknesses
        if (char.plot_hooks) characterData.plot_hooks = char.plot_hooks
        if (char.tldr) characterData.tldr = char.tldr
        if (char.character_sheet_url) characterData.character_sheet_url = char.character_sheet_url
        if (char.theme_music_url) characterData.theme_music_url = char.theme_music_url
        if (char.theme_music_title) characterData.theme_music_title = char.theme_music_title
        if (char.gold) characterData.gold = char.gold
        if (char.source_file) characterData.source_file = char.source_file
        if (char.imported_at) characterData.imported_at = char.imported_at

        // New fields from migration 014 - try to include them
        if (char.pronouns) characterData.pronouns = char.pronouns
        if (char.age) characterData.age = char.age
        if (char.fears) characterData.fears = char.fears
        if (char.open_questions) characterData.open_questions = char.open_questions
        if (char.character_tags) characterData.character_tags = char.character_tags
        if (char.important_people) characterData.important_people = char.important_people
        if (char.family) characterData.family = char.family
        if (char.signature_items) characterData.signature_items = char.signature_items
        if (char.session_journal) characterData.session_journal = char.session_journal

        if (existing) {
          // Update existing character
          const { error } = await supabase
            .from('vault_characters')
            .update(characterData)
            .eq('id', existing.id)

          if (error) throw error
          results.updated++
        } else {
          // Insert new character
          const { error } = await supabase
            .from('vault_characters')
            .insert(characterData)

          if (error) throw error
          results.imported++
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
