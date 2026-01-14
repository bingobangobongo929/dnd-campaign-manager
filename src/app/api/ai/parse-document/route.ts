import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { getAIModel } from '@/lib/ai/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'
export const maxDuration = 60

interface ParseDocumentRequest {
  campaignId: string
  documentText: string
  documentType: 'character' | 'session' | 'general'
  characterType?: 'pc' | 'npc'
  preserveTone?: boolean
}

const CHARACTER_PARSE_PROMPT = `You are an expert at parsing D&D character documents. Extract structured character information from the provided text.

IMPORTANT: Preserve the original author's writing style and tone. Do not add "AI waffle" or overly formal language. Keep descriptions punchy and true to how they were written.

Extract the following fields (use null if not present):
- name: The character's name
- race: The character's race (e.g., Human, Elf, Tiefling)
- class: The character's class (e.g., Fighter, Wizard, Rogue)
- age: Numeric age if mentioned
- background: D&D background (e.g., Noble, Soldier, Acolyte)
- appearance: Physical description
- personality: Personality traits and mannerisms
- backstory: Full backstory/background story
- goals: Character motivations and goals
- secrets: Hidden information or secrets
- important_people: Array of important NPCs from their backstory [{name, relationship, notes}]
- story_hooks: Array of plot hooks [{hook, notes}]
- quotes: Array of memorable quotes

Return your response as valid JSON with this exact structure:
{
  "name": "string",
  "race": "string | null",
  "class": "string | null",
  "age": "number | null",
  "background": "string | null",
  "appearance": "string | null",
  "personality": "string | null",
  "backstory": "string | null",
  "goals": "string | null",
  "secrets": "string | null",
  "important_people": [{"name": "string", "relationship": "string", "notes": "string | null"}],
  "story_hooks": [{"hook": "string", "notes": "string | null"}],
  "quotes": ["string"]
}`

const SESSION_PARSE_PROMPT = `You are an expert at parsing D&D session notes. Extract structured session information from the provided text.

IMPORTANT: Preserve the original author's writing style and tone. Keep the narrative voice intact.

Extract the following:
- title: A suitable title for the session
- summary: A brief 2-3 sentence summary
- notes: The full session notes (cleaned up but preserving original style)
- attendees: Array of character names who were present
- key_events: Array of major events [{title, description}]
- npcs_encountered: Array of NPC names mentioned
- locations: Array of locations visited
- items: Array of items gained or lost [{name, action: "gained" | "lost"}]

Return your response as valid JSON with this exact structure:
{
  "title": "string",
  "summary": "string",
  "notes": "string",
  "attendees": ["string"],
  "key_events": [{"title": "string", "description": "string"}],
  "npcs_encountered": ["string"],
  "locations": ["string"],
  "items": [{"name": "string", "action": "gained | lost"}]
}`

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      campaignId,
      documentText,
      documentType,
      characterType = 'npc',
    }: ParseDocumentRequest = await req.json()

    if (!campaignId || !documentText) {
      return NextResponse.json({ error: 'Campaign ID and document text required' }, { status: 400 })
    }

    // Verify user owns this campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const model = getAIModel('anthropic')
    const systemPrompt = documentType === 'character' ? CHARACTER_PARSE_PROMPT : SESSION_PARSE_PROMPT

    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: `Parse the following ${documentType} document:\n\n${documentText}`,
    })

    // Try to parse the JSON response
    let parsedData
    try {
      // Find JSON in the response (in case there's text before/after)
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

    // If it's a character, we can optionally save it directly
    if (documentType === 'character' && parsedData.name) {
      const characterData = {
        campaign_id: campaignId,
        name: parsedData.name,
        type: characterType,
        race: parsedData.race,
        class: parsedData.class,
        age: parsedData.age,
        background: parsedData.background,
        appearance: parsedData.appearance,
        personality: parsedData.personality,
        backstory: parsedData.backstory,
        goals: parsedData.goals,
        secrets: parsedData.secrets,
        important_people: parsedData.important_people || [],
        story_hooks: parsedData.story_hooks || [],
        quotes: parsedData.quotes || [],
        source_document: 'imported',
        imported_at: new Date().toISOString(),
        status: 'alive',
        position_x: Math.floor(Math.random() * 400) + 100,
        position_y: Math.floor(Math.random() * 400) + 100,
      }

      return NextResponse.json({
        success: true,
        documentType: 'character',
        parsed: characterData,
        rawParsed: parsedData,
      })
    }

    if (documentType === 'session' && parsedData.title) {
      return NextResponse.json({
        success: true,
        documentType: 'session',
        parsed: parsedData,
      })
    }

    return NextResponse.json({
      success: true,
      documentType,
      parsed: parsedData,
    })
  } catch (error) {
    console.error('Document parse error:', error)
    return NextResponse.json(
      { error: 'Failed to parse document' },
      { status: 500 }
    )
  }
}
