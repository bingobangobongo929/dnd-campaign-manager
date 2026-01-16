import { streamText } from 'ai'
import { getAIModel, AI_PROMPTS, AIProvider } from '@/lib/ai/config'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
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
- Use <h4> for section headers (NOT h1/h2/h3)
- Use <p> for paragraphs
- Use <hr> between major sections${entitiesList}

OUTPUT STRUCTURE:
Your output should have these sections (skip any that don't apply).
IMPORTANT: Add a blank line between each section for visual spacing.

---CLEANED_SUMMARY---
Bullet points with grammar fixed. Keep it brief.

---DETAILED_NOTES---
<h4>📍 What Happened</h4>
<p>Chronological summary of events in 2-4 short paragraphs. Plain factual language.</p>

<h4>👥 People</h4>
<ul>
<li><strong>Name</strong> - who they are, what they did (NEW if first appearance)</li>
</ul>

<h4>🗺️ Locations</h4>
<ul>
<li><em>Location</em> - brief note about what happened there</li>
</ul>

<h4>⚔️ Combat</h4>
<p>Brief combat summary if any fighting occurred. Who fought whom, outcome.</p>

<h4>📦 Items & Loot</h4>
<ul>
<li><strong>Item</strong> - where found, why important</li>
</ul>

<h4>🔍 Discoveries</h4>
<ul>
<li>Important information learned</li>
</ul>

<h4>📝 Decisions</h4>
<ul>
<li>Key choices made and their consequences</li>
</ul>

<h4>🎯 Hooks & Setup</h4>
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
• Met Bob the blacksmith, received magic sword
• Traveled to the Old Mill
• Fought 3 goblins
• Found treasure map

---DETAILED_NOTES---
<h4>📍 What Happened</h4>
<p>The party met <strong>Bob</strong>, a local blacksmith, who provided them with a magic sword. They traveled to <em>the Old Mill</em> where they encountered and defeated three goblins. Among the loot, they discovered a map leading to treasure.</p>

<h4>👥 People</h4>
<ul>
<li><strong>Bob</strong> - Blacksmith, gave the party a magic sword (NEW)</li>
</ul>

<h4>🗺️ Locations</h4>
<ul>
<li><em>The Old Mill</em> - Site of goblin encounter</li>
</ul>

<h4>⚔️ Combat</h4>
<p>Fought 3 goblins at <em>the Old Mill</em>. Party victorious.</p>

<h4>📦 Items & Loot</h4>
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
