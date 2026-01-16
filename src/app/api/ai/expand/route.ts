import { streamText } from 'ai'
import { getAIModel, AI_PROMPTS, AIProvider } from '@/lib/ai/config'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const { text, context, provider, mode } = await req.json()

    if (!text) {
      return new Response('Text is required', { status: 400 })
    }

    const model = getAIModel((provider as AIProvider) || 'anthropic')

    // Different prompts for different modes
    let systemPrompt: string
    let userPrompt: string

    if (mode === 'session') {
      // Session notes expansion - practical, scannable format
      systemPrompt = `You are a session notes editor. Your job is to make session notes CLEAN and SCANNABLE - NOT creative writing.

TASK 1 - CLEAN THE SUMMARY:
- Fix grammar and spelling only
- Keep bullet point format
- Don't change meaning or add anything
- Keep it brief and factual

TASK 2 - EXPAND INTO DETAILED NOTES:
Create a longer but still FACTUAL version. Rules:
- Write in simple, clear sentences - NOT flowery prose
- Keep it scannable - use short paragraphs
- Wrap character/NPC names in <strong> tags (e.g., <strong>Mr. Giggles</strong>)
- Wrap location names in <em> tags (e.g., <em>The Rusty Anchor</em>)
- NEVER add atmosphere, emotions, or descriptions that weren't mentioned
- NEVER use phrases like "a fortunate turn of events", "peeling back layers", "crucial step forward"
- Just state what happened in plain language
- If they wrote "met Mr. Giggles, a potion seller" - write "Met <strong>Mr. Giggles</strong>, a potion seller"
- Don't embellish or add meaning - just make it readable

BAD example: "We were introduced to a peculiar individual who goes by the name Mr. Giggles. We learned that his trade is alchemy..."
GOOD example: "Met <strong>Mr. Giggles</strong>, a potion seller at the tavern. He could be useful for supplies."

Output format:
---CLEANED_SUMMARY---
[Cleaned bullet points - just fix grammar]
---DETAILED_NOTES---
[Expanded but FACTUAL notes with name highlighting - 2-4 short paragraphs max]`

      userPrompt = `${context ? `Context:\n${context}\n\n` : ''}Raw Session Notes:\n${text}

Clean up and expand these notes. Keep it factual and scannable - no creative writing.`
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
