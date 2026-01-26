# RESUME POINT - Read This After Context Compression

> **START HERE** if context was compressed. This tells you exactly where we are.

## Current Status (2026-01-26)

**LOCATIONS UI COMPLETE. Quests and Encounters have placeholder pages.**

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
- **Detail panel** - Slide-out with full info, edit/delete buttons
- **Add/Edit modal** - Name, type, parent, description, tags, notes, secrets
- **Filtering** - Search + type filter dropdown
- **View toggle** - List/Tree switch
- **Secrets section** - Red styling, "DM Only" label
- **Status indicators** - Visited (green), Hidden (amber), Has Secrets (red)

Location types: Region, City, Town, Village, Building, Tavern, Temple, Dungeon, Wilderness, Landmark, Camp, Other

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

**Build Quests UI** - Next unified feature.

### Frontend Work Queue:
1. ~~**Build Locations UI**~~ ✅ DONE
2. **Build Quests UI** - List, board view, status tracking, objectives
3. **Build Encounters UI** - Prep view, session linking
4. **Recreate Oneshots pages** - Using unified system
5. **Update existing campaign components** - Migrate to ContentProvider (optional, can do incrementally)

## Critical Reminders

1. **Share pages must stay in sync** with campaign pages - ALWAYS
2. **No "AI" branding** - call it "Intelligence"
3. **All modules available to all content types** - just different defaults
4. **Wife's campaigns are SAFE** - existing data untouched
5. **Use unified pattern** - `useContent()`, `useContentQuery()`, `useContentPermissions()`
6. **Deduplication** - When Intelligence detects locations/quests, check if they already exist before creating

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
