import { NextResponse } from 'next/server'
import { generateText } from 'ai'
import { getAIModel } from '@/lib/ai/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

interface CharacterInput {
  name: string
  type: string
  description?: string | null
  summary?: string | null
  secrets?: string | null
  tags: string[]
}

interface RelationshipInput {
  character?: string
  related?: string
  type: string
  label?: string | null
}

interface AnalyzeLoreRequest {
  campaignId: string
  characters: CharacterInput[]
  relationships: RelationshipInput[]
}

const ANALYZE_LORE_PROMPT = `You are an expert D&D lore analyst. Analyze the campaign data provided and generate valuable insights for the dungeon master.

Your analysis should include:

1. **Hidden Connections**: Identify potential connections between characters that might not be explicitly stated but could create interesting story opportunities.

2. **Faction Dynamics**: Analyze the power dynamics between factions and groups of characters.

3. **Plot Threads**: Identify unresolved plot hooks, character secrets that could emerge, and potential future conflicts.

4. **Character Arcs**: Suggest potential character development arcs based on their backstories and relationships.

5. **World-Building Opportunities**: Point out areas where the lore could be expanded or deepened.

Guidelines:
- Be insightful and creative, but ground suggestions in the provided data
- Highlight specific character names and relationships when making connections
- Consider both PC and NPC perspectives
- Look for dramatic irony opportunities (things players don't know)
- Format your response clearly with headers for each insight type

Provide your analysis in a clear, readable format that helps the DM understand their campaign at a deeper level.`

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { campaignId, characters, relationships }: AnalyzeLoreRequest = await req.json()

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 })
    }

    // Verify user owns this campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, name')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Build the analysis prompt with campaign data
    const characterSummary = characters.map(c => {
      const parts = [`- ${c.name} (${c.type})`]
      if (c.summary) parts.push(`  Summary: ${c.summary}`)
      if (c.description) parts.push(`  Description: ${c.description.slice(0, 500)}...`)
      if (c.secrets) parts.push(`  [SECRET] ${c.secrets.slice(0, 200)}`)
      if (c.tags.length > 0) parts.push(`  Tags: ${c.tags.join(', ')}`)
      return parts.join('\n')
    }).join('\n\n')

    const relationshipSummary = relationships.length > 0
      ? relationships.map(r =>
          `- ${r.character} → ${r.related}: ${r.label || r.type}`
        ).join('\n')
      : 'No explicit relationships defined'

    const analysisPrompt = `Campaign: ${campaign.name}

## Characters (${characters.length} total)
${characterSummary}

## Known Relationships
${relationshipSummary}

Please analyze this campaign data and provide insights:`

    const model = getAIModel('anthropic')

    const { text } = await generateText({
      model,
      system: ANALYZE_LORE_PROMPT,
      prompt: analysisPrompt,
      maxTokens: 2000,
    })

    // Save the lore entry to the database
    const { error: insertError } = await supabase
      .from('campaign_lore')
      .insert({
        campaign_id: campaignId,
        lore_type: 'analysis',
        title: `Campaign Analysis - ${new Date().toLocaleDateString()}`,
        content: text,
        ai_generated: true,
        last_analyzed_at: new Date().toISOString(),
      })

    if (insertError) {
      console.error('Failed to save lore entry:', insertError)
    }

    return NextResponse.json({
      success: true,
      analysis: text,
    })
  } catch (error) {
    console.error('Lore analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze campaign lore' },
      { status: 500 }
    )
  }
}
