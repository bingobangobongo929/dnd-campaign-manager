# Location Hierarchy Feature Design

> The #1 critical gap. Connects maps to structured data and answers "where is this NPC?"

## Why This Matters

Current state:
- Maps exist with pins and fog of war
- Lore entries exist with descriptions
- **These are NOT connected** - a map pin doesn't link to location data

Result: DM can't answer basic questions:
- "Where is the blacksmith NPC?"
- "What's in this city?"
- "Who lives at the tavern?"

---

## Design Principles

1. **Parent-child hierarchy** - Not enforced levels (flexible depth)
2. **Bidirectional map linking** - Pin → Location, Location → Map position
3. **Character associations** - NPCs have locations, locations show their NPCs
4. **Quest integration** - Locations can be quest objectives
5. **Type flexibility** - Sensible defaults, custom types allowed

---

## Location Types

### Suggested Defaults (User Can Add Custom)

| Category | Types |
|----------|-------|
| **Cosmic** | Universe, Galaxy, Plane, World |
| **Geographic** | Continent, Region, Island, Forest, Mountain, Desert, Ocean |
| **Political** | Kingdom, Empire, Province, Territory |
| **Settlement** | City, Town, Village, Hamlet, Camp |
| **District** | Ward, District, Neighborhood, Quarter |
| **Structure** | Castle, Temple, Tavern, Shop, House, Tower, Dungeon |
| **Interior** | Room, Chamber, Hall, Basement, Attic |
| **Natural** | Cave, Clearing, Grove, Lake, River |
| **Other** | Ruins, Landmark, Monument, Battlefield |

Implementation: Dropdown with these defaults + "Custom..." option that saves to user's list.

---

## Database Schema

```sql
CREATE TABLE campaign_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Core fields
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Location', -- City, Tavern, etc.
  description TEXT, -- Rich text
  summary TEXT, -- One-line summary for lists
  image_url TEXT,

  -- Hierarchy
  parent_location_id UUID REFERENCES campaign_locations(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,

  -- Map integration
  map_id UUID REFERENCES world_maps(id) ON DELETE SET NULL,
  map_pin_x FLOAT, -- Position on parent's map
  map_pin_y FLOAT,
  has_own_map BOOLEAN DEFAULT FALSE, -- Does this location have a detailed map?

  -- Settlement-specific (nullable for non-settlements)
  population INTEGER,
  government TEXT,
  economy TEXT,
  defenses TEXT,

  -- Geography-specific (nullable for non-geography)
  climate TEXT,
  terrain TEXT,
  resources TEXT,

  -- Metadata
  status TEXT DEFAULT 'active', -- active, destroyed, abandoned, hidden
  discovered_session INTEGER, -- When party first found this
  visibility TEXT DEFAULT 'dm_only', -- dm_only, party, public

  -- DM Notes
  dm_notes TEXT,
  secrets TEXT, -- Hidden info about this location

  -- Arc/Quest integration
  arc_id UUID REFERENCES campaign_arcs(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for hierarchy queries
CREATE INDEX idx_locations_parent ON campaign_locations(parent_location_id);
CREATE INDEX idx_locations_campaign ON campaign_locations(campaign_id);
CREATE INDEX idx_locations_map ON campaign_locations(map_id);
```

---

## Character-Location Associations

Characters already exist. Add location fields to characters:

```sql
-- Add to characters table
ALTER TABLE characters ADD COLUMN current_location_id UUID REFERENCES campaign_locations(id) ON DELETE SET NULL;
ALTER TABLE characters ADD COLUMN home_location_id UUID REFERENCES campaign_locations(id) ON DELETE SET NULL;
ALTER TABLE characters ADD COLUMN work_location_id UUID REFERENCES campaign_locations(id) ON DELETE SET NULL;

-- For more complex associations (lives at, works at, owns, etc.)
CREATE TABLE character_location_associations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
  location_id UUID REFERENCES campaign_locations(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL, -- 'lives_at', 'works_at', 'owns', 'guards', 'rules', 'born_at', 'died_at'
  notes TEXT,
  is_current BOOLEAN DEFAULT TRUE, -- For historical associations
  start_session INTEGER, -- When this association began
  end_session INTEGER, -- When it ended (if applicable)
  PRIMARY KEY (character_id, location_id, relationship_type)
);
```

---

## Map Integration

### Current State
Maps table (`world_maps`) exists with:
- `parent_map_id` - hierarchy support
- `map_type` - world, region, city, dungeon, etc.
- Interactive pins, fog of war, grid

### Enhancement Needed
Map pins should link to locations:

```sql
-- Enhance or create map_pins table
CREATE TABLE map_pins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  map_id UUID REFERENCES world_maps(id) ON DELETE CASCADE,

  -- Position
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,

  -- Link to location
  location_id UUID REFERENCES campaign_locations(id) ON DELETE SET NULL,

  -- Fallback for pins without location entries
  label TEXT,
  description TEXT,

  -- Visual
  icon TEXT DEFAULT 'pin',
  color TEXT DEFAULT '#666',

  -- Visibility
  visibility TEXT DEFAULT 'dm_only',

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Workflow
1. **Create location** → Can optionally specify which map and position
2. **Place pin on map** → Can link to existing location or create new one
3. **Click pin** → Shows location details panel
4. **View location** → Shows "View on map" button if linked

---

## UI Design

### Locations Page (`/campaigns/[id]/locations`)

**List View:**
```
Locations                                    [+ Add Location] [View: List | Tree | Map]

🏰 Waterdeep (City)                          Population: 130,000
   └── 🏛️ Castle Ward (District)             8 locations, 12 NPCs
       └── 🍺 The Yawning Portal (Tavern)    Durnan (innkeeper)
       └── ⛪ Temple of Gond (Temple)         3 NPCs
   └── 🏚️ Dock Ward (District)               5 locations, 8 NPCs

🌲 Neverwinter Wood (Forest)                 Dangerous, unexplored
   └── 🗿 Cragmaw Castle (Ruins)             Party discovered Session 3
```

**Tree View:**
- Collapsible hierarchy
- Drag-and-drop reorganization
- Quick-add child location

**Map View:**
- Shows campaign map with location pins
- Click pin to see location card
- Overlay mode on existing maps page

### Location Detail Panel

```
┌─────────────────────────────────────────────────────────────┐
│ 🍺 The Yawning Portal                              [Edit] │
│ Tavern in Castle Ward, Waterdeep                           │
├─────────────────────────────────────────────────────────────┤
│ [Image]                                                     │
│                                                             │
│ Famous tavern built around the entrance to Undermountain.   │
│ A massive well in the center leads down into the dungeon.   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ 📍 Located in: Castle Ward → Waterdeep         [View Map]   │
│ 👥 NPCs Here: Durnan (owner), Bonnie (server)               │
│ 📜 Related Quests: "Enter Undermountain"                    │
│ 📅 Discovered: Session 1                                    │
├─────────────────────────────────────────────────────────────┤
│ 🔒 DM Notes                                                 │
│ Durnan is secretly a retired adventurer who cleared         │
│ the first three levels of Undermountain.                    │
└─────────────────────────────────────────────────────────────┘
```

### Integration Points

**Canvas:**
- Character cards can show "Location: The Yawning Portal"
- Filter canvas by location ("Show NPCs in Waterdeep")

**Sessions:**
- "Session took place at: [Location dropdown]"
- Session notes can @mention locations

**Timeline:**
- Events can be tagged with location
- Filter timeline by location

**Character Panel:**
- Shows current location
- "Where is this character?" question answered

---

## Relationship Types

| Type | Description | Example |
|------|-------------|---------|
| `lives_at` | Permanent residence | Durnan lives at The Yawning Portal |
| `works_at` | Employment | Guard works at City Gate |
| `owns` | Property ownership | Lord owns Manor |
| `rules` | Leadership | King rules Kingdom |
| `guards` | Protection duty | Knight guards Castle |
| `born_at` | Birthplace | Hero born in Village |
| `died_at` | Death location | Villain died at Tower |
| `imprisoned_at` | Incarceration | Prisoner at Dungeon |
| `frequent_visitor` | Regular presence | Merchant visits Market |

---

## Empty State

```
Locations

Track the places in your world - from sprawling cities to
hidden taverns.

Locations help you organize where your NPCs are, connect
your maps to actual places, and answer "where is this?"
at a glance.

Start with your main adventuring area - a city, a dungeon,
or wherever your party begins.

[+ Create First Location]
```

---

## Integration with Existing Features

### Maps (world_maps table)
- Maps become the visual layer for locations
- Pins link to location entries
- Location entries can reference "has map" for drill-down

### Lore (campaign_lore table)
- Lore entries of type "location" could migrate to locations table
- Or lore entries can link to locations for additional flavor text

### Characters
- Add current_location_id to characters
- Show location on character panel
- "Characters at this location" list on location page

### Sessions
- Add location_id to sessions ("This session took place at...")
- Session notes can @mention locations

### Timeline
- Events have location_id
- Filter timeline by location

### Quests (future)
- Quests can have objective_location_id
- "Go to X and do Y" structure

---

## Migration Path

1. **Create tables** - campaign_locations, character_location_associations, map_pins
2. **Add nav item** - "Locations" in campaign sidebar
3. **Basic CRUD** - Create, view, edit, delete locations
4. **Hierarchy** - Parent-child relationships, tree view
5. **Map integration** - Link pins to locations
6. **Character integration** - Add location fields to characters
7. **Session integration** - Location field on sessions

---

## Open Questions

1. **Migrate existing lore?** - Should "location" type lore entries become locations?
2. **Vault locations?** - Should vault_locations table merge with this? Or stay separate?
3. **Preset hierarchies?** - Offer "Waterdeep" or "Generic City" templates?
4. **Map requirement?** - Can locations exist without maps?

---

## Dependencies

- [ ] Maps table already exists ✓
- [ ] Characters table already exists ✓
- [ ] Sessions table already exists ✓
- [ ] Timeline table already exists ✓
- [ ] Quest system (future) - will integrate when built
