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

    const { text, sessionTitle, provider } = await req.json()

    if (!text) {
      return new Response('Text is required', { status: 400 })
    }

    const model = getAIModel((provider as AIProvider) || 'anthropic')

    const result = await streamText({
      model,
      system: AI_PROMPTS.summarize,
      prompt: `Please create a concise summary of the following session notes:

${sessionTitle ? `Session: ${sessionTitle}\n\n` : ''}Notes:
${text}

Summary:`,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('AI summarize error:', error)
    return new Response('AI service error', { status: 500 })
  }
}
