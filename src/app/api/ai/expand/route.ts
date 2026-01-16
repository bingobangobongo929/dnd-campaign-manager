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
        ? `\n\nKNOWN NPCs/CHARACTERS FROM VAULT (ALWAYS wrap these in <strong> tags when they appear):\n${knownEntities.map((e: string) => `- ${e}`).join('\n')}`
        : ''

      // Session notes expansion - practical, scannable format
      systemPrompt = `You are a session notes editor. Your job is to make session notes CLEAN and SCANNABLE - like meeting minutes, NOT creative writing.

TASK 1 - CLEAN THE SUMMARY:
- Fix grammar and spelling only
- Keep bullet point format
- Don't change meaning or add anything
- Keep it brief and factual

TASK 2 - EXPAND INTO DETAILED NOTES:
Create a longer but still FACTUAL version. Rules:
- Write in simple, clear sentences - NOT flowery prose
- Keep it scannable - use short paragraphs (2-4 sentences each)
- Wrap character/NPC names in <strong> tags (e.g., <strong>Mr. Giggles</strong>)
- Wrap location names in <em> tags (e.g., <em>The Rusty Anchor</em>)
- NEVER add atmosphere, emotions, or descriptions that weren't mentioned
- NEVER use phrases like "a fortunate turn of events", "peeling back layers", "crucial step forward", "peculiar individual", "proved to be"
- Just state what happened in plain language
- If they wrote "met Mr. Giggles, a potion seller" - write "Met <strong>Mr. Giggles</strong>, a potion seller"
- Don't embellish or add meaning - just make it readable
- Don't add invented details about characters' emotions, motivations, or the scene
- Think of this like summarizing a meeting, not writing a novel${entitiesList}

TASK 3 - REASONING:
After the notes, add a brief section explaining what names/entities you recognized and linked.

BAD example: "We were introduced to a peculiar individual who goes by the name Mr. Giggles. We learned that his trade is alchemy and he proved to be a valuable contact..."
GOOD example: "Met <strong>Mr. Giggles</strong>, a potion seller at the tavern. He could be useful for supplies."

Output format:
---CLEANED_SUMMARY---
[Cleaned bullet points - just fix grammar]
---DETAILED_NOTES---
[Expanded but FACTUAL notes with name highlighting - 2-4 short paragraphs max]
---REASONING---
[List names you recognized and linked, e.g. "Recognized: Mr. Giggles (from vault), The Rusty Anchor (location)"]`

      userPrompt = `${context ? `Context:\n${context}\n\n` : ''}Raw Session Notes:\n${text}

Clean up and expand these notes. Keep it factual and scannable - like meeting minutes, not a story.`
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
