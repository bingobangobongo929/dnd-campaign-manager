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
      systemPrompt += `\n\n=== THIS IS THEIR CAMPAIGN - REFERENCE IT CONSTANTLY ===\n`
      systemPrompt += `Campaign: "${campaignContext.campaignName || 'Unnamed'}"\n`
      systemPrompt += `System: ${campaignContext.gameSystem || 'D&D 5e'}\n`

      // Player Characters - THE PROTAGONISTS
      const pcs = campaignContext.characters?.filter((c: any) => c.type === 'pc') || []
      const npcs = campaignContext.characters?.filter((c: any) => c.type !== 'pc') || []

      if (pcs.length > 0) {
        systemPrompt += `\n=== PLAYER CHARACTERS (The Party) ===\n`
        pcs.forEach((char: any) => {
          systemPrompt += `\n★ ${char.name}`
          if (char.status && char.status !== 'Active') systemPrompt += ` [STATUS: ${char.status}]`
          systemPrompt += `\n`
          if (char.race || char.class) {
            systemPrompt += `  ${[char.race, char.class, char.level ? `Level ${char.level}` : ''].filter(Boolean).join(' | ')}\n`
          }
          if (char.summary) systemPrompt += `  WHO THEY ARE: ${char.summary}\n`
          if (char.background) systemPrompt += `  BACKGROUND: ${char.background}\n`
          if (char.personality) systemPrompt += `  PERSONALITY: ${char.personality}\n`
          if (char.goals) systemPrompt += `  GOALS (use these for plot hooks!): ${char.goals}\n`
          if (char.secrets) systemPrompt += `  SECRETS (dramatic potential!): ${char.secrets}\n`
          if (char.fears) systemPrompt += `  FEARS: ${Array.isArray(char.fears) ? char.fears.join(', ') : char.fears}\n`
          if (char.bonds) systemPrompt += `  BONDS: ${char.bonds}\n`
          if (char.flaws) systemPrompt += `  FLAWS: ${char.flaws}\n`
          if (char.importantPeople && char.importantPeople.length > 0) {
            systemPrompt += `  IMPORTANT PEOPLE:\n`
            char.importantPeople.forEach((p: any) => {
              systemPrompt += `    - ${p.name} (${p.relationship}): ${p.notes || 'No notes'}\n`
            })
          }
          if (char.storyHooks && char.storyHooks.length > 0) {
            systemPrompt += `  UNRESOLVED STORY HOOKS:\n`
            char.storyHooks.forEach((h: any) => {
              if (!h.resolved) systemPrompt += `    - ${h.hook}\n`
            })
          }
          if (char.notes) {
            const truncatedNotes = char.notes.substring(0, 800)
            systemPrompt += `  DM NOTES: ${truncatedNotes}${char.notes.length > 800 ? '...' : ''}\n`
          }
        })
      }

      // NPCs - Supporting Cast
      if (npcs.length > 0) {
        systemPrompt += `\n=== KEY NPCs (Use these names, reference their motivations!) ===\n`
        npcs.forEach((char: any) => {
          systemPrompt += `\n• ${char.name}`
          if (char.status && char.status !== 'Active') systemPrompt += ` [${char.status}]`
          systemPrompt += `\n`
          if (char.summary) systemPrompt += `  ${char.summary}\n`
          if (char.goals) systemPrompt += `  WANTS: ${char.goals}\n`
          if (char.secrets) systemPrompt += `  SECRET: ${char.secrets}\n`
          if (char.personality) systemPrompt += `  PERSONALITY: ${char.personality}\n`
          if (char.notes) {
            const truncatedNotes = char.notes.substring(0, 400)
            systemPrompt += `  NOTES: ${truncatedNotes}${char.notes.length > 400 ? '...' : ''}\n`
          }
        })
      }

      // Recent Sessions - WHAT'S BEEN HAPPENING
      if (campaignContext.sessions?.length > 0) {
        systemPrompt += `\n=== RECENT SESSION HISTORY (Reference specific events!) ===\n`
        // Show most recent sessions first, limit to last 5 for relevance
        const recentSessions = [...campaignContext.sessions].slice(-5)
        recentSessions.forEach((session: any) => {
          systemPrompt += `\nSession ${session.sessionNumber}: "${session.title}" (${session.date})\n`
          if (session.summary) systemPrompt += `  SUMMARY: ${session.summary}\n`
          if (session.notes) {
            const truncatedNotes = session.notes.substring(0, 1200)
            systemPrompt += `  WHAT HAPPENED: ${truncatedNotes}${session.notes.length > 1200 ? '...' : ''}\n`
          }
        })
      }

      // Major Timeline Events - THE BIG MOMENTS
      if (campaignContext.timelineEvents?.length > 0) {
        const majorEvents = campaignContext.timelineEvents.filter((e: any) => e.isMajor)
        const recentEvents = campaignContext.timelineEvents.slice(-10)
        const eventsToShow = majorEvents.length > 0 ? majorEvents : recentEvents

        systemPrompt += `\n=== KEY CAMPAIGN EVENTS (Build on these!) ===\n`
        eventsToShow.forEach((event: any) => {
          systemPrompt += `• ${event.title}`
          if (event.date) systemPrompt += ` (${event.date})`
          systemPrompt += `\n`
          if (event.description) systemPrompt += `  ${event.description}\n`
        })
      }

      // World Lore - THE SETTING
      if (campaignContext.lore?.length > 0) {
        systemPrompt += `\n=== WORLD LORE & FACTIONS ===\n`
        campaignContext.lore.forEach((lore: any) => {
          systemPrompt += `[${lore.type?.toUpperCase() || 'LORE'}] ${lore.title}\n`
          if (lore.content) {
            const contentStr = typeof lore.content === 'string'
              ? lore.content
              : JSON.stringify(lore.content)
            systemPrompt += `  ${contentStr.substring(0, 600)}${contentStr.length > 600 ? '...' : ''}\n`
          }
        })
      }

      // Locations
      if (campaignContext.canvasGroups?.length > 0) {
        systemPrompt += `\n=== LOCATIONS IN PLAY ===\n`
        systemPrompt += campaignContext.canvasGroups.map((g: any) => g.name).join(', ') + '\n'
      }

      systemPrompt += `\n=== END OF CAMPAIGN CONTEXT ===\n`
      systemPrompt += `Remember: Reference this specific campaign constantly. Use character names, NPC motivations, unresolved hooks, and recent events in your responses.\n`
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
