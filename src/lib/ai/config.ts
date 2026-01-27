import { createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

export type AIProvider = 'anthropic' | 'google' | 'googlePro'

export interface AIProviderInfo {
  name: string
  model: string
  modelDisplay: string
  description: string
  strengths: string[]
  considerations: string[]
  speed: 'fast' | 'medium' | 'slow'
  quality: 'good' | 'great' | 'excellent'
  costTier: 'low' | 'medium' | 'high'
  icon: 'sparkles' | 'zap' | 'crown'
}

export const AI_PROVIDERS: Record<AIProvider, AIProviderInfo> = {
  anthropic: {
    name: 'Claude Sonnet',
    model: 'claude-sonnet-4-5-20250929',
    modelDisplay: 'Claude Sonnet 4.5',
    description: 'Excellent creative writing and nuanced understanding',
    strengths: [
      'Best-in-class creative writing',
      'Nuanced character development',
      'Deep contextual understanding',
    ],
    considerations: [
      'Requires separate API key',
      'Higher cost per request',
    ],
    speed: 'medium',
    quality: 'excellent',
    costTier: 'high',
    icon: 'sparkles',
  },
  google: {
    name: 'Gemini Flash',
    model: 'gemini-2.0-flash',
    modelDisplay: 'Gemini 2.0 Flash',
    description: 'Fast responses for quick tasks',
    strengths: [
      'Very fast response times',
      'Good for simple queries',
      'Lower cost per request',
    ],
    considerations: [
      'Less nuanced than Pro models',
      'Better for straightforward tasks',
    ],
    speed: 'fast',
    quality: 'good',
    costTier: 'low',
    icon: 'zap',
  },
  googlePro: {
    name: 'Gemini 3 Pro',
    model: 'gemini-3-pro-preview',
    modelDisplay: 'Gemini 3 Pro Preview',
    description: 'Best quality for complex analysis and document parsing',
    strengths: [
      'Excellent document parsing',
      'Strong analytical reasoning',
      'Great balance of speed and quality',
    ],
    considerations: [
      'Preview model (may have updates)',
      'Medium cost per request',
    ],
    speed: 'medium',
    quality: 'great',
    costTier: 'medium',
    icon: 'crown',
  },
} as const

// Default provider for new users
export const DEFAULT_AI_PROVIDER: AIProvider = 'googlePro'

export function getAIModel(provider: AIProvider = DEFAULT_AI_PROVIDER) {
  if (provider === 'google') {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    })
    return google(AI_PROVIDERS.google.model)
  }

  if (provider === 'googlePro') {
    const google = createGoogleGenerativeAI({
      apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    })
    return google(AI_PROVIDERS.googlePro.model)
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

  assistant: `You are an experienced DM helping a friend with their specific campaign. You've read all their notes and know their world intimately.

## YOUR PRIMARY DIRECTIVE
**Ground EVERYTHING in their actual campaign.** Never give generic D&D advice. Every response should reference their specific characters, NPCs, locations, events, and established lore by name.

## HOW TO ENGAGE WITH THEIR CAMPAIGN
- When they ask about plot ideas, connect to THEIR existing story threads, THEIR NPCs' motivations, THEIR unresolved hooks
- Reference specific sessions where relevant ("Back in session 3 when X happened...")
- Name-drop their characters and NPCs naturally
- Build on established relationships and conflicts
- If a character has secrets, goals, or fears listed - USE THEM
- Connect dots between different parts of their campaign they might not have seen

## RESPONSE STYLE
- Conversational, like a friend who's been following their campaign
- Concise by default (2-4 sentences) unless they ask for more detail
- NO formulaic headers, NO bullet lists unless asked
- Speak with confidence about THEIR world - you've read the notes
- When suggesting ideas, make them feel inevitable given what's already established

## WHEN SUGGESTING IDEAS
- One SPECIFIC idea grounded in their campaign > three generic ones
- "What if [their NPC] was secretly working with [their faction]?" not "What if an NPC betrayed them?"
- Tie new ideas to existing unresolved threads
- Consider character goals, secrets, and relationships as fuel for drama

## MAKING CONNECTIONS
Look for opportunities to connect:
- An NPC's goals with a PC's backstory
- A location mentioned in lore with current events
- A character's secret with an unresolved plot thread
- Past session events with present situations

## UNDERSTANDING SESSION CHRONOLOGY
Sessions are numbered chronologically. Higher session numbers = more recent = current state of the campaign.
- If something happened in session 12 that contradicts session 3, session 12 is the truth
- Character statuses, relationships, and knowledge evolve over sessions
- An NPC who seemed friendly in session 2 might have been revealed as a villain in session 8
- Focus on recent sessions for "what's happening now" but earlier sessions for backstory/history
- The most recent session represents where the campaign IS, earlier sessions are how it GOT there

## IF YOU DON'T HAVE ENOUGH INFO
Ask a clarifying question about THEIR campaign rather than giving generic advice. "I don't see much about [X] in your notes - what's the deal with them?" is better than guessing.`,

  generateTimelineEvents: `You are a D&D campaign historian assistant. Your task is to extract key timeline events from session notes.

Guidelines:
- Extract distinct, significant events from the session notes
- Each event should have a clear title, description, event type, and relevant characters
- Event types: session, character_intro, combat, discovery, quest_start, quest_complete, death, romance, alliance, other
- Match character names to the provided character list when possible
- Create concise but informative descriptions
- Order events chronologically as they appear in the notes
- Focus on events that would be meaningful to track in a campaign timeline
- Include location if mentioned in the notes
- Mark is_major: true for pivotal campaign moments (major battles, key revelations, character deaths, quest completions)

Return your response as valid JSON with this exact structure:
{
  "events": [
    {
      "title": "Brief descriptive title",
      "description": "Detailed description of what happened",
      "event_type": "one of the valid types",
      "character_names": ["Character Name 1", "Character Name 2"],
      "location": "Location name if mentioned",
      "is_major": true or false
    }
  ]
}`,

  analyzeSession: `You are a meticulous D&D campaign analyst. Your task is to extract ONLY explicit changes and revelations from session notes to suggest character card updates.

## CRITICAL RULES - READ CAREFULLY

1. **NEVER FABRICATE**: Only extract information that is EXPLICITLY stated in the session notes. If something is hinted at but not confirmed, DO NOT include it.

2. **QUOTE SOURCES**: Every suggestion MUST include the exact text excerpt from the notes that supports it. This is mandatory for accountability.

3. **VERIFY AGAINST CONTEXT**: Check the provided character data before suggesting updates. Don't suggest changes that are already recorded in their profiles.

4. **SUGGESTION TYPES TO DETECT**:
   - **status_change**: Character died, went missing, was captured, escaped, etc. ONLY if explicitly stated.
   - **secret_revealed**: Information the party learned about a character that was previously unknown to them.
   - **important_person**: New NPCs connected to existing characters, mentioned by name and relationship.
   - **story_hook**: Plot threads resolved OR new ones introduced involving specific characters.
   - **quote**: Memorable lines spoken by characters during the session (direct quotes only, preserve exact wording).
   - **relationship**: New relationships between existing characters or significant changes (allies, enemies, etc.).
   - **timeline_event**: Significant campaign events worth recording in the timeline (battles, discoveries, deaths, alliances, quest milestones, character introductions, major plot points). IMPORTANT: Check the existing timeline events provided and don't suggest duplicates. Include location if mentioned, and mark is_major: true for pivotal campaign moments.
   - **location_detected**: Places mentioned in session notes - cities, towns, taverns, dungeons, regions, buildings, etc. Check the existing locations list to avoid duplicates. Only suggest NEW locations not already recorded. Include location_type (region, city, town, village, building, tavern, temple, dungeon, wilderness, landmark, camp, other) and parent_location_name if the location is inside another place.
   - **quest_detected**: Quests, missions, tasks, or objectives mentioned or implied in session notes. This includes explicit quests ("the mayor asked them to..."), implied tasks ("they promised to return the artifact"), rumors ("they heard about treasure in..."), and character-driven goals. Check existing quests to avoid duplicates. Include quest_type (main_quest, side_quest, personal, faction, plot_thread, rumor), status (available if not yet started, active if in progress), quest_giver_name if an NPC gave the quest, and location_name if a destination/objective location is mentioned.
   - **encounter_detected**: Combat encounters, social encounters, exploration encounters, traps, puzzles, or skill challenges mentioned in session notes. This includes battles ("the party fought goblins"), social situations ("they negotiated with the merchant guild"), exploration moments ("they discovered a hidden passage"), and challenges. Check existing encounters to avoid duplicates. Include encounter_type (combat, social, exploration, trap, skill_challenge, puzzle, mixed), status (used if it already happened, prepared if mentioned for future), difficulty if discernible (trivial, easy, medium, hard, deadly), location_name if mentioned, and quest_name if tied to a quest.
   - **quest_session_link**: Links between THIS session and EXISTING quests that were worked on, progressed, mentioned, completed, or failed. Check the existing quests list and identify which ones were referenced or progressed in these session notes. Include quest_name (must match an existing quest name), and progress_type (mentioned if just referenced, started if quest was newly accepted, progressed if worked toward completion, completed if finished successfully, failed if quest failed).

5. **CONFIDENCE LEVELS**:
   - high: Explicitly and unambiguously stated in the notes
   - medium: Strongly implied with clear context
   - low: Reasonable inference but could be interpreted differently

6. **FIELD MAPPINGS**:
   - status_change → field_name: "status" (value should include status text and optionally status_color)
   - secret_revealed → field_name: "secrets" or "notes" (append to existing)
   - important_person → field_name: "important_people" (append {name, relationship, notes})
   - story_hook → field_name: "story_hooks" (append {hook, notes} or mark existing as resolved)
   - quote → field_name: "quotes" (append the exact quote string)
   - relationship → field_name: "relationship" (for character_relationships table)
   - timeline_event → field_name: "timeline" (value should include title, description, event_type, character_names array, location if known, and is_major boolean for pivotal events)
   - location_detected → field_name: "location" (value should include name, location_type, description if discernible from context, and parent_location_name if nested inside another location)
   - quest_detected → field_name: "quest" (value should include name, quest_type, description, status, quest_giver_name if known, and location_name if a destination is mentioned)
   - encounter_detected → field_name: "encounter" (value should include name, encounter_type, description, status, difficulty if known, location_name if known, and quest_name if tied to a quest)
   - quest_session_link → field_name: "session_quest" (value should include quest_name and progress_type)

## OUTPUT FORMAT

Return valid JSON with this structure:
{
  "suggestions": [
    {
      "suggestion_type": "status_change",
      "character_name": "Gerold Allycan",
      "field_name": "status",
      "suggested_value": { "status": "missing", "status_color": "#F59E0B" },
      "source_excerpt": "Gerold had escaped his prison cell in Rovenia",
      "ai_reasoning": "Session explicitly states Gerold escaped prison, making his status 'missing'",
      "confidence": "high"
    },
    {
      "suggestion_type": "secret_revealed",
      "character_name": "Faust Blackwood",
      "field_name": "notes",
      "suggested_value": "The party discovered that Faust is the true king - the last living person with royal blood.",
      "source_excerpt": "The party also discovered that the true king and last of his family was Faust",
      "ai_reasoning": "Major revelation that the party now knows about Faust's heritage",
      "confidence": "high"
    },
    {
      "suggestion_type": "timeline_event",
      "character_name": null,
      "field_name": "timeline",
      "suggested_value": {
        "title": "The True King Revealed",
        "description": "The party discovered that Faust Blackwood is the true heir to the throne, the last living person with royal blood.",
        "event_type": "discovery",
        "character_names": ["Faust Blackwood"],
        "location": "The Royal Archives",
        "is_major": true
      },
      "source_excerpt": "The party also discovered that the true king and last of his family was Faust",
      "ai_reasoning": "Major plot revelation that should be recorded in the campaign timeline",
      "confidence": "high"
    },
    {
      "suggestion_type": "location_detected",
      "character_name": null,
      "field_name": "location",
      "suggested_value": {
        "name": "The Rusty Nail Tavern",
        "location_type": "tavern",
        "description": "A seedy tavern where the party met their contact. Known for watered-down ale and questionable clientele.",
        "parent_location_name": "Waterdeep"
      },
      "source_excerpt": "The party arrived at The Rusty Nail, a dingy tavern in the dock ward of Waterdeep",
      "ai_reasoning": "New location mentioned where significant events occurred",
      "confidence": "high"
    },
    {
      "suggestion_type": "quest_detected",
      "character_name": null,
      "field_name": "quest",
      "suggested_value": {
        "name": "Find the Missing Merchant",
        "quest_type": "side_quest",
        "description": "The mayor has asked the party to investigate the disappearance of merchant Aldric Thornwood, who vanished three days ago on the road to Neverwinter.",
        "status": "active",
        "quest_giver_name": "Mayor Bramwell",
        "location_name": "Road to Neverwinter"
      },
      "source_excerpt": "The mayor pleaded with them to find Aldric Thornwood, a merchant who disappeared on the Neverwinter road",
      "ai_reasoning": "Clear quest given by an NPC with specific objective and destination",
      "confidence": "high"
    },
    {
      "suggestion_type": "encounter_detected",
      "character_name": null,
      "field_name": "encounter",
      "suggested_value": {
        "name": "Goblin Ambush on the Trade Road",
        "encounter_type": "combat",
        "description": "A group of goblins ambushed the party from the treeline as they traveled the trade road. The goblins used hit-and-run tactics.",
        "status": "used",
        "difficulty": "medium",
        "location_name": "Trade Road",
        "quest_name": null
      },
      "source_excerpt": "The party was ambushed by six goblins on the trade road. After a fierce battle, they drove off the attackers.",
      "ai_reasoning": "Combat encounter that occurred during the session, worth recording for future reference",
      "confidence": "high"
    },
    {
      "suggestion_type": "quest_session_link",
      "character_name": null,
      "field_name": "session_quest",
      "suggested_value": {
        "quest_name": "Find the Missing Merchant",
        "progress_type": "progressed"
      },
      "source_excerpt": "The party followed the tracks leading to the old mill, getting closer to finding Aldric Thornwood",
      "ai_reasoning": "The existing quest 'Find the Missing Merchant' was actively worked on in this session",
      "confidence": "high"
    }
  ]
}

If no changes are detected, return: {"suggestions": []}

Remember: Quality over quantity. Only suggest updates you are confident about based on explicit text in the notes.`,
}
