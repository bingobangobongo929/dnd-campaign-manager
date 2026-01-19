import { generateText } from 'ai'
import { getAIModel, AI_PROMPTS, AIProvider } from '@/lib/ai/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

interface SessionData {
  id: string
  title: string
  notes: string
  session_date: string
}

interface GeneratedEvent {
  title: string
  description: string
  event_type: string
  character_names: string[]
  location?: string
  is_major?: boolean
}

export async function POST(req: Request) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    // Tier check - only standard and premium tiers can use AI
    const { data: settings } = await supabase
      .from('user_settings')
      .select('tier')
      .eq('user_id', user.id)
      .single()
    if ((settings?.tier || 'free') === 'free') {
      return new Response(JSON.stringify({ error: 'AI features require a paid plan' }), { status: 403, headers: { 'Content-Type': 'application/json' } })
    }

    const { sessions, characters, provider } = await req.json() as {
      sessions: SessionData[]
      characters: { id: string; name: string }[]
      provider?: AIProvider
    }

    if (!sessions || sessions.length === 0) {
      return new Response('At least one session is required', { status: 400 })
    }

    const model = getAIModel(provider || 'anthropic')

    // Build context from sessions
    const sessionContext = sessions.map(s =>
      `Session: ${s.title} (${s.session_date})\n${s.notes}`
    ).join('\n\n---\n\n')

    const characterList = characters.map(c => c.name).join(', ')

    const result = await generateText({
      model,
      system: AI_PROMPTS.generateTimelineEvents,
      prompt: `Available characters in this campaign: ${characterList || 'None specified'}

Session notes to analyze:
${sessionContext}

Extract timeline events from these session notes:`,
    })

    // Parse the JSON response
    let events: GeneratedEvent[] = []
    try {
      // Extract JSON from the response (handle potential markdown code blocks)
      let jsonText = result.text
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim()
      }

      const parsed = JSON.parse(jsonText)
      events = parsed.events || []
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      return new Response(JSON.stringify({
        error: 'Failed to parse AI response',
        raw: result.text
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Map character names to IDs
    const eventsWithCharacterIds = events.map(event => {
      const characterIds = event.character_names
        .map(name => {
          const char = characters.find(c =>
            c.name.toLowerCase() === name.toLowerCase() ||
            c.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(c.name.toLowerCase())
          )
          return char?.id
        })
        .filter(Boolean) as string[]

      return {
        title: event.title,
        description: event.description,
        event_type: event.event_type,
        character_ids: characterIds,
        location: event.location || null,
        is_major: event.is_major || false,
        // Include source session info for tracking
        source_session_ids: sessions.map(s => s.id),
      }
    })

    return new Response(JSON.stringify({
      events: eventsWithCharacterIds,
      sessionCount: sessions.length,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('AI timeline generation error:', error)
    return new Response('AI service error', { status: 500 })
  }
}
