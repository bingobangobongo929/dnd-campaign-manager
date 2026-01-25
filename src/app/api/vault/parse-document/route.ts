import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { getAIModel } from '@/lib/ai/config'
import { createClient } from '@/lib/supabase/server'
import { startImportSession, updateImportSession } from '@/lib/ai'

export const runtime = 'edge'
export const maxDuration = 120 // Allow more time for comprehensive parsing

interface ParseVaultDocumentRequest {
  documentText: string
  characterName?: string
  includeImages?: boolean
}

// Comprehensive prompt for extracting ALL character data
const VAULT_CHARACTER_PARSE_PROMPT = `You are an expert at parsing D&D character documents. Your task is to extract EVERY piece of information from this document with ZERO data loss.

## CRITICAL RULES

1. **ZERO DATA LOSS**: Every single piece of information in the document must be captured somewhere. If you're unsure where something goes, put it in the appropriate "notes" or "full_notes" field.

2. **PRESERVE ORIGINAL TEXT**: Keep the original wording and tone. Do not paraphrase or "clean up" the writing. Only fix obvious typos if necessary.

3. **PARAGRAPH BREAKS**: For backstory and long text, preserve paragraph breaks by using "\\n\\n" between paragraphs.

4. **NPCs ARE CRITICAL**: When you find an NPC section (usually a bold name followed by bullet points), extract EVERY bullet point into the "full_notes" field. Also parse out structured fields like location, faction, needs, goals when identifiable.

5. **DETECT SECTIONS**: Look for these section patterns:
   - "Backstory" or prose text at the start
   - "TL;DR" or "TLDR" - bullet point summaries
   - Bold names followed by bullets = NPCs
   - "Session 1", "Session 2" etc. = Session notes
   - "Dear...", letters, stories = Character writings
   - "Quotes" section = Voice lines
   - "Knives", "Plot Hooks", hooks for DMs
   - Player info (Discord, timezone)
   - Possessions, inventory, gold
   - "Companion", "Familiar", "Pet", "Mount" = Companions

## OUTPUT FORMAT

Return valid JSON with this EXACT structure:

{
  "character": {
    "name": "string",
    "race": "string | null",
    "class": "string | null",
    "subclass": "string | null",
    "level": "number | null",
    "age": "string | null",
    "pronouns": "string | null",
    "background": "string | null",
    "alignment": "string | null",
    "backstory": "string - FULL prose backstory with \\n\\n for paragraph breaks",
    "backstory_phases": [{"title": "Phase Name", "content": "Full text of this phase"}],
    "tldr": "string - bullet point summary if present",
    "appearance": "string | null",
    "personality": "string | null",
    "ideals": "string | null",
    "bonds": "string | null",
    "flaws": "string | null",
    "goals": "string | null",
    "secrets": "string | null",
    "fears": ["string"],
    "quotes": ["string - exact voice lines"],
    "plot_hooks": ["string - DM story hooks"],
    "pre_session_hook": "string - what brought them to the party",
    "theme_music_url": "string | null",
    "character_sheet_url": "string | null",
    "external_links": [{"url": "string", "label": "string", "type": "dndbeyond|youtube|pinterest|other"}],
    "player_discord": "string | null",
    "player_timezone": "string | null",
    "player_experience": "string | null",
    "possessions": [{"name": "string", "quantity": "number", "notes": "string | null"}],
    "gold": "number | null",
    "rumors": [{"statement": "string", "is_true": "boolean"}],
    "dm_qa": [{"question": "string", "answer": "string"}]
  },
  "npcs": [
    {
      "name": "string - NPC's name",
      "nickname": "string | null - alias like 'Orchpyre'",
      "relationship_type": "mentor|family|friend|enemy|patron|contact|ally|employer|love_interest|rival|other",
      "relationship_label": "string - specific label like 'Father', 'Criminal Contact'",
      "image_index": "number | null - if you can associate an image",
      "faction_affiliations": ["string - groups they belong to"],
      "location": "string | null - where to find them",
      "occupation": "string | null",
      "origin": "string | null - where they're from",
      "needs": "string | null - what they need from PC",
      "can_provide": "string | null - what favors/help they offer",
      "goals": "string | null - their personal goals",
      "secrets": "string | null",
      "personality_traits": ["string"],
      "full_notes": "string - EVERY bullet point about this NPC, verbatim",
      "relationship_status": "active|deceased|estranged|complicated|unknown"
    }
  ],
  "companions": [
    {
      "name": "string",
      "companion_type": "familiar|pet|mount|animal_companion",
      "companion_species": "string - ferret, dog, horse, etc.",
      "description": "string | null",
      "abilities": "string | null",
      "image_index": "number | null"
    }
  ],
  "session_notes": [
    {
      "session_number": "number",
      "session_date": "string | null - date if mentioned",
      "title": "string | null",
      "campaign_name": "string | null",
      "summary": "string | null - brief summary",
      "notes": "string - FULL session notes",
      "kill_count": "number | null",
      "loot": "string | null",
      "thoughts_for_next": "string | null",
      "npcs_met": ["string"],
      "locations_visited": ["string"]
    }
  ],
  "writings": [
    {
      "title": "string",
      "writing_type": "letter|story|poem|diary|campfire_story|note|speech",
      "content": "string - FULL text",
      "recipient": "string | null - for letters"
    }
  ],
  "secondary_characters": [
    {
      "name": "string",
      "concept": "string - brief description",
      "notes": "string | null - any additional notes"
    }
  ],
  "raw_sections": {
    "unclassified": "string - any text that didn't fit elsewhere"
  }
}

## EXAMPLES OF NPC EXTRACTION

If you see:
"""
Giselbert Almayda
- Talebheim 11
- Was taken in as a charity case as a kid
- Knickname is Orchpyre
- He needs allies to help investigate the murder of his old mentor
"""

Extract as:
{
  "name": "Giselbert Almayda",
  "nickname": "Orchpyre",
  "relationship_type": "mentor",
  "faction_affiliations": ["Talebheim 11"],
  "needs": "Allies to help investigate the murder of his old mentor",
  "full_notes": "- Talebheim 11\\n- Was taken in as a charity case as a kid\\n- Knickname is Orchpyre\\n- He needs allies to help investigate the murder of his old mentor"
}

## EXAMPLES OF SESSION NOTE EXTRACTION

If you see:
"""
Session 3
Literally just combat.
Killscore: 2
Thoughts for next session (4):
Did fighting the bandits look too easy for Noah?
"""

Extract as:
{
  "session_number": 3,
  "notes": "Literally just combat.",
  "kill_count": 2,
  "thoughts_for_next": "Did fighting the bandits look too easy for Noah?"
}

Remember: ZERO DATA LOSS. Every word matters. If in doubt, include it.`

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      documentText,
      characterName,
    }: ParseVaultDocumentRequest = await req.json()

    if (!documentText) {
      return NextResponse.json({ error: 'Document text required' }, { status: 400 })
    }

    // Start import session tracking
    const parseStartTime = Date.now()
    const importSessionId = await startImportSession({
      userId: user.id,
      importType: 'text',
      targetType: 'vault_character',
      fileSizeBytes: new TextEncoder().encode(documentText).length,
    })

    const model = getAIModel('googlePro')

    const { text } = await generateText({
      model,
      system: VAULT_CHARACTER_PARSE_PROMPT,
      prompt: `Parse this character document completely. Extract EVERY piece of information.\n\n${characterName ? `Character Name Hint: ${characterName}\n\n` : ''}DOCUMENT:\n\n${documentText}`,
    })

    // Parse the JSON response
    let parsedData
    try {
      // Find JSON in the response
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      return NextResponse.json({
        success: false,
        error: 'Failed to parse document structure',
        rawText: text,
      }, { status: 422 })
    }

    // Calculate extraction statistics for verification
    const stats = {
      npcCount: parsedData.npcs?.length || 0,
      companionCount: parsedData.companions?.length || 0,
      sessionCount: parsedData.session_notes?.length || 0,
      writingCount: parsedData.writings?.length || 0,
      quoteCount: parsedData.character?.quotes?.length || 0,
      plotHookCount: parsedData.character?.plot_hooks?.length || 0,
      hasBackstory: !!parsedData.character?.backstory,
      backstoryLength: parsedData.character?.backstory?.length || 0,
      hasTldr: !!parsedData.character?.tldr,
    }

    // Update import session to parsed status
    if (importSessionId) {
      await updateImportSession({
        sessionId: importSessionId,
        status: 'parsed',
        parseDurationMs: Date.now() - parseStartTime,
      })
    }

    return NextResponse.json({
      success: true,
      parsed: parsedData,
      stats,
      inputLength: documentText.length,
      importSessionId, // Include for frontend to pass to save endpoint
    })
  } catch (error) {
    console.error('Vault document parse error:', error)
    return NextResponse.json(
      { error: 'Failed to parse document' },
      { status: 500 }
    )
  }
}
