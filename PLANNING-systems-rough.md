# Systems Overview - Rough Level

> This document captures HIGH-LEVEL decisions for all systems.
> Detailed specs will be created when we "lock in" each system.
> Read with PLANNING-CONTEXT.md for full picture.

---

## Systems with Detailed Designs (Ready for Lock-In)

### 1. Locations
**File:** `DESIGN-locations.md`
- Hierarchical (World > Region > City > Building > Room)
- Bidirectional map linking (pins ↔ location entries)
- Character associations (lives_at, works_at, rules, etc.)
- Integration: Maps, Characters, Quests, Sessions, Timeline

### 2. Quests
**File:** `DESIGN-quests.md`
- Types: main, side, personal, faction, plot_thread, rumor
- Status flow: available → active → completed/failed/abandoned
- Objectives, quest givers, rewards, consequences
- Integration: Characters, Locations, Arcs, Sessions

### 3. Encounters
**File:** `DESIGN-encounters.md`
- Types: combat, social, exploration, trap, skill_challenge, mixed
- Consistent with oneshot_encounters schema
- Session tracking (planned vs. played, outcomes)
- Integration: Characters, Locations, Quests, Sessions, Maps

### 4. Story Arcs
**File:** `DESIGN-story-arcs.md`
- Organizational layer between Campaign and Sessions
- Can be nested (arc > sub-arc)
- Built on/enhance existing Timeline eras system
- Integration: Sessions, Characters, Locations, Quests

---

## Systems Discussed at Rough Level

### 5. Character Vault Integration

**Current functionality (already built):**
- Vault characters with 100+ fields
- Export from campaign in different states:
  - Linked (in-play, read-only, pulls from campaign)
  - Session 0 snapshot (before changes)
  - Any-time snapshot (session 5, end of campaign, etc.)
  - Unlinked copy (keeps all context but now independent)
- Linked character session notes pull from campaign

**Key insight:** Vault supports TWO modes:

| Mode | Description |
|------|-------------|
| **Linked to Multiloop campaign** | Data flows from campaign, read-only-ish |
| **Standalone (external campaign)** | User manually tracks everything for games NOT on Multiloop |

**Additional use case:** People making characters just for fun/publishing, not necessarily for play.

**What this means for new systems:**
- Vault characters need their own location/quest/session tracking (for standalone mode)
- These get overridden/pulled from campaign when linked
- When unlinked, character KEEPS all accumulated context

**Action:** Review current character migration code to understand exact behavior before lock-in.

---

### 6. Oneshots

**Status:** DEFERRED until campaigns fully locked in.

**Options to consider later:**
- A: Keep separate (lightweight)
- B: Unify with campaigns (same tables)
- C: Hybrid (simple mode + full mode)

**Likely approach:** Copy campaign approach, possibly with simple/full modes.

---

### 7. Items/Treasure System

**Goal:** Painless to manage, not a chore.

**Key features:**
- Simple creation (name, description, who has it, where is it)
- AI-assisted via Campaign Intelligence:
  - "Session 12 mentioned 'Ring of Protection' - add to items?"
  - Bulk accept/reject suggestions
- Manual control always available
- No forced structure - as detailed or simple as user wants

**Integration:**
- Items on character panels
- Items at locations
- Items as quest objectives
- Items as encounter rewards

**Lock-in note:** Include icon set for common item types (sword, ring, potion, scroll, etc.)

---

### 8. Handouts System

**Our role:** Library and organization, NOT real-time display.

| Function | Who Does It |
|----------|-------------|
| Create/organize handouts | Us |
| Store handout library | Us |
| Track "revealed" status | Us |
| Show to players in real-time during session | VTT |
| Players access revealed handouts after session | Us |

**Key features:**
- Handout types: letter, map, image, document
- Status: hidden, revealed, printed
- Related to: location, quest, character, session
- Export for VTT use
- Share link to players

**Analogy:** We're the filing cabinet and prep system. VTT is the projector.

---

### 9. In-game Calendar

**Adoption:** ~20-30% of DMs actively track in-game time.

**Approach:**
- **Optional module** - OFF by default
- Visible in nav for experts to discover
- Simple version: current date + "advance by X days"
- Advanced version (opt-in): festivals, moon phases, weather
- Presets for common calendars (Harptos, Gregorian, custom)

**Integration:**
- Sessions can record in-game date range
- Timeline events can have in-game dates
- Quests can have deadlines
- Locations can have events (market day, festivals)

---

### 10. Session Zero Framework

**Expanded scope:** Not just player sign-off, also RECRUITMENT tool.

**Two modes:**

| Mode | Purpose |
|------|---------|
| **Recruitment** | Share publicly, attract players, review applications |
| **Sign-off** | Accepted players acknowledge expectations |

**Content sections:**
- Campaign pitch
- Tone & rating
- Safety tools (Lines, Veils, X-Card)
- Table rules
- House rules
- Allowed content/sources
- Character guidelines
- Scheduling

**Sharing features:**
- One-click share link
- Embeddable preview for Discord
- Export to PDF/image
- "Looking for X more players" status

**Future feature (post-MVP):** Handle applications within Multiloop (players apply with existing characters).

---

### 11. Random Tables

**Research complete.** See `RESEARCH-random-tables.md`

**Key findings:**
- Random tables ARE widely used (prep AND at-table)
- Gap in market: Kanka, LegendKeeper, D&D Beyond don't have this
- World Anvil has it and markets it prominently
- Community consensus: heavy randomization = prep, light reference = at-table

**Decision:** Include random tables, positioned as PREP tool.

**Rough approach:**
- Create custom tables (weighted entries)
- Link results to campaign entities (NPCs, items, locations, encounters)
- Pre-built templates for common uses
- Differentiator: Rolling pulls from YOUR campaign content, not generic results

**NOT competing with:** VTT dice rolling for combat mechanics.

---

## Systems NOT Yet Discussed

### 12. Factions
**Status:** Already exists, mostly complete.

**What exists:**
- 10 faction types, memberships, hierarchy, secret membership
- `faction_relations` table (allied, hostile, war) - but NO UI for it

**Decision:** Keep as-is for now. Inter-faction relationship UI is nice-to-have for political campaigns but not critical. Can be enhanced later.

**AI Integration:** Campaign Intelligence should detect faction mentions and suggest links to locations/quests.

### 13. Relationships
**Status:** Already exists, works well.

**What exists:**
- 25 templates, asymmetric support, force-directed diagram
- Secret relationships, status tracking

**Decision:** Good for now. No immediate changes needed.

**AI Integration:** Campaign Intelligence could suggest relationships from session notes ("Durnan warned about Xanathar" → rivalry relationship?)

### 14. Secrets/Revelations
**Status:** Exists but needs enhancement.

**What exists:**
- `entity_secrets` table for any entity type
- Revelation tracking with session linking
- Three visibility levels (dm_only, party, public)

**Enhancement needed:**
- More granular reveal control (partial reveals, hints)
- NOT eye toggle on every field (too cluttered)
- Need cleaner UX for managing visibility

**Technical debt:** `character.secrets` TEXT field vs `entity_secrets` table - inconsistent. Review needed.

**AI Integration:** Campaign Intelligence should detect when secrets are revealed in session notes and suggest marking them.

### 15. Player Notes/Contributions
**Status:** Exists, but research shows players don't contribute much anyway.

**Research finding:** Players want agency over THEIR CHARACTER, not world content. Even with wiki access, most don't use it.

**What exists:**
- `player_session_notes` table
- Multi-source import fields (Discord, WhatsApp, email) - **BUT THIS DOESN'T EXIST YET**
- **CLEANUP NEEDED:** Code references imports that aren't implemented

**Focus on (high value):**
- Character ownership (player controls their page)
- Simple shared resources (party loot, quest log)
- Session recaps from player perspective
- Private character journal

**Don't over-build:**
- Complex wiki contribution systems
- Formal approval queues
- Player-editable world lore

See `RESEARCH-player-contributions.md` for full findings.

### 16. Import/Export
**Status:** 70% done, hold for now.

- JSON export works
- PDF export: HOLD until site is stable
- Share pages: CRITICAL - must stay in sync with campaign pages

### 17. Campaign Intelligence (AI)
**Status:** THE PRIORITY. Needs major expansion.

Philosophy:
- ✅ Extract entities, suggest connections, organize, save time
- ❌ NOT creative suggestions, NOT prescriptive
- Call it "Intelligence" not "AI"

Expand to:
- Entity detection (NPCs, locations, factions, items from text)
- Connection suggestions
- Bulk approve/reject workflow

### 18. Collaboration Features
**Status:** 40% done, important but AFTER content finalized.

Want:
- Notion-level real-time sync
- See who's typing and where
- Proper co-editing

This needs focus once all campaign content is defined.

### 19. Templates/Presets
**Status:** 70% done, needs discovery UI.

Want:
- Marketplace/browse
- Categories, ratings, reviews
- "Save as template" visible in UI

This needs focus once all campaign content is defined.

### 20. Search/Navigation
**Status:** 20% done, HIGH PRIORITY.

Want:
- Global search across all entities
- Smart autocomplete EVERYWHERE (not just @)
- Places, names, anything significant
- Campaign-scoped search

### 21. Publishing/Sharing
**Status:** 75% done, HOLD community features.

- Share system works well
- Public profiles/community: HOLD until ready to "look big"
- Pull this lever when site has enough activity to look active

---

## Key Decisions Log

| Decision | Status | Notes |
|----------|--------|-------|
| Full nav visible for experts | ✅ Confirmed | Content areas stay clean |
| No completion percentages | ✅ Confirmed | No pressure metrics |
| Story Arcs worth implementing | ✅ Confirmed | All competitors have this |
| Stay system-agnostic | ✅ Confirmed | Legal safety |
| Presets configure, don't restrict | ✅ Confirmed | Users can change anytime |
| Handouts = library, not live display | ✅ Confirmed | VTTs handle live display |
| Calendar is optional module | ✅ Confirmed | ~20-30% adoption |
| Session Zero = also recruitment tool | ✅ Confirmed | Sharing/advertising focus |
| Vault supports linked + standalone | ✅ Confirmed | External campaigns supported |
| Items should feel painless | ✅ Confirmed | AI-assisted, manual optional |
| Oneshots deferred | ✅ Confirmed | After campaigns locked in |
| Random tables = prep tool | ✅ Confirmed | Links to campaign content, not VTT dice |

---

## Lock-In Order (Proposed)

After all rough discussions complete:

1. **Locations** - Foundation for everything
2. **Quests** - Core gameplay tracking
3. **Encounters** - Gameplay moments
4. **Story Arcs** - Organization layer
5. **Items/Treasure** - Object tracking
6. **Session Zero** - Onboarding/recruitment
7. **Handouts** - Player-facing content
8. **Calendar** - Optional time tracking
9. **Character Vault integration** - Cross-system sync
10. **Oneshots** - After all above

---

## Open Questions

1. ~~Random tables - do people use them?~~ ✅ Resolved - yes, include as prep tool
2. Character vault - review current migration code for exact behavior.
3. ~~Factions - enhancement needed?~~ ✅ Resolved - keep as-is, AI integration later
4. ~~Secrets system - how should this work?~~ ✅ Partial - needs granular reveal UX (not eye toggles)
5. ~~Player contributions - scope?~~ ✅ Resolved - focus on character ownership, don't over-build
6. Items/Treasure - icon set for lock-in, AI integration details.
7. Session Zero - application handling scope (future feature).
8. **CLEANUP NEEDED:** player_session_notes has source fields for Discord/WhatsApp/email import that don't exist yet.

## Key Insight: Campaign Intelligence Vision

**The system should NOT require manual linking of everything.**

Instead:
1. DM writes session notes naturally
2. AI extracts entities (NPCs, locations, factions, items)
3. AI suggests connections ("Link Durnan to Yawning Portal?")
4. DM approves/rejects suggestions
5. Campaign world grows automatically

See `DESIGN-campaign-intelligence-vision.md` for full details.

This changes how we think about ALL features - they should be AI-suggestible, not manual-entry-required.
