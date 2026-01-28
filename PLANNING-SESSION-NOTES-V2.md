# Session Notes System Redesign v2 - Comprehensive Plan

## Executive Summary

This document covers the complete redesign of the Session Notes system, including:
1. **Prep Phase** - Optional modules redesign with progressive enhancement
2. **Completed Phase** - Standard vs Enhanced view modes (FIX CURRENT BUGS)
3. **Random Tables** - New campaign feature under World
4. **Campaign Settings** - Update Session Defaults for new modules
5. **View Toggle** - Move from localStorage to user_settings DB
6. **Data Migration** - Moving existing data to new schema

---

## CRITICAL BUGS TO FIX (Current State)

### Bug 1: Standard Mode Shows Wrong Fields
**Current behavior:** Both Standard and Enhanced mode edit `formData.summary` in the main editor
**Correct behavior:**
- Standard mode should edit `formData.notes` directly
- Standard mode should NOT see "Quick Recap" OR "Detailed Notes"

### Bug 2: Toggle Uses localStorage
**Current behavior:** `localStorage.getItem('session-enhanced-view')`
**Correct behavior:** Store in `user_settings` table so it syncs across devices

### Bug 3: Detailed Notes Always Shows
**Current behavior:** "Detailed Notes" section shows if notes exist OR if Enhanced mode
**Correct behavior:**
- Standard mode: NO "Detailed Notes" section at all
- Enhanced mode: Shows "Session Notes" (the notes field) always visible

---

## Part 1: Prep Phase Optional Modules

### Current State
- SessionWorkflow has `Prep Notes` + optional modules (Checklist, Quick References)
- Modules are visually connected to Prep Notes (need separation)
- Limited module options

### New Module System

#### Design Philosophy
> "Designed for many types of DMs - use what works for you."

DMs have different prep styles:
- **Minimal DM**: Just bullet points
- **Detailed DM**: Full scene breakdowns
- **Combat DM**: Focus on encounters
- **Narrative DM**: Focus on story beats
- **Improv DM**: Just enough to riff from

Our system should support ALL of them without making any feel wrong.

#### Available Modules (Expanded)

| Module | Description | Color | Icon |
|--------|-------------|-------|------|
| **Checklist** | Prep tasks (existing) | Yellow | ClipboardList |
| **Quick References** | Text notes (existing) | Blue | Pin |
| **Session Goals** | What you want to accomplish | Green | Target |
| **Key NPCs** | Quick NPC reference (links to campaign characters) | Purple | Users |
| **Random Tables** | Quick roll tables (links to campaign library) | Orange | Dices |
| **Music & Ambiance** | Spotify/YouTube links, mood notes | Pink | Music |
| **Session Opener** | Read-aloud text, recap script | Amber | BookOpen |

#### UI Layout (FINAL)

**Design Philosophy:**
- Pre-collapsed sections showing title + description (user can judge before expanding)
- Click anywhere on the row to expand/activate
- Auto-expanded if enabled in Campaign Settings
- If left empty, doesn't count as "active" (won't clutter future views)
- All fields auto-save (like Notion)

```
┌──────────────────────────────────────────────────────────────────┐
│ Session 12: The Sewer Infiltration          [Prep] [Completed]   │
│ March 15, 2025                                       (auto-saved)│
├──────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 💡 From Previous Session                           [Dismiss] │ │
│ │ "Party left heading toward the sewers..."                    │ │
│ │ (from last session's "Thoughts for Next")                    │ │
│ └──────────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ PREP NOTES                                                       │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ [Rich Text Editor - AUTO-SAVES]                              │ │
│ │                                                              │ │
│ │ Placeholder: "Plan your session however you like - scene     │ │
│ │ ideas, NPC notes, encounters, or just a quick bullet list."  │ │
│ │                                                              │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ─────────────── OPTIONAL MODULES ───────────────                 │
│                                                                  │
│ Every DM preps differently - and that's the point. These tools   │
│ are here if you want them, not because you need them.            │
│                                                                  │
│ 💡 Set your defaults in Campaign Settings                        │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ▸ Session Goals                                   (Green)    │ │
│ │   What do you want to accomplish this session?               │ │
│ │   Keep it simple - even one goal helps you stay focused.     │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ▸ Key NPCs                                        (Purple)   │ │
│ │   Quick reference to NPCs likely to appear. Link existing    │ │
│ │   characters or add quick notes for improvised NPCs.         │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ▸ Random Tables                                   (Orange)   │ │
│ │   Quick roll tables for improvisation. Pin tables from your  │ │
│ │   campaign library for easy access during play.              │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ▸ Music & Ambiance                                (Pink)     │ │
│ │   Playlists and mood settings. Paste Spotify/YouTube links   │ │
│ │   or just write "creepy ambient for the dungeon."            │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ▸ Session Opener                                  (Amber)    │ │
│ │   Read-aloud text to start the session. "Last time, our      │ │
│ │   heroes..." Great for "previously on" recaps.               │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ▸ Checklist                                       (Yellow)   │ │
│ │   Prep tasks to complete before the session. Check them off  │ │
│ │   as you go.                                                 │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ▸ Quick References                                (Cyan)     │ │
│ │   Text notes for quick access during the session.            │ │
│ │   One item per line.                                         │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### Module Behavior

1. **Collapsed by default** - Shows title + description, user decides if they want it
2. **Click to expand** - Opens the module with its input fields
3. **Auto-expanded** - If Campaign Settings has this module enabled by default
4. **Empty = inactive** - If user expands, looks at it, but leaves empty → not saved as active
5. **Has content = active** - If user adds content, it persists and shows expanded next time
6. **Color-coded borders** - Subtle accent color on left border when expanded
7. **Auto-save** - All fields save automatically after 1.5s debounce

#### Expanded Module Example

When user clicks to expand Session Goals:
```
┌──────────────────────────────────────────────────────────────────┐
│ ▾ Session Goals                                     [× Remove]   │
│   What do you want to accomplish this session?                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ • Introduce the BBEG's lieutenant                            │ │
│ │ • Players reach the underground temple                       │ │
│ │ • At least one combat encounter                              │ │
│ │ [+ Add goal]                                                 │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                        (auto-saves when you type)│
└──────────────────────────────────────────────────────────────────┘
```

#### Module Card Component

```tsx
// Module Card Structure
<div className={cn(
  "rounded-xl overflow-hidden transition-all",
  expanded
    ? "bg-[module-color]/5 border border-[module-color]/30"
    : "bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12]"
)}>
  <button
    onClick={() => setExpanded(!expanded)}
    className="w-full p-4 text-left"
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {expanded ? <ChevronDown /> : <ChevronRight />}
        <Icon className={cn("w-5 h-5", expanded ? "text-[module-color]" : "text-gray-500")} />
        <span className="font-medium text-white">{name}</span>
      </div>
      {expanded && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }}>
          <X className="w-4 h-4 text-gray-500 hover:text-red-400" />
        </button>
      )}
    </div>
    <p className="text-xs text-gray-500 mt-1 ml-7">{description}</p>
  </button>

  {expanded && (
    <div className="px-4 pb-4 border-t border-[module-color]/10">
      {/* Module-specific content */}
    </div>
  )}
</div>
```

#### Module Persistence

- **Per-session**: Each session stores which modules have content (not just which are "enabled")
- **Campaign defaults**: Campaign settings specify which modules auto-expand for new sessions
- **Database column**: `enabled_prep_modules TEXT[]` tracks modules with actual content

#### Module Content Details

**Session Goals**
```tsx
<div className="space-y-3">
  <p className="text-xs text-gray-500">What do you want to accomplish this session?</p>
  <textarea
    placeholder="- Introduce the BBEG's lieutenant&#10;- Players reach the underground temple&#10;- At least one combat encounter"
    className="form-input w-full min-h-[100px]"
  />
</div>
```

**Key NPCs** (Links to campaign characters)
```tsx
<div className="space-y-3">
  <p className="text-xs text-gray-500">NPCs likely to appear this session</p>
  {/* Character picker from campaign */}
  <div className="flex flex-wrap gap-2">
    {selectedNpcs.map(npc => (
      <div className="flex items-center gap-2 px-2 py-1 bg-purple-500/10 rounded-lg">
        <Avatar src={npc.image_url} size="xs" />
        <span className="text-sm">{npc.name}</span>
        <button onClick={() => removeNpc(npc.id)}><X /></button>
      </div>
    ))}
  </div>
  <button onClick={openNpcPicker}>+ Add NPC</button>
  <textarea
    placeholder="Quick notes about their mood, goals, or what they know..."
    className="form-input w-full"
  />
</div>
```

**Random Tables** (Links to campaign library)
```tsx
<div className="space-y-3">
  <p className="text-xs text-gray-500">Quick roll tables for this session</p>
  {/* Reference to campaign random tables */}
  <div className="space-y-2">
    {sessionTables.map(table => (
      <QuickRollTable table={table} onRoll={handleRoll} />
    ))}
  </div>
  <button onClick={openTableSelector}>+ Add Table from Library</button>
  {/* Or create a quick inline table */}
  <button onClick={createQuickTable}>+ Create Quick Table</button>
</div>
```

**Music & Ambiance**
```tsx
<div className="space-y-3">
  <p className="text-xs text-gray-500">Playlists and mood settings</p>
  <div className="space-y-2">
    {musicLinks.map(link => (
      <div className="flex items-center gap-2">
        <Music className="w-4 h-4" />
        <input value={link.label} placeholder="Combat music" />
        <input value={link.url} placeholder="Spotify/YouTube URL" />
        <button onClick={() => removeLink(link.id)}><X /></button>
      </div>
    ))}
  </div>
  <button onClick={addMusicLink}>+ Add Link</button>
  <textarea
    placeholder="Mood notes: Dark, tense atmosphere in the sewers. Dripping water sounds."
    className="form-input w-full"
  />
</div>
```

**Session Opener**
```tsx
<div className="space-y-3">
  <p className="text-xs text-gray-500">Read-aloud text to start the session</p>
  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
    <textarea
      placeholder="Last time, our heroes..."
      className="form-input w-full min-h-[100px] bg-transparent border-none"
    />
  </div>
  <p className="text-xs text-gray-400">
    Tip: Great for "previously on..." recaps or setting the scene
  </p>
</div>
```

---

## Part 2: Completed Phase Layout

### View Modes

**Standard Mode** (Default for all users)
- Single "Session Notes" field (`notes` column)
- Simple, focused interface
- No Quick Recap, no Expand Notes

**Enhanced Mode** (Mods+ only, opt-in toggle)
- "Quick Recap" field (`summary` column)
- "Expand Notes" button (processes summary → outputs to notes)
- "Session Notes" field (`notes` column) - always visible
- Quick Recap stays visible (reformatted into bullet points by Expand Notes)

### Database Field Mapping

| Field | Standard Mode Label | Enhanced Mode Label |
|-------|---------------------|---------------------|
| `summary` | (not shown) | "Quick Recap" |
| `notes` | "Session Notes" | "Session Notes" |
| `dm_notes` | "DM Notes" | "DM Notes" |

### Standard Mode Layout (FINAL)

**Design Philosophy:**
- Beginners see: Session Notes + Attendance + Thoughts for Next
- Everything else is optional and clearly separated
- Auto-save on ALL fields (like Notion)
- Show "(auto-saved)" indicator so users know nothing is lost

```
┌──────────────────────────────────────────────────────────────────┐
│ Session 12: The Sewer Infiltration          [Prep] [Completed]   │
│ March 15, 2025                                       (auto-saved)│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Session Status: [Private ▾]                                      │
│ Players cannot see this session                                  │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ SESSION NOTES                           <- Edits `notes` field   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ [Rich Text Editor - AUTO-SAVES]                              │ │
│ │                                                              │ │
│ │ Placeholder: "What happened this session? Try mentioning     │ │
│ │ NPCs talked to, locations visited, key decisions..."         │ │
│ │                                                              │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ [ ] Share with players                                           │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ATTENDANCE                                                       │
│ Who was present this session?                                    │
│ [✓] Valeria  [✓] Thorin  [ ] Mira                               │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ THOUGHTS FOR NEXT SESSION                 (encouraged, not opt.) │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ [Text area - AUTO-SAVES]                                     │ │
│ │ Placeholder: "Ideas for next session - loose threads,        │ │
│ │ player interests to follow up on..."                         │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ 💡 These notes will appear when you create your next session.    │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ─────────────── OPTIONAL SECTIONS ───────────────                │
│                                                                  │
│ Every DM records sessions differently. These tools are           │
│ here if you want them, not because you need them.                │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ▸ DM Notes (Private)                                         │ │
│ │   Private notes about this session - plot threads, player    │ │
│ │   behaviors, things to remember. Never visible to players.   │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ▸ Session Content                                            │ │
│ │   Link quests and encounters featured in this session.       │ │
│ │   Campaign Intelligence can detect these from your notes.    │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ ▸ Player Notes (2 notes)                                     │ │
│ │   Notes from players about this session from their           │ │
│ │   character's perspective.                                   │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**What's REMOVED for Standard mode:**
- ❌ "Quick Recap" - doesn't exist in Standard
- ❌ "Detailed Notes" section - the main Session Notes IS the detailed notes
- ❌ "Expand Notes" button - Enhanced mode only

**Thoughts for Next flow:**
1. DM writes in "Thoughts for Next Session" at end of Session 12
2. When DM creates Session 13, the "From Previous Session" banner shows those thoughts
3. This already works in SessionWorkflow - just repositioning the field

### Enhanced Mode Layout (FINAL - Mods+ Only)

**Same as Standard, PLUS:**
- Quick Recap section at top (edits `summary`)
- "Expand Notes" button
- Both Quick Recap AND Session Notes always visible

```
┌──────────────────────────────────────────────────────────────────┐
│ Session 12: The Sewer Infiltration          [Prep] [Completed]   │
│ March 15, 2025                   [Standard][Enhanced] (auto-saved)│
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Session Status: [Private ▾]                                      │
│ Players cannot see this session                                  │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ QUICK RECAP                     [Expand Notes]  <- Edits `summary`│
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ [Rich Text Editor - smaller, ~150px - AUTO-SAVES]            │ │
│ │                                                              │ │
│ │ Placeholder: "Quick bullets about what happened. Click       │ │
│ │ 'Expand Notes' to generate detailed session notes."          │ │
│ │                                                              │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ SESSION NOTES                               <- Edits `notes`     │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ [Rich Text Editor - main content, ~300px - AUTO-SAVES]       │ │
│ │                                                              │ │
│ │ (Generated from Expand Notes, or manually written/edited)    │ │
│ │                                                              │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ [ ] Share with players                                           │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ATTENDANCE                                                       │
│ Who was present this session?                                    │
│ [✓] Valeria  [✓] Thorin  [ ] Mira                               │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ THOUGHTS FOR NEXT SESSION                 (encouraged, not opt.) │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ [Text area - AUTO-SAVES]                                     │ │
│ └──────────────────────────────────────────────────────────────┘ │
│ 💡 These notes will appear when you create your next session.    │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ─────────────── OPTIONAL SECTIONS ───────────────                │
│ (Same as Standard mode - DM Notes, Session Content, Player Notes)│
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Expand Notes flow:**
1. Mod writes quick bullets in Quick Recap (`summary`)
2. Clicks "Expand Notes"
3. Campaign Intelligence processes → outputs to Session Notes (`notes`)
4. ALSO reformats Quick Recap into nice bullet points
5. Both fields remain visible and editable
6. Wife can read the formatted Quick Recap bullets

### Expand Notes Behavior

When "Expand Notes" is clicked:
1. Takes `summary` (Quick Recap) content
2. Processes through Campaign Intelligence
3. Generates detailed prose in `notes` field
4. **ALSO** reformats Quick Recap into nice bullet points
5. Both fields remain visible and editable

This is why we keep both fields visible - the Quick Recap becomes a formatted summary.

### Toggle Implementation (DB-Stored)

The toggle must be stored in the database, not localStorage, so it syncs across devices.

**Storage location:** `user_settings.session_enhanced_view` (boolean, default false)

```tsx
// Hook to get/set enhanced view preference
const useEnhancedViewPreference = () => {
  const { settings, updateSettings } = useUserSettings()

  const useEnhancedView = settings?.session_enhanced_view ?? false

  const setUseEnhancedView = async (value: boolean) => {
    await updateSettings({ session_enhanced_view: value })
  }

  return { useEnhancedView, setUseEnhancedView }
}

// In session detail page
const { settings } = useAppStore()
const isModOrAbove = settings?.role === 'moderator' || settings?.role === 'super_admin'
const { useEnhancedView, setUseEnhancedView } = useEnhancedViewPreference()
const showEnhancedView = isModOrAbove && useEnhancedView

// Toggle UI in header
{isModOrAbove && (
  <div className="flex items-center bg-white/[0.03] rounded-lg border border-white/[0.08] p-1">
    <button
      onClick={() => setUseEnhancedView(false)}
      className={cn(
        "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
        !useEnhancedView
          ? "bg-[--arcane-purple] text-white"
          : "text-gray-400 hover:text-white"
      )}
    >
      Standard
    </button>
    <button
      onClick={() => setUseEnhancedView(true)}
      className={cn(
        "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
        useEnhancedView
          ? "bg-[--arcane-purple] text-white"
          : "text-gray-400 hover:text-white"
      )}
    >
      Enhanced
    </button>
  </div>
)}
```

**Database change needed:**
```sql
-- Add to user_settings table
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS session_enhanced_view BOOLEAN DEFAULT FALSE;
```

---

## Part 3: Random Tables - Campaign Feature

### Research Summary

Based on research of [Donjon](https://donjon.bin.sh/), [Chartopia](https://chartopia.d12dev.com/), [Perchance.org](https://www.perchance.org/), and [Sly Flourish's recommendations](https://slyflourish.com/good_books_of_random_tables.html):

**Key Principles:**
1. **Tables should inspire, not dictate** - DMs pick what fits
2. **Variety is crucial** - 1000+ items per category to avoid repetition
3. **Categories should match common prep needs** - Names, rumors, encounters, treasure
4. **Custom tables are essential** - DMs want campaign-specific content
5. **Quick rolling** - Shouldn't break immersion

### Feature Location

**Campaign Sidebar > World > Random Tables**

This sits alongside Locations, Factions, Lore, Timeline - it's world-building content.

### Category Structure

#### Default Categories (Starter Templates)

| Category | Description | Item Count |
|----------|-------------|------------|
| **NPC Names** | By culture/region | 1000+ per culture |
| **Tavern Names** | Fantasy inn/tavern names | 500+ |
| **Shop Names** | Various shop types | 500+ |
| **Rumors & Hooks** | Plot seeds, gossip | 200+ |
| **Random Encounters** | By environment | 100+ per environment |
| **Treasure & Loot** | By tier/type | 500+ |
| **NPC Quirks** | Personality traits | 300+ |
| **Weather** | By climate/season | 50+ per climate |
| **Town Events** | Things happening in town | 200+ |
| **Dungeon Dressing** | Room details, features | 300+ |

#### Custom Tables

DMs can create their own tables with:
- Custom name
- Description
- Items (weighted or equal probability)
- Tags for organization
- Campaign-specific content

### Database Schema

```sql
-- Random tables library
CREATE TABLE random_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Basic info
  name TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'names', 'encounters', 'treasure', etc.

  -- Table type
  table_type TEXT DEFAULT 'simple' CHECK (table_type IN ('simple', 'weighted', 'nested')),

  -- For built-in starter tables
  is_starter_template BOOLEAN DEFAULT FALSE,
  starter_template_id TEXT, -- e.g., 'npc_names_common', 'tavern_names'

  -- Items (JSONB array)
  items JSONB DEFAULT '[]',
  -- Format: [{ "text": "...", "weight": 1, "tags": [] }, ...]

  -- Meta
  tags TEXT[] DEFAULT '{}',
  roll_count INTEGER DEFAULT 0, -- Track usage
  last_rolled_at TIMESTAMPTZ,

  -- Visibility
  visibility TEXT DEFAULT 'dm_only' CHECK (visibility IN ('public', 'party', 'dm_only')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_random_tables_campaign ON random_tables(campaign_id);
CREATE INDEX idx_random_tables_category ON random_tables(category);

-- Session quick tables (references to campaign tables used in session prep)
CREATE TABLE session_random_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  table_id UUID REFERENCES random_tables(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### UI Design

#### Campaign Random Tables Page

```
┌──────────────────────────────────────────────────────────────────┐
│ Random Tables                              [+ Create Table]      │
│ Roll from your campaign's tables or use starter templates        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ [Search...]                    [Category: All ▾]                 │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ MY TABLES                                                        │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ 🎲 Waterdeep NPC Names                              [Roll] │   │
│ │ Names for Waterdhavian citizens                            │   │
│ │ 47 items · Rolled 12 times                                 │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ 🎲 Sewer Encounters                                 [Roll] │   │
│ │ Random things in the Waterdeep sewers                      │   │
│ │ 23 items · Rolled 5 times                                  │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ STARTER TEMPLATES                          [Add All to Campaign] │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ 📚 NPC Names - Common                               [Add]  │   │
│ │ 1,200+ fantasy names for common folk                       │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ 📚 Tavern Names                                     [Add]  │   │
│ │ 500+ creative tavern and inn names                         │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ 📚 Random Encounters - Urban                        [Add]  │   │
│ │ 150+ city encounter ideas                                  │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

#### Roll Animation (RollReveal Style)

We'll create a **RollTableReveal** component similar to the existing RollReveal:

**Animation Phases:**
1. **Summon** (0.5s) - Arcane circle appears
2. **Shuffle** (1.0s) - Items cascade/shuffle visually
3. **Draw** (0.5s) - Single item highlighted
4. **Reveal** (0.3s) - Result displayed with flair

**Key Differences from Encounter Roll:**
- Simpler visual (text items vs cards)
- Slot machine / wheel aesthetic
- Quick reroll option
- Copy to clipboard option

```tsx
<RollTableReveal
  table={selectedTable}
  isOpen={showRoll}
  onClose={() => setShowRoll(false)}
  onAccept={(item) => {
    // Maybe copy to clipboard or insert into notes
  }}
  renderResult={(item) => (
    <div className="text-center py-4">
      <p className="text-2xl font-bold text-white">{item.text}</p>
      {item.tags && (
        <div className="flex justify-center gap-2 mt-2">
          {item.tags.map(tag => (
            <span className="text-xs px-2 py-0.5 bg-white/10 rounded">{tag}</span>
          ))}
        </div>
      )}
    </div>
  )}
/>
```

**Slot Machine Visual:**

```
     ╔═══════════════════════════════╗
     ║                               ║
     ║    ▲  Elara Moonwhisper  ▲    ║  <- fading out
     ║                               ║
     ╠═══════════════════════════════╣
     ║                               ║
     ║    ★  THADDEUS IRONFORGE  ★   ║  <- SELECTED (glowing)
     ║                               ║
     ╠═══════════════════════════════╣
     ║                               ║
     ║    ▼  Bramble Thornfoot  ▼    ║  <- fading out
     ║                               ║
     ╚═══════════════════════════════╝

         [Roll Again]  [Copy]  [Use]
```

### Starter Template Data

We'll need to create JSON files with 1000+ items per category. Example structure:

```json
// /data/random-tables/npc-names-common.json
{
  "id": "npc_names_common",
  "name": "NPC Names - Common",
  "description": "Generic fantasy names for commoners, merchants, guards, etc.",
  "category": "names",
  "items": [
    { "text": "Aldric Stonehammer", "tags": ["male", "dwarf"] },
    { "text": "Elara Brightwater", "tags": ["female", "human"] },
    { "text": "Thaddeus Ironforge", "tags": ["male", "human"] },
    // ... 1000+ more
  ]
}
```

**Data Sources Strategy:**
1. **Public Domain**: Fantasy name generators, SRD content
2. **Generated**: Use GPT/Claude to generate massive lists
3. **Community**: Allow export/import for sharing
4. **Algorithm**: Some tables can use combinatorial generation (e.g., "[Adjective] [Noun] Tavern")

### Integration with Session Prep

In the **Random Tables** session module:

```tsx
// Session prep Random Tables module
<div className="space-y-3">
  <p className="text-xs text-gray-500">
    Quick roll tables for this session
  </p>

  {sessionTables.map(table => (
    <div key={table.id} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
      <Dices className="w-4 h-4 text-orange-400" />
      <span className="flex-1 text-sm">{table.name}</span>
      <button
        onClick={() => rollTable(table)}
        className="btn btn-sm btn-ghost"
      >
        Roll
      </button>
      <button onClick={() => removeTable(table.id)}>
        <X className="w-4 h-4 text-gray-500" />
      </button>
    </div>
  ))}

  <button
    onClick={openTableSelector}
    className="btn btn-sm btn-ghost w-full"
  >
    + Add Table from Library
  </button>
</div>
```

---

## Part 3.5: Campaign Settings Updates

The Campaign Settings page (`settings/page.tsx`) needs updates to support new modules.

### Current Session Defaults Section

Currently shows these toggleable sections:
- `prep_checklist` - Prep Checklist
- `thoughts_for_next` - Thoughts for Next Session
- `quick_reference` - Quick Reference
- `session_timer` - Session Timer (REMOVE - timer feature is being removed)

### New Module Toggles

Add these new modules to the Session Defaults section:

| Module ID | Label | Description | Color |
|-----------|-------|-------------|-------|
| `session_goals` | Session Goals | What you want to accomplish this session | Green |
| `key_npcs` | Key NPCs | Quick reference to NPCs likely to appear | Purple |
| `random_tables` | Random Tables | Quick roll tables for improvisation | Orange |
| `music_ambiance` | Music & Ambiance | Playlists and mood settings | Pink |
| `session_opener` | Session Opener | Read-aloud text to start the session | Amber |
| `prep_checklist` | Checklist | Prep tasks to complete | Yellow |
| `quick_reference` | Quick References | Text notes and references | Cyan |

**Remove:**
- `session_timer` - Timer feature is being removed

### Updated Campaign Settings UI

```
┌─────────────────────────────────────────────────────────────────┐
│ SESSION DEFAULTS                                                 │
│ Default settings for new sessions                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Default Prep Modules                                            │
│ Modules automatically enabled when creating new sessions        │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [ ] Session Goals                                           │ │
│ │     What you want to accomplish this session                │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ [ ] Key NPCs                                                │ │
│ │     Quick reference to NPCs likely to appear                │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ [ ] Random Tables                                           │ │
│ │     Quick roll tables for improvisation                     │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ [ ] Music & Ambiance                                        │ │
│ │     Playlists and mood settings                             │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ [ ] Session Opener                                          │ │
│ │     Read-aloud text to start the session                    │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ [✓] Checklist                                               │ │
│ │     Prep tasks to complete                                  │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ [ ] Quick References                                        │ │
│ │     Text notes and references                               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Default Prep Checklist Items                                    │
│ These items will be added to every new session                  │
│ [Existing checklist editor UI...]                               │
│                                                                 │
│                                            [Save Session Defaults]│
└─────────────────────────────────────────────────────────────────┘
```

### Database: SessionSection Type Update

Update the `SessionSection` type in `types/database.ts`:

```typescript
export type SessionSection =
  | 'prep_checklist'
  | 'thoughts_for_next'
  | 'quick_reference'
  | 'session_goals'       // NEW
  | 'key_npcs'            // NEW
  | 'random_tables'       // NEW
  | 'music_ambiance'      // NEW
  | 'session_opener'      // NEW
// REMOVED: 'session_timer'
```

---

## Part 4: Data Migration

### Summary → Notes Migration

For existing sessions where users wrote in `summary` but not `notes`:

```sql
-- Migration: Move summary content to notes where notes is empty
UPDATE sessions
SET notes = summary
WHERE
  summary IS NOT NULL
  AND summary != ''
  AND (notes IS NULL OR notes = '');

-- Don't clear summary - it's still used for Enhanced mode users
```

**Why this migration:**
- Standard mode users see ONLY `notes`
- If we don't migrate, their content disappears
- Enhanced mode users won't be affected (they see both)

### Phase Migration (Already Done)

```sql
-- Already in migration 093
UPDATE sessions SET phase = 'completed' WHERE phase = 'live';
```

### New Columns (Already Added)

From migration 093:
- `prep_notes TEXT`
- `state TEXT` (private/open/locked)
- `share_notes_with_players BOOLEAN`
- `enabled_prep_modules TEXT[]`

### New Columns Needed

```sql
-- For new session modules
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS session_goals TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS key_npcs UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS key_npcs_notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS music_links JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS music_notes TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS session_opener TEXT DEFAULT '';

-- For enhanced view toggle (stored in user_settings, not localStorage)
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS session_enhanced_view BOOLEAN DEFAULT FALSE;
```

---

## Part 5: Implementation Order

### Phase 0: Critical Fixes (Immediate - Before Anything Else)
1. **Move toggle to DB** - Change from `localStorage` to `user_settings.session_enhanced_view`
2. **Fix Standard mode** - Edit `notes` field directly, remove "Detailed Notes" section entirely
3. **Fix Enhanced mode** - Show both `summary` (Quick Recap) AND `notes` (Session Notes) always
4. **Data migration** - Move `summary` → `notes` where notes is empty (so Standard users don't lose content)

### Phase 1: Completed Page Polish
1. Ensure proper field labels and placeholders
2. Test Expand Notes flow (summary → AI → notes)
3. Verify mobile variant matches desktop

### Phase 2: Prep Page Modules (Week 1)
1. Separate Optional Modules section from Prep Notes visually
2. Add explanatory text about DM flexibility
3. Implement toggle grid for module selection
4. Add new module types (Session Goals, Key NPCs, Music, Session Opener)
5. Make modules collapsible cards
6. Connect Key NPCs to campaign characters

### Phase 3: Random Tables - Database & API (Week 2)
1. Create `random_tables` and `session_random_tables` tables
2. Create API routes for CRUD operations
3. Design starter template JSON data structure
4. Generate/source starter template content (1000+ items per category)

### Phase 4: Random Tables - UI (Week 3)
1. Create campaign Random Tables page under World
2. Create table editor modal
3. Create RollTableReveal animation component
4. Integrate with session prep module

### Phase 5: Polish & Testing (Week 4)
1. Mobile variants for all new UI
2. Campaign settings for default modules
3. Intelligence integration (detect tables from session notes?)
4. Performance testing with large tables

---

## Files to Modify

| File | Changes |
|------|---------|
| `page.tsx` (session detail) | Fix Standard/Enhanced field binding, move toggle to DB |
| `page.mobile.tsx` | Same changes for mobile |
| `SessionWorkflow.tsx` | Complete rebuild with new module system, remove timer |
| `settings/page.tsx` (campaign settings) | Update Session Defaults section with new modules, remove timer |
| `hooks/useUserSettings.ts` | Add `session_enhanced_view` field support |
| `components/sessions/PrepModules/` | New directory for module components |
| `components/sessions/PrepModules/SessionGoals.tsx` | New component |
| `components/sessions/PrepModules/KeyNpcs.tsx` | New component (links to campaign characters) |
| `components/sessions/PrepModules/MusicAmbiance.tsx` | New component |
| `components/sessions/PrepModules/SessionOpener.tsx` | New component |
| `components/sessions/PrepModules/RandomTables.tsx` | New component (links to campaign tables) |
| `components/roll-reveal/RollTableReveal.tsx` | New component for table rolling |
| `app/(dashboard)/campaigns/[id]/world/random-tables/page.tsx` | New page |
| `api/campaigns/[id]/random-tables/` | New API routes |
| `supabase/migrations/094_session_notes_fix.sql` | Toggle column, summary→notes migration |
| `supabase/migrations/095_session_modules.sql` | Module columns |
| `supabase/migrations/096_random_tables.sql` | Random tables feature |
| `supabase/migrations/097_user_campaign_preferences.sql` | Per-user-per-campaign layout preferences |
| `components/sessions/CustomizeLayoutModal.tsx` | Drag-based layout customization modal |
| `components/sessions/HideSectionModal.tsx` | "Hide for this session" vs "Hide permanently" modal |
| `types/database.ts` | Regenerate after migrations |

---

## Verification Checklist

### Phase 0: Critical Fixes
- [ ] Toggle stored in `user_settings.session_enhanced_view` (NOT localStorage)
- [ ] Standard mode edits `notes` field (NOT `summary`)
- [ ] Standard mode shows ONLY "Session Notes" (no "Quick Recap", no "Detailed Notes")
- [ ] Enhanced mode shows both `summary` (Quick Recap) AND `notes` (Session Notes)
- [ ] Enhanced mode: Both fields always visible
- [ ] Toggle only visible to Mods+
- [ ] Data migration moves summary → notes where notes empty

### Completed Phase Layout
- [ ] Session Status dropdown at top
- [ ] Standard: Session Notes (edits `notes`) - single field only
- [ ] Enhanced: Quick Recap (edits `summary`) + Session Notes (edits `notes`) - both visible
- [ ] Share with players checkbox below notes
- [ ] Attendance section
- [ ] Thoughts for Next Session ABOVE optional divider (encouraged, not optional)
- [ ] Optional sections divider with explanatory text
- [ ] DM Notes collapsed with explanation
- [ ] Session Content collapsed with explanation
- [ ] Player Notes collapsed with explanation
- [ ] "Detailed Notes" section REMOVED (doesn't exist anymore)
- [ ] Mobile variant matches desktop

### Auto-Save (Like Notion)
- [ ] Prep Notes auto-saves with 1.5s debounce
- [ ] All Prep Module fields auto-save
- [ ] Session Notes auto-saves
- [ ] Quick Recap auto-saves
- [ ] DM Notes auto-saves
- [ ] Thoughts for Next auto-saves
- [ ] Attendance saves immediately on click
- [ ] Visual "(auto-saved)" indicator in header

### Expand Notes (Enhanced Mode)
- [ ] Expand Notes button works (summary → AI → notes)
- [ ] Expand Notes also reformats Quick Recap to bullet points
- [ ] Both fields remain visible after expansion

### Section Customization
- [ ] Campaign Settings can fully disable optional sections
- [ ] [×] button on sections shows hide modal
- [ ] Modal offers "Hide for this session" vs "Hide permanently"
- [ ] "Customize Layout" button in header opens modal
- [ ] Drag-based reordering (like Customize Homepage)
- [ ] "Reset to Default" button works
- [ ] Preferences stored per-user-per-campaign in DB
- [ ] Locked sections can't be hidden or reordered (Session Notes, Share, Attendance)
- [ ] Thoughts for Next is separate category (customizable but visually distinct)

### Player View
- [ ] Players only see Open/Locked sessions in list
- [ ] Private sessions hidden from players
- [ ] Session Notes only visible if DM checked "Share with players"
- [ ] "DM hasn't shared notes yet" message when not shared
- [ ] Attendance always visible (read-only)
- [ ] Player Notes section visible
- [ ] Players can add notes when session is Open
- [ ] Players cannot add notes when session is Locked
- [ ] Players never see: Quick Recap, DM Notes, Thoughts for Next, Session Content, Status dropdown, Customize button

### Prep Phase
- [ ] "Thoughts from last session" banner (renamed from "From Previous Session")
- [ ] Banner ONLY shows if previous session had content in Thoughts for Next
- [ ] Prep Notes with auto-save
- [ ] Prep Notes and Optional Modules are visually separated
- [ ] Explanatory text: "Every DM preps differently..."
- [ ] "Set your defaults in Campaign Settings" link
- [ ] All 7 modules as pre-collapsed sections with title + description visible
- [ ] Click to expand modules (NOT toggle grid)
- [ ] Auto-expanded if Campaign Settings has it enabled
- [ ] Empty modules don't persist as "active"
- [ ] Modules with content persist and show expanded next time
- [ ] Modules color-coded subtly (border accent when expanded)
- [ ] All module fields auto-save

### Random Tables
- [ ] Campaign page under World
- [ ] Table CRUD operations
- [ ] Starter templates available
- [ ] 1000+ items in name tables
- [ ] Roll animation (slot machine style)
- [ ] Copy result to clipboard
- [ ] Session prep integration
- [ ] Quick roll from session module

---

## Confirmed Decisions Summary

All decisions from our conversation, locked in:

### Auto-Save (Like Notion)
**CRITICAL:** All text fields must auto-save so nothing is lost if PC turns off or page refreshes.

| Field | Auto-Save | Debounce |
|-------|-----------|----------|
| Prep Notes | ✅ Yes | 1.5s |
| All Prep Modules | ✅ Yes | 1.5s |
| Session Notes | ✅ Yes | 1.5s |
| Quick Recap | ✅ Yes | 1.5s |
| DM Notes | ✅ Yes | 1.5s |
| Thoughts for Next | ✅ Yes | 1.5s |
| Attendance | ✅ Immediate | On click |

**Visual indicator:** Show "(auto-saved)" or "✓ Saved" in the header so users know their work is safe.

```tsx
// Auto-save pattern for all text fields
useEffect(() => {
  if (!hasChanges) return

  const timeoutId = setTimeout(() => {
    saveToDatabase()
  }, 1500) // 1.5 second debounce

  return () => clearTimeout(timeoutId)
}, [fieldValue])
```

### Data Flow
| Mode | Field Edited | UI Label | Notes |
|------|-------------|----------|-------|
| Standard | `notes` | "Session Notes" | The ONLY field shown. No Quick Recap, no Detailed Notes. |
| Enhanced | `summary` | "Quick Recap" | Input for Expand Notes feature. Always visible. |
| Enhanced | `notes` | "Session Notes" | Output from Expand Notes. Always visible. |

### Toggle Storage
- **Where:** `user_settings.session_enhanced_view` (boolean, default false)
- **NOT localStorage** - must sync across devices
- **Who sees it:** Only `moderator` or `super_admin` roles

### Prep Page Optional Modules
- **UI:** Pre-collapsed sections showing title + description (NOT toggle grid)
- **Click to expand** - User clicks to open/activate the module
- **Auto-expanded** - If enabled in Campaign Settings
- **Empty = inactive** - If left empty, doesn't count as active
- **7 modules:** Session Goals, Key NPCs, Random Tables, Music & Ambiance, Session Opener, Checklist, Quick References
- **Links:** Key NPCs links to campaign characters, Random Tables links to campaign library
- **DM flexibility text:** "Every DM preps differently - and that's the point. These tools are here if you want them, not because you need them."

### Completed Page Layout Order
1. **Session Status dropdown** (Private/Open/Locked) - stays at top
2. **Session Notes** (Standard) OR **Quick Recap + Session Notes** (Enhanced)
3. **Share with players** checkbox
4. **Attendance** - who was present
5. **Thoughts for Next Session** - ENCOURAGED (not optional, above the divider)
6. ─── OPTIONAL SECTIONS ─── divider with explanatory text
7. **DM Notes** (collapsed)
8. **Session Content** (collapsed)
9. **Player Notes** (collapsed)

### "Thoughts for Next" Flow
1. DM writes in "Thoughts for Next Session" at end of Session 12
2. When DM creates Session 13, the "Thoughts from last session" banner shows those thoughts
3. **ONLY shows if there's content** - Don't bring over empty thoughts
4. Renamed from "From Previous Session" → "Thoughts from last session" (clearer)

### Section Customization System

**Campaign Settings can:**
- Fully disable optional sections (won't appear at all)
- Set default order for the campaign

**Per-session, users can:**
- Click [×] to hide a section → Modal asks:
  - "Hide for this session only" (re-add from "+" button)
  - "Hide permanently" (re-enable in Campaign Settings)

**Customize Layout modal:**
- Drag-based reordering (like Customize Homepage)
- "Reset to Default" button
- Stored per-user-per-campaign in DB

**Section Categories:**

| Category | Sections | Can Hide? | Can Reorder? |
|----------|----------|-----------|--------------|
| **Locked** | Session Notes, Share checkbox, Attendance | ❌ No | ❌ No |
| **Encouraged** | Thoughts for Next Session | ✅ Yes | ✅ Yes |
| **Optional** | DM Notes, Session Content, Player Notes | ✅ Yes | ✅ Yes |

**Visual Layout:**
```
┌──────────────────────────────────────────────┐
│ [LOCKED - Always visible, always at top]     │
│ • Session Notes                              │
│ • Share with players                         │
│ • Attendance                                 │
├──────────────────────────────────────────────┤
│ [ENCOURAGED - Separate, customizable]        │
│ • Thoughts for Next Session                  │
├──────────────────────────────────────────────┤
│ ─────── OPTIONAL SECTIONS ───────            │
│ • DM Notes                                   │
│ • Session Content                            │
│ • Player Notes                               │
└──────────────────────────────────────────────┘
```

**Customize Modal (Drag-based):**
```
┌─────────────────────────────────────────────┐
│ Customize Session Layout                    │
├─────────────────────────────────────────────┤
│                                             │
│ 🔒 Session Notes              (always first)│
│ 🔒 Share with players                       │
│ 🔒 Attendance                               │
│ ──────────────────────────────────────────  │
│ ⋮⋮ Thoughts for Next              [👁 Hide] │
│ ──────────────────────────────────────────  │
│ ⋮⋮ DM Notes                       [👁 Hide] │
│ ⋮⋮ Session Content                [👁 Hide] │
│ ⋮⋮ Player Notes                   [👁 Hide] │
│                                             │
│         [Reset to Default]       [Done]     │
└─────────────────────────────────────────────┘
```
Drag ⋮⋮ handles to reorder. Click 👁 to hide.

**Database Storage:**
```sql
-- Per-user-per-campaign layout preferences
CREATE TABLE user_campaign_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,

  -- Completed page layout
  completed_section_order TEXT[] DEFAULT NULL, -- NULL = use campaign default
  completed_hidden_sections TEXT[] DEFAULT '{}',

  -- Future: Prep page layout if needed

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, campaign_id)
);
```

### Random Tables (New Campaign Feature)
- **Location:** Campaign > World > Random Tables
- **Option C:** Both campaign library AND session quick tables
- **Starter templates:** Copied (not referenced), allows customization
- **Item count:** 1000+ per category to avoid repetition
- **Roll animation:** Slot machine style (similar to RollReveal but simpler)

### Enhanced View Behavior
- **Quick Recap stays visible** after Expand Notes (it gets reformatted to bullet points)
- **Session Notes always visible** in Enhanced mode
- **User's wife likes reading** the formatted Quick Recap bullets

### Things REMOVED
- **Timer:** Users prefer external timers
- **"Live" phase:** Merged into Prep
- **session_timer module:** Remove from Campaign Settings
- **"Detailed Notes" section:** REMOVED for Standard mode - the main "Session Notes" IS the detailed notes

### Beginner vs Expert Philosophy
- **Beginners see:** Prep Notes + Session Notes + Attendance + Thoughts for Next
- **Everything else is optional:** Clearly separated with explanatory text
- **No completion pressure:** No required fields beyond the basics
- **Good hand-holding:** Each optional section explains what it is and why they might want it

---

## Player View (Complete Specification)

Players see a simplified, read-only version of the session. DM controls what's visible.

### What Players CAN See

| Content | Visibility Rule |
|---------|----------------|
| Session title, date, number | Always (if session is Open/Locked) |
| Session Notes | Only if DM checked "Share with players" |
| Attendance | Always visible (read-only) |
| Player Notes | Their own + others shared with party |

### What Players CANNOT See (Ever)

| Content | Reason |
|---------|--------|
| Quick Recap | Enhanced mode only, DM input field |
| DM Notes | Always private |
| Thoughts for Next Session | DM planning tool |
| Session Content (quests/encounters) | DM organizational tool |
| Session Status dropdown | DM control |
| Customize layout button | DM feature |
| Expand Notes button | Enhanced mode only |
| Share with players checkbox | DM control |

### Player View Layout

**Session is Private:**
- Players cannot see the session at all (not in list)

**Session is Open or Locked:**
```
┌──────────────────────────────────────────────────────────────────┐
│ Session 12: The Sewer Infiltration                               │
│ March 15, 2025                                                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ [If DM has shared notes]                                         │
│ SESSION NOTES                                                    │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ The party made their way through the sewers...               │ │
│ │ (read-only display)                                          │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ [If DM has NOT shared notes]                                     │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ 📝 The DM hasn't shared their session notes yet.             │ │
│ │    You can still add your own notes below.                   │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ATTENDANCE                                                       │
│ Present: Valeria, Thorin                                         │
│ Absent: Mira                                                     │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ PARTY NOTES                                                      │
│                                                                  │
│ Your note:                                        [Edit][Delete] │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ "From Valeria's perspective, the sewers were terrifying..."  │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Thorin's notes:                                                  │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ "The combat was intense. We nearly lost Mira to the ooze."   │ │
│ └──────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ [+ Add Your Notes]  ← Only if session is Open                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Player Session List

Players only see sessions that are **Open** or **Locked**:

```
┌──────────────────────────────────────────────────────────────────┐
│ Sessions                                                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ Session 12: The Sewer Infiltration                               │
│ March 15, 2025 · 🟢 Open for notes                               │
│                                              [View / Add Notes]  │
│                                                                  │
│ Session 11: The Yawning Portal                                   │
│ March 8, 2025 · 🔒 Locked                                        │
│                                                          [View]  │
│                                                                  │
│ ─────────────────────────────────────────────────────────────    │
│ Private sessions are not shown to players                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Player Permissions Summary

| Session State | Can View? | Can Add Notes? |
|--------------|-----------|----------------|
| Private | ❌ No | ❌ No |
| Open | ✅ Yes | ✅ Yes |
| Locked | ✅ Yes | ❌ No (read-only) |

### Key Player Experience Points

1. **Page is still useful without DM notes** - Players can collaborate on their own recaps
2. **Party builds collective memory** - Even if DM doesn't share, players see each other's notes
3. **Clear status indicators** - 🟢 Open / 🔒 Locked badges
4. **No confusion** - Players never see DM-only features

## Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| Should Random Tables be campaign or global? | **Campaign** - each campaign has its own library |
| Should starter templates be copied or referenced? | **Copied** - allows customization |
| Should we track roll history? | **Yes** - useful for avoiding repetition |
| Where does Random Tables live in nav? | **World > Random Tables** |
| Can players see random tables? | **Configurable** via visibility setting |
| Toggle storage? | **DB (user_settings)** - NOT localStorage |
| Enhanced mode: keep both fields visible? | **Yes** - Quick Recap gets reformatted, wife likes to read it |
