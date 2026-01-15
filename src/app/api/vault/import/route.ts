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

        const characterData = {
          user_id: user.id,
          name: char.name,
          type: char.type || 'pc',
          game_system: char.game_system,
          race: char.race,
          class: char.class,
          background: char.background,
          pronouns: char.pronouns || 'she/her',
          age: char.age,
          description: char.description,
          summary: char.summary,
          personality: char.personality,
          goals: char.goals,
          secrets: char.secrets,
          notes: char.notes,
          status: char.status || 'active',
          // Arrays
          quotes: char.quotes,
          common_phrases: char.common_phrases,
          weaknesses: char.weaknesses,
          fears: char.fears,
          plot_hooks: char.plot_hooks,
          tldr: char.tldr,
          open_questions: char.open_questions,
          character_tags: char.character_tags,
          // JSON fields
          important_people: char.important_people,
          family: char.family,
          signature_items: char.signature_items,
          session_journal: char.session_journal,
          // URLs
          character_sheet_url: char.character_sheet_url,
          theme_music_url: char.theme_music_url,
          theme_music_title: char.theme_music_title,
          // Metadata
          gold: char.gold,
          source_file: char.source_file,
          imported_at: char.imported_at || new Date().toISOString(),
        }

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
      } catch (charError) {
        const errorMsg = charError instanceof Error ? charError.message : 'Unknown error'
        results.errors.push(`${char.name}: ${errorMsg}`)
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
