import { streamText } from 'ai'
import { getAIModel, AI_PROMPTS, AIProvider } from '@/lib/ai/config'

export const runtime = 'edge'

export async function POST(req: Request) {
  try {
    const { messages, campaignContext, provider } = await req.json()

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Check if API keys are configured
    const selectedProvider = (provider as AIProvider) || 'anthropic'
    if (selectedProvider === 'anthropic' && !process.env.ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'Anthropic API key not configured' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    if (selectedProvider === 'google' && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Google API key not configured' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const model = getAIModel(selectedProvider)

    // Build context about the campaign
    let systemPrompt = AI_PROMPTS.assistant

    if (campaignContext) {
      systemPrompt += `\n\nCampaign Information:\n`

      if (campaignContext.campaignName) {
        systemPrompt += `Campaign Name: ${campaignContext.campaignName}\n`
      }
      if (campaignContext.gameSystem) {
        systemPrompt += `Game System: ${campaignContext.gameSystem}\n`
      }
      if (campaignContext.characters && campaignContext.characters.length > 0) {
        systemPrompt += `\nCharacters:\n`
        campaignContext.characters.forEach((char: { name: string; type: string; summary?: string }) => {
          systemPrompt += `- ${char.name} (${char.type}): ${char.summary || 'No description'}\n`
        })
      }
      if (campaignContext.recentSessions && campaignContext.recentSessions.length > 0) {
        systemPrompt += `\nRecent Sessions:\n`
        campaignContext.recentSessions.forEach((session: { title: string; summary?: string }) => {
          systemPrompt += `- ${session.title}: ${session.summary || 'No summary'}\n`
        })
      }
    }

    const result = await streamText({
      model,
      system: systemPrompt,
      messages,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('AI chat error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({
      error: 'AI service error',
      details: errorMessage
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
