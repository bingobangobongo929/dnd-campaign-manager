# Multiloop Import System - Complete Plan

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Content Type Analysis](#content-type-analysis)
3. [Field Inventory](#field-inventory)
4. [Source Platform Analysis](#source-platform-analysis)
5. [Field Mapping Matrix](#field-mapping-matrix)
6. [Data Handling Strategies](#data-handling-strategies)
7. [User Flow Design](#user-flow-design)
8. [Technical Architecture](#technical-architecture)
9. [Edge Cases & Error Handling](#edge-cases--error-handling)
10. [Implementation Phases](#implementation-phases)

---

## Executive Summary

### What We're Building

A unified import system that allows users to bring their TTRPG narrative content into Multiloop from:
- **Documents**: PDFs, DOCX files (AI-parsed)
- **Obsidian**: Markdown vaults with YAML frontmatter
- **World Anvil**: World-building platform (API/export)
- **Kanka**: Campaign management platform (API/export)

### Three Separate Import Destinations

| Destination | What It Is | Entry Point |
|-------------|------------|-------------|
| **Character Vault** | Personal character sheets with backstories, NPCs, journals | `/vault/import` (existing) |
| **Campaigns** | DM-focused world management with characters, sessions, timeline, lore | `/campaigns/import` (new) |
| **Oneshots** | Standalone adventure modules with plans, NPCs, encounters | `/oneshots/import` (new) |

### Key Principle

**Never lose user data.** Every piece of information from the source must go somewhere. If we don't have an exact field match, we:
1. Map to the closest equivalent field
2. Append to a notes/catch-all field
3. Store in metadata for reference

---

## Content Type Analysis

### 1. Character Vault (`vault_characters`)

**Purpose**: Store personal characters with rich narrative detail for sharing and presentation.

**Primary Tables**:
- `vault_characters` - Core character data
- `vault_character_relationships` - NPCs, companions, party members
- `vault_character_images` - Gallery images
- `play_journal` - Session notes from character's perspective
- `vault_character_writings` - Letters, stories, poems
- `character_links` - External URLs
- `character_learned_facts` - What character knows about others
- `character_mood_board` - Visual inspiration

**Who Creates This**: Players creating their own characters for campaigns they play in.

**What Makes It Unique**:
- Player-perspective session journals
- Rich personality/appearance fields
- DM Q&A, rumors about the character
- Companion/familiar tracking
- Links to external character sheets (D&D Beyond, etc.)

---

### 2. Campaigns (`campaigns`)

**Purpose**: DM tool for managing ongoing campaign worlds with characters, sessions, and lore.

**Primary Tables**:
- `campaigns` - Campaign metadata
- `characters` - NPCs and PCs in the campaign
- `sessions` - Session logs (from DM perspective)
- `timeline_events` - Campaign timeline
- `campaign_lore` - Factions, locations, artifacts, prophecies
- `world_maps` - Map images
- `media_gallery` - Campaign images
- `tags` - Organization tags
- `character_tags` - Character-to-tag relationships
- `canvas_groups` - Visual organization on canvas
- `character_relationships` - NPC-to-NPC relationships

**Who Creates This**: DMs managing their campaign worlds.

**What Makes It Unique**:
- DM-perspective session notes
- Timeline with event types (plot, death, revelation, etc.)
- Lore system (factions, family trees, artifacts)
- Visual canvas for character organization
- Character relationships between NPCs

---

### 3. Oneshots (`oneshots`)

**Purpose**: Standalone adventure modules for running single sessions.

**Primary Tables**:
- `oneshots` - Adventure metadata and content
- `oneshot_genre_tags` - Genre categorization
- `oneshot_runs` - Tracking when/how it was run

**Who Creates This**: DMs preparing one-shot adventures.

**What Makes It Unique**:
- Session plan with structure for running
- Twists and reveals
- Character creation guidelines for players
- Handout information
- Run tracking (who played, when, rating)
- Encounter presets for combat

---

## Field Inventory

### Character Vault - Complete Field List

```
vault_characters
├── IDENTITY
│   ├── name: string (REQUIRED)
│   ├── type: 'pc' | 'npc' (default: 'pc')
│   ├── race: string | null
│   ├── class: string | null
│   ├── subclass: string | null
│   ├── level: number | null
│   ├── background: string | null
│   ├── alignment: string | null
│   └── deity: string | null
│
├── DEMOGRAPHICS
│   ├── age: string | null
│   └── pronouns: string | null
│
├── PHYSICAL APPEARANCE
│   ├── appearance: string | null (general description)
│   ├── height: string | null
│   ├── weight: string | null
│   ├── hair: string | null
│   ├── eyes: string | null
│   ├── skin: string | null
│   ├── voice: string | null
│   ├── distinguishing_marks: string | null
│   └── typical_attire: string | null
│
├── CREATIVE REFERENCES
│   ├── faceclaim: string | null
│   └── voice_claim: string | null
│
├── PERSONALITY
│   ├── personality: string | null
│   ├── ideals: string | null
│   ├── bonds: string | null
│   ├── flaws: string | null
│   ├── mannerisms: string | null
│   ├── speech_patterns: string | null
│   └── motivations: string | null
│
├── NARRATIVE
│   ├── backstory: string | null (long prose)
│   ├── backstory_phases: Json[] | null [{title, content}]
│   ├── description: string | null
│   ├── summary: string | null
│   ├── notes: string | null
│   ├── goals: string | null
│   └── secrets: string | null
│
├── ARRAYS
│   ├── quotes: string[] | null
│   ├── common_phrases: string[] | null
│   ├── weaknesses: string[] | null
│   ├── fears: string[] | null
│   ├── plot_hooks: string[] | null
│   ├── tldr: string[] | null
│   ├── open_questions: string[] | null
│   ├── character_tags: string[] | null
│   ├── languages: string[] | null
│   ├── saving_throws: string[] | null
│   ├── resistances: string[] | null
│   ├── immunities: string[] | null
│   ├── vulnerabilities: string[] | null
│   ├── aesthetic_tags: string[] | null
│   ├── color_palette: string[] | null
│   └── gameplay_tips: string[] | null
│
├── MEDIA LINKS
│   ├── theme_music_url: string | null
│   ├── theme_music_title: string | null
│   ├── character_sheet_url: string | null
│   ├── spotify_playlist: string | null
│   └── pinterest_board: string | null
│
├── CAMPAIGN CONTEXT
│   ├── game_system: string | null
│   ├── external_campaign: string | null
│   ├── linked_campaign_id: string | null
│   ├── party_name: string | null
│   ├── party_role: string | null
│   ├── player_name: string | null
│   ├── dm_name: string | null
│   ├── campaign_started: string | null
│   ├── joined_session: number | null
│   └── retired_session: number | null
│
├── JSONB FIELDS
│   ├── backstory_phases: Json | null
│   ├── story_arcs: Json | null
│   ├── factions: Json | null
│   ├── companions: Json | null
│   ├── possessions: Json | null
│   ├── art_references: Json | null
│   ├── important_people: Json | null (legacy)
│   ├── session_journal: Json | null (legacy)
│   ├── signature_items: Json | null
│   ├── family: Json | null
│   ├── rumors: Json | null [{statement, is_true}]
│   ├── dm_qa: Json | null [{question, answer}]
│   ├── player_preferences: Json | null
│   ├── party_relations: Json | null
│   └── combat_stats: Json | null
│
├── GAME MECHANICS
│   ├── ability_scores: Json | null
│   ├── hit_points: Json | null
│   ├── armor_class: number | null
│   ├── speed: string | null
│   └── proficiencies: Json | null
│
├── PLAYER INFO
│   ├── player_discord: string | null
│   ├── player_timezone: string | null
│   └── player_experience: string | null
│
├── NPC-SPECIFIC
│   ├── npc_role: string | null
│   ├── first_appearance: string | null
│   ├── location: string | null
│   ├── disposition: string | null
│   └── occupation: string | null
│
├── ORGANIZATION
│   ├── folder: string | null
│   ├── is_archived: boolean
│   ├── is_favorite: boolean
│   └── display_order: number
│
├── TRACKING
│   ├── gold: number | null
│   ├── source_file: string | null
│   ├── imported_at: string | null
│   └── raw_document_text: string | null
│
└── SYSTEM (auto-managed)
    ├── id: string
    ├── user_id: string
    ├── created_at: string
    ├── updated_at: string
    └── [template fields omitted]
```

**Related Tables**:

```
vault_character_relationships
├── related_name: string (NPC name)
├── related_character_id: string | null (links to another vault char)
├── related_image_url: string | null
├── relationship_type: string (family, mentor, friend, etc.)
├── relationship_label: string | null (Father, Criminal Contact, etc.)
├── description: string | null
├── from_perspective: string | null
├── to_perspective: string | null
├── relationship_status: string | null (active, deceased, etc.)
├── is_known: boolean
├── is_mutual: boolean
├── first_met: string | null
├── display_order: number
├── nickname: string | null
├── faction_affiliations: string[] | null
├── location: string | null
├── needs: string | null
├── can_provide: string | null
├── goals: string | null
├── secrets: string | null
├── personality_traits: string[] | null
├── full_notes: string | null
├── occupation: string | null
├── origin: string | null
├── is_companion: boolean
├── companion_type: string | null
├── companion_species: string | null
├── companion_abilities: string | null
└── is_party_member: boolean

play_journal
├── session_number: number | null
├── session_date: string | null
├── title: string | null
├── notes: string (REQUIRED)
├── campaign_name: string | null
├── summary: string | null
├── kill_count: number | null
├── loot: string | null
├── thoughts_for_next: string | null
├── npcs_met: string[] | null
└── locations_visited: string[] | null

vault_character_writings
├── title: string
├── writing_type: string
├── content: string
├── recipient: string | null
└── in_universe_date: string | null
```

---

### Campaigns - Complete Field List

```
campaigns
├── name: string (REQUIRED)
├── game_system: string (default: 'D&D 5e')
├── description: string | null
├── image_url: string | null
├── status: 'active' | 'completed' | 'hiatus' | 'archived'
└── [template fields omitted]

characters (campaign characters)
├── name: string (REQUIRED)
├── campaign_id: string (REQUIRED)
├── type: 'pc' | 'npc'
├── description: string | null
├── summary: string | null
├── notes: string | null
├── image_url: string | null
├── status: string | null
├── status_color: string | null
├── race: string | null
├── class: string | null
├── age: number | null (note: number not string!)
├── background: string | null
├── appearance: string | null
├── personality: string | null
├── goals: string | null
├── secrets: string | null
├── role: string | null (NPC role)
├── important_people: Json | null
├── story_hooks: Json | null
├── quotes: Json | null
├── position_x: number (canvas)
├── position_y: number (canvas)
└── canvas_width/height: number | null

sessions
├── campaign_id: string (REQUIRED)
├── session_number: number (REQUIRED)
├── title: string | null
├── date: string
├── notes: string | null
└── summary: string | null

timeline_events
├── campaign_id: string (REQUIRED)
├── session_id: string | null
├── event_type: enum (plot, character_intro, character_death, location,
│               combat, revelation, quest_start, quest_end, session,
│               discovery, quest_complete, death, romance, alliance, other)
├── title: string (REQUIRED)
├── description: string | null
├── event_date: string
├── character_id: string | null
├── character_ids: string[] | null
├── location: string | null
├── is_major: boolean
└── event_order: number

campaign_lore
├── campaign_id: string (REQUIRED)
├── lore_type: 'family_tree' | 'faction' | 'timeline' | 'location' | 'artifact' | 'prophecy'
├── title: string (REQUIRED)
├── content: Json (REQUIRED - structure varies by type)
└── ai_generated: boolean

character_relationships (between campaign characters)
├── campaign_id: string (REQUIRED)
├── character_id: string (REQUIRED)
├── related_character_id: string (REQUIRED)
├── relationship_type: string
├── relationship_label: string | null
├── is_known_to_party: boolean
└── notes: string | null
```

---

### Oneshots - Complete Field List

```
oneshots
├── title: string (REQUIRED)
├── tagline: string | null (short hook)
├── image_url: string | null
├── genre_tag_ids: string[] | null
├── game_system: string (default: 'D&D 5e')
├── level: number | null (recommended player level)
├── player_count_min: number (default: 3)
├── player_count_max: number (default: 6)
├── estimated_duration: string | null (e.g., '3-4 hours')
├── introduction: string | null (read-aloud intro)
├── setting_notes: string | null (world/location context)
├── character_creation: string | null (guidelines for players)
├── session_plan: string | null (DM's session structure)
├── twists: string | null (plot twists/reveals)
├── key_npcs: string | null (important NPCs)
├── handouts: string | null (handout descriptions)
├── status: string (default: 'draft')
├── encounter_presets: Json (combat encounters)
└── [template fields omitted]

oneshot_runs
├── oneshot_id: string (REQUIRED)
├── run_date: string
├── group_name: string | null
├── player_count: number | null
├── notes: string | null
└── rating: number | null
```

---

## Source Platform Analysis

### Source 1: PDF Documents

**What PDFs Typically Contain**:

For **Character Documents**:
- Character name, race, class, level
- Backstory prose
- Personality traits
- NPCs mentioned in backstory
- Session notes
- Letters, journal entries
- Quotes

For **Campaign Documents** (setting guides, homebrew worlds):
- World name and description
- Factions and organizations
- Locations with descriptions
- History/timeline
- Key NPCs
- Pantheons, religions
- Maps (as images)

For **Oneshot Modules**:
- Adventure title and hook
- Level recommendation
- Estimated duration
- Scene-by-scene breakdown
- NPC stat blocks (we ignore mechanical stats)
- NPC descriptions and motivations
- Encounter descriptions
- Handout text
- Twist/reveal notes

**What PDFs DON'T Have** (need defaults/inference):
- Structured field separation
- Database IDs
- User preferences
- Canvas positions
- Template/sharing settings

**Technical Approach**:
- Use Gemini AI to parse unstructured text
- Different prompts for character vs campaign vs oneshot
- AI infers field mappings from context

---

### Source 2: Obsidian Vaults

**Typical Obsidian TTRPG Structure**:

```
My Campaign/
├── _templates/
│   ├── NPC Template.md
│   └── Session Template.md
├── Characters/
│   ├── PCs/
│   │   └── Kira Shadowmend.md
│   └── NPCs/
│       └── Lord Blackwood.md
├── Sessions/
│   ├── Session 01.md
│   └── Session 02.md
├── Locations/
│   ├── Waterdeep.md
│   └── The Rusty Anchor Tavern.md
├── Factions/
│   └── Zhentarim.md
├── Lore/
│   └── The Sundering.md
└── README.md (campaign overview)
```

**Common YAML Frontmatter Fields**:

```yaml
# Character
---
name: "Kira Shadowmend"
aliases: ["The Shadow", "K"]
race: "Half-Elf"
class: "Rogue"
subclass: "Arcane Trickster"
level: 7
background: "Criminal"
alignment: "Chaotic Neutral"
status: "Active"
player: "Alex"
pronouns: "she/her"
age: 28
location: "Waterdeep"
faction: "Harpers"
tags: [pc, party-member, rogue]
---

# NPC
---
name: "Lord Blackwood"
type: "npc"
occupation: "Noble"
location: "Blackwood Manor"
faction: "Waterdeep Nobility"
attitude: "Hostile"
first_appeared: "Session 3"
status: "Alive"
tags: [npc, antagonist, noble]
---

# Session
---
session: 5
date: 2024-01-15
players: ["Alex", "Jordan", "Sam"]
location: "Waterdeep"
summary: "The party investigated the warehouse"
tags: [session]
---

# Location
---
name: "The Rusty Anchor Tavern"
type: "location"
region: "Dock Ward"
owner: "Marta Greenleaf"
tags: [location, tavern, dock-ward]
---

# Faction
---
name: "Zhentarim"
type: "faction"
alignment: "Lawful Evil"
leader: "The Pereghost"
headquarters: "Darkhold"
tags: [faction, criminal]
---
```

**What Obsidian Has That We Need to Map**:
- Frontmatter metadata → Specific fields
- Wikilinks `[[Character Name]]` → Relationships
- Tags → Our tag system
- Folder structure → Organization hints
- Markdown content → Long text fields

**What Obsidian DOESN'T Have**:
- Rigid schema (everyone organizes differently)
- Explicit relationship types
- Timeline event types
- Lore type categorization

**Technical Approach**:
- Parse YAML frontmatter for structured data
- Parse markdown body for prose content
- Infer relationships from wikilinks
- Map folders to content types
- Use configurable field mapping

---

### Source 3: World Anvil

**World Anvil Article Types**:

| WA Type | Multiloop Equivalent |
|---------|---------------------|
| Character | Campaign character OR Vault character |
| Location | Campaign lore (location) |
| Organization | Campaign lore (faction) |
| Species | Campaign lore (other) |
| Item | Campaign lore (artifact) |
| Myth/Legend | Campaign lore (prophecy) |
| Timeline | Timeline events |
| Map | World map |
| Condition | Campaign lore (other) |
| Document | Session notes OR campaign lore |
| Plot | Timeline events OR session plan |

**World Anvil API Data Structure** (from Boromir v2):

```json
// Character Article
{
  "id": "abc123",
  "title": "Lord Blackwood",
  "content": "<p>HTML content...</p>",
  "excerpt": "Short description",
  "state": "public|private",
  "species": {"title": "Human"},
  "pronouns": "he/him",
  "age": "45",
  "conditions": [...],
  "goals": "string",
  "fears": "string",
  "secrets": "string",
  "relations": [
    {"character_id": "xyz", "type": "parent"}
  ],
  "portrait": {"url": "..."},
  "world": {"id": "world123", "title": "Forgotten Realms"}
}

// Location Article
{
  "id": "loc456",
  "title": "Waterdeep",
  "content": "<p>HTML content...</p>",
  "type": "City",
  "parent_location": {"id": "...", "title": "Sword Coast"},
  "founding_date": "...",
  "demonym": "Waterdhavian",
  "population": 1000000,
  "maps": [{"url": "..."}]
}

// Organization Article
{
  "id": "org789",
  "title": "Zhentarim",
  "content": "<p>HTML content...</p>",
  "type": "Criminal Organization",
  "leader": {"title": "The Pereghost"},
  "goals": "string",
  "headquarters": {...}
}

// Timeline
{
  "id": "tl123",
  "title": "Fall of Netheril",
  "content": "<p>HTML content...</p>",
  "date": "-339 DR",
  "era": "Age of Humanity"
}
```

**What World Anvil Has That We Map**:
- Rich HTML content → Strip to markdown
- Structured relations → Character relationships
- Article types → Lore types
- Timelines → Timeline events
- Images/portraits → Image URLs

**What World Anvil DOESN'T Have**:
- Session-based organization
- DM/player perspective distinction
- Oneshot structure
- Play journal concept

---

### Source 4: Kanka

**Kanka Entity Types**:

| Kanka Type | Multiloop Equivalent |
|------------|---------------------|
| Character | Campaign character OR Vault character |
| Location | Campaign lore (location) |
| Organisation | Campaign lore (faction) |
| Family | Campaign lore (family_tree) |
| Item | Campaign lore (artifact) |
| Journal | Session notes |
| Quest | Plot hooks / Session plan |
| Timeline | Timeline events |
| Note | Campaign lore OR notes field |
| Map | World map |
| Event | Timeline events |
| Calendar | (calendar info, can append to campaign description) |

**Kanka API Data Structure**:

```json
// Character Entity
{
  "id": 123,
  "name": "Lord Blackwood",
  "entry": "<p>HTML description</p>",
  "entry_parsed": "Plain text version",
  "type": "NPC",
  "title": "Duke of Waterdeep",
  "age": "45",
  "sex": "Male",
  "pronouns": "he/him",
  "is_dead": false,
  "traits": {
    "appearance": "Tall and imposing...",
    "personality": "Cunning and ruthless...",
    "goals": "Expand his power...",
    "fears": "Losing his wealth...",
    "mannerisms": "Taps fingers when thinking..."
  },
  "image": {"url": "..."},
  "location_id": 456,
  "family_ids": [789],
  "organisation_ids": [101112]
}

// Location Entity
{
  "id": 456,
  "name": "Waterdeep",
  "entry": "<p>HTML description</p>",
  "type": "City",
  "parent_location_id": 789,
  "map": {"url": "..."}
}

// Journal Entity
{
  "id": 999,
  "name": "Session 5: The Warehouse",
  "entry": "<p>Session notes...</p>",
  "date": "2024-01-15",
  "type": "Session",
  "character_id": 123,
  "location_id": 456
}

// Quest Entity
{
  "id": 1001,
  "name": "Find the Missing Artifact",
  "entry": "<p>Quest description...</p>",
  "type": "Main Quest",
  "is_completed": false,
  "character_id": 123,
  "instigator_id": 456
}

// Relations
{
  "owner_id": 123,
  "target_id": 456,
  "relation": "Father",
  "attitude": "Hostile",
  "two_way": true,
  "colour": "#ff0000"
}
```

**What Kanka Has That We Map**:
- Rich entity relationships → Character relationships
- Journals → Sessions
- Quests → Plot hooks or session plans
- Nested locations → Location lore
- Family entities → Family tree lore

**What Kanka DOESN'T Have**:
- Oneshot-specific structure
- Vault character complexity (no backstory phases, play journals)
- Timeline event types
- Detailed personality fields (ideals, bonds, flaws)

---

## Field Mapping Matrix

### Character Vault Field Mapping

| Multiloop Field | PDF (AI Inferred) | Obsidian | World Anvil | Kanka |
|-----------------|-------------------|----------|-------------|-------|
| **name** | ✅ Extract | frontmatter.name | article.title | entity.name |
| **type** | ✅ Infer (pc/npc) | frontmatter.type | article.template | entity.type |
| **race** | ✅ Extract | frontmatter.race | article.species.title | (from entry) |
| **class** | ✅ Extract | frontmatter.class | (from content) | (from entry) |
| **subclass** | ✅ Extract | frontmatter.subclass | (from content) | (from entry) |
| **level** | ✅ Extract | frontmatter.level | (from content) | (from entry) |
| **background** | ✅ Extract | frontmatter.background | (from content) | (from entry) |
| **alignment** | ✅ Extract | frontmatter.alignment | (from content) | (from entry) |
| **age** | ✅ Extract | frontmatter.age | article.age | entity.age |
| **pronouns** | ✅ Extract | frontmatter.pronouns | article.pronouns | entity.pronouns |
| **appearance** | ✅ Extract | body section | (from content) | traits.appearance |
| **personality** | ✅ Extract | body section | (from content) | traits.personality |
| **ideals** | ✅ Extract | frontmatter/body | (from content) | ❌ → notes |
| **bonds** | ✅ Extract | frontmatter/body | (from content) | ❌ → notes |
| **flaws** | ✅ Extract | frontmatter/body | (from content) | ❌ → notes |
| **goals** | ✅ Extract | frontmatter.goals | article.goals | traits.goals |
| **secrets** | ✅ Extract | frontmatter.secrets | article.secrets | ❌ → notes |
| **fears** | ✅ Extract | frontmatter.fears | article.fears | traits.fears |
| **backstory** | ✅ Extract prose | body content | article.content | entity.entry |
| **backstory_phases** | ✅ Extract sections | headings + content | ❌ → single backstory | ❌ → single backstory |
| **quotes** | ✅ Extract | frontmatter/body | (from content) | ❌ → notes |
| **plot_hooks** | ✅ Extract | frontmatter.hooks | (from content) | ❌ → notes |
| **tldr** | ✅ Extract | frontmatter.tldr | article.excerpt | ❌ → summary |

**Legend**:
- ✅ = Direct mapping available
- (from content) = Parse from HTML/markdown body
- ❌ → field = No equivalent, store in alternate field

---

### Campaign Field Mapping

| Multiloop Field | PDF (AI) | Obsidian | World Anvil | Kanka |
|-----------------|----------|----------|-------------|-------|
| **campaigns.name** | ✅ Extract | folder name OR README title | world.title | campaign.name |
| **campaigns.description** | ✅ Extract | README content | world.content | campaign.entry |
| **campaigns.game_system** | ✅ Infer | frontmatter.system | (from content) | (from entry) |
| **characters.name** | ✅ Extract | file name / frontmatter | article.title | entity.name |
| **characters.type** | ✅ Infer | frontmatter.type | template type | entity.type |
| **characters.description** | ✅ Extract | body content | article.content | entity.entry |
| **characters.role** | ✅ Extract | frontmatter.role | (from content) | entity.title |
| **sessions.session_number** | ✅ Extract | frontmatter.session | (parse from title) | (parse from name) |
| **sessions.title** | ✅ Extract | frontmatter.title | article.title | entity.name |
| **sessions.notes** | ✅ Extract | body content | article.content | entity.entry |
| **sessions.date** | ✅ Extract | frontmatter.date | (from content) | entity.date |
| **timeline_events.title** | ✅ Extract | frontmatter.title | timeline.title | event.name |
| **timeline_events.description** | ✅ Extract | body content | timeline.content | event.entry |
| **timeline_events.event_type** | ✅ Infer | frontmatter.type | (infer from content) | (infer) |
| **timeline_events.event_date** | ✅ Extract | frontmatter.date | timeline.date | event.date |
| **campaign_lore.title** | ✅ Extract | file name | article.title | entity.name |
| **campaign_lore.lore_type** | ✅ Infer | folder/frontmatter | article.template | entity.type |
| **campaign_lore.content** | ✅ Extract | body content | article.content | entity.entry |

---

### Oneshot Field Mapping

| Multiloop Field | PDF (AI) | Obsidian | World Anvil | Kanka |
|-----------------|----------|----------|-------------|-------|
| **title** | ✅ Extract | frontmatter.title | article.title | entity.name |
| **tagline** | ✅ Extract/Generate | frontmatter.tagline | article.excerpt | ❌ → AI generate |
| **game_system** | ✅ Infer | frontmatter.system | (from content) | (from entry) |
| **level** | ✅ Extract | frontmatter.level | (from content) | (from entry) |
| **player_count_min/max** | ✅ Extract | frontmatter.players | (from content) | (from entry) |
| **estimated_duration** | ✅ Extract | frontmatter.duration | (from content) | ❌ → default |
| **introduction** | ✅ Extract | ## Introduction | (from content) | entity.entry |
| **setting_notes** | ✅ Extract | ## Setting | (from content) | (from entry) |
| **session_plan** | ✅ Extract | ## Session Plan | (from content) | quest.entry |
| **twists** | ✅ Extract | ## Twists | (from content) | ❌ → notes |
| **key_npcs** | ✅ Extract | ## NPCs | (from content) | (linked chars) |
| **handouts** | ✅ Extract | ## Handouts | (from content) | ❌ → notes |
| **character_creation** | ✅ Extract | ## Character Creation | (from content) | ❌ → notes |

---

## Data Handling Strategies

### Strategy 1: Missing Required Fields

| Field | Required? | If Missing... |
|-------|-----------|---------------|
| vault_characters.name | YES | ❌ FAIL - must have name |
| vault_characters.type | Default | Use 'pc' |
| campaigns.name | YES | ❌ FAIL - must have name |
| campaigns.game_system | Default | Use 'D&D 5e' |
| oneshots.title | YES | ❌ FAIL - must have title |
| sessions.session_number | YES | Auto-increment from highest |
| timeline_events.title | YES | Generate from description |

### Strategy 2: Type Coercion

| Field | Expected Type | Coercion Rules |
|-------|---------------|----------------|
| level | number | Parse "Level 5" → 5, "Fifth level" → 5 |
| age | string (vault) / number (campaign) | Keep as string for vault, parse for campaign |
| player_count | number | Parse "3-6 players" → min: 3, max: 6 |
| event_date | string | Accept any date format, normalize to ISO |
| is_major | boolean | Infer from keywords: "major", "significant", "turning point" |

### Strategy 3: Content Transformation

| From | To | Transformation |
|------|-----|----------------|
| HTML content | Markdown | Strip tags, preserve structure |
| Wikilinks `[[Name]]` | Plain text | Extract name, optionally create relationship |
| Multiple paragraphs | Single field | Join with `\n\n` |
| Bullet lists | Array | Split by bullet points |
| Nested structure | Flat fields | Flatten with prefixes or into notes |

### Strategy 4: Overflow Handling

When source has data we don't have a field for:

| Source Data | Multiloop Destination |
|-------------|----------------------|
| Extra character fields | Append to `notes` field |
| Unknown relationship types | Use `other` type, preserve original in `relationship_label` |
| Unmatched lore types | Use `location` or create as campaign description |
| Complex nested data | Serialize to JSON in notes |
| Platform-specific metadata | Ignore (API IDs, timestamps, etc.) |

### Strategy 5: Relationship Inference

From wikilinks and mentions:
```
"Her father [[Egon]] taught her magic"
→ Create relationship: type=family, label=Father, name=Egon
```

From explicit relationship data:
```
World Anvil relation: {character: "Egon", type: "parent"}
→ relationship_type=family, relationship_label=Father
```

### Strategy 6: Default Values

| Field | Default Value |
|-------|---------------|
| type | 'pc' for vault, infer for campaign |
| game_system | 'D&D 5e' |
| status | 'Concept' for vault, 'active' for campaign |
| status_color | '#8B5CF6' (purple) |
| is_major | false (timeline events) |
| player_count_min | 3 |
| player_count_max | 6 |

---

## User Flow Design

### Entry Points

```
/vault/import         → Import character to vault (existing)
/campaigns/import     → Import world/campaign (NEW)
/oneshots/import      → Import adventure module (NEW)
```

### Universal Import Wizard Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Choose Source                                          │
│                                                                 │
│  How would you like to import?                                  │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ 📄 Document │  │ 📝 Obsidian │  │ 🌍 World    │             │
│  │             │  │    Vault    │  │   Anvil     │             │
│  │ Upload PDF  │  │ Upload .zip │  │ Connect     │             │
│  │ or DOCX     │  │ or .md      │  │ Account     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  ┌─────────────┐                                                │
│  │ 🗂️ Kanka    │                                                │
│  │             │                                                │
│  │ Connect     │                                                │
│  │ Account     │                                                │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Upload / Connect                                       │
│                                                                 │
│  [Varies by source - see below]                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Content Selection (for multi-item sources)            │
│                                                                 │
│  Select what to import:                                         │
│                                                                 │
│  ☑ Characters (12)                                             │
│  │  ├── ☑ Lord Blackwood (NPC)                                 │
│  │  ├── ☑ Kira Shadowmend (PC)                                 │
│  │  └── ... more                                               │
│  │                                                              │
│  ☑ Locations (8)                                               │
│  │  └── ☑ Waterdeep, ☑ Baldur's Gate, ...                     │
│  │                                                              │
│  ☑ Sessions (5)                                                │
│  └── ☑ Factions (3)                                            │
│                                                                 │
│  [Select All] [Deselect All]                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Preview & Mapping                                      │
│                                                                 │
│  Review how your content will be imported:                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Campaign: "Sword Coast Adventures"                       │   │
│  │ System: D&D 5e                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Characters (12)                                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Name           │ Type │ Source Field │ Multiloop Field  │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │ Lord Blackwood │ NPC  │ Character    │ Campaign Char    │  │
│  │ Kira           │ PC   │ Character    │ Campaign Char    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ⚠️ Some fields couldn't be mapped:                            │
│  - "custom_field_xyz" → Will be added to notes                 │
│                                                                 │
│  [Back] [Edit Mappings] [Continue]                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: Confirm Import                                         │
│                                                                 │
│  Ready to import!                                               │
│                                                                 │
│  Creating:                                                      │
│  • 1 Campaign: "Sword Coast Adventures"                         │
│  • 12 Characters (3 PCs, 9 NPCs)                               │
│  • 8 Location lore entries                                      │
│  • 5 Sessions                                                   │
│  • 3 Faction lore entries                                       │
│  • 24 Timeline events                                           │
│                                                                 │
│  ⓘ You can edit everything after import                        │
│                                                                 │
│  [Cancel] [Import]                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  STEP 6: Import Progress                                        │
│                                                                 │
│  Importing your content...                                      │
│                                                                 │
│  ████████████████░░░░░░░░░░░░ 65%                               │
│                                                                 │
│  ✓ Campaign created                                             │
│  ✓ Characters imported (12/12)                                  │
│  ⏳ Locations importing (5/8)                                   │
│  ○ Sessions                                                     │
│  ○ Factions                                                     │
│  ○ Timeline events                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  STEP 7: Success                                                │
│                                                                 │
│  ✓ Import Complete!                                             │
│                                                                 │
│  "Sword Coast Adventures" has been created with:                │
│  • 12 Characters                                                │
│  • 8 Locations                                                  │
│  • 5 Sessions                                                   │
│  • 3 Factions                                                   │
│  • 24 Timeline events                                           │
│                                                                 │
│  ⚠️ 2 items need attention:                                     │
│  • "Unknown Faction" - No description, consider adding one      │
│  • Session 3 - Date couldn't be parsed                          │
│                                                                 │
│  [View Campaign] [Import Another]                               │
└─────────────────────────────────────────────────────────────────┘
```

---

### Source-Specific Step 2 Flows

#### Document Upload (PDF/DOCX)

```
┌─────────────────────────────────────────────────────────────────┐
│  Upload Document                                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │            📄 Drop your file here                       │   │
│  │               or click to browse                        │   │
│  │                                                         │   │
│  │            Supported: .pdf, .docx                       │   │
│  │            Max size: 50MB                               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ℹ️ Our AI will analyze your document and extract:             │
│     • Campaign/world information                                │
│     • Characters and NPCs                                       │
│     • Locations and lore                                        │
│     • Sessions and timeline                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

[After upload, show parsing progress]

┌─────────────────────────────────────────────────────────────────┐
│  Analyzing Document...                                          │
│                                                                 │
│  📄 sword_coast_guide.pdf                                       │
│                                                                 │
│  ⏳ Reading document...                                         │
│  ⏳ Extracting structure...                                     │
│  ⏳ Identifying characters...                                   │
│  ⏳ Finding locations...                                        │
│                                                                 │
│  This may take 1-2 minutes for large documents.                │
└─────────────────────────────────────────────────────────────────┘
```

#### Obsidian Vault Upload

```
┌─────────────────────────────────────────────────────────────────┐
│  Import from Obsidian                                           │
│                                                                 │
│  Upload your vault:                                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │            📁 Drop your vault folder (.zip)             │   │
│  │               or individual .md files                   │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ℹ️ We'll look for:                                            │
│     • YAML frontmatter for structured data                      │
│     • Folder structure to organize content                      │
│     • [[Wikilinks]] to create relationships                     │
│                                                                 │
│  💡 Tip: Export your vault as a .zip from your file manager    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### World Anvil Connect

```
┌─────────────────────────────────────────────────────────────────┐
│  Connect World Anvil                                            │
│                                                                 │
│  Step 1: Get your API token                                     │
│                                                                 │
│  1. Go to World Anvil → Account → API Access                   │
│  2. Create a new token with read permissions                    │
│  3. Copy and paste it below                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ API Token: ••••••••••••••••••••••••••••••••             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Connect to World Anvil]                                       │
│                                                                 │
│  🔒 Your token is encrypted and only used to read your data.   │
│     We never store your World Anvil password.                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

[After connection]

┌─────────────────────────────────────────────────────────────────┐
│  Select World to Import                                         │
│                                                                 │
│  ✓ Connected as: username@email.com                            │
│                                                                 │
│  Your worlds:                                                   │
│                                                                 │
│  ○ Forgotten Realms Campaign                                   │
│    23 characters · 15 locations · 8 organizations              │
│                                                                 │
│  ○ Homebrew World: Aethoria                                    │
│    45 characters · 32 locations · 12 organizations             │
│                                                                 │
│  ○ One-Shot Collection                                          │
│    5 adventures                                                 │
│                                                                 │
│  [Continue with Selected]                                       │
└─────────────────────────────────────────────────────────────────┘
```

#### Kanka Connect

```
┌─────────────────────────────────────────────────────────────────┐
│  Connect Kanka                                                  │
│                                                                 │
│  Step 1: Get your API token                                     │
│                                                                 │
│  1. Go to Kanka → Settings → API                               │
│  2. Create a new personal access token                          │
│  3. Copy and paste it below                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ API Token: ••••••••••••••••••••••••••••••••             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Connect to Kanka]                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

[After connection]

┌─────────────────────────────────────────────────────────────────┐
│  Select Campaign to Import                                      │
│                                                                 │
│  ✓ Connected as: username                                       │
│                                                                 │
│  Your campaigns:                                                │
│                                                                 │
│  ○ Dragon Heist                                                │
│    18 characters · 12 locations · 6 journals                   │
│                                                                 │
│  ○ Curse of Strahd                                             │
│    32 characters · 25 locations · 15 journals                  │
│                                                                 │
│  [Continue with Selected]                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

### Vault Character Import Flow (Specific)

For character vault, the existing flow already works well. Enhancements:

```
/vault/import

Source Options:
├── 📄 Document (existing - PDF/DOCX/images)
├── 📝 Obsidian (new - single character .md file)
├── 🌍 World Anvil (new - import character article)
└── 🗂️ Kanka (new - import character entity)

After AI parsing/API fetch:
├── STEP 3: Section Approval (existing)
│   ├── Character basics ✓
│   ├── NPCs (12) ✓
│   ├── Companions (2) ✓
│   ├── Session Notes (5) ✓
│   └── Writings (3) ✓
│
└── STEP 4: Import with progress
```

---

### Campaign Import Flow (Specific)

```
/campaigns/import

Source Options:
├── 📄 Document (new - campaign setting PDF)
├── 📝 Obsidian (new - campaign vault folder)
├── 🌍 World Anvil (new - import world)
└── 🗂️ Kanka (new - import campaign)

After parsing:
├── STEP 3: Campaign Setup
│   ├── Campaign Name: [Sword Coast Adventures    ]
│   ├── Game System: [D&D 5e ▼]
│   └── Description: [auto-filled, editable]
│
├── STEP 4: Content Selection
│   ├── Characters
│   │   ├── ☑ Import PCs (3)
│   │   └── ☑ Import NPCs (15)
│   ├── ☑ Locations → Campaign Lore (12)
│   ├── ☑ Factions → Campaign Lore (4)
│   ├── ☑ Sessions (8)
│   └── ☑ Timeline Events (24)
│
├── STEP 5: Preview
│   └── Show what will be created
│
└── STEP 6: Import
    └── Create campaign + all content
```

---

### Oneshot Import Flow (Specific)

```
/oneshots/import

Source Options:
├── 📄 Document (new - oneshot module PDF)
├── 📝 Obsidian (new - oneshot .md file or folder)
└── ❌ World Anvil/Kanka don't have oneshot-specific structure

After AI parsing:
├── STEP 3: Oneshot Setup
│   ├── Title: [The Lost Mine of Phandelver      ]
│   ├── Tagline: [A classic adventure for new players]
│   ├── Game System: [D&D 5e ▼]
│   ├── Level: [1-5       ]
│   ├── Players: [3] - [6]
│   └── Duration: [4-6 hours]
│
├── STEP 4: Content Review
│   ├── Introduction: [preview text...]      [Edit]
│   ├── Setting Notes: [preview text...]     [Edit]
│   ├── Session Plan: [preview text...]      [Edit]
│   ├── Key NPCs: [preview text...]          [Edit]
│   ├── Twists: [preview text...]            [Edit]
│   └── Handouts: [preview text...]          [Edit]
│
├── STEP 5: Confirm
│   └── Show summary
│
└── STEP 6: Import
    └── Create oneshot
```

---

## Technical Architecture

### API Routes

```
/api/import/
├── parse/
│   ├── document/       POST - AI parse PDF/DOCX
│   │   └── route.ts    → Returns parsed structure
│   │
│   ├── obsidian/       POST - Parse Obsidian vault
│   │   └── route.ts    → Returns parsed structure
│   │
│   └── preview/        POST - Preview any parsed data
│       └── route.ts    → Returns preview of what will be created
│
├── sources/
│   ├── world-anvil/
│   │   ├── connect/    POST - Validate API token
│   │   ├── worlds/     GET - List user's worlds
│   │   └── fetch/      POST - Fetch world data
│   │
│   └── kanka/
│       ├── connect/    POST - Validate API token
│       ├── campaigns/  GET - List user's campaigns
│       └── fetch/      POST - Fetch campaign data
│
├── vault/
│   ├── import-parsed/  POST - Import parsed vault character (existing)
│   └── import-structured/ POST - Import structured data (existing)
│
├── campaigns/
│   ├── import-parsed/  POST - Import parsed campaign data
│   └── route.ts
│
└── oneshots/
    ├── import-parsed/  POST - Import parsed oneshot data
    └── route.ts
```

### Component Structure

```
src/components/import/
├── ImportWizard.tsx              # Shared wizard container
├── steps/
│   ├── SourceSelector.tsx        # Step 1: Choose source
│   ├── DocumentUpload.tsx        # Step 2a: PDF/DOCX upload
│   ├── ObsidianUpload.tsx        # Step 2b: Obsidian upload
│   ├── WorldAnvilConnect.tsx     # Step 2c: WA connection
│   ├── KankaConnect.tsx          # Step 2d: Kanka connection
│   ├── ContentSelector.tsx       # Step 3: Select items
│   ├── MappingPreview.tsx        # Step 4: Preview mappings
│   ├── ImportConfirm.tsx         # Step 5: Confirm
│   ├── ImportProgress.tsx        # Step 6: Progress
│   └── ImportSuccess.tsx         # Step 7: Success
│
├── previews/
│   ├── CharacterPreview.tsx      # Preview a character
│   ├── SessionPreview.tsx        # Preview a session
│   ├── LorePreview.tsx           # Preview lore item
│   └── TimelinePreview.tsx       # Preview timeline event
│
├── parsers/
│   ├── obsidian/
│   │   ├── parser.ts             # Main vault parser
│   │   ├── yaml.ts               # YAML frontmatter handling
│   │   ├── markdown.ts           # Markdown body parsing
│   │   └── wikilinks.ts          # Wikilink extraction
│   │
│   ├── mappers/
│   │   ├── world-anvil.ts        # WA → Multiloop mapping
│   │   ├── kanka.ts              # Kanka → Multiloop mapping
│   │   └── common.ts             # Shared utilities
│   │
│   └── ai/
│       ├── campaign-prompt.ts    # AI prompt for campaigns
│       └── oneshot-prompt.ts     # AI prompt for oneshots
│
└── hooks/
    ├── useImportWizard.ts        # Wizard state management
    ├── useWorldAnvil.ts          # WA API integration
    └── useKanka.ts               # Kanka API integration
```

### Database Changes

```sql
-- Track import sources on all content types

-- Campaigns (add columns)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS import_source TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS import_source_id TEXT;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS import_metadata JSONB;

-- Oneshots (add columns)
ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS import_source TEXT;
ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS import_source_id TEXT;
ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;
ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS import_metadata JSONB;

-- Characters in campaigns (add columns)
ALTER TABLE characters ADD COLUMN IF NOT EXISTS import_source TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS import_source_id TEXT;

-- Sessions (add columns)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS import_source TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS import_source_id TEXT;

-- Campaign lore (add columns)
ALTER TABLE campaign_lore ADD COLUMN IF NOT EXISTS import_source TEXT;
ALTER TABLE campaign_lore ADD COLUMN IF NOT EXISTS import_source_id TEXT;

-- Timeline events (add columns)
ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS import_source TEXT;
ALTER TABLE timeline_events ADD COLUMN IF NOT EXISTS import_source_id TEXT;

-- Import sources enum/values:
-- 'pdf', 'docx', 'obsidian', 'world_anvil', 'kanka', 'manual'
```

---

## Edge Cases & Error Handling

### Edge Case 1: Duplicate Names

**Scenario**: User imports a character named "Lord Blackwood" but already has one.

**Handling**:
```
⚠️ A character named "Lord Blackwood" already exists.

Options:
○ Import as "Lord Blackwood (Imported)"
○ Skip this character
○ Replace existing character
```

### Edge Case 2: Circular Relationships

**Scenario**: WA/Kanka has A→B and B→A relationships.

**Handling**: Create both relationships, mark `is_mutual: true` if appropriate.

### Edge Case 3: Missing Required Fields

**Scenario**: AI couldn't extract a name from the document.

**Handling**:
```
⚠️ We couldn't determine the character's name.

Please enter a name to continue:
[                              ]
```

### Edge Case 4: Rate Limits

**Scenario**: World Anvil or Kanka API rate limit hit.

**Handling**:
```
⏳ We've hit the rate limit for World Anvil.
   Resuming in 30 seconds...

   Items imported: 45/100
   [Cancel Import]
```

### Edge Case 5: Large Imports

**Scenario**: User imports 500+ characters from World Anvil.

**Handling**:
- Batch imports (50 at a time)
- Background processing with progress updates
- Email notification when complete (optional)

### Edge Case 6: Partial Failures

**Scenario**: 95 of 100 items import successfully, 5 fail.

**Handling**:
```
⚠️ Import completed with some issues:

✓ 95 items imported successfully
✗ 5 items failed:
  • "Unknown Character" - Name was empty
  • "Session ??" - Invalid date format
  • [3 more...]

[View Errors] [Continue to Campaign]
```

### Edge Case 7: Encoding Issues

**Scenario**: Document has special characters that don't parse correctly.

**Handling**:
- Use UTF-8 encoding throughout
- Strip invalid characters with warning
- Preserve original in `raw_document_text`

### Edge Case 8: Empty Sections

**Scenario**: AI returns empty arrays for NPCs, sessions, etc.

**Handling**: Don't show empty sections in the wizard, skip during import.

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal**: Extend existing vault import, create shared components

1. Create `ImportWizard` component structure
2. Refactor existing vault import to use wizard
3. Add Obsidian markdown parsing for vault characters
4. Create shared preview components

**Deliverables**:
- [ ] `/vault/import` uses new wizard UI
- [ ] Obsidian .md import for vault characters
- [ ] Shared component library

### Phase 2: Campaign Imports (Week 3-4)

**Goal**: Enable campaign imports from all sources

1. Create campaign AI parsing prompt
2. Create `/campaigns/import` page
3. Implement Obsidian vault → campaign import
4. Add World Anvil API integration
5. Add Kanka API integration

**Deliverables**:
- [ ] `/campaigns/import` page
- [ ] PDF/DOCX campaign parsing
- [ ] Obsidian campaign import
- [ ] World Anvil campaign import
- [ ] Kanka campaign import

### Phase 3: Oneshot Imports (Week 5)

**Goal**: Enable oneshot imports

1. Create oneshot AI parsing prompt
2. Create `/oneshots/import` page
3. Implement PDF/DOCX → oneshot parsing
4. Implement Obsidian → oneshot parsing

**Deliverables**:
- [ ] `/oneshots/import` page
- [ ] PDF/DOCX oneshot parsing
- [ ] Obsidian oneshot import

### Phase 4: Polish & Edge Cases (Week 6)

**Goal**: Handle all edge cases, improve UX

1. Add error handling for all edge cases
2. Add retry logic for API failures
3. Add progress persistence (resume interrupted imports)
4. Add import history tracking
5. Mobile optimization

**Deliverables**:
- [ ] Comprehensive error handling
- [ ] Import history at `/settings/imports`
- [ ] Mobile-friendly import UI

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Import completion rate | >90% |
| Time to import (small) | <1 minute |
| Time to import (large) | <5 minutes |
| Data accuracy | >95% fields correctly mapped |
| User satisfaction | Can edit any issues post-import |

---

## Open Questions

1. **Should we support re-importing?** (Update existing content from source)
2. **Should we support two-way sync?** (Changes in Multiloop → back to source)
3. **How do we handle images?** (Download and re-host vs. link to original)
4. **Should imports be reversible?** (Undo entire import)
5. **Rate limits for AI parsing?** (Credits/limits per user per day)

---

## Appendix: AI Prompts

See separate files:
- `docs/import-prompts/campaign-parse.md`
- `docs/import-prompts/oneshot-parse.md`
- `docs/import-prompts/obsidian-parse.md`
