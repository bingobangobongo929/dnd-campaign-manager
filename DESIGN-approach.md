# Design Approach: Serving All Audiences

> How to build a system that works for complete beginners AND experts writing official-module-level content.

## Core Principle: Progressive Disclosure, Not Modes

**Don't ask users to choose "Simple" or "Advanced" upfront.**

Instead, design so that:
1. The default experience is simple and focused
2. Features reveal themselves as needed
3. Nothing is hidden from anyone - just not prominent until relevant
4. Templates provide starting points, not limitations

---

## Three-Layer Feature Architecture

### Layer 1: Core (Always Present)
The minimum every campaign needs. Visible from day one.

| Feature | What It Does |
|---------|--------------|
| Campaign Info | Name, description, image, status |
| Characters | List of PCs and NPCs with basic info |
| Sessions | Session notes and summaries |
| Basic Lore | Freeform notes about the world |

**UX**: Clean, uncluttered. A brand new DM sees only this and isn't overwhelmed.

### Layer 2: Contextual (Appears When Relevant)
Features that "wake up" when content is added.

| Feature | Appears When... |
|---------|-----------------|
| Factions | First faction is created |
| Timeline | First event is added |
| Maps | First map is uploaded |
| Relationships | First relationship is defined |
| Locations | First structured location is added |
| Quests | First quest is created |

**UX**: Empty states have gentle prompts ("Add your first faction to track political dynamics") but don't feel like missing features.

### Layer 3: Specialized (Opt-In Modules)
Power features for specific campaign styles. User explicitly enables them.

| Module | For Campaign Type | What It Adds |
|--------|-------------------|--------------|
| Hex Crawl Tools | Sandbox | Hex grid overlay, terrain, random tables |
| Clue Network | Mystery | Clue tracking, evidence board, three-clue-rule helper |
| Political Web | Intrigue | Faction relationship matrix, alliance tracking |
| Scheduling Hub | West Marches | Player availability, session booking, Discord integration |
| Megadungeon Mode | Megadungeon | Multi-level maps, room state, restocking scheduler |
| Play-by-Post | PbP | Thread organization, async dice, post tracking |

**UX**: Settings page with "Enable [Module]" toggles. Each module has a brief description of what it's for.

---

## Template System

Templates are **starting points**, not **restrictions**.

### Proposed Templates

**1. "My First Campaign"** (Beginner)
- Guided setup wizard
- Pre-fills example content
- Tooltips and explanations throughout
- Suggests next steps ("Now add your first NPC!")
- Only Layer 1 features initially visible

**2. "Quick Adventure"** (Casual)
- Minimal setup
- Focus on session notes
- Good for short campaigns

**3. "Story Campaign"** (Standard)
- Story outline feature enabled
- NPC focus with relationships
- Timeline for plot tracking

**4. "Dungeon Delve"** (Dungeon Crawl)
- Map tools prominent
- Encounter tracker
- Treasure/loot tracking
- Room-by-room organization

**5. "Open World"** (Sandbox/Hex)
- Hex crawl tools enabled
- Faction territories
- Random encounter tables
- Discovery tracking

**6. "Court Intrigue"** (Political)
- Faction web enabled
- Relationship matrix prominent
- Secret tracking
- Consequence notes

**7. "Mystery Investigation"** (Mystery)
- Clue network enabled
- Timeline prominent
- Evidence tracking
- Suspect profiles

**8. "West Marches"** (Open Table)
- Scheduling enabled
- Shared world state
- Large character roster
- Session report system

**9. "Blank Canvas"** (Expert)
- All Layer 1+2 features visible
- All Layer 3 modules available to enable
- No guidance, full control

---

## Handling the Anthologies Question

You mentioned "Adventures in Faerun" as an anthology containing multiple adventures.

**We don't need a new content type.** Instead:

### Option A: "Story Arcs" Within Campaigns
Add a lightweight organizational layer:
```
Campaign: "Tales from Waterdeep"
  └── Arc 1: "The Yawning Portal Mystery" (sessions 1-4)
  └── Arc 2: "Dragon Heist" (sessions 5-12)
  └── Arc 3: "Undermountain" (sessions 13+)
```

Each arc can have its own:
- Summary/introduction
- Key NPCs
- Objectives
- Status (upcoming, in progress, completed)

This naturally supports:
- Running published adventures within a homebrew campaign
- Organizing long campaigns into narrative chunks
- Tracking multiple storylines

### Option B: Collections (Future Feature)
A "Collection" that groups related content:
- Multiple one-shots as a series
- Several adventures as an anthology
- Campaign + its associated one-shots

This is lower priority than arcs within campaigns.

---

## Character Vault Integration Points

Wherever campaigns have content, characters should be linkable:

| Campaign Feature | Character Integration |
|------------------|----------------------|
| Sessions | Which characters were present? |
| Locations | Who lives/works here? Who has visited? |
| Quests | Who gave the quest? Who's pursuing it? |
| Factions | Which characters are members? |
| Timeline Events | Which characters were involved? |
| Relationships | Between campaign characters AND vault characters |
| Arcs | Which characters are central to this arc? |

### Export/Import Completeness
When exporting a character to vault (or importing to campaign), capture:
- Basic info (already done)
- Relationships to other characters (need mapping)
- Faction memberships
- Quest involvement
- Location associations
- Timeline appearances

### Cross-Campaign Character Tracking
Vault characters can exist in multiple campaigns. Track:
- Which campaigns they're in
- Different "versions" (same character, different points in time)
- Campaign-specific notes that don't sync

---

## Implementation Strategy

### Phase 1: Foundation
- Implement Layer 1 solidly
- Add Location hierarchy (critical gap)
- Add Quest/Plot thread tracking (high-value gap)
- Improve Session Zero support

### Phase 2: Organization
- Add Story Arcs within campaigns
- Add Encounters to campaigns (already in oneshots)
- Enhanced character-campaign linking

### Phase 3: Specialized Modules
- Hex Crawl tools
- Mystery/Clue network
- Political relationship web
- (Each as opt-in module)

### Phase 4: Polish
- Templates and guided setup
- Advanced scheduling
- Random table system
- Handouts

---

## Success Criteria

**For Beginners:**
- Can create a campaign in under 2 minutes
- Don't see overwhelming options
- Get helpful guidance without feeling patronized
- Natural progression to more features

**For Experts:**
- Can create content at published-module depth
- All organizational tools available
- Nothing artificially limited
- Efficient workflows for complex content

**For Both:**
- Same underlying data model
- Content is portable (export/import)
- Features grow with needs
- Never feels "wrong" for their skill level
