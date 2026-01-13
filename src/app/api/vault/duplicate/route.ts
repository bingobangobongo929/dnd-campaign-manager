import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { characterId } = await request.json()

    if (!characterId) {
      return NextResponse.json({ error: 'Character ID required' }, { status: 400 })
    }

    // Fetch the original character
    const { data: original, error: fetchError } = await supabase
      .from('vault_characters')
      .select('*')
      .eq('id', characterId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !original) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    // Create duplicate with modified name
    const duplicateData = {
      ...original,
      id: undefined, // Let database generate new ID
      name: `${original.name} (Copy)`,
      created_at: undefined,
      updated_at: undefined,
    }

    delete duplicateData.id
    delete duplicateData.created_at
    delete duplicateData.updated_at

    const { data: newCharacter, error: insertError } = await supabase
      .from('vault_characters')
      .insert(duplicateData)
      .select()
      .single()

    if (insertError) {
      console.error('Duplicate error:', insertError)
      return NextResponse.json({ error: 'Failed to duplicate character' }, { status: 500 })
    }

    // Also duplicate related data
    const newCharacterId = newCharacter.id

    // Duplicate story characters
    const { data: storyChars } = await supabase
      .from('story_characters')
      .select('*')
      .eq('character_id', characterId)

    if (storyChars && storyChars.length > 0) {
      const duplicatedStoryChars = storyChars.map(sc => ({
        ...sc,
        id: undefined,
        character_id: newCharacterId,
        created_at: undefined,
        updated_at: undefined,
      }))

      for (const sc of duplicatedStoryChars) {
        delete sc.id
        delete sc.created_at
        delete sc.updated_at
      }

      await supabase.from('story_characters').insert(duplicatedStoryChars)
    }

    // Duplicate character links
    const { data: charLinks } = await supabase
      .from('character_links')
      .select('*')
      .eq('character_id', characterId)

    if (charLinks && charLinks.length > 0) {
      const duplicatedLinks = charLinks.map(link => ({
        ...link,
        id: undefined,
        character_id: newCharacterId,
        created_at: undefined,
        updated_at: undefined,
      }))

      for (const link of duplicatedLinks) {
        delete link.id
        delete link.created_at
        delete link.updated_at
      }

      await supabase.from('character_links').insert(duplicatedLinks)
    }

    // Duplicate learned facts
    const { data: facts } = await supabase
      .from('character_learned_facts')
      .select('*')
      .eq('character_id', characterId)

    if (facts && facts.length > 0) {
      const duplicatedFacts = facts.map(fact => ({
        ...fact,
        id: undefined,
        character_id: newCharacterId,
        created_at: undefined,
        updated_at: undefined,
      }))

      for (const fact of duplicatedFacts) {
        delete fact.id
        delete fact.created_at
        delete fact.updated_at
      }

      await supabase.from('character_learned_facts').insert(duplicatedFacts)
    }

    // Note: We don't duplicate play_journal as that's session-specific

    return NextResponse.json({ id: newCharacterId })
  } catch (error) {
    console.error('Duplicate error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
