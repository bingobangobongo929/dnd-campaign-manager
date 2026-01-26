# Final Planning Decisions - Master Reference

> **READ THIS FIRST** after any context loss. Contains all confirmed decisions.

## The Vision

**"I just write my session notes, and the campaign world builds itself."**

Campaign Intelligence is THE differentiator. It does the organizational heavy lifting so DMs save time. It is NOT creative/prescriptive - it doesn't tell DMs how to make their campaign better. It organizes what they've already created.

---

## Architecture Decision: UNIFIED SYSTEM

**DO NOT build 3 separate systems for campaigns, oneshots, and adventures.**

See `ARCHITECTURE-unified-system.md` for full details.

### Core Principle
Build ONE system. Content types (campaign/adventure/oneshot) are just PRESETS that enable/disable modules.

### What This Means
- **Same components** - Canvas, Maps, Locations, Encounters, Intelligence - ALL unified
- **Same tables** - Characters, Locations, Encounters work for campaigns AND oneshots
- **Same share pages** - One share system for all content types
- **Module toggles** - User can enable ANY module on ANY content type
- **Oneshots get everything** - Canvas, Maps, Timeline, Intelligence - all available if enabled

### Current Technical Debt
Oneshots have separate tables (`oneshot_npcs`, `oneshot_locations`, `oneshot_encounters`).
These should migrate to unified tables with `content_id` + `content_type` pattern.

### Default Modules by Type
| Module | Campaign | Adventure | Oneshot |
|--------|----------|-----------|---------|
| Canvas | ON | ON | OFF |
| Timeline | ON | ON | OFF |
| Locations | ON | ON | ON |
| Encounters | ON | ON | ON |
| Factions | ON | ON | OFF |
| Intelligence | ON | ON | ON |

User can always change these.

---

## Critical Reminders

### Campaign Intelligence Integration (MANDATORY)
**EVERY new feature must consider Campaign Intelligence integration.**
Ask these questions for every feature:
1. Can this data be auto-detected from session notes? (locations, NPCs, items, quests)
2. What's the approval workflow? (suggest → review → approve/reject)
3. How does Intelligence handle conflicts? (newer sessions = more recent truth)
4. How does it handle existing data? (match by name before creating new)

**The vision: "I just write my session notes, and the campaign world builds itself."**

### Share Pages Must Stay In Sync
**EVERY update to campaign pages must also update share pages.**
This is non-negotiable. Don't let share pages fall behind.

### No "AI" Branding
Avoid mentioning "AI" on the site. Call it "Intelligence" - it's the DM's and players' input being organized, not AI creativity.

### Campaign Intelligence Philosophy
- ✅ Extract entities from session notes
- ✅ Suggest connections
- ✅ Organize and track
- ✅ Save time on bookkeeping
- ❌ NOT creative suggestions ("you should add a twist here")
- ❌ NOT prescriptive ("your campaign needs more combat")
- ⚠️ Random encounter rolling CAN be an exception (user-initiated)

---

## System Priorities

### Phase 1: Foundation (Build Now)
| System | Priority | Notes |
|--------|----------|-------|
| **Locations** | CRITICAL | Foundation for "where is everything" |
| **Quests** | CRITICAL | Foundation for "what's happening" |
| **Encounters** | HIGH | Gameplay moments, parity with oneshots |
| **Story Arcs** | HIGH | Organizational layer |
| **Campaign Intelligence Expansion** | CRITICAL | Entity detection, connection suggestions |
| **Search/Autocomplete** | HIGH | Smart autocomplete everywhere (@, places, names) |

### Phase 2: Integration (After Foundation)
| System | Priority | Notes |
|--------|----------|-------|
| Items/Treasure | MEDIUM | AI-assisted from session notes |
| Handouts | MEDIUM | Library/organization, not live display |
| Session Zero | MEDIUM | Also recruitment/advertising tool |
| In-game Calendar | LOWER | Optional module, ~20-30% adoption |
| Random Tables | LOWER | Prep tool, links to campaign content |

### Phase 3: Polish (After Core Complete)
| System | Priority | Notes |
|--------|----------|-------|
| Real-time Collaboration | HIGH | Notion-level sync, see who's typing |
| Template Marketplace | HIGH | Discovery, browse, ratings |
| PDF Export | MEDIUM | After site is stable |
| Public Profiles/Community | HOLD | Pull this lever when ready to "look big" |

---

## Confirmed Decisions

### UX Principles
- [x] Full navigation visible (experts see depth)
- [x] Content areas start clean (beginners not overwhelmed)
- [x] No completion percentages
- [x] Presets configure defaults, don't restrict
- [x] All fields optional except name

### Features Confirmed
- [x] Story Arcs - implement (all competitors have this)
- [x] Locations - hierarchical, map-linked
- [x] Quests - types, status flow, objectives
- [x] Encounters - combat/social/exploration, session linking
- [x] Random Tables - prep tool, links to campaign content
- [x] Handouts - library/organization (VTT does live display)
- [x] Calendar - optional module
- [x] Session Zero - also recruitment/sharing tool
- [x] Search - smart autocomplete everywhere

### Features On Hold
- [ ] PDF Export - wait until site is stable
- [ ] Public profiles/community - wait until ready to look active
- [ ] Discord OAuth - IDs stored, OAuth later
- [ ] In-app applications for Session Zero - future feature

### Features NOT Building
- Complex player contribution systems (players don't use them)
- VTT-style dice rolling for combat
- D&D Beyond-style character building with mechanics

---

## Key Integrations

### Everything Links to Campaign Intelligence
When building any feature, ask:
- Can this be auto-detected from session notes?
- Can Intelligence suggest this connection?
- What's the approval workflow?

### Share Pages Mirror Campaign Pages
Every campaign page has a share equivalent:
- `/campaigns/[id]/locations` → `/share/[code]/locations`
- When campaign pages update, share pages MUST update

---

## Existing Systems Status

### Keep As-Is (Working Well)
- Relationships (25 templates, diagram)
- Factions (complete, may add political map later)
- Canvas (excellent UX)
- Sessions (good workflow)
- Timeline (multiple views, eras)

### Needs Enhancement
- Secrets (more granular reveals, NOT eye toggles everywhere)
- Player Notes (focus on character ownership, not world editing)
- Campaign Intelligence (expand to full entity detection)

### Needs Building
- Locations (CRITICAL - maps disconnected from data)
- Quests (CRITICAL - no tracking system)
- Encounters for campaigns (oneshots have them)
- Global search with smart autocomplete
- Template discovery/marketplace

### Code Cleanup Needed
- `player_session_notes` has source fields for Discord/WhatsApp/email imports that don't exist yet

---

## Document Index

| Document | Purpose |
|----------|---------|
| `PLANNING-CONTEXT.md` | Master context, links to all docs |
| `PLANNING-FINAL-DECISIONS.md` | **THIS FILE** - confirmed decisions |
| `PLANNING-systems-rough.md` | All systems at rough level |
| `DESIGN-campaign-intelligence-vision.md` | AI philosophy and workflow |
| `DESIGN-ux-principles.md` | Beginner/expert balance |
| `DESIGN-story-arcs.md` | Arc system specification |
| `DESIGN-locations.md` | Location hierarchy specification |
| `DESIGN-quests.md` | Quest system specification |
| `DESIGN-encounters.md` | Encounter system specification |
| `RESEARCH-*.md` | Various research findings |
| `AUDIT-*.md` | Current state audits |

---

## Next Steps

### COMPLETED:
- [x] **Unified Database Schema** - Migrations 081 and 082 applied
- [x] **Locations table** - Created with hierarchy support
- [x] **Quests table** - Created with objectives, status flow
- [x] **Encounters table** - Created with combat/social/exploration types
- [x] **ContentProvider** - `src/components/providers/ContentProvider.tsx`
- [x] **useContent hook** - `src/hooks/useContent.ts`
- [x] **useContentPermissions** - `src/hooks/useContentPermissions.ts`
- [x] **Example component** - `src/components/unified/UnifiedCharacterList.tsx`
- [x] **Locations UI** - Full page with list/tree views, detail panel, add/edit modal
- [x] **Navigation updated** - Sidebar, floating dock, navigation map all include Locations/Quests/Encounters
- [x] **Placeholder pages** - Quests and Encounters pages created
- [x] **Campaign Intelligence - Location Detection** - AI extracts locations from session notes
- [x] **Location Edit Modal** - Edit name, type, parent, description before approving
- [x] **Location Bulk Approval** - "Add All X Locations" button for one-click approval

### TODO (Priority Order):
1. **Build Quests UI** - List, board view, status tracking, objectives (NEXT)
2. **Campaign Intelligence - Quest Detection** - Detect quests/objectives from sessions
3. **Build Encounters UI** - Prep view, detail panel
4. **Campaign Intelligence - Encounter Detection** - Detect encounters from sessions
5. **Recreate Oneshots UI** - Using unified tables
6. **Build Search** - Global search with smart autocomplete
7. **Update Share Pages** - Mirror all campaign page updates
