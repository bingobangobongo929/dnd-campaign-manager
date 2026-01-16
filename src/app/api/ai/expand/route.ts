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
      // Session notes expansion - two-step process
      systemPrompt = `You are a skilled session notes editor for tabletop RPG campaigns. Your task is to:

1. CLEAN UP the user's raw bullet-point summary:
   - Fix grammar and spelling mistakes
   - Improve clarity while keeping their voice
   - Keep it concise - don't add information they didn't mention
   - Preserve all the facts they wrote

2. EXPAND into detailed narrative notes (3-6 paragraphs):
   - Transform the bullet points into a narrative session log
   - Use the context provided to make it richer
   - NEVER invent details, NPCs, locations, or events they didn't mention
   - Maintain the character's perspective if this is their journal
   - Be descriptive but stay true to what actually happened

CRITICAL: Never make anything up. Only expand on what the user wrote. If something is unclear, keep it vague rather than inventing details.

Output format:
---CLEANED_SUMMARY---
[The cleaned up summary here]
---DETAILED_NOTES---
[The expanded narrative notes here - use HTML formatting with <p>, <strong>, <em> tags]`

      userPrompt = `${context ? `Context:\n${context}\n\n` : ''}Raw Session Summary:\n${text}

Please clean up the summary and expand it into detailed notes.`
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
