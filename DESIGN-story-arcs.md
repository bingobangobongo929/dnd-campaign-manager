# Story Arcs Feature Design

> Organizational layer between Campaigns and Sessions, based on competitor research.

## What Competitors Do

| Tool | Feature | Structure |
|------|---------|-----------|
| World Anvil | Plots | Master plot + subplots, tree visualization |
| Kanka | Quests | Quest → Subquests, collect related elements |
| Obsidian RPG Manager | Adventures | Campaign > Adventures > Chapters > Sessions > Scenes |

**Common pattern:** A grouping layer that collects related sessions, NPCs, locations, and objectives.

---

## Proposed Design: Arcs

An **Arc** is an optional organizational container within a campaign that groups related narrative content.

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Arc title (e.g., "Dragon Heist", "The Amber Temple") |
| description | text | No | Summary of what this arc is about |
| status | enum | No | planned, active, completed, abandoned |
| order | number | No | Display order among arcs |
| image_url | string | No | Cover image for the arc |

### Relationship Fields

| Field | Type | Description |
|-------|------|-------------|
| sessions | relation | Which sessions belong to this arc |
| characters | relation | Key characters in this arc (PCs and NPCs) |
| locations | relation | Where this arc takes place |
| quests | relation | Objectives/missions within this arc |
| parent_arc_id | relation | Optional: for sub-arcs |

### Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| started_session | number | Session number where arc began |
| ended_session | number | Session number where arc concluded |
| level_range | string | Expected character levels (e.g., "3-5") |
| estimated_sessions | number | How many sessions expected |
| source | string | "Homebrew" or published source name |
| notes | text | DM-only notes about the arc |

---

## How It Works

### Without Arcs (Current Behavior)
```
Campaign
└── Sessions (flat list)
    ├── Session 1
    ├── Session 2
    └── Session 3
```

### With Arcs (New Behavior)
```
Campaign
├── Arc: "Lost Mine of Phandelver"
│   ├── Session 1: Goblin Ambush
│   ├── Session 2: Cragmaw Hideout
│   └── Session 3: Phandalin
├── Arc: "Dragon Heist" (planned)
└── Unassigned Sessions
    └── Session 0: Character Creation
```

### Key Behaviors

1. **Arcs are optional** - Campaigns work fine without them
2. **Sessions can be unassigned** - Don't force every session into an arc
3. **Sub-arcs supported** - Arc can have parent_arc_id for nesting
4. **Arc status flows naturally** - First session starts it, marking complete ends it
5. **Arcs aggregate data** - Show all NPCs, locations, etc. from child sessions

---

## UI Locations

### Sessions Page Enhancement
- Group sessions by arc (collapsible)
- "Unassigned" section for sessions without arc
- Quick-assign: drag session to arc, or dropdown

### New: Arcs Page (Optional Module)
- List/card view of all arcs
- Arc detail view showing:
  - Description and status
  - Sessions within this arc
  - Key characters, locations, quests
  - Notes

### Timeline Integration
- Arcs appear as spans on timeline
- Events can be tagged with arc

### Canvas Integration
- Filter canvas by arc (show only characters in this arc)

---

## Database Schema

```sql
CREATE TABLE campaign_arcs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Core fields
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planned', -- planned, active, completed, abandoned
  display_order INTEGER DEFAULT 0,
  image_url TEXT,

  -- Hierarchy
  parent_arc_id UUID REFERENCES campaign_arcs(id) ON DELETE SET NULL,

  -- Session tracking
  started_session INTEGER,
  ended_session INTEGER,
  estimated_sessions INTEGER,

  -- Metadata
  level_range TEXT,
  source TEXT, -- 'Homebrew' or published module name
  notes TEXT, -- DM-only

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions get arc reference
ALTER TABLE sessions ADD COLUMN arc_id UUID REFERENCES campaign_arcs(id) ON DELETE SET NULL;

-- Junction tables for many-to-many relationships
CREATE TABLE arc_characters (
  arc_id UUID REFERENCES campaign_arcs(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  role TEXT, -- 'protagonist', 'antagonist', 'supporting', etc.
  PRIMARY KEY (arc_id, character_id)
);

CREATE TABLE arc_locations (
  arc_id UUID REFERENCES campaign_arcs(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE, -- needs locations table
  significance TEXT,
  PRIMARY KEY (arc_id, location_id)
);

CREATE TABLE arc_quests (
  arc_id UUID REFERENCES campaign_arcs(id) ON DELETE CASCADE,
  quest_id UUID REFERENCES quests(id) ON DELETE CASCADE, -- needs quests table
  PRIMARY KEY (arc_id, quest_id)
);
```

---

## Integration with Existing Features

### Sessions
- Sessions gain optional `arc_id` field
- Sessions page groups by arc when arcs exist
- Session detail shows which arc it belongs to

### Characters
- Characters can be tagged as "key to arc X"
- Arc detail shows all characters involved
- Character panel shows which arcs they appear in

### Timeline
- Arc appears as a time span
- Events inherit arc association from session

### Lore
- Lore entries can be tagged with arc
- Helps filter "what lore is relevant to this arc"

### Future: Quests
- Quests can belong to arc
- Arc completion might depend on quest completion

### Future: Locations
- Locations can be tagged as "introduced in arc X"
- Arc detail shows relevant locations

---

## Empty State

```
Arcs

Organize your campaign into narrative chunks - story arcs, published adventures,
or seasonal chapters.

Arcs help you group related sessions, track which NPCs and locations belong
to each part of your story, and see your campaign's structure at a glance.

Many DMs run published adventures (like "Lost Mine of Phandelver") as arcs
within their homebrew campaign.

[+ Create First Arc]
```

---

## Open Questions

1. **Should arcs auto-detect from sessions?** (Sessions 1-4 had same NPCs, suggest grouping?)
2. **Should there be arc templates?** (Published module templates with suggested structure?)
3. **How deep should nesting go?** (Arc > Sub-arc > Sub-sub-arc?)
4. **Should arc status auto-update?** (All quests complete → arc complete?)

---

## Dependencies

This feature depends on:
- [ ] Sessions table already exists ✓
- [ ] Characters table already exists ✓
- [ ] Locations table/hierarchy (needs design)
- [ ] Quests table (needs design)
- [ ] Timeline enhancement (needs design)
