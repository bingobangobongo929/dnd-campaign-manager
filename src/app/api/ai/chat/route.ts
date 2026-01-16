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

    // Build comprehensive context about the campaign
    let systemPrompt = AI_PROMPTS.assistant

    if (campaignContext) {
      systemPrompt += `\n\n=== CAMPAIGN CONTEXT ===\n`
      systemPrompt += `Campaign: ${campaignContext.campaignName || 'Unnamed'}\n`
      systemPrompt += `System: ${campaignContext.gameSystem || 'D&D 5e'}\n`

      // Characters with full details
      if (campaignContext.characters?.length > 0) {
        systemPrompt += `\n--- CHARACTERS ---\n`
        campaignContext.characters.forEach((char: any) => {
          systemPrompt += `\n[${char.type?.toUpperCase() || 'CHARACTER'}] ${char.name}`
          if (char.status) systemPrompt += ` (${char.status})`
          systemPrompt += `\n`
          if (char.race || char.class) {
            systemPrompt += `  Race/Class: ${[char.race, char.class].filter(Boolean).join(' ')}\n`
          }
          if (char.summary) systemPrompt += `  Summary: ${char.summary}\n`
          if (char.background) systemPrompt += `  Background: ${char.background}\n`
          if (char.personality) systemPrompt += `  Personality: ${char.personality}\n`
          if (char.goals) systemPrompt += `  Goals: ${char.goals}\n`
          if (char.secrets) systemPrompt += `  Secrets: ${char.secrets}\n`
          if (char.notes) systemPrompt += `  Notes: ${char.notes.substring(0, 500)}${char.notes.length > 500 ? '...' : ''}\n`
          if (char.importantPeople) {
            systemPrompt += `  Important People: ${JSON.stringify(char.importantPeople)}\n`
          }
          if (char.storyHooks) {
            systemPrompt += `  Story Hooks: ${JSON.stringify(char.storyHooks)}\n`
          }
          if (char.quotes && Array.isArray(char.quotes) && char.quotes.length > 0) {
            systemPrompt += `  Quotes: ${char.quotes.slice(0, 3).map((q: string) => `"${q}"`).join(', ')}\n`
          }
        })
      }

      // Sessions with notes
      if (campaignContext.sessions?.length > 0) {
        systemPrompt += `\n--- SESSION HISTORY ---\n`
        campaignContext.sessions.forEach((session: any) => {
          systemPrompt += `\nSession ${session.sessionNumber}: ${session.title} (${session.date})\n`
          if (session.summary) systemPrompt += `  Summary: ${session.summary}\n`
          if (session.notes) {
            // Truncate very long notes but include meaningful content
            const truncatedNotes = session.notes.substring(0, 1000)
            systemPrompt += `  Notes: ${truncatedNotes}${session.notes.length > 1000 ? '...' : ''}\n`
          }
        })
      }

      // Timeline events
      if (campaignContext.timelineEvents?.length > 0) {
        systemPrompt += `\n--- KEY EVENTS ---\n`
        campaignContext.timelineEvents.forEach((event: any) => {
          const majorMarker = event.isMajor ? '[MAJOR] ' : ''
          systemPrompt += `${majorMarker}${event.title}`
          if (event.date) systemPrompt += ` (${event.date})`
          systemPrompt += `: ${event.description || 'No description'}\n`
        })
      }

      // Campaign lore
      if (campaignContext.lore?.length > 0) {
        systemPrompt += `\n--- WORLD LORE ---\n`
        campaignContext.lore.forEach((lore: any) => {
          systemPrompt += `[${lore.type?.toUpperCase()}] ${lore.title}\n`
          if (lore.content) {
            const contentStr = typeof lore.content === 'string'
              ? lore.content
              : JSON.stringify(lore.content)
            systemPrompt += `  ${contentStr.substring(0, 500)}${contentStr.length > 500 ? '...' : ''}\n`
          }
        })
      }

      // Canvas groups (campaign areas)
      if (campaignContext.canvasGroups?.length > 0) {
        systemPrompt += `\n--- CAMPAIGN AREAS ---\n`
        systemPrompt += campaignContext.canvasGroups.map((g: any) => g.name).join(', ') + '\n'
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
