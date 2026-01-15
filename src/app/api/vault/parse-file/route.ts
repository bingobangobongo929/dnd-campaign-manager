import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { getAIModel } from '@/lib/ai/config'

// Use Node.js runtime for longer timeout
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes (Vercel Pro)

// Comprehensive prompt for extracting ALL character data with zero data loss
const VAULT_CHARACTER_PARSE_PROMPT = `You are an expert at parsing TTRPG character documents. Your task is to extract EVERY piece of information from this document with ZERO data loss.

## CRITICAL RULES

1. **ABSOLUTE ZERO DATA LOSS**: Every single piece of information in the document MUST be captured somewhere. This is non-negotiable. If you cannot find a specific field for something, put it in:
   - "full_notes" for NPC-related content
   - "backstory" or "backstory_phases" for character history
   - "unclassified_content" as a last resort
   NEVER silently drop content. The user wrote it for a reason.

2. **PRESERVE ORIGINAL TEXT**: Keep the original wording and tone. Do not paraphrase or "clean up" the writing. Only fix obvious typos if necessary.

3. **PRESERVE FORMATTING WITH MARKDOWN**: For backstory and long text fields, use markdown formatting:
   - Paragraph breaks: Use "\\n\\n" between paragraphs
   - Bullet points: Use "\\n- " for each bullet item
   - Bold text: Use **bold** for important names, terms, or emphasis
   - Italic text: Use *italic* for thoughts, foreign words, or mild emphasis
   - Headings: Use "## Heading" for section headers within the text
   - Keep the original structure and emphasis from the document

4. **BACKSTORY vs BACKSTORY_PHASES - CRITICAL**:
   - "backstory": Contains the main PROSE narrative of the character's history
   - "backstory_phases": Contains BULLETED/OUTLINED life sections that supplement the prose

   IMPORTANT: Many documents have BOTH a prose backstory AND bulleted life phase sections like:
   - "Early Life" with bullet points
   - "The Good Path" with bullet points
   - "Student Life" with bullet points
   - "Adult Life" with bullet points
   - "Childhood", "Teenage Years", "How I Met X" etc.

   These bulleted sections are BACKSTORY PHASES and must ALL be captured in the backstory_phases array. They often come AFTER the prose backstory and contain additional detail. DO NOT DROP THEM.

5. **NPCs ARE CRITICAL**: When you find an NPC section (usually a bold name followed by bullet points), extract EVERY bullet point into the "full_notes" field verbatim. Also parse out structured fields like location, faction, needs, goals when identifiable. Look for sections like "How she bonds with the PCs" - these describe relationships with OTHER player characters and should be captured as NPCs or in the main character's notes.

6. **DETECT SECTIONS**: Look for these section patterns:
   - "Backstory" or prose text at the start → backstory (prose field)
   - Life phases with bullets (Early Life, Student Life, etc.) → backstory_phases array
   - "TL;DR" or "TLDR" → tldr bullet points
   - Bold names followed by bullets → NPCs
   - "dad", "father", "mother", person names with notes → NPCs (family)
   - "Session 1", "Session 2" etc. → Session notes
   - "Dear...", letters, stories, poems → Character writings
   - "Quotes" section → Voice lines
   - "Knives", "Plot Hooks", hooks for DMs → plot_hooks
   - Player info (Discord, timezone) → player fields
   - Possessions, inventory, gold → possessions/gold
   - "Companion", "Familiar", "Pet", "Mount", "Fam." → Companions
   - Tables with data → reference_tables
   - "How she bonds with PCs", party relationships → Can be NPCs or party_relations notes

7. **GAME SYSTEM AGNOSTIC**: Documents may be for D&D 5e, Warhammer Fantasy, LANCER, Pathfinder, etc. Extract what you find without assuming a system.

## OUTPUT FORMAT

Return valid JSON with this EXACT structure:

{
  "character": {
    "name": "string - character name",
    "type": "pc|npc - 'pc' if player character, 'npc' if non-player character (default to 'pc' if unclear)",
    "race": "string | null - species/race/ancestry",
    "class": "string | null - class/career/profession",
    "subclass": "string | null - specialization/archetype",
    "level": "number | null",
    "age": "string | null - can be descriptive like 'young adult' or specific",
    "pronouns": "string | null",
    "background": "string | null - D&D background or origin story hook",
    "alignment": "string | null",
    "deity": "string | null - god/gods they worship",
    "backstory": "string - FULL prose backstory with MARKDOWN: \\n\\n for paragraphs, **bold** for names/emphasis, *italic* for thoughts, ## for headings, - for bullets. Include ALL narrative content.",
    "backstory_phases": [{"title": "Phase Name like 'Early Life' or 'Student Years'", "content": "Full bulleted content with markdown: \\n- bullet1\\n- bullet2. CRITICAL: Include ALL bulleted life phase sections here!"}],
    "tldr": ["string - each TLDR/summary bullet as separate item"],
    "appearance": "string | null - general physical description prose",
    "height": "string | null - e.g. '5\\'10\"' or '180cm' or 'tall'",
    "weight": "string | null - e.g. '150 lbs' or 'slender'",
    "hair": "string | null - color, style, length",
    "eyes": "string | null - color, notable features",
    "skin": "string | null - tone, complexion, notable features",
    "voice": "string | null - description of how they sound",
    "distinguishing_marks": "string | null - scars, tattoos, birthmarks",
    "typical_attire": "string | null - what they usually wear",
    "personality": "string | null - personality description",
    "ideals": "string | null - what principles guide them",
    "bonds": "string | null - connections to people/places/things",
    "flaws": "string | null - weaknesses, vices, bad habits",
    "goals": "string | null - what they want to achieve",
    "secrets": "string | null - things they hide",
    "fears": ["string - things they fear"],
    "quotes": ["string - exact voice lines, catchphrases, things they say"],
    "plot_hooks": ["string - DM story hooks, 'knives', adventure seeds"],
    "pre_session_hook": "string | null - what brought them to the party/adventure",
    "theme_music_url": "string | null - YouTube or Spotify link if mentioned",
    "character_sheet_url": "string | null - D&D Beyond, Demiplane, etc.",
    "image_url": "string | null - if an image URL is mentioned in the document",
    "external_links": [{"url": "string", "label": "string", "type": "dndbeyond|youtube|pinterest|spotify|other"}],
    "player_discord": "string | null - Discord username",
    "player_timezone": "string | null",
    "player_experience": "string | null - player's TTRPG experience level",
    "possessions": [{"name": "string", "quantity": "number", "notes": "string | null"}],
    "gold": "number | null - currency amount",
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
      "full_notes": "string - EVERY bullet point about this NPC, VERBATIM, with markdown: - for bullets, **bold** for emphasis, \\n\\n between sections",
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
      "notes": "string - FULL session notes with markdown formatting preserved (\\n\\n, **bold**, - bullets)",
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
      "content": "string - FULL text with markdown formatting (\\n\\n, **bold**, *italic*)",
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

## BACKSTORY FORMATTING EXAMPLE

If the document has prose like:
"""
Early Life
Kira was born in Waterdeep to a merchant family. Her father, Marcus, taught her the trade.

The Incident
When she was 15, bandits attacked their caravan. She discovered her magical abilities that day, accidentally burning the attackers alive.
"""

Format the backstory as:
"## Early Life\\n\\n**Kira** was born in *Waterdeep* to a merchant family. Her father, **Marcus**, taught her the trade.\\n\\n## The Incident\\n\\nWhen she was 15, bandits attacked their caravan. She discovered her magical abilities that day, accidentally burning the attackers alive."

## BACKSTORY_PHASES EXAMPLE - CRITICAL

Many documents have BOTH prose AND bulleted life sections. If you see:
"""
Backstory (prose section)
The smoke and screams from the pyre never reached her sense...

(later in document, after the prose)

Early life
• She was born in a small village. Her mother was accused of witchcraft.
• Her father Egon fled with baby Ana to the city.

The "good path"
• When she started showing magical signs, her father panicked.
• Through his services, he met Baron Feuerbach and made a deal.

Student life: the cracks
• She got a mentor, Giselbert Almayda
• She started sneaking out, drinking, chasing excitement
"""

You MUST capture these as backstory_phases:
{
  "backstory": "The smoke and screams from the pyre never reached her sense... (full prose)",
  "backstory_phases": [
    {
      "title": "Early life",
      "content": "- She was born in a small village. Her mother was accused of witchcraft.\\n- Her father **Egon** fled with baby Ana to the city."
    },
    {
      "title": "The good path",
      "content": "- When she started showing magical signs, her father panicked.\\n- Through his services, he met **Baron Feuerbach** and made a deal."
    },
    {
      "title": "Student life: the cracks",
      "content": "- She got a mentor, **Giselbert Almayda**\\n- She started sneaking out, drinking, chasing excitement"
    }
  ]
}

CRITICAL: These bulleted life sections often appear AFTER the main prose and are easily missed. They contain important detail. NEVER drop them!

## FINAL VERIFICATION

Before returning your JSON, verify:
1. Did you capture ALL prose backstory content?
2. Did you capture ALL bulleted life phase sections (Early Life, Student Life, Adult Life, etc.)?
3. Did you capture ALL NPCs mentioned (including family like "dad", mentor names, etc.)?
4. Did you capture ALL companions/familiars?
5. Is there ANY text from the document that isn't in your JSON? If yes, put it in unclassified_content.

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

    // Check file size (max 50MB for Vercel Pro)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 50MB.' }, { status: 400 })
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
        maxOutputTokens: 32000, // Large output for comprehensive extraction
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
      backstoryPhaseCount: parsedData.character?.backstory_phases?.length || 0,
      backstoryPhases: parsedData.character?.backstory_phases?.map((p: { title: string }) => p.title) || [],
      referenceTableCount: parsedData.reference_tables?.length || 0,
      secondaryCharacterCount: parsedData.secondary_characters?.length || 0,
      hasUnclassifiedContent: !!parsedData.unclassified_content,
      unclassifiedContentLength: parsedData.unclassified_content?.length || 0,
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
