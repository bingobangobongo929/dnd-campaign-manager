import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { getAIModel } from '@/lib/ai/config'

// Use Node.js runtime for longer timeout (edge has 25s limit on hobby)
export const runtime = 'nodejs'
export const maxDuration = 60 // 60 seconds (Vercel hobby limit)

// Comprehensive prompt for extracting ALL character data with zero data loss
const VAULT_CHARACTER_PARSE_PROMPT = `You are an expert at parsing TTRPG character documents. Your task is to extract EVERY piece of information from this document with ZERO data loss.

## CRITICAL RULES

1. **ZERO DATA LOSS**: Every single piece of information in the document must be captured somewhere. If you're unsure where something goes, put it in the appropriate "notes" or "full_notes" field.

2. **PRESERVE ORIGINAL TEXT**: Keep the original wording and tone. Do not paraphrase or "clean up" the writing. Only fix obvious typos if necessary.

3. **PRESERVE FORMATTING**: For backstory and long text, preserve paragraph breaks using "\\n\\n". Preserve bullet points using "\\n- " or "\\n• ".

4. **NPCs ARE CRITICAL**: When you find an NPC section (usually a bold name followed by bullet points), extract EVERY bullet point into the "full_notes" field verbatim. Also parse out structured fields like location, faction, needs, goals when identifiable.

5. **DETECT SECTIONS**: Look for these section patterns:
   - "Backstory" or prose text at the start → backstory
   - "TL;DR" or "TLDR" → tldr bullet points
   - Bold names followed by bullets → NPCs
   - "Session 1", "Session 2" etc. → Session notes
   - "Dear...", letters, stories, poems → Character writings
   - "Quotes" section → Voice lines
   - "Knives", "Plot Hooks", hooks for DMs → plot_hooks
   - Player info (Discord, timezone) → player fields
   - Possessions, inventory, gold → possessions/gold
   - "Companion", "Familiar", "Pet", "Mount" → Companions
   - Tables with data → reference_tables

6. **GAME SYSTEM AGNOSTIC**: Documents may be for D&D 5e, Warhammer Fantasy, LANCER, Pathfinder, etc. Extract what you find without assuming a system.

## OUTPUT FORMAT

Return valid JSON with this EXACT structure:

{
  "character": {
    "name": "string - character name",
    "race": "string | null - species/race",
    "class": "string | null - class/career/profession",
    "subclass": "string | null",
    "level": "number | null",
    "age": "string | null",
    "pronouns": "string | null",
    "background": "string | null - D&D background or origin",
    "alignment": "string | null",
    "backstory": "string - FULL prose backstory with \\n\\n for paragraph breaks. This is the main narrative.",
    "backstory_phases": [{"title": "Phase Name", "content": "Full text of this life phase"}],
    "tldr": ["string - each TLDR bullet as separate item"],
    "appearance": "string | null - physical description",
    "personality": "string | null - personality description",
    "ideals": "string | null",
    "bonds": "string | null",
    "flaws": "string | null",
    "goals": "string | null - character's goals",
    "secrets": "string | null - secrets the character has",
    "fears": ["string - things they fear"],
    "quotes": ["string - exact voice lines/catchphrases"],
    "plot_hooks": ["string - DM story hooks, 'knives'"],
    "pre_session_hook": "string | null - what brought them to the party",
    "theme_music_url": "string | null - YouTube or other link",
    "character_sheet_url": "string | null - D&D Beyond or similar",
    "external_links": [{"url": "string", "label": "string", "type": "dndbeyond|youtube|pinterest|other"}],
    "player_discord": "string | null",
    "player_timezone": "string | null",
    "player_experience": "string | null - player's TTRPG experience",
    "possessions": [{"name": "string", "quantity": "number", "notes": "string | null"}],
    "gold": "number | null",
    "rumors": [{"statement": "string", "is_true": "boolean"}],
    "dm_qa": [{"question": "string", "answer": "string"}],
    "gameplay_tips": ["string - tips for playing/DMing this character"]
  },
  "npcs": [
    {
      "name": "string - NPC's full name",
      "nickname": "string | null - alias like 'Orchpyre'",
      "relationship_type": "family|mentor|friend|enemy|patron|contact|ally|employer|love_interest|rival|acquaintance|other",
      "relationship_label": "string - specific label like 'Father', 'Criminal Contact', 'Ex-Wife'",
      "faction_affiliations": ["string - groups/organizations they belong to"],
      "location": "string | null - where they can be found",
      "occupation": "string | null - their job/role",
      "origin": "string | null - where they're from",
      "needs": "string | null - what they need from the PC",
      "can_provide": "string | null - what favors/help they can offer",
      "goals": "string | null - their personal goals",
      "secrets": "string | null - secrets about them",
      "personality_traits": ["string - key traits"],
      "full_notes": "string - EVERY bullet point about this NPC, VERBATIM, preserving original formatting",
      "relationship_status": "active|deceased|estranged|missing|complicated|unknown"
    }
  ],
  "companions": [
    {
      "name": "string - companion's name",
      "companion_type": "familiar|pet|mount|animal_companion|construct|other",
      "companion_species": "string - ferret, dog, horse, mechanical drone, etc.",
      "description": "string | null - appearance/personality",
      "abilities": "string | null - special abilities"
    }
  ],
  "session_notes": [
    {
      "session_number": "number",
      "session_date": "string | null - date if mentioned (any format found)",
      "title": "string | null - session title if present",
      "campaign_name": "string | null - campaign name if mentioned",
      "summary": "string | null - brief summary if separate from notes",
      "notes": "string - FULL session notes, preserving all formatting",
      "kill_count": "number | null - if kill count/score mentioned",
      "loot": "string | null - items/gold acquired",
      "thoughts_for_next": "string | null - plans for next session",
      "npcs_met": ["string - NPC names encountered"],
      "locations_visited": ["string - place names"]
    }
  ],
  "writings": [
    {
      "title": "string - title or 'Letter to X' or 'Untitled Story'",
      "writing_type": "letter|story|poem|diary|journal|campfire_story|note|speech|song|other",
      "content": "string - FULL text preserving formatting",
      "recipient": "string | null - for letters",
      "in_universe_date": "string | null - if dated in-universe"
    }
  ],
  "reference_tables": [
    {
      "title": "string - table title like 'Potion Inventory' or 'Known Locations'",
      "headers": ["string - column headers"],
      "rows": [["string - cell values for each row"]]
    }
  ],
  "secondary_characters": [
    {
      "name": "string",
      "concept": "string - brief character concept",
      "notes": "string | null - any additional notes"
    }
  ],
  "unclassified_content": "string | null - any text that didn't fit elsewhere, to ensure zero data loss"
}

## NPC EXTRACTION EXAMPLES

If you see:
"""
**Giselbert Almayda**
- Talebheim 11
- Was taken in as a charity case as a kid
- Nickname is Orchpyre
- He needs allies to help investigate the murder of his old mentor
- Currently in Talabheim working as a bounty hunter
"""

Extract as:
{
  "name": "Giselbert Almayda",
  "nickname": "Orchpyre",
  "relationship_type": "ally",
  "relationship_label": "Fellow Guild Member",
  "faction_affiliations": ["Talebheim 11"],
  "location": "Talabheim",
  "occupation": "Bounty hunter",
  "needs": "Allies to help investigate the murder of his old mentor",
  "full_notes": "- Talebheim 11\\n- Was taken in as a charity case as a kid\\n- Nickname is Orchpyre\\n- He needs allies to help investigate the murder of his old mentor\\n- Currently in Talabheim working as a bounty hunter"
}

## SESSION NOTES EXAMPLE

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

## COMPANION EXAMPLE

If you see:
"""
Fipps (Companion)
Type: Familiar
Species: Ferret
A clever little ferret who helps scout ahead. Can understand Common but can't speak.
"""

Extract as:
{
  "name": "Fipps",
  "companion_type": "familiar",
  "companion_species": "Ferret",
  "description": "A clever little ferret who helps scout ahead. Can understand Common but can't speak."
}

Remember: ZERO DATA LOSS. Every word matters. If in doubt, include it in the appropriate notes field.`

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const characterNameHint = formData.get('characterName') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/webp',
    ]

    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const isAllowedByExtension = ['docx', 'pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(fileExtension || '')

    if (!allowedTypes.includes(file.type) && !isAllowedByExtension) {
      return NextResponse.json({
        error: `Unsupported file type: ${file.type}. Allowed: .docx, .pdf, .png, .jpg, .jpeg, .webp`
      }, { status: 400 })
    }

    // Check file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 20MB.' }, { status: 400 })
    }

    // Convert file to base64 for Gemini
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Determine MIME type
    let mimeType = file.type
    if (!mimeType || mimeType === 'application/octet-stream') {
      // Infer from extension
      const mimeMap: Record<string, string> = {
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'pdf': 'application/pdf',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'webp': 'image/webp',
      }
      mimeType = mimeMap[fileExtension || ''] || 'application/octet-stream'
    }

    // Use Gemini Pro 3 for best document parsing quality
    const model = getAIModel('googlePro')

    // Build the data URL for the file
    const dataUrl = `data:${mimeType};base64,${base64}`

    // Send file to Gemini for parsing
    let text: string
    try {
      const result = await generateText({
        model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'file',
                data: dataUrl,
                mediaType: mimeType as 'application/pdf' | 'image/png' | 'image/jpeg' | 'image/webp',
              },
              {
                type: 'text',
                text: `${VAULT_CHARACTER_PARSE_PROMPT}\n\n---\n\nParse this character document completely. Extract EVERY piece of information with zero data loss.\n\n${characterNameHint ? `Character Name Hint: ${characterNameHint}\n\n` : ''}The document is attached as a file. Read it carefully and extract all content.`,
              },
            ],
          },
        ],
      })
      text = result.text
    } catch (aiError) {
      console.error('AI generation error:', aiError)
      return NextResponse.json({
        error: `AI parsing failed: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`,
      }, { status: 500 })
    }

    // Parse the JSON response
    let parsedData
    try {
      // Find JSON in the response (Gemini may add markdown code blocks)
      let jsonStr = text

      // Remove markdown code blocks if present
      const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonBlockMatch) {
        jsonStr = jsonBlockMatch[1].trim()
      } else {
        // Try to find raw JSON object
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          jsonStr = jsonMatch[0]
        }
      }

      parsedData = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      console.error('Raw response:', text.substring(0, 1000))
      return NextResponse.json({
        success: false,
        error: 'Failed to parse document structure. The AI response was not valid JSON.',
        rawText: text.substring(0, 5000),
      }, { status: 422 })
    }

    // Calculate extraction statistics for verification
    const stats = {
      characterName: parsedData.character?.name || 'Unknown',
      npcCount: parsedData.npcs?.length || 0,
      companionCount: parsedData.companions?.length || 0,
      sessionCount: parsedData.session_notes?.length || 0,
      writingCount: parsedData.writings?.length || 0,
      quoteCount: parsedData.character?.quotes?.length || 0,
      plotHookCount: parsedData.character?.plot_hooks?.length || 0,
      tldrCount: parsedData.character?.tldr?.length || 0,
      hasBackstory: !!parsedData.character?.backstory,
      backstoryLength: parsedData.character?.backstory?.length || 0,
      referenceTableCount: parsedData.reference_tables?.length || 0,
      secondaryCharacterCount: parsedData.secondary_characters?.length || 0,
      hasUnclassifiedContent: !!parsedData.unclassified_content,
    }

    return NextResponse.json({
      success: true,
      parsed: parsedData,
      stats,
      sourceFile: file.name,
      sourceFileSize: file.size,
      sourceFileType: mimeType,
    })
  } catch (error) {
    console.error('Vault file parse error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to parse document' },
      { status: 500 }
    )
  }
}
