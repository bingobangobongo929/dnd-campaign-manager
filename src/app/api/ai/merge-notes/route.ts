import { streamText } from 'ai'
import { getAIModel, AIProvider } from '@/lib/ai/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

const MERGE_NOTES_PROMPT = `You are a skilled TTRPG session note editor. Your task is to merge the Dungeon Master's notes with player perspectives into a single, cohesive session recap.

Guidelines:
- Combine information from all sources without repetition
- Prioritize factual events over interpretation
- Include both objective events and subjective player reactions when interesting
- Keep the tone consistent with a campaign journal
- Preserve specific names, places, and events mentioned
- If perspectives conflict, include both with appropriate framing
- Format with clear paragraphs, not bullet points
- Keep it concise but comprehensive
- Write in past tense

Output a merged session summary that captures the full picture of what happened.`

interface PlayerNote {
  characterName: string
  content: string
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    // Tier check
    const { data: settings } = await supabase
      .from('user_settings')
      .select('tier')
      .eq('user_id', user.id)
      .single()
    if ((settings?.tier || 'free') === 'free') {
      return new Response('AI features require a paid plan', { status: 403 })
    }

    const {
      dmNotes,
      dmDetailedNotes,
      playerNotes,
      sessionTitle,
      sessionNumber,
      provider
    } = await req.json() as {
      dmNotes?: string
      dmDetailedNotes?: string
      playerNotes: PlayerNote[]
      sessionTitle?: string
      sessionNumber?: number
      provider?: AIProvider
    }

    if (!dmNotes && !dmDetailedNotes && (!playerNotes || playerNotes.length === 0)) {
      return new Response('At least some notes are required', { status: 400 })
    }

    // Build the prompt
    let prompt = ''

    if (sessionNumber || sessionTitle) {
      prompt += `Session ${sessionNumber || ''}${sessionTitle ? `: ${sessionTitle}` : ''}\n\n`
    }

    if (dmDetailedNotes) {
      prompt += `## DM's Session Notes\n${dmDetailedNotes}\n\n`
    }

    if (dmNotes) {
      prompt += `## DM's Summary\n${dmNotes}\n\n`
    }

    if (playerNotes && playerNotes.length > 0) {
      prompt += `## Player Perspectives\n\n`
      for (const note of playerNotes) {
        prompt += `### ${note.characterName}'s Perspective\n${note.content}\n\n`
      }
    }

    prompt += `\nPlease merge these notes into a single cohesive session recap:`

    const model = getAIModel(provider || 'anthropic')

    const result = await streamText({
      model,
      system: MERGE_NOTES_PROMPT,
      prompt,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('AI merge notes error:', error)
    return new Response('AI service error', { status: 500 })
  }
}
