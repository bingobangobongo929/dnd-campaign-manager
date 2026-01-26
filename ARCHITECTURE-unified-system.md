# Unified Architecture

> One system. Three content types. Modules enabled/disabled per type.

## Status: IMPLEMENTED

**Migrations 081 and 082 have been applied.** The database now supports unified content.

## The Principle

**Don't build separate systems. Build ONE system with module toggles.**

Campaigns, Adventures, and Oneshots are NOT different products. They're the SAME product with different default configurations.

---

## What Should Be Unified (Everything)

| Component | Campaign | Adventure | Oneshot |
|-----------|----------|-----------|---------|
| Canvas | ✅ | ✅ | ✅ (could have) |
| Dashboard | ✅ | ✅ | ✅ (simpler) |
| Gallery | ✅ | ✅ | ✅ |
| Lore | ✅ | ✅ | ✅ (lighter) |
| Maps | ✅ | ✅ | ✅ |
| Sessions | ✅ | ✅ | ✅ (maybe just 1) |
| Timeline | ✅ | ✅ | ✅ (condensed) |
| Intelligence | ✅ | ✅ | ✅ |
| Settings | ✅ | ✅ | ✅ |
| Locations | ✅ | ✅ | ✅ |
| Quests | ✅ | ✅ | ✅ |
| Encounters | ✅ | ✅ | ✅ |
| Characters/NPCs | ✅ | ✅ | ✅ |
| Factions | ✅ | ✅ | ✅ (optional) |
| Relationships | ✅ | ✅ | ✅ |
| Handouts | ✅ | ✅ | ✅ |
| Items/Treasure | ✅ | ✅ | ✅ |
| Arcs | ✅ | ✅ | ❌ (not needed) |
| Calendar | ✅ | ✅ | ❌ (not needed) |
| Random Tables | ✅ | ✅ | ✅ |
| Search | ✅ | ✅ | ✅ |
| Share Pages | ✅ | ✅ | ✅ |

---

## Content Types = Presets

### Campaign
- All modules available
- All modules enabled by default (or per user preset)
- Long-running, multiple sessions

### Adventure
- All modules available (identical to campaign)
- `duration_type = 'adventure'`
- Shorter duration expectation
- Same codebase, same tables, same components

### Oneshot
- All modules AVAILABLE (can be enabled)
- Fewer modules ENABLED by default
- Optimized for single-session prep
- Same codebase, same tables, same components

---

## Implementation (COMPLETE)

### Pattern Used: Dual FK with Constraint

Every unified table has:
```sql
campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
oneshot_id UUID REFERENCES oneshots(id) ON DELETE CASCADE,
content_type TEXT GENERATED ALWAYS AS (
  CASE
    WHEN campaign_id IS NOT NULL THEN 'campaign'
    WHEN oneshot_id IS NOT NULL THEN 'oneshot'
    ELSE NULL
  END
) STORED,

CONSTRAINT table_parent_check CHECK (
  (campaign_id IS NOT NULL AND oneshot_id IS NULL) OR
  (campaign_id IS NULL AND oneshot_id IS NOT NULL)
)
```

### Helper Functions

```sql
-- Check if user owns content
user_owns_content(campaign_id, oneshot_id, user_id) RETURNS BOOLEAN

-- Check if user can access (owner OR member)
user_can_access_content(campaign_id, oneshot_id, user_id) RETURNS BOOLEAN
```

### Tables Structure (IMPLEMENTED)

```
campaigns (parent)
oneshots (parent - recreated)

Shared child tables (all have campaign_id OR oneshot_id):
├── characters
├── sessions
├── timeline_events
├── canvas_groups
├── world_maps
├── media_gallery
├── campaign_lore
├── campaign_factions
├── tags
├── canvas_relationships
├── relationship_templates
├── locations (NEW)
├── quests (NEW)
├── encounters (NEW)
└── ... plus their related tables
```

---

## Unified Components

Every page component should work for ANY content type:

```tsx
// Instead of:
<CampaignCanvas campaignId={id} />
<OneshotCanvas oneshotId={id} />

// Should be:
<Canvas contentId={id} contentType="campaign" />
<Canvas contentId={id} contentType="oneshot" />

// Or even simpler with context:
<ContentProvider type="campaign" id={id}>
  <Canvas />
  <Locations />
  <Encounters />
  <Intelligence />
</ContentProvider>
```

---

## Benefits

1. **One codebase** - Fix a bug once, fixed everywhere
2. **Feature parity** - New feature for campaigns automatically available for oneshots
3. **Consistent UX** - Users learn one system
4. **Easier testing** - Test components once
5. **Flexible content** - Oneshot can "upgrade" to campaign by enabling modules
6. **Share pages** - One share system for all content types

---

## Migration Path

1. **Design unified tables** - Locations, Quests, Encounters with content_id/content_type pattern
2. **Build unified components** - Canvas, Maps, etc. that accept contentType prop
3. **Migrate oneshot data** - Move oneshot_npcs → characters, oneshot_locations → locations
4. **Deprecate old tables** - Keep for backwards compat, stop using
5. **Update share pages** - One share system

---

## Module Defaults by Content Type

| Module | Campaign Default | Adventure Default | Oneshot Default |
|--------|------------------|-------------------|-----------------|
| Canvas | ON | ON | OFF |
| Sessions | ON | ON | ON (single) |
| Timeline | ON | ON | OFF |
| Locations | ON | ON | ON |
| NPCs/Characters | ON | ON | ON |
| Encounters | ON | ON | ON |
| Quests | ON | ON | OFF |
| Maps | ON | ON | ON |
| Factions | ON | ON | OFF |
| Arcs | ON | ON | OFF |
| Calendar | OFF | OFF | OFF |
| Intelligence | ON | ON | ON |
| Handouts | ON | ON | ON |
| Items | ON | ON | ON |

User can always enable/disable any module regardless of content type.
