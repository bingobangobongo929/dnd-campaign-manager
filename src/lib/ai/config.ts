import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

export type AIProvider = 'anthropic' | 'google'

export const AI_PROVIDERS = {
  anthropic: {
    name: 'Claude (Anthropic)',
    model: 'claude-sonnet-4-5-20250929',
    description: 'Excellent at creative writing and nuanced understanding',
  },
  google: {
    name: 'Gemini (Google)',
    model: 'gemini-2-flash',
    description: 'Fast responses with good general performance',
  },
} as const

export function getAIModel(provider: AIProvider = 'anthropic') {
  if (provider === 'google') {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    })
    return google(AI_PROVIDERS.google.model)
  }

  const anthropic = createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
  return anthropic(AI_PROVIDERS.anthropic.model)
}

// System prompts for different AI features
export const AI_PROMPTS = {
  expand: `You are a creative D&D dungeon master assistant. Your task is to expand brief character notes into rich, detailed descriptions that would be useful for storytelling and roleplay.

Guidelines:
- Maintain the established facts from the original notes
- Add sensory details, personality quirks, and background elements
- Use vivid, evocative language suitable for fantasy settings
- Keep the tone appropriate for tabletop RPGs
- Include potential plot hooks or story connections where appropriate
- Format with clear paragraphs for readability`,

  summarize: `You are a helpful assistant for D&D dungeon masters. Your task is to create concise, useful summaries of session notes.

Guidelines:
- Extract the key events and decisions
- Note any important NPCs encountered
- Highlight plot developments and clues
- Include any items obtained or lost
- Keep the summary to 2-3 paragraphs
- Use bullet points for lists of items or characters`,

  assistant: `You are an AI assistant for a D&D dungeon master. You have access to information about their campaign and can help with:

- Answering questions about characters, events, and locations
- Suggesting plot hooks and story ideas
- Helping with world-building details
- Providing inspiration for encounters
- Recalling past events from session notes

Be helpful, creative, and maintain consistency with the established campaign lore. If you don't have information about something, acknowledge it and offer to help create something new.`,

  generateTimelineEvents: `You are a D&D campaign historian assistant. Your task is to extract key timeline events from session notes.

Guidelines:
- Extract distinct, significant events from the session notes
- Each event should have a clear title, description, event type, and relevant characters
- Event types: session, character_intro, combat, discovery, quest_start, quest_complete, death, romance, alliance, other
- Match character names to the provided character list when possible
- Create concise but informative descriptions
- Order events chronologically as they appear in the notes
- Focus on events that would be meaningful to track in a campaign timeline

Return your response as valid JSON with this exact structure:
{
  "events": [
    {
      "title": "Brief descriptive title",
      "description": "Detailed description of what happened",
      "event_type": "one of the valid types",
      "character_names": ["Character Name 1", "Character Name 2"]
    }
  ]
}`,
}
