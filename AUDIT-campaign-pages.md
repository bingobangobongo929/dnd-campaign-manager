# Campaign System Audit

> Detailed analysis of current implementation vs. research requirements.

## Executive Summary

The campaign system is **feature-rich for narrative collaboration** (8/10 on what exists) but **lacks structural systems** that professional modules use (0/10 on locations, quests, encounters).

**The gap:** DMs can track "who exists and how they relate" but struggle to track "what's happening and where it happens."

---

## Page-by-Page Assessment

| Page | Maturity | Strengths | Critical Gaps |
|------|----------|-----------|---------------|
| Canvas | 8/10 | Excellent drag-drop, relationships, groups | No location context, no quest links |
| Dashboard | 7.5/10 | Customizable widgets, DM/player views | No narrative overview, no quest tracker |
| Sessions | 8/10 | Good workflow, attendee tracking | No encounters, no location field |
| Timeline | 8.5/10 | Multiple views, eras system | Uses real dates only, no in-game calendar |
| Lore | 7/10 | Relationships, factions, AI analysis | **No location hierarchy** |
| Maps | 7/10 | Interactive, hierarchy support | **Not linked to locations in lore** |
| Gallery | 5/10 | Basic image storage | No categories, no handout workflow |
| Intelligence | 8.5/10 | Sophisticated AI, good filtering | No quest/structure suggestions |
| Settings | 8/10 | Comprehensive, sharing links | No Session Zero framework |

---

## Feature Maturity Summary

### Implemented Well
| Feature | Status | Notes |
|---------|--------|-------|
| Characters | 8/10 | Rich data model, good canvas integration |
| Sessions | 8/10 | Workflow system, prep/live/completed phases |
| Timeline | 8.5/10 | Multiple views, eras/chapters support |
| Canvas | 8/10 | Excellent visual organization |
| Relationships | 8/10 | Templates, categories, visualization |
| Factions | 7/10 | Basic system works |
| Collaboration | 8/10 | Roles, permissions, invites |
| AI Intelligence | 8.5/10 | 25+ suggestion types |

### Not Implemented (Critical Gaps)
| Feature | Status | Impact |
|---------|--------|--------|
| **Location Hierarchy** | 0/10 | Can't answer "where is this NPC?" |
| **Quest System** | 0/10 | Can't track objectives/missions |
| **Encounters (campaigns)** | 0/10 | Oneshots have them, campaigns don't |
| **Handouts** | 0/10 | Gallery doesn't distinguish |
| **Items/Treasure** | 0/10 | No tracking system |
| **In-game Calendar** | 0/10 | Only real-world dates |
| **Random Tables** | 0/10 | Not implemented |

---

## Key Discovery: Timeline Eras

The Timeline already has an **"eras" system** that provides chapter organization:
- Named chapters with descriptions
- Color-coded for visual distinction
- Events assigned to eras
- Sort order customizable

**This could become the foundation for "Story Arcs"** - the infrastructure partially exists.

---

## Key Discovery: Maps Disconnection

Maps exist with good features:
- Multiple map types (World, Region, City, Dungeon, etc.)
- Hierarchy support (parent map linking)
- Pins with descriptions
- Grid and fog of war

**But maps are NOT linked to structured location data.** A pin on a map doesn't connect to a location entry that has NPCs, quests, and history.

---

## Database Schema Notes

### Campaign Table (48 fields)
- Core info, template system, collaboration, scheduling all present
- Missing: campaign structure fields, Session Zero configuration

### Supporting Tables Exist
- `campaign_eras` - chapter organization (could become Arcs)
- `canvas_groups` - visual organization
- `campaign_factions` - faction system
- `relationship_templates` - relationship types
- `intelligence_suggestions` - AI system

### Tables That Need Creation
- `locations` - hierarchical location system
- `quests` - quest/mission tracking
- `encounters` - combat/social/exploration encounters
- `items` - magic items and treasure
- `handouts` - player-facing documents
- `random_tables` - custom tables with rolling

---

## Current vs. Official Module Structure

| Official Module Has | Current State |
|---------------------|---------------|
| Chapters/Acts | Eras in Timeline (partial) |
| Locations with NPCs | Maps + Lore (disconnected) |
| Encounters | Oneshots only |
| Read-aloud text | Rich text, no distinction |
| Handouts | Gallery images only |
| Magic items appendix | Not tracked |
| Monster stat blocks | Character system (partial) |
| Random tables | Not implemented |

---

## Recommended Priority Order

### Phase 1: Foundation (Critical)
1. **Location Hierarchy** - World > Region > Settlement > Building > Room
2. **Quest System** - Objectives, status, rewards, quest givers

### Phase 2: Organization (High Value)
3. **Arcs** (enhance Timeline eras) - Story organization
4. **Encounters for Campaigns** - Combat/social/exploration
5. **Session-Location-Encounter linking** - Where did the session happen?

### Phase 3: Parity (Medium)
6. **Items/Treasure** - Magic item tracking
7. **Handouts** - Distinguish from gallery
8. **In-game Calendar** - Custom calendar support

### Phase 4: Polish (Lower)
9. **Random Tables** - Custom rolling
10. **Read-aloud Text** - Boxed text distinction
11. **Session Zero Framework** - Guided setup

---

## Navigation/UX Gaps

Current navigation is feature-based:
```
Campaign → Canvas | Dashboard | Sessions | Timeline | Lore | Maps | Gallery | Intelligence | Settings
```

Missing narrative context:
- No "where am I in the story?" indicator
- Character on canvas doesn't show location
- No breadcrumb: "Arc: Dragon Heist → Chapter 2 → Session 5"
- No quick-jump from character to their quests/locations
