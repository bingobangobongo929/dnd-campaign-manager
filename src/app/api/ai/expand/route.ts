import { streamText } from 'ai'
import { getAIModel, AI_PROMPTS, AIProvider } from '@/lib/ai/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Tier check - only standard and premium tiers can use AI
    const { data: settings } = await supabase
      .from('user_settings')
      .select('tier')
      .eq('user_id', user.id)
      .single()
    if ((settings?.tier || 'free') === 'free') {
      return new Response('AI features require a paid plan', { status: 403 })
    }

    const { text, context, provider, mode, knownEntities } = await req.json()

    if (!text) {
      return new Response('Text is required', { status: 400 })
    }

    const model = getAIModel((provider as AIProvider) || 'anthropic')

    // Different prompts for different modes
    let systemPrompt: string
    let userPrompt: string

    if (mode === 'session') {
      // Build known entities instruction
      const entitiesList = knownEntities && knownEntities.length > 0
        ? `\n\nKNOWN ENTITIES FROM VAULT (wrap these in <strong> tags when they appear):\n${knownEntities.map((e: string) => `- ${e}`).join('\n')}`
        : ''

      // Session notes expansion - structured HTML output
      systemPrompt = `You are a session notes editor. Transform rough session notes into CLEAN, STRUCTURED, SCANNABLE notes.

YOUR WRITING STYLE:
- Write like meeting minutes, NOT creative fiction
- Plain, factual language - just state what happened
- NO flowery prose, NO invented emotions, NO atmosphere descriptions
- NEVER use: "proved to be", "peculiar individual", "fortunate turn", "peeling back layers", "crucial step"
- Just facts: who, what, where, when

HTML FORMATTING RULES:
- Character/NPC names: <strong>Name</strong>
- Locations: <em>Location Name</em>
- Items of note: <strong>item name</strong>
- Use <ul><li> for lists
- Use <h3> for section headers
- Use <p> for paragraphs
- Use <hr> between major sections${entitiesList}

OUTPUT STRUCTURE:
Your output should have these sections (skip any that don't apply).
IMPORTANT: Add a blank line between each section for visual spacing.

---CLEANED_SUMMARY---
Output as HTML bullet list: <ul><li><p>Point 1</p></li><li><p>Point 2</p></li></ul>
Keep each bullet brief (one sentence). Use <strong> for names.

---DETAILED_NOTES---
<h3>📍 What Happened</h3>
<p>Chronological summary of events in 2-4 short paragraphs. Plain factual language.</p>

<h3>👥 People</h3>
<ul>
<li><strong>Name</strong> - who they are, what they did (NEW if first appearance)</li>
</ul>

<h3>🗺️ Locations</h3>
<ul>
<li><em>Location</em> - brief note about what happened there</li>
</ul>

<h3>⚔️ Combat</h3>
<p>Brief combat summary if any fighting occurred. Who fought whom, outcome.</p>

<h3>📦 Items & Loot</h3>
<ul>
<li><strong>Item</strong> - where found, why important</li>
</ul>

<h3>🔍 Discoveries</h3>
<ul>
<li>Important information learned</li>
</ul>

<h3>📝 Decisions</h3>
<ul>
<li>Key choices made and their consequences</li>
</ul>

<h3>🎯 Hooks & Setup</h3>
<ul>
<li>Things set up for future sessions</li>
</ul>

---TITLE---
[Generate a short, descriptive title for this session, 3-6 words, e.g. "The Bomb on the Columbus" or "Infiltrating IPS-N Headquarters"]

---REASONING---
Entities linked: [list names you recognized from the vault]

EXAMPLE INPUT:
"met bob the blacksmith, he gave us a magic sword. went to old mill, fought 3 goblins. found map to treasure"

EXAMPLE OUTPUT:
---CLEANED_SUMMARY---
<ul><li><p>Met <strong>Bob</strong> the blacksmith, received magic sword</p></li><li><p>Traveled to <em>the Old Mill</em></p></li><li><p>Fought 3 goblins</p></li><li><p>Found treasure map</p></li></ul>

---DETAILED_NOTES---
<h3>📍 What Happened</h3>
<p>The party met <strong>Bob</strong>, a local blacksmith, who provided them with a magic sword. They traveled to <em>the Old Mill</em> where they encountered and defeated three goblins. Among the loot, they discovered a map leading to treasure.</p>

<h3>👥 People</h3>
<ul>
<li><strong>Bob</strong> - Blacksmith, gave the party a magic sword (NEW)</li>
</ul>

<h3>🗺️ Locations</h3>
<ul>
<li><em>The Old Mill</em> - Site of goblin encounter</li>
</ul>

<h3>⚔️ Combat</h3>
<p>Fought 3 goblins at <em>the Old Mill</em>. Party victorious.</p>

<h3>📦 Items & Loot</h3>
<ul>
<li><strong>Magic sword</strong> - Gift from Bob</li>
<li><strong>Treasure map</strong> - Found after goblin fight</li>
</ul>

---TITLE---
The Old Mill Goblin Ambush

---REASONING---
Entities linked: Bob (NPC), Old Mill (location)`

      userPrompt = `${context ? `Context:\n${context}\n\n` : ''}Raw Session Notes:\n${text}

Transform these notes into clean, structured format. Be factual and concise.`
    } else {
      // Default character notes expansion
      systemPrompt = AI_PROMPTS.expand
      userPrompt = `Please expand the following character notes into a richer description:

${context ? `Context about this character:\n${context}\n\n` : ''}Notes to expand:
${text}

Provide an expanded, detailed description:`
    }

    const result = await streamText({
      model,
      system: systemPrompt,
      prompt: userPrompt,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('AI expand error:', error)
    return new Response('AI service error', { status: 500 })
  }
}
