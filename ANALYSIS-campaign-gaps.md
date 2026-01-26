# Campaign System Gap Analysis

> Comparing current implementation against TTRPG industry standards and professional module requirements.

## Current State Summary

The app has three content types:
- **Campaigns** (`duration_type: 'campaign'`) - Long-form with canvas, sessions, timeline, lore, maps
- **Adventures** (`duration_type: 'adventure'`) - Same as campaigns, filtered view
- **Oneshots** (separate table) - Self-contained with structured NPCs, encounters, locations

## Major Gaps Identified

### 1. Story Architecture (CRITICAL)

**Current**: Campaigns have no internal structure. Content is organized by feature (sessions, lore, timeline) not by narrative.

**Needed**:
- Chapter/Act system for organizing story beats
- Adventure flowcharts showing branching paths
- Scene/encounter organization within chapters
- Plot thread/quest tracking with status

**Why it matters**: Official modules are organized by story flow, not by content type. A DM needs to see "Chapter 3: The Amber Temple" not "all my lore entries."

---

### 2. Location Hierarchy (CRITICAL)

**Current**:
- Vault has `vault_locations` table (basic)
- Campaigns have no structured location system
- Maps exist but aren't linked to location data

**Needed**:
```
World/Setting
  └── Regions (e.g., Sword Coast)
       └── Settlements (e.g., Waterdeep)
            └── Districts/Areas (e.g., Castle Ward)
                 └── Buildings (e.g., Yawning Portal Inn)
                      └── Rooms/Areas (e.g., Common Room)
```

Each level should support:
- Description and history
- Associated NPCs
- Events that occurred there
- Connected locations
- Map markers

**Why it matters**: "Where is this NPC?" and "What's in this town?" are the most common DM questions.

---

### 3. Quest/Plot Thread System (HIGH)

**Current**: No quest tracking. Plot threads are scattered in session notes and lore.

**Needed**:
- Quest/mission entities with:
  - Title, description, objectives
  - Quest giver NPC
  - Rewards
  - Status (available, active, completed, failed)
  - Prerequisites/dependencies
  - Related locations
  - Related NPCs
- Plot thread tracking (ongoing mysteries, unresolved hooks)

**Why it matters**: DMs need to track "what's happening" not just "what exists."

---

### 4. Encounter System for Campaigns (HIGH)

**Current**: Oneshots have structured encounters. Campaigns do not.

**Needed**: Campaign encounters with:
- Combat encounters (monsters, difficulty, terrain)
- Social encounters (NPCs, stakes, outcomes)
- Exploration encounters (challenges, discoveries)
- Trap/hazard encounters
- Link to location and chapter/scene

**Why it matters**: Encounters are the atomic unit of play. They need structure.

---

### 5. Read-Aloud/Boxed Text (MEDIUM)

**Current**: Rich text in lore and session notes, but no "boxed text" concept.

**Needed**:
- Distinct "read-aloud" text blocks
- DM-only notes adjacent to read-aloud
- Easy toggle between player-visible and DM-only

**Why it matters**: Core feature of published modules. DMs read boxed text aloud, then consult notes.

---

### 6. Session Zero Framework (MEDIUM)

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

**Why it matters**: Session 0 is standard practice. The app should guide users through it.

---

### 7. Items/Treasure System (MEDIUM)

**Current**: No structured item/treasure tracking.

**Needed**:
- Magic items database (campaign-specific)
- Treasure parcels (what's found where)
- Item distribution tracking (who has what)
- Loot tables

**Why it matters**: Published modules have extensive magic item appendices.

---

### 8. Calendar/In-Game Time (MEDIUM)

**Current**:
- Timeline exists with events
- Session dates tracked
- No in-game calendar

**Needed**:
- In-game date tracking (different calendar systems)
- Festival/holiday definitions
- Event scheduling on in-game dates
- Travel time calculations
- Day/night cycle awareness

**Why it matters**: "It's been 3 tendays since..." is common in play.

---

### 9. Handouts System (LOWER)

**Current**: Gallery for images. No handout concept.

**Needed**:
- Player-facing handouts (letters, maps, documents)
- Handout reveal status (shown/hidden)
- Handout categories
- Print-friendly export

---

### 10. Random Tables (LOWER)

**Current**: None visible.

**Needed**:
- Custom random tables
- Table rolling interface
- Pre-built tables (names, encounters, weather)
- Table results history

---

## Character-Campaign Integration Gaps

### Current Integration Points
- `vault_character_id` links campaign character to vault
- Bidirectional sync of core fields
- Character claiming workflow
- Export to vault with source tracking

### Missing Integration
1. **Quest associations**: Characters aren't linked to quests they're involved in
2. **Location history**: No tracking of where characters have been
3. **Relationship to NPCs**: Campaign characters have relationships, but vault sync doesn't preserve campaign-specific relationships
4. **Item ownership**: No structured way to track what items a character has
5. **Character arc tracking**: No way to track character development across sessions

---

## Terminology Alignment Issues

### Current
- `duration_type: 'adventure'` on campaigns table
- Separate `oneshots` table

### Problem
- "Adventure" in TTRPG means a 1-9 session storyline, which could be:
  - Standalone
  - Part of a larger campaign
  - A published module
- Current implementation treats "adventure" as "short campaign" rather than "story arc within campaign"

### Recommendation
Consider restructuring:
- **Campaign**: The container (ongoing game with players)
- **Adventure/Arc**: Story units within a campaign (could have multiple)
- **Oneshot**: Remains separate (single-session, self-contained)

This would allow:
- Running published modules as adventures within a homebrew campaign
- Tracking multiple story arcs
- Better matching industry terminology

---

## Priority Ranking

| Gap | Priority | Effort | Impact |
|-----|----------|--------|--------|
| Story Architecture (chapters/acts) | CRITICAL | High | Transforms organization |
| Location Hierarchy | CRITICAL | High | Core DM need |
| Quest/Plot Thread System | HIGH | Medium | Gameplay tracking |
| Encounter System | HIGH | Medium | Core content type |
| Session Zero Framework | MEDIUM | Low | Onboarding improvement |
| Read-Aloud Text | MEDIUM | Low | Module parity |
| Items/Treasure | MEDIUM | Medium | Module parity |
| Calendar/Time | MEDIUM | Medium | Immersion feature |
| Handouts | LOWER | Low | Nice to have |
| Random Tables | LOWER | Low | Nice to have |
