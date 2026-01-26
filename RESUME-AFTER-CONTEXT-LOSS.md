# RESUME POINT - Read This After Context Compression

> **START HERE** if context was compressed. This tells you exactly where we are.

## Current Status (2026-01-26)

**LOCATIONS FULLY INTEGRATED WITH CAMPAIGN INTELLIGENCE.**
**QUESTS UI - Design decisions finalized, ready to build.**

## What's Done

### Database (COMPLETE)
1. **Oneshot data deleted** - Fresh start
2. **Migration 081 applied** - `supabase/migrations/081_unified_content_system.sql`
3. **Migration 082 applied** - `supabase/migrations/082_unified_locations_quests_encounters.sql`

### Frontend Hooks (COMPLETE)
1. **ContentProvider** - `src/components/providers/ContentProvider.tsx`
2. **useContent** - `src/hooks/useContent.ts` (contentId, contentType, campaignId, oneshotId)
3. **useContentQuery** - Same file, for building unified DB queries
4. **useContentPermissions** - `src/hooks/useContentPermissions.ts`
5. **Example** - `src/components/unified/UnifiedCharacterList.tsx`

### Locations UI (COMPLETE)
**Full page at:** `src/app/(dashboard)/campaigns/[id]/locations/page.tsx`

Features built:
- **List view** - Cards with type badges, parent location, tags, status indicators
- **Tree view** - Hierarchical with expand/collapse, connecting lines
- **Detail modal** - Trello-style modal overlay (NOT sidebar), click-outside-to-close
- **Add/Edit modal** - Name, type, parent, description, tags, notes, secrets
- **Filtering** - Search + type filter dropdown
- **View toggle** - List/Tree switch with responsive text hiding
- **Secrets section** - Red styling, "DM Only" label
- **Status indicators** - Visited (green), Hidden (amber), Has Secrets (red)
- **Quests integration** - "Quests Here" section shows quests at this location

Location types: Region, City, Town, Village, Building, Tavern, Temple, Dungeon, Wilderness, Landmark, Camp, Other

### Campaign Intelligence - Location Detection (COMPLETE)
**Files:**
- `src/lib/ai/config.ts` - AI prompt with location_detected instructions
- `src/app/api/ai/analyze-campaign/route.ts` - Loads existing locations for deduplication
- `src/app/api/ai/suggestions/route.ts` - Creates location records on approval
- `src/app/(dashboard)/campaigns/[id]/intelligence/page.tsx` - Edit modal + bulk approval

Features:
- AI extracts locations from session notes (cities, taverns, dungeons, etc.)
- Existing locations loaded for context (avoids duplicates)
- Session chronology: higher session number = more recent truth
- **Edit modal**: Change name, type, parent location, description before approving
- **Bulk approval**: "Add All X Locations" button in sidebar
- Deduplication check on approval (case-insensitive name match)

### Navigation (COMPLETE)
All three new pages accessible from:
- **Sidebar** - `src/components/layout/sidebar.tsx`
- **Floating Dock** - `src/components/layout/floating-dock.tsx`
- **Navigation Map** - `src/components/layout/navigation-map.tsx`

### Placeholder Pages (COMPLETE)
- `src/app/(dashboard)/campaigns/[id]/quests/page.tsx`
- `src/app/(dashboard)/campaigns/[id]/encounters/page.tsx`

## Key Architecture (IMPLEMENTED)

**ONE unified system for campaigns, adventures, and oneshots.**

### Database Pattern
Every table has:
```sql
campaign_id UUID,  -- set for campaigns
oneshot_id UUID,   -- set for oneshots
content_type TEXT GENERATED ALWAYS AS (...) STORED,
CONSTRAINT: exactly one must be set
```

### Frontend Pattern
```tsx
<ContentProvider contentId={id} contentType="campaign">
  <UnifiedComponent />  // Uses useContent(), useContentPermissions()
</ContentProvider>
```

### Unified Tables
- `characters`, `sessions`, `timeline_events`, `canvas_groups`
- `world_maps`, `media_gallery`, `campaign_lore`, `campaign_factions`
- `tags`, `canvas_relationships`, `relationship_templates`
- `oneshots`, `oneshot_shares`, `oneshot_runs`
- `locations`, `quests`, `encounters` (NEW)

### DB Helper Functions
- `user_owns_content(campaign_id, oneshot_id, user_id)`
- `user_can_access_content(campaign_id, oneshot_id, user_id)`

## Immediate Next Step

**Build Quests System** - Full integration across the app.

### Quests Integration Plan (COMPLETE SCOPE)

**Philosophy**: Quests integrate with existing Session Workflow, NOT separate prep system. No duplication.

**Session System Context** (existing):
- 3 phases: Prep → Live → Completed
- 4 optional boxes: Prep Checklist, Quick Reference, Session Timer, Thoughts for Next
- Quick Reference already pins NPCs, characters, locations

**The Flow**:
1. Quest created in Quests page (or Intelligence detects from session notes)
2. DM pins quest to session via Quick Reference during prep
3. Session plays - DM references pinned quest
4. Session completes - DM writes notes mentioning quest progress
5. Intelligence reads notes → suggests status/objective updates → DM approves

### Full Quest Integration Points

| Location | Integration | Status |
|----------|-------------|--------|
| **Quests Page** | Main library, list + board views, objectives | ✅ DONE |
| **Quick Reference** | Pin quests to sessions (new pinnable type) | ✅ DONE |
| **Campaign Intelligence** | Detect quests/progress from session notes | ✅ DONE |
| **Canvas** | NPC cards show "Quest Giver for: X" | ✅ DONE |
| **Characters Detail** | "Quests involving this character" section | ✅ DONE |
| **Locations Detail** | "Quests at this location" section | ✅ DONE |
| **Sessions** | Link sessions to quests progressed | TODO |
| **Roll Random** | Button to pick random Available quest | ✅ DONE |
| **Share Page** | `/share/[code]/quests` for player visibility | TODO |

### Quests Page Features (COMPLETE)
**Full page at:** `src/app/(dashboard)/campaigns/[id]/quests/page.tsx`

Features built:
- **Board view only** - Trello-style Kanban with drag-and-drop (no list view)
- **Column visibility** - Dropdown to show/hide columns (Available, Active, Completed, Failed, Abandoned)
- **Detail levels** - Compact (name+type), Standard (+summary, quest giver), Detailed (+objectives, rewards)
- **Presets** - Quick presets: Focus Mode, Full Overview, DM Prep, Clean Slate
- **Settings saved** - Column and detail preferences saved to localStorage per campaign
- **Detail modal** - Trello-style modal overlay (NOT sidebar), click-outside-to-close
- **Add/Edit modal** - Progressive disclosure with expandable sections, NPC dropdown, location dropdown
- **Roll Random button** - Pick random quest from Available pool
- **Simple objectives** - Checklist style (no status-per-objective complexity)
- **Drag and drop** - Uses `@hello-pangea/dnd` for smooth column transitions

### Rolling Feature
- **"Roll Random" button** on Quests page
- Picks randomly from Available quests (quests not yet introduced to party)
- Simple implementation now, more complex Random Tables system in Phase 2

### Frontend Work Queue:
1. ~~**Build Locations UI**~~ ✅ DONE
2. ~~**Campaign Intelligence - Location Detection**~~ ✅ DONE
3. ~~**Build Quests Page**~~ ✅ DONE - List + board view, objectives, roll random
4. ~~**Update Quick Reference**~~ ✅ DONE - Quests now pinnable in sessions
5. ~~**Update Locations Detail**~~ ✅ DONE - "Quests at this location" in detail panel
6. ~~**Update Characters/Canvas**~~ ✅ DONE - "Quest Giver For" in character view modal
7. ~~**Campaign Intelligence - Quest Detection**~~ ✅ DONE - Detect from session notes
8. **Build Share Page** - `/share/[code]/quests` (NEXT)
9. **Build Encounters UI** - After quests complete
10. **Campaign Intelligence - Encounter Detection**
11. **Recreate Oneshots pages** - Using unified system

## Critical Reminders

1. **Campaign Intelligence integration is MANDATORY** - Every feature must consider:
   - Can this be auto-detected from session notes?
   - What's the approval workflow?
   - How to handle conflicts (newer = more recent truth)?
   - How to deduplicate against existing data?
2. **Share pages must stay in sync** with campaign pages - ALWAYS
3. **No "AI" branding** - call it "Intelligence"
4. **All modules available to all content types** - just different defaults
5. **Wife's campaigns are SAFE** - existing data untouched
6. **Use unified pattern** - `useContent()`, `useContentQuery()`, `useContentPermissions()`

## UI/UX Styling Guidelines (MANDATORY)

**STOP! READ THIS BEFORE BUILDING ANY NEW UI COMPONENTS.**

These patterns have been established after multiple iterations. Follow them EXACTLY.

### Cards - NO HARSH WHITE BORDERS

**WRONG** (causes ugly white outlines):
```tsx
<div className="border border-white/[0.06] bg-[#1a1a24] rounded-xl">
```

**CORRECT** (soft, subtle styling):
```tsx
// Normal state - NO border, just subtle background
<div className="bg-white/[0.03] hover:bg-white/[0.05] rounded-xl">

// Selected state - use ring-1, NOT border
<div className={cn(
  'rounded-xl transition-all',
  isSelected
    ? 'bg-[--arcane-purple]/15 ring-1 ring-[--arcane-purple]/40 shadow-lg shadow-purple-500/10'
    : 'bg-white/[0.03] hover:bg-white/[0.05]'
)}>
```

### Search Inputs - Prevent Icon Overlap

**WRONG** (icon overlaps placeholder text):
```tsx
<Search className="absolute left-3 ..." />
<input className="form-input pl-10" />
```

**CORRECT** (proper spacing - use pl-12 and left-4):
```tsx
<div className="relative flex-[2] min-w-[250px]">
  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
  <input className="form-input pl-12 w-full" placeholder="Search..." />
</div>
```

### Filter Dropdowns - Keep Narrow
```tsx
{/* Dropdowns should be narrow, search should be wide */}
<select className="form-input w-full sm:w-32">  {/* NOT w-40 */}
```

### View Toggles - Prevent Text Cutoff

**WRONG** (text gets cut off on narrow screens):
```tsx
<button className="px-3 py-2">
  <Icon className="w-4 h-4" />
  List
</button>
```

**CORRECT** (responsive with proper sizing):
```tsx
<div className="flex rounded-lg border border-[--border] overflow-hidden flex-shrink-0">
  <Tooltip content="Card list view">
    <button className={cn(
      'flex items-center gap-2 px-4 py-2 text-sm transition-colors whitespace-nowrap flex-shrink-0',
      isActive ? 'bg-[--arcane-purple]/20 text-[--arcane-purple]' : 'text-gray-400 hover:bg-white/5'
    )}>
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">List</span>
    </button>
  </Tooltip>
</div>
```

### Page Headers - Use Page-Specific Icons

**WRONG** (generic "M" logo):
```tsx
<CampaignPageHeader title="Quests" ... />
```

**CORRECT** (page-specific icon):
```tsx
<CampaignPageHeader
  title="Quests"
  icon={Target}
  iconColor="#8B5CF6"
  ...
/>
```

### Page Scrolling - Let Page Scroll Naturally

**WRONG** (forces internal scrolling which is confusing):
```tsx
<div className="flex flex-col h-[calc(100vh-56px)]">
  <div className="flex-shrink-0">Toolbar</div>
  <div className="flex-1 overflow-auto">Content</div>  {/* Bad! */}
</div>
```

**CORRECT** (page scrolls naturally):
```tsx
<div className="flex flex-col">
  <div>Toolbar</div>
  <div className="p-4">Content</div>  {/* No overflow constraints */}
</div>
```

### Detail Views - Centered Modal, NOT Sidebar

**WRONG** (old sidebar pattern OR modal pushed to top):
```tsx
// Sidebar pattern
<div className="flex">
  <div className="flex-1">Content</div>
  {selected && <DetailPanel className="w-96" />}
</div>

// Modal pushed to top
<div className="fixed inset-0 flex items-start pt-12 ...">
```

**CORRECT** (Trello-style modal, vertically AND horizontally centered):
```tsx
{selected && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
    <div className="fixed inset-0 bg-black/70" />
    <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1a1a24] rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
      {/* Color bar at top */}
      <div className="h-2 rounded-t-xl" style={{ backgroundColor: color }} />
      {/* Content */}
    </div>
  </div>
)}
```

### Drag and Drop (for Board Views)

Use `@hello-pangea/dnd` (maintained fork of react-beautiful-dnd):
```tsx
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'

<DragDropContext onDragEnd={handleDragEnd}>
  <Droppable droppableId={status}>
    {(provided) => (
      <div ref={provided.innerRef} {...provided.droppableProps}>
        {items.map((item, index) => (
          <Draggable key={item.id} draggableId={item.id} index={index}>
            {(provided, snapshot) => (
              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                <Card isDragging={snapshot.isDragging} />
              </div>
            )}
          </Draggable>
        ))}
        {provided.placeholder}
      </div>
    )}
  </Droppable>
</DragDropContext>
```

## Database Schema Notes

**CRITICAL: Always verify field names match actual database columns!**

Run this in Supabase SQL Editor to check any table:
```sql
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'locations';
```

### locations table (actual columns)
```
id, campaign_id, oneshot_id, content_type, name, type, description, summary,
parent_location_id, map_id, map_pin_x, map_pin_y, status, visibility,
discovered_session, dm_notes, secrets, created_at, updated_at
```

**NOT in database** (removed from frontend):
- `location_type` → use `type`
- `parent_id` → use `parent_location_id`
- `is_visited`, `is_known`, `tags`, `notes`, `current_characters` → don't exist

### quests table (actual columns)
```
id, campaign_id, oneshot_id, name, type, description, summary, status, priority,
quest_giver_id, quest_giver_location_id, objective_location_id,
rewards_description, rewards_xp, rewards_gold, dm_notes, secrets, visibility,
discovered_session, started_session, completed_session, created_at, updated_at
```

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/hooks/useContent.ts` | Unified content hook |
| `src/hooks/useContentPermissions.ts` | Unified permissions |
| `src/components/providers/ContentProvider.tsx` | Context provider |
| `src/components/unified/UnifiedCharacterList.tsx` | Example component |
| `src/app/(dashboard)/campaigns/[id]/locations/page.tsx` | **Locations UI (COMPLETE)** |
| `src/app/(dashboard)/campaigns/[id]/quests/page.tsx` | Quests placeholder |
| `src/app/(dashboard)/campaigns/[id]/encounters/page.tsx` | Encounters placeholder |
| `DESIGN-locations.md` | Locations UI spec |
| `DESIGN-quests.md` | Quests UI spec |
| `DESIGN-encounters.md` | Encounters UI spec |
| `supabase/migrations/081_unified_content_system.sql` | Unified DB schema |
| `supabase/migrations/082_unified_locations_quests_encounters.sql` | New tables |
