# Campaign System Gap Analysis

> Comparing current implementation against TTRPG industry standards and professional module requirements.

## Status Key
- ✅ DONE - Implemented
- 🚧 TODO - On the roadmap
- ⏭️ SKIPPED - Deprioritized (not how DMs actually play, publishing feature, or scope creep)
- ❌ NOT STARTED - Identified but not yet evaluated

## Current State Summary

The app has three content types:
- **Campaigns** (`duration_type: 'campaign'`) - Long-form with canvas, sessions, timeline, lore, maps
- **Adventures** (`duration_type: 'adventure'`) - Same as campaigns, filtered view
- **Oneshots** (separate table) - Self-contained with structured NPCs, encounters, locations

## Major Gaps Identified

### 1. Story Architecture ⏭️ SKIPPED

**Current**: Campaigns have no internal structure. Content is organized by feature (sessions, lore, timeline) not by narrative.

**Needed**:
- Chapter/Act system for organizing story beats
- Adventure flowcharts showing branching paths
- Scene/encounter organization within chapters
- Plot thread/quest tracking with status

**Why it matters**: Official modules are organized by story flow, not by content type. A DM needs to see "Chapter 3: The Amber Temple" not "all my lore entries."

**Why skipped**: This is how *published modules* are organized, not how homebrew DMs run games. DMs think in sessions, quests, and "what's next" - not formal chapter structure. The current sessions + quests + timeline system covers real use.

---

### 2. Location Hierarchy ✅ DONE (schema) / 🚧 TODO (UI polish)

**Current**:
- `locations` table with `parent_location_id` for hierarchy
- Location types, descriptions, map integration
- Character-location associations
- Map pin linking

**Implemented**:
```
World/Setting
  └── Regions (e.g., Sword Coast)
       └── Settlements (e.g., Waterdeep)
            └── Districts/Areas (e.g., Castle Ward)
                 └── Buildings (e.g., Yawning Portal Inn)
                      └── Rooms/Areas (e.g., Common Room)
```

Each level supports:
- ✅ Description and history
- ✅ Associated NPCs (character_location_associations)
- ✅ Connected locations (parent_location_id)
- ✅ Map markers (map_id, map_pin_x/y)
- 🚧 Events that occurred there (needs UI)

**Remaining**: UI for viewing location hierarchy (tree view), better NPC associations display.

---

### 3. Quest/Plot Thread System ✅ DONE

**Implemented** (migration 082):
- Quest/mission entities with:
  - ✅ Title, description, objectives (`quest_objectives` table)
  - ✅ Quest giver NPC (`quest_giver_id`)
  - ✅ Rewards (description, xp, gold)
  - ✅ Status (available, active, completed, failed, abandoned)
  - ⏭️ Prerequisites/dependencies (skipped - video game concept, not TTRPG)
  - ✅ Related locations (`quest_giver_location_id`, `objective_location_id`)
  - ✅ Related NPCs (`quest_characters` table with roles)
- ✅ Plot thread tracking (type includes `plot_thread`, `rumor`)
- ✅ Sub-quest hierarchy (`parent_quest_id`)
- ✅ Session linking (`session_quests` table)
- ✅ Full UI with Kanban board, list, and detail views

---

### 4. Encounter System for Campaigns ✅ DONE

**Implemented** (migration 082):
- ✅ Combat encounters (enemies JSONB, difficulty, tactics, terrain)
- ✅ Social encounters (stakes, npc_goals)
- ✅ Exploration encounters (type: 'exploration')
- ✅ Trap/hazard encounters (type: 'trap')
- ✅ Skill challenges and puzzles (type: 'skill_challenge', 'puzzle')
- ✅ Link to location (`location_id`)
- ✅ Link to quest (`quest_id`)
- ✅ Session tracking (`planned_session`, `played_session`)
- ✅ Session linking (`session_encounters` table)
- ✅ Read-aloud text (`boxed_text` field)
- ✅ Full UI with filtering, status management

---

### 5. Read-Aloud/Boxed Text ⏭️ SKIPPED

**Current**: Rich text in lore and session notes. Encounters have `boxed_text` field.

**Why skipped**: This is a publishing feature. Homebrew DMs improvise descriptions, they don't write scripts. The description fields and encounters `boxed_text` cover the rare cases where someone wants this.

---

### 6. Session Zero Framework 🚧 TODO

**Current**:
- `is_session0_ready` flag
- `default_session_sections` and `default_prep_checklist`
- Basic collaboration settings

**Missing**:
- Safety tools configuration (X-Card, Lines & Veils)
- House rules documentation
- Allowed content/sources list
- Campaign expectations (tone, themes, rating)
- Character creation guidelines
- Session logistics (frequency, duration, cancellation policy)

**Why it matters**: Session 0 is standard practice. Actually matters for real games, especially online with strangers. Keep it simple - form/checklist approach, not a complex system.

**Approach**: Simple guided form that captures the essentials. Can be shared with players as a "campaign pitch" page.

---

### 7. Items/Treasure System 🚧 TODO (simplified)

**Current**: No structured item/treasure tracking.

**Simplified scope**:
- Party loot/treasury tracking (simple list)
- Notable magic items (name, description, who has it)
- ~~Treasure parcels~~ (overkill)
- ~~Loot tables~~ (scope creep - use external tools)

**Approach**: Simple "Party Inventory" section - a list of notable items with optional assignment to characters. Not a full inventory management system.

---

### 8. Calendar/In-Game Time ⏭️ SKIPPED

**Current**:
- Timeline exists with events
- Session dates tracked

**Why skipped**: Niche hobby. Most tables say "a few days pass" and move on. Forgotten Realms calendar enthusiasts exist but are a minority. Festival tracking, travel calculations, custom calendar systems - all scope creep for a small audience. DMs who want this have dedicated tools.

---

### 9. Handouts System ⏭️ SKIPPED

**Current**: Gallery for images.

**Why skipped**: Gallery already covers images. Formal "handout reveal status" is a VTT feature, not a campaign manager feature. DMs who need handouts just upload to Gallery or share via Discord/etc.

---

### 10. Random Tables ⏭️ SKIPPED

**Current**: None.

**Why skipped**: Dedicated sites exist (donjon, Chartopia, etc.). Building this is scope creep into a different product category. DMs who want random tables already have tools they love.

---

## Character-Campaign Integration Gaps

### Current Integration Points
- `vault_character_id` links campaign character to vault
- Bidirectional sync of core fields
- Character claiming workflow
- Export to vault with source tracking

### Integration Status
1. **Quest associations**: ✅ DONE - `quest_giver_id`, `quest_characters` table
2. **Location history**: ⏭️ SKIPPED - Rarely tracked in practice
3. **Relationship to NPCs**: ✅ DONE - `canvas_relationships` system
4. **Item ownership**: 🚧 TODO - Part of simplified Items/Treasure system
5. **Character arc tracking**: ⏭️ SKIPPED - DMs don't formally track this

---

## Terminology Alignment Issues ⏭️ SKIPPED

### Current
- `duration_type: 'adventure'` on campaigns table
- Separate `oneshots` table

### Original Recommendation
Add Adventure/Arc as middle layer between Campaign and content.

### Why Skipped
Adds complexity without clear user benefit. Most DMs either:
- Run a single continuous campaign
- Run distinct oneshots

The "adventure within campaign" concept can be handled with quest grouping or simple notes. Not worth restructuring the data model.

---

## Priority Ranking (Updated)

| Gap | Status | Notes |
|-----|--------|-------|
| Story Architecture (chapters/acts) | ⏭️ SKIPPED | Publishing feature, not how DMs run games |
| Location Hierarchy | ✅ DONE | Schema complete, UI needs polish |
| Quest/Plot Thread System | ✅ DONE | Full implementation with UI |
| Encounter System | ✅ DONE | Full implementation with UI |
| Session Zero Framework | 🚧 TODO | Keep simple - guided form |
| Read-Aloud Text | ⏭️ SKIPPED | Encounters have boxed_text, enough |
| Items/Treasure | 🚧 TODO | Simplified: party loot list only |
| Calendar/Time | ⏭️ SKIPPED | Niche, external tools exist |
| Handouts | ⏭️ SKIPPED | Gallery covers it |
| Random Tables | ⏭️ SKIPPED | Out of scope, external tools |

## Active TODO List

1. **Session Zero Framework** - Simple guided form for campaign setup
2. **Items/Treasure** - Simple party loot tracking
3. **Location UI polish** - Tree view, better hierarchy display
4. **Maps review** - Evaluate current state, remove bloat
