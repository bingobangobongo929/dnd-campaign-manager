# Campaign System Planning - Master Context

> **AFTER CONTEXT COMPRESSION:** Read `RESUME-AFTER-CONTEXT-LOSS.md` FIRST.
> **THEN READ:** `PLANNING-FINAL-DECISIONS.md` for all confirmed decisions.
> This document links all planning work.

## Project Goal

Build a campaign management system that serves ALL users from complete beginners to experts writing official-module-level content, without intimidating the former or limiting the latter.

---

## Key Constraints

### UX Constraints
- **No rigid creation flows** - Users may start with backstory, NPCs, images, or anything in any order
- **No "completion pressure"** - Amateurs shouldn't feel their campaign is lacking
- **No "too basic" feeling** - Experts must see depth is available immediately
- **Grouped naturally** - Related things near each other, but order is flexible
- **Full navigation visible** - All features in nav (expert sees depth), content areas stay clean (beginner isn't overwhelmed)

### Legal Constraints
- **D&D/WotC are litigious** - Cannot copy copyrighted content
- **System-agnostic where possible** - Support multiple game systems
- **Safe content only** - Use SRD (CC-BY-4.0) or stay system-agnostic
- **Cannot use**: "D&D", "Dungeons & Dragons", Beholder, Mind Flayer, Forgotten Realms, etc.
- (See `RESEARCH-legal.md` for full details)

### Technical Constraints
- Context compression will happen - all important info must be in documents
- Documents must be self-contained and readable in isolation

---

## Reference Documents

| Document | Purpose | Status |
|----------|---------|--------|
| `RESEARCH-ttrpg-terminology.md` | TTRPG terms, module structure, what DMs track | Complete |
| `RESEARCH-campaign-types.md` | All 13 campaign types and their needs | Complete |
| `RESEARCH-legal.md` | Legal landscape, OGL, what's safe to use | Complete |
| `RESEARCH-competitor-ux.md` | How competitors handle beginner/expert balance | Complete |
| `ANALYSIS-campaign-gaps.md` | Initial gap analysis | Complete |
| `AUDIT-campaign-pages.md` | Detailed audit of current pages | Complete |
| `DESIGN-approach.md` | Progressive disclosure, templates, feature layers | Complete |
| `DESIGN-ux-principles.md` | Core UX principles for all audiences | Complete |
| `DESIGN-story-arcs.md` | Story Arcs feature specification | Complete |
| `DESIGN-locations.md` | Location hierarchy specification | Complete |
| `DESIGN-quests.md` | Quest system specification | Complete |
| `DESIGN-encounters.md` | Encounter system specification | Complete |
| `RESEARCH-random-tables.md` | Random table usage research | Complete |
| `PLANNING-systems-rough.md` | All systems at rough level | Complete |
| `PLANNING-FINAL-DECISIONS.md` | All confirmed decisions | **READ THIS** |
| `ARCHITECTURE-unified-system.md` | Unified architecture for all content types | **CRITICAL** |

---

## Current State Summary

### What's Implemented Well (8/10)
- Characters with rich data model and canvas visualization
- Sessions with prep/live/completed workflow
- Timeline with multiple views and eras system
- Relationships and factions
- Maps with interactive features
- AI intelligence suggestions
- Collaboration (roles, permissions, invites)

### Database Complete - Frontend Needed (Schema Ready)
| Feature | Database | Frontend |
|---------|----------|----------|
| **Unified Content System** | ✅ Migration 081 | 🔄 ContentProvider needed |
| **Location Hierarchy** | ✅ Migration 082 | ❌ UI needed |
| **Quest System** | ✅ Migration 082 | ❌ UI needed |
| **Encounters** | ✅ Migration 082 | ❌ UI needed |

### Still Missing (Not in Database Yet)
| Gap | Why It Matters |
|-----|----------------|
| **Items/Treasure** | No magic item or loot tracking |
| **Handouts** | Gallery doesn't distinguish handouts from reference images |
| **In-game Calendar** | Only real-world dates, no custom calendars |

### Key Discovery
Timeline already has **"eras" system** - this is partial infrastructure for Story Arcs!

---

## Key Decisions

### Confirmed
- [x] Navigation shows ALL features (expert sees depth immediately)
- [x] Content areas start clean (beginner isn't overwhelmed)
- [x] Presets configure defaults, don't restrict
- [x] Story Arcs are worth implementing (all competitors have this concept)
- [x] Stay system-agnostic for legal safety
- [x] No completion percentages or pressure metrics

### Proposed (Awaiting Final Confirmation)
- Modules can be disabled per campaign in settings
- Presets offered at campaign creation ("My First Campaign", "Dungeon Delve", "Expert", etc.)
- Arcs built on/enhance existing Timeline eras system

### Rejected
- "Normal" vs "Expert" mode toggle (using progressive disclosure instead)
- Restructuring "adventures" terminology (current approach works)
- Anthologies as new content type (arcs within campaigns instead)

---

## Implementation Priority

### Phase 1: Foundation (Critical)
1. **Location Hierarchy** - World > Region > Settlement > Building > Room
2. **Quest System** - Objectives, status, rewards, quest givers
3. **Link Maps to Locations** - Pins connect to location entries

### Phase 2: Organization (High Value)
4. **Story Arcs** - Enhance Timeline eras into full arc system
5. **Encounters for Campaigns** - Combat/social/exploration
6. **Session-Location-Encounter linking**

### Phase 3: Parity (Medium)
7. **Items/Treasure tracking**
8. **Handouts system** - Distinguish from gallery
9. **In-game Calendar**

### Phase 4: Polish (Lower)
10. **Random Tables**
11. **Read-aloud/boxed text distinction**
12. **Session Zero framework**

---

## Open Questions

1. ~~Completion Pressure~~ → Resolved: No pressure metrics, full nav visible
2. ~~Story Arcs~~ → Resolved: Yes, implement them
3. ~~Expert visibility~~ → Resolved: Full nav always visible
4. **Module enable/disable UX** - Settings toggles? Per-campaign?
5. **Preset selection UX** - At campaign creation? Changeable later?
6. **Location-Map linking** - How exactly should this work?

---

## Session Log

### Session 1 (Current)
- Explored codebase structure (Next.js, Supabase, extensive schema)
- Researched TTRPG terminology and 13 campaign types
- Researched legal landscape (OGL, SRD, trademarks)
- Researched competitor UX (World Anvil, Kanka, LegendKeeper)
- Created gap analysis and detailed page audit
- Designed UX principles for beginner/expert balance
- Designed Story Arcs feature specification
- Designed Location Hierarchy system (full schema, UI, integrations)
- Designed Quest system (full schema, UI, types, status flow)
- Designed Encounters for campaigns (consistent with oneshots)
- User confirmed: full nav visible for experts, story arcs needed

### Completed Design Documents
1. `DESIGN-ux-principles.md` - Show capabilities, simplify content
2. `DESIGN-story-arcs.md` - Organizational layer, schema, UI
3. `DESIGN-locations.md` - Hierarchy, map linking, character associations
4. `DESIGN-quests.md` - Types, status flow, objectives, templates
5. `DESIGN-encounters.md` - Types, combat/social/exploration, session linking

### Next Steps
- Review Character Vault integration points
- Review Oneshots for consistency
- Design Items/Treasure system
- Design Handouts system
- Design In-game Calendar
- Design Session Zero framework
- Create consolidated feature roadmap
