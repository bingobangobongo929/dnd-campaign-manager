# Quest System Feature Design

> Track objectives, missions, and plot threads the party is pursuing.

## Why This Matters

Current state:
- Quest information scattered in session notes
- No structured way to track "what are we doing?"
- Plot threads get lost over long campaigns

DMs need to answer:
- "What quests are active?"
- "Who gave us this quest?"
- "What happens when we complete/fail this?"
- "What plot threads are dangling?"

---

## Design Principles

1. **Flexible structure** - From simple "go here, do thing" to complex multi-objective missions
2. **Status tracking** - Available, active, completed, failed, abandoned
3. **Relationship links** - Quest giver, involved NPCs, locations, items
4. **Player visibility** - Some quests visible to players, some DM-only
5. **Plot thread support** - Not just formal quests, also "unresolved hooks"

---

## Quest Types

| Type | Description | Example |
|------|-------------|---------|
| **Main Quest** | Primary campaign objective | "Stop the Lich King" |
| **Side Quest** | Optional adventure | "Help the farmer with wolves" |
| **Personal Quest** | Character backstory | "Find my missing sister" |
| **Faction Quest** | Organization mission | "Retrieve artifact for Guild" |
| **Plot Thread** | Unresolved hook | "Who was that mysterious figure?" |
| **Rumor** | Potential quest lead | "Heard there's treasure in the ruins" |

---

## Database Schema

```sql
CREATE TABLE campaign_quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Core fields
  name TEXT NOT NULL,
  type TEXT DEFAULT 'side_quest', -- main_quest, side_quest, personal, faction, plot_thread, rumor
  description TEXT, -- Rich text, full details
  summary TEXT, -- One-liner for lists

  -- Status
  status TEXT DEFAULT 'available', -- available, active, completed, failed, abandoned
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent

  -- Organization
  arc_id UUID REFERENCES campaign_arcs(id) ON DELETE SET NULL,
  parent_quest_id UUID REFERENCES campaign_quests(id) ON DELETE SET NULL, -- For sub-quests
  display_order INTEGER DEFAULT 0,

  -- Quest giver
  quest_giver_id UUID REFERENCES characters(id) ON DELETE SET NULL,
  quest_giver_location_id UUID REFERENCES campaign_locations(id) ON DELETE SET NULL,

  -- Objective location(s)
  objective_location_id UUID REFERENCES campaign_locations(id) ON DELETE SET NULL,

  -- Rewards
  rewards_description TEXT, -- "500 gold and a magic sword"
  rewards_xp INTEGER,
  rewards_gold INTEGER,

  -- Consequences
  success_outcome TEXT, -- What happens if completed
  failure_outcome TEXT, -- What happens if failed
  time_limit TEXT, -- "Before the full moon" (optional)

  -- Session tracking
  discovered_session INTEGER, -- When party learned of quest
  started_session INTEGER, -- When party accepted
  completed_session INTEGER, -- When resolved

  -- Visibility
  visibility TEXT DEFAULT 'party', -- dm_only, party, public

  -- DM notes
  dm_notes TEXT,
  secrets TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Objectives within a quest
CREATE TABLE quest_objectives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_id UUID REFERENCES campaign_quests(id) ON DELETE CASCADE,

  -- Objective details
  description TEXT NOT NULL,
  is_optional BOOLEAN DEFAULT FALSE,
  is_completed BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,

  -- Links
  location_id UUID REFERENCES campaign_locations(id) ON DELETE SET NULL,
  target_character_id UUID REFERENCES characters(id) ON DELETE SET NULL, -- Kill/rescue/find this NPC

  -- Timestamps
  completed_at TIMESTAMPTZ
);

-- Characters involved in quest (beyond quest giver)
CREATE TABLE quest_characters (
  quest_id UUID REFERENCES campaign_quests(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  role TEXT, -- 'target', 'helper', 'obstacle', 'informant'
  notes TEXT,
  PRIMARY KEY (quest_id, character_id)
);

-- Items related to quest
CREATE TABLE quest_items (
  quest_id UUID REFERENCES campaign_quests(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL, -- Simple text for now, will be item_id when items table exists
  role TEXT, -- 'macguffin', 'reward', 'tool', 'delivery'
  notes TEXT,
  PRIMARY KEY (quest_id, item_name)
);

-- Index for common queries
CREATE INDEX idx_quests_campaign ON campaign_quests(campaign_id);
CREATE INDEX idx_quests_status ON campaign_quests(status);
CREATE INDEX idx_quests_arc ON campaign_quests(arc_id);
```

---

## Quest Status Flow

```
                    ┌─────────────┐
                    │   Rumor     │
                    └──────┬──────┘
                           │ (party investigates)
                           ▼
┌─────────────┐     ┌─────────────┐
│  Available  │────▶│   Active    │
└─────────────┘     └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
   │  Completed  │  │   Failed    │  │  Abandoned  │
   └─────────────┘  └─────────────┘  └─────────────┘
```

---

## UI Design

### Quests Page (`/campaigns/[id]/quests`)

**List View:**
```
Quests                                    [+ Add Quest] [Filter: All | Active | Completed]

⚔️ ACTIVE (3)

  🔴 Stop the Cult of Dragons (Main Quest)
     Objective: Find and destroy the Dragon Orb
     Location: Dragon's Lair, Sword Mountains
     Quest Giver: Lord Neverember
     Started: Session 12

  🟡 Clear the Goblin Camp (Side Quest)
     Objective: Eliminate goblin threat near Phandalin
     Location: Cragmaw Hideout
     Reward: 50 gold from villagers
     Started: Session 8

  🟢 Find My Brother (Personal - Aria)
     Objective: Locate missing brother Marcus
     No leads yet...
     Started: Session 1

📋 AVAILABLE (2)

  The Haunted Manor - Rumors of treasure
  Escort the Merchant - Safe passage to Neverwinter

✅ COMPLETED (5) [Show]
```

**Board View (Kanban):**
```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Available  │  │    Active    │  │  Completed   │  │    Failed    │
├──────────────┤  ├──────────────┤  ├──────────────┤  ├──────────────┤
│ Haunted Manor│  │ Cult Dragons │  │ Save Village │  │ Rescue Prince│
│ Escort Merch │  │ Goblin Camp  │  │ Find Artifact│  │              │
│              │  │ Find Brother │  │ Clear Mine   │  │              │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

### Quest Detail Panel

```
┌─────────────────────────────────────────────────────────────┐
│ ⚔️ Stop the Cult of Dragons                    [Edit] ⭐    │
│ Main Quest • Active • High Priority                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ The Cult of Dragons seeks to summon Tiamat. Find and        │
│ destroy the Dragon Orb before the ritual is complete.       │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 📋 OBJECTIVES                                               │
│ ☑ Discover the cult's hideout                               │
│ ☑ Obtain the key from High Priest                           │
│ ☐ Find the Dragon Orb                                       │
│ ☐ Destroy the Orb (or contain it?)                          │
│ ☐ Stop the ritual                                           │
├─────────────────────────────────────────────────────────────┤
│ 👤 Quest Giver: Lord Neverember at Castle Never             │
│ 📍 Location: Dragon's Lair, Sword Mountains                 │
│ 👥 Involved: Severin (enemy), Ontharr (ally)                │
│ 🎁 Reward: 5000 gold, title of Dragon Slayer                │
├─────────────────────────────────────────────────────────────┤
│ ⏰ Time Limit: Before the Blood Moon (3 sessions?)          │
├─────────────────────────────────────────────────────────────┤
│ 🔒 DM Notes                                                 │
│ If they fail, Tiamat appears and campaign shifts to         │
│ survival/resistance arc.                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration Points (CONFIRMED - Build All)

### Session Workflow Integration (KEY ARCHITECTURE)
**Philosophy**: Quests integrate with existing Session Workflow, NOT a separate prep system.

**The Flow**:
1. Quest created in Quests page (or Intelligence detects from session notes)
2. DM pins quest to session via **Quick Reference** during prep
3. Session plays - DM references pinned quest
4. Session completes - DM writes notes mentioning quest progress
5. Intelligence reads notes → suggests status/objective updates → DM approves

### Quick Reference (NEW - Priority)
- Add "Quests" as pinnable type alongside NPCs, Characters, Locations
- DM pins active quests to session for easy access
- This replaces need for separate "quest prep" status

### Characters
- Quest giver links to character via dropdown
- Character detail panel shows "Quests involving this character" section
- Canvas NPC cards show "Quest Giver for: X"
- Personal quests tied to specific PC

### Locations
- Quest objective at location
- Quest giver location
- Location detail panel shows "Quests at this location" section

### Campaign Intelligence
- Detect new quests mentioned in session notes
- Detect quest progress (objectives completed, status changes)
- Suggest updates with approval workflow
- Deduplicate against existing quests by name

### Sessions
- Session notes can @mention quests
- Quest status changes logged: "Session 12: Started 'Dragon Cult'"
- Link sessions to quests progressed

### Rolling (NEW)
- "Roll Random" button on Quests page
- Picks randomly from Available quests (not yet introduced to party)
- Simple implementation for now, more complex Random Tables in Phase 2

### Share Pages
- `/share/[code]/quests` for player visibility
- Respects visibility setting (dm_only, party, public)
- Players see name, description, objectives, quest giver, location
- Players do NOT see: DM notes, secrets, failure outcomes

### Timeline (Later)
- Quest start/complete events on timeline
- Filter timeline by quest

### Dashboard (Later)
- "Active Quests" widget
- "Quest updates this session" summary

---

## Empty State

```
Quests

Track what the party is doing, who asked them, and what's at stake.

Quests help you remember plot threads, organize objectives, and
see the story from the players' perspective.

Create your first quest - whether it's the main campaign goal
or just "that thing the bartender mentioned."

[+ Create First Quest]
```

---

## Presets/Templates

Quick-start templates when creating a quest:

| Template | Pre-filled Fields |
|----------|-------------------|
| **Fetch Quest** | Go to [location], retrieve [item], return to [quest giver] |
| **Kill Quest** | Defeat [target] at [location] |
| **Escort Quest** | Protect [character] traveling to [location] |
| **Mystery** | Investigate [situation], discover [truth] |
| **Rescue** | Save [character] from [location/captor] |
| **Delivery** | Take [item] from [location A] to [location B] |
| **Plot Thread** | Minimal fields, just name and notes |

---

## Player Visibility

| Visibility | What Players See |
|------------|------------------|
| `party` | Name, description, objectives, quest giver, location |
| `dm_only` | Not visible to players at all |
| `public` | Visible even to non-party (for public shares) |

Players do NOT see:
- DM notes
- Secrets
- Failure outcomes
- Behind-the-scenes NPC motivations

---

## Sub-Quests

Quests can have parent_quest_id for complex missions:

```
Main Quest: Defeat the Lich
├── Sub-Quest: Find the Phylactery
│   ├── Objective: Research in Library
│   └── Objective: Locate in Tomb
├── Sub-Quest: Gather Allies
│   ├── Objective: Convince the Elves
│   └── Objective: Hire Mercenaries
└── Sub-Quest: Final Battle
    └── Objective: Destroy Phylactery during fight
```

---

## Plot Threads vs Formal Quests

**Formal Quest:** Structured, has giver, objectives, rewards
**Plot Thread:** Informal, just something unresolved

Examples of plot threads:
- "Who was the mysterious figure watching us?"
- "What did that prophecy mean?"
- "We never found out what happened to the missing villagers"
- "The BBEG mentioned a 'greater power'"

Plot threads can become quests when the party decides to pursue them.

---

## Dependencies

- [x] Characters table exists
- [x] Sessions table exists
- [x] Locations table (COMPLETE - migration 082)
- [x] Quests table (COMPLETE - migration 082)
- [x] Quest objectives table (COMPLETE - migration 082)
- [ ] Arcs (enhancing eras) - future
- [ ] Items table - future
