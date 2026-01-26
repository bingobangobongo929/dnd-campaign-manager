# Campaign Encounters Feature Design

> Oneshots have structured encounters. Campaigns need them too.

## Current State

**Oneshots have:**
- `oneshot_encounters`: name, description, difficulty, enemies (JSON), tactics, terrain, rewards, map_id
- `oneshot_npcs`: separate NPC table
- `oneshot_locations`: separate location table

**Campaigns have:**
- Characters table (richer than oneshot_npcs)
- Locations table (designing now, richer than oneshot_locations)
- **NO encounters table** - encounter info lives in session notes

---

## Design Principles

1. **Consistent with oneshots** - Similar schema for familiarity
2. **Integrated with campaign entities** - Use campaign characters, locations, quests
3. **Multiple encounter types** - Combat, social, exploration, puzzle, trap
4. **Session linking** - Which session was this used in?
5. **Prep vs. played** - Track what's planned vs. what happened

---

## Encounter Types

| Type | Description | Example |
|------|-------------|---------|
| **Combat** | Fight with monsters/enemies | Goblin ambush, dragon battle |
| **Social** | Roleplay/negotiation | Audience with the king, interrogation |
| **Exploration** | Discovery, puzzle, navigation | Explore the ruins, find the hidden door |
| **Trap/Hazard** | Environmental danger | Poison darts, collapsing ceiling |
| **Skill Challenge** | Extended skill-based obstacle | Chase sequence, ritual interruption |
| **Mixed** | Combination of above | Combat with environmental hazards |

---

## Database Schema

```sql
CREATE TABLE campaign_encounters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Core fields
  name TEXT NOT NULL,
  type TEXT DEFAULT 'combat', -- combat, social, exploration, trap, skill_challenge, mixed
  description TEXT, -- Setup and context
  summary TEXT, -- One-liner for lists

  -- Difficulty (for combat encounters)
  difficulty TEXT, -- trivial, easy, medium, hard, deadly
  party_level INTEGER, -- What level was this designed for?

  -- Combat specifics
  enemies JSONB, -- [{name, count, hp, ac, notes}]
  tactics TEXT, -- How enemies fight
  terrain TEXT, -- Environmental features

  -- Social specifics
  stakes TEXT, -- What's at risk in negotiation
  npc_goals TEXT, -- What does NPC want?

  -- Rewards
  rewards TEXT, -- Treasure, items, information
  xp_reward INTEGER,

  -- Location
  location_id UUID REFERENCES campaign_locations(id) ON DELETE SET NULL,
  map_id UUID REFERENCES world_maps(id) ON DELETE SET NULL,

  -- Organization
  arc_id UUID REFERENCES campaign_arcs(id) ON DELETE SET NULL,
  quest_id UUID REFERENCES campaign_quests(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,

  -- Session tracking
  planned_session INTEGER, -- Which session is this planned for?
  played_session INTEGER, -- Which session was it actually used?
  status TEXT DEFAULT 'prepared', -- prepared, used, skipped, modified

  -- How it went
  outcome TEXT, -- How did it resolve?
  player_notes TEXT, -- What players did, memorable moments
  lessons_learned TEXT, -- DM reflection

  -- Read-aloud text
  boxed_text TEXT, -- Text to read to players

  -- Visibility
  visibility TEXT DEFAULT 'dm_only', -- dm_only, party (after played)

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NPCs/Monsters involved in encounter (link to characters or simple list)
CREATE TABLE encounter_creatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  encounter_id UUID REFERENCES campaign_encounters(id) ON DELETE CASCADE,

  -- Option A: Link to campaign character
  character_id UUID REFERENCES characters(id) ON DELETE SET NULL,

  -- Option B: Simple creature entry (for monsters not worth full character entries)
  name TEXT,
  count INTEGER DEFAULT 1,
  hit_points INTEGER,
  armor_class INTEGER,
  notes TEXT,

  -- Role in encounter
  role TEXT, -- 'enemy', 'ally', 'neutral', 'hazard'

  display_order INTEGER DEFAULT 0
);

-- Index for queries
CREATE INDEX idx_encounters_campaign ON campaign_encounters(campaign_id);
CREATE INDEX idx_encounters_session ON campaign_encounters(played_session);
CREATE INDEX idx_encounters_location ON campaign_encounters(location_id);
CREATE INDEX idx_encounters_quest ON campaign_encounters(quest_id);
```

---

## Campaign Intelligence Integration

**MANDATORY** - Encounters must integrate with session note analysis.

### Detection from Session Notes

When analyzing session notes, Intelligence looks for:
- Combat mentions: "fought", "battle", "attacked", "ambushed", "defeated"
- Social encounters: "negotiated", "persuaded", "interrogated", "audience with"
- Traps/hazards: "triggered trap", "fell into", "poisoned", "collapsed"
- Puzzles: "solved the riddle", "figured out", "unlocked"

**Example session note:**
> "The party was ambushed by goblins on the forest road. After defeating them, they found a map to the hideout."

**Intelligence extracts:**
```json
{
  "type": "encounter_detected",
  "name": "Goblin Ambush",
  "encounter_type": "combat",
  "description": "Party ambushed by goblins on forest road",
  "outcome": "Victory - found map to hideout",
  "session_number": 14
}
```

### Approval Workflow

1. Intelligence suggests encounter from session notes
2. DM can: Approve, Edit then Approve, or Dismiss
3. On approve: Creates encounter record with status "used" and links to session
4. Deduplication: Check if encounter name already exists (case-insensitive)

### Existing Encounter Updates

Intelligence can also suggest updates to existing encounters:
- Mark prepared encounter as "used"
- Add outcome notes
- Link to session where it was played

---

## Form Field Organization (Progressive Disclosure)

**Essential fields (always visible):**
- Name (required)
- Type (combat, social, exploration, trap, skill_challenge, mixed)
- Status (prepared, used, skipped)
- Summary (one-liner for lists)

**Collapsible sections:**

| Section | Fields | Icon |
|---------|--------|------|
| **Description** | Full description, boxed text | 📖 |
| **Combat Details** | Difficulty, enemies list, tactics, terrain | ⚔️ |
| **Location & Quest** | Location dropdown, quest dropdown | 📍 |
| **Rewards** | XP, loot description | 🎁 |
| **Session Tracking** | Planned session, played session | 📅 |
| **Outcome** | How it resolved, player notes, lessons learned | 📝 |
| **DM Notes & Secrets** | Private notes, hidden info | 🔒 |

**Auto-expand logic (when editing):**
- Sections with existing content auto-expand
- Empty sections stay collapsed

---

## UI Design

### Encounters Page (`/campaigns/[id]/encounters`)

**List View:**
```
Encounters                             [+ Add Encounter] [Filter: All | Prepared | Used]

⚔️ PREPARED FOR NEXT SESSION (2)

  🗡️ Goblin Ambush (Combat - Medium)
     Location: Forest Road near Phandalin
     Enemies: 6 Goblins, 1 Bugbear
     Planned for: Session 15

  🗣️ Negotiating with the Baron (Social)
     Location: Baron's Keep, Great Hall
     Stakes: Alliance against the Cult

📜 USED (12)

  🗡️ Session 14: Cave Defense (Combat - Hard)
     Party defended the cave entrance from orc raiders
     Outcome: Victory, 2 PCs dropped to 0 HP
     ✓ 450 XP awarded

  🧩 Session 13: Riddle of the Sphinx (Puzzle)
     Location: Temple of Mysteries
     Outcome: Solved after 3 wrong guesses
```

**Prep View (For Upcoming Session):**
```
Session 15 Prep                                     [Add Encounter]

Planned Encounters (3):
┌─────────────────────────────────────────────────────────────────┐
│ 1. 🗡️ Goblin Ambush          Medium | Forest Road              │
│    [View] [Edit] [Move to Session 16] [Remove]                  │
├─────────────────────────────────────────────────────────────────┤
│ 2. 🗣️ Baron Negotiation      Social | Baron's Keep             │
│    [View] [Edit] [Move to Session 16] [Remove]                  │
├─────────────────────────────────────────────────────────────────┤
│ 3. 🗿 Trapped Hallway         Trap | Dungeon Level 2            │
│    [View] [Edit] [Move to Session 16] [Remove]                  │
└─────────────────────────────────────────────────────────────────┘

[Reorder] [Mark Session 15 Complete]
```

### Encounter Detail Panel

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚔️ Goblin Ambush                                    [Edit] 🎯   │
│ Combat • Medium • Forest Road                                   │
├─────────────────────────────────────────────────────────────────┤
│ 📖 BOXED TEXT                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ The road narrows as ancient oaks crowd in from both sides. │ │
│ │ A fallen log blocks the path ahead. As you approach, you   │ │
│ │ hear rustling in the underbrush...                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 👹 ENEMIES                                                      │
│ • Goblin × 6 (HP 7, AC 15) - hiding in trees                    │
│ • Bugbear × 1 (HP 27, AC 16) - behind the log                   │
│                                                                 │
│ 🎯 TACTICS                                                      │
│ Goblins fire from cover, then flee if bugbear falls.           │
│ Bugbear charges the weakest-looking PC.                         │
│                                                                 │
│ 🌲 TERRAIN                                                      │
│ Dense forest (difficult terrain). Log provides half cover.      │
│ Trees can be climbed (DC 10 Athletics).                         │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 🎁 REWARDS                                                      │
│ 450 XP total • 20 gold • Crude map to Cragmaw Hideout           │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 📍 Location: Forest Road → Triboar Trail                        │
│ 📜 Quest: Clear the Road (side quest)                           │
│ 🗺️ Map: [View Battle Map]                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Encounter Templates

Quick-start when creating encounters:

| Template | Pre-filled |
|----------|------------|
| **Ambush** | Enemies hidden, surprise round, escape routes |
| **Boss Fight** | Single powerful enemy, lair actions, phases |
| **Horde** | Many weak enemies, waves, reinforcements |
| **Negotiation** | NPC goals, stakes, success/failure outcomes |
| **Trap Gauntlet** | Multiple traps, DC scales, rewards for caution |
| **Chase** | Obstacles, complications, success thresholds |
| **Investigation** | Clues, DC checks, red herrings |

---

## Integration Points

| Location | Integration | Status |
|----------|-------------|--------|
| **Encounters Page** | Main library, list view, detail modal | TODO |
| **Quick Reference** | Pin encounters to sessions (like quests) | TODO |
| **Campaign Intelligence** | Detect encounters from session notes | TODO |
| **Locations Detail** | "Encounters at this location" section | TODO |
| **Quests Detail** | "Encounters for this quest" section | TODO |
| **Sessions** | Link sessions to encounters played | TODO |
| **Canvas** | NPCs show "Appears in encounters: X" (for named villains) | TODO |
| **Share Page** | DEFERRED - update with locations/quests/encounters together |

### Sessions
- Session can have `encounters_used[]` list
- Session prep shows planned encounters
- "Mark encounter as used" workflow
- **Quick Reference**: Pin encounters like quests/NPCs/locations

### Locations
- Encounter has location_id
- Location detail modal shows "Encounters Here" section

### Quests
- Encounter can belong to quest (quest_id)
- Quest detail modal shows "Encounters for this Quest" section

### Characters
- Named villains link to character entries
- Generic monsters use simple enemy list (JSONB)

### Campaign Intelligence
- Detect encounters from session notes (see above)
- Suggest marking prepared encounters as "used"
- Auto-fill outcome from notes

### Maps
- Battle map can be attached to encounter
- Click encounter → view map with setup

---

## Post-Session Workflow

After an encounter is used:

1. **Mark as Used** - Set status, record session number
2. **Record Outcome** - What happened? Did they win/lose/negotiate?
3. **Add Player Notes** - Memorable moments, quotes, surprises
4. **Award XP/Rewards** - Track what was given
5. **Lessons Learned** - DM reflection for future

This creates a log of what actually happened vs. what was planned.

---

## Consistency with Oneshots

| Oneshot Field | Campaign Equivalent |
|---------------|---------------------|
| `enemies` (JSON) | `enemies` (JSONB) or `encounter_creatures` table |
| `difficulty` | Same: trivial/easy/medium/hard/deadly |
| `tactics` | Same |
| `terrain` | Same |
| `rewards` | Same, plus `xp_reward` |
| `map_id` | Same |
| - | `type` (combat, social, etc.) - NEW |
| - | `played_session` - NEW |
| - | `outcome`, `player_notes` - NEW |
| - | `location_id`, `quest_id`, `arc_id` - NEW |

---

## Empty State

```
Encounters

Prepare combat, social, and exploration encounters ahead of time.

Encounters let you plan the exciting moments of your sessions -
battles, negotiations, puzzles, and traps - with all the details
you need at your fingertips.

After a session, record what happened for your campaign's history.

[+ Create First Encounter]
```

---

## Visibility Notes

| Status | Player Visibility |
|--------|-------------------|
| Prepared | DM only |
| Used | Can be shared with party (toggle) |
| Skipped | DM only (for future use) |

Players might see past encounters as "battle recap" or "adventure log" - but never see prepared encounters (spoilers!).

---

## Dependencies

- [x] Characters table exists
- [x] Sessions table exists
- [ ] Locations table (designing now)
- [ ] Quests table (designed above)
- [ ] Arcs (enhancing eras)
- [x] Maps table exists
