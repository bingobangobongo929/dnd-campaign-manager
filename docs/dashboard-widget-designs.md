# Campaign Dashboard Widget Designs

## Overview

The dashboard is the central hub for campaign management. It displays different content based on user role (DM vs Player) and permissions. All widgets follow consistent styling patterns.

---

## Page Structure & Navigation Philosophy

### The Problem

Currently, the **Canvas** page has accumulated campaign-level controls:
- Share button & modal
- Members management
- Template/Published state badges
- Intelligence link
- Labels, Factions, Relationships managers
- Connections visualization
- Add Character/Group
- Resize Cards

This creates confusion because the Canvas is a **workspace tool**, not a campaign hub.

### The Solution

**Dashboard = Campaign Hub** (the "home base")
- Primary campaign actions (Share, Members, Settings)
- Overview widgets
- Navigation to all sections
- Campaign-level status indicators

**Canvas = Character Workspace** (a specialized tool)
- Character/NPC management
- Visual layout tools
- Connection lines visualization
- Add/resize/organize characters

---

## Dashboard Page Layout

### Header Bar (Sticky)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back    The Dragon's Awakening              [🔔] [☰ Menu] [👤 Profile]  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Left Side:**
- Back button (to /campaigns)
- Campaign name (truncated on mobile)

**Right Side:**
- Notification bell (if activity) - future
- Burger menu (☰) - opens slide-out drawer
- Profile avatar (existing from TopBar)

### Burger Menu (Slide-Out Drawer)

Opens from right side, covers content with overlay.

```
┌──────────────────────────────────────────┐
│                                     [✕]  │
│  ┌────────────────────────────────────┐  │
│  │ 🎲 The Dragon's Awakening         │  │
│  │ High Fantasy • D&D 5e             │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ── CAMPAIGN ──────────────────────────  │
│                                          │
│  📊  Dashboard              ← current    │
│  🎭  Canvas                              │
│  📅  Sessions                            │
│  ⏱️  Timeline                            │
│  📜  Lore                                │
│  🗺️  World Map                           │
│  🖼️  Gallery                             │
│                                          │
│  ── MANAGEMENT ────────────────────────  │
│                                          │
│  👥  Members & Invites                   │
│  🏷️  Labels                              │
│  🛡️  Factions                            │
│  🔗  Relationships                       │
│  🔒  Secrets                   (future)  │
│                                          │
│  ── TOOLS ─────────────────────────────  │
│                                          │
│  🧠  Intelligence              (if AI)   │
│  🔗  Share Campaign                      │
│  📤  Export                    (future)  │
│  ⚙️  Campaign Settings        (owner)    │
│                                          │
│  ── TEMPLATE ──────────────────────────  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ ✨ Published as Template           │  │
│  │ Version 3 • 12 copies made        │  │
│  │ [Manage Template]                 │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ──────────────────────────────────────  │
│                                          │
│  🏠  Home                                │
│  📚  All Campaigns                       │
│  🎭  Character Vault                     │
│  🎲  One-Shots                           │
│                                          │
└──────────────────────────────────────────┘
```

**Sections:**

1. **Campaign Header** - Name, setting, game system
2. **Campaign Navigation** - All campaign pages
3. **Management** - Data managers (moved from Canvas)
4. **Tools** - AI, Share, Export, Settings
5. **Template Status** - If published, show status
6. **Global Navigation** - Back to home, other areas

### Mobile Considerations

On mobile, the burger menu becomes the **primary navigation** since the floating dock is hidden.

```
Mobile Header:
┌─────────────────────────────────────────┐
│  ←   Campaign Name...        [🔔] [☰]  │
└─────────────────────────────────────────┘
```

- Smaller header
- Essential actions only
- Full menu in burger drawer

---

## Canvas Page Updates

With dashboard as the hub, Canvas becomes focused:

### Canvas Header Bar

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Dashboard     Canvas                    [🔗] [Manage ▼] [+ Add ▼]       │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Left Side:**
- Back to Dashboard link
- Page title "Canvas"

**Right Side (Canvas-specific tools only):**
- Connections toggle (🔗)
- Manage dropdown:
  - Labels (for quick access)
  - Resize Cards
- Add dropdown:
  - Add Character
  - Add Group

**Removed from Canvas (moved to Dashboard menu):**
- Share button → Dashboard menu
- Members → Dashboard menu
- Intelligence → Dashboard menu
- Factions manager → Dashboard menu
- Relationships manager → Dashboard menu
- Template badges → Dashboard header or menu

---

## Floating Action Buttons (Mobile)

On mobile dashboard, consider a FAB for primary actions:

```
                                    ┌─────┐
                                    │  +  │
                                    └─────┘
                                        │
                    ┌───────────────────┘
                    ▼
            ┌─────────────────┐
            │ 📅 New Session  │
            │ 🎭 Add Character│
            │ 🔗 Share        │
            └─────────────────┘
```

**FAB Actions (DM):**
- New Session
- Add Character (goes to Canvas)
- Quick Share

---

## Share Modal Trigger Locations

Since sharing is important, make it accessible from multiple places:

1. **Dashboard Header** - Campaign Header widget has Share button
2. **Dashboard Menu** - "Share Campaign" in burger menu
3. **Quick Actions Widget** - Share quick action button
4. **Canvas** - NOT on canvas (removed)

---

## Campaign Settings Access

Currently buried. Should be easy to find:

1. **Dashboard Menu** - "Campaign Settings" (owner only)
2. **Campaign Header Widget** - Edit button (DM) opens settings

---

## What Each Page Now Contains

### Dashboard Page
```
Header: Campaign name, burger menu, profile
Body:
  - Campaign Header (with Share, Edit)
  - Quick Actions
  - Latest Session
  - Campaign Stats
  - Party Overview
  - Recent Events
  - Recent Sessions
  - Recent Activity (DM)
  - DM Toolbox (DM)
  - My Character (Player)
  - Previously... (Player)

Menu (Burger):
  - All navigation
  - All managers
  - All tools
  - Template status
```

### Canvas Page
```
Header: Back to dashboard, Connections, Manage (Labels/Resize), Add
Body:
  - Character cards on infinite canvas
  - Groups
  - Connection lines (when enabled)
  - Selection tools
  - Multi-select actions
```

### Sessions Page
```
Header: Back to dashboard, Add Session button
Body: Session list/grid
```

### Timeline Page
```
Header: Back to dashboard, Add Event button, View switcher
Body: Timeline view
```

### Other Pages
Similar pattern - focused on their content, navigation via burger menu.

---

## Component Hierarchy

```
AppLayout
├── TopBar (simplified for campaign pages)
│   ├── BackButton
│   ├── PageTitle / CampaignName
│   ├── NotificationBell (future)
│   ├── BurgerMenuButton
│   └── ProfileDropdown
│
├── BurgerMenuDrawer (new)
│   ├── CampaignInfo
│   ├── CampaignNavSection
│   ├── ManagementSection
│   ├── ToolsSection
│   ├── TemplateSection
│   └── GlobalNavSection
│
├── MainContent
│   └── [Page Content]
│
└── FloatingDock (desktop only, existing)
```

---

## New Components Needed

1. **BurgerMenuDrawer** - Slide-out navigation drawer
2. **CampaignPageHeader** - Simplified header for campaign pages
3. **Dashboard widgets** - All 11 widget components
4. **MobileQuickActionsFAB** - Floating action button for mobile

---

## State Badge Locations

Template/Content state badges appear in:

1. **Dashboard Campaign Header** - Primary location
2. **Burger Menu Template Section** - Detailed status
3. **NOT on every page** - Reduces clutter

---

## Revised Navigation Architecture

### Current State Analysis

**What We Have:**

| Component | Desktop | Mobile | Purpose |
|-----------|---------|--------|---------|
| **Floating Dock** | Always visible (bottom) | Hidden | Primary navigation between pages |
| **Mobile Tab Bar** | Hidden | Always visible (bottom) | Primary navigation + "More" overflow |
| **Page Headers** | Varies per page | Varies | Page-specific actions |

**Navigation Already Covers:**
- Dashboard, Canvas, Sessions, Timeline, Intelligence, Lore, Map, Gallery, Settings
- All permission-aware
- Consistent across desktop/mobile

**The Problem:**
Page headers have **inconsistent buttons** scattered across pages:
- Canvas: Share, Intelligence, Connections, Manage dropdown, Add dropdown
- Sessions: Add Session button
- Timeline: Add Event, View Switcher
- Others: Various patterns

### Proposed Solution

**Key Insight:** The dock/tab bar handles PAGE navigation. We need consistency for PAGE-LEVEL ACTIONS.

**Principle:** Every campaign page gets the same header structure with a burger menu for campaign-wide management, plus page-specific action buttons.

---

## Unified Campaign Page Header

Every campaign page uses this consistent header:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo]   Dashboard                [Page Actions...]  [☰]   [👤]           │
└─────────────────────────────────────────────────────────────────────────────┘
         ↑                           ↑                   ↑      ↑
     Breadcrumb                 Page-specific        Burger   Profile
     or Page Title              action buttons       Menu
```

### Left Section
- Multiloop logo (links to home)
- Current page name as title/breadcrumb

### Center/Right Section
- **Page-specific actions** (varies per page)
- **Burger Menu button** (☰) - same on every page
- **Profile dropdown** (existing)

### Page-Specific Actions

| Page | Action Buttons |
|------|----------------|
| **Dashboard** | (none - actions are in widgets) |
| **Canvas** | [Connections ▼] [+ Add ▼] |
| **Sessions** | [+ New Session] |
| **Timeline** | [+ Add Event] [View ▼] |
| **Lore** | [+ Add] (factions/locations/items) |
| **Map** | [+ New Map] |
| **Gallery** | [+ Upload] |
| **Intelligence** | (none - page is the action) |
| **Settings** | (none) |

---

## Burger Menu (Campaign Management Drawer)

**Same on every campaign page.** Opens from right side.

```
┌──────────────────────────────────────────┐
│  The Dragon's Awakening            [✕]  │
│  High Fantasy • D&D 5e                   │
│  ────────────────────────────────────    │
│                                          │
│  MANAGEMENT                              │
│  ─────────────────────────────────────   │
│  👥  Party & Members                     │
│  🏷️  Labels                              │
│  🛡️  Factions                            │
│  🔗  Character Relationships             │
│  📐  Card Sizing                         │
│                                          │
│  SHARING                                 │
│  ─────────────────────────────────────   │
│  🔗  Share Campaign                      │
│  📋  Copy Invite Link                    │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ ✨ Published Template              │  │
│  │    Version 3 • 12 uses            │  │
│  │    [Manage]                       │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ─────────────────────────────────────   │
│  ⚙️  Campaign Settings      (owner)      │
│                                          │
└──────────────────────────────────────────┘
```

**What's IN the burger menu:**
- Party & Members management
- Labels (tags)
- Factions
- Character Relationships
- Card Sizing (resize tool)
- Share Campaign
- Copy Invite Link
- Template status (if published)
- Campaign Settings (owner only)

**What's NOT in the burger menu:**
- Page navigation (that's what dock/tab bar is for)
- Intelligence (already in dock/tab bar)
- Add Character/Group (page-specific, on Canvas header)

---

## Intelligence: Widget Not Link

Since Intelligence is already in the dock/tab bar, we don't need it as a button on Dashboard or Canvas.

**Instead, add an Intelligence WIDGET to the dashboard:**

### 12. INTELLIGENCE STATUS WIDGET (New)

**Purpose:** Show AI analysis status and recent suggestions without navigating away.

**Visibility:** DMs with AI access

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ 🧠 Intelligence                                   View All →    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ✅ Last analyzed: 2 days ago                           │   │
│  │  Available now • Run analysis                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Recent Suggestions:                                            │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ⏱️ 3 timeline events detected                    [Review]     │
│     From Session 15 notes                                       │
│                                                                 │
│  🎭 1 new NPC mentioned                           [Review]     │
│     "Lord Varen" in Session 15                                  │
│                                                                 │
│  ⚠️ 1 inconsistency found                         [Review]     │
│     Character status conflict                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**States:**
1. **Ready to run** - "Available now • [Run Analysis]"
2. **On cooldown** - "Available in 8h 32m"
3. **Has suggestions** - Shows pending review items
4. **No suggestions** - "All caught up! No new suggestions."

**Actions:**
- "View All" - Goes to full Intelligence page
- "Review" buttons - Go to Intelligence page filtered to that type
- "Run Analysis" - Triggers analysis (if available)

This gives DMs a quick glance at AI status without leaving the dashboard.

---

## Complete Page Layout Visualization

### Dashboard Page (Full Example)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HEADER                                         │
│  [🔮]   Dashboard                                         [☰]   [ED ▼]     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         CAMPAIGN HEADER WIDGET                              │
│  ┌──────────┐                                                               │
│  │  IMAGE   │  The Dragon's Awakening              [Share] [Edit]          │
│  │          │  High Fantasy • D&D 5e • Started Jan 2024                    │
│  └──────────┘  "Ancient dragons stir beneath the mountains..."             │
│                📅 15 Sessions  •  👥 5 Players  •  🗓️ 8 months             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────┬─────────────────────────┬─────────────────────────┐
│     QUICK ACTIONS       │     LATEST SESSION      │    CAMPAIGN STATS       │
│  ┌─────┐ ┌─────┐        │  Session 15             │  👥 Party: 5            │
│  │ 📅  │ │ 👥  │        │  The Siege of Thornhold │  📅 Sessions: 15        │
│  │ New │ │Party│        │  Dec 20, 2024           │  🎭 Characters: 23      │
│  └─────┘ └─────┘        │                         │  ────────────────       │
│  ┌─────┐ ┌─────┐        │  "The party defended    │  ⚠️ 3 NPCs need details │
│  │ 🔗  │ │ 🗺️  │        │   the walls against..." │                         │
│  │Share│ │ Map │        │                         │                         │
│  └─────┘ └─────┘        │                         │                         │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           PARTY OVERVIEW                        View All →  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌───────────┐ │
│  │ 🧙 Thornwick    │ │ 👼 Seraphina    │ │ 🪓 Grimjaw      │ │ 🧝 Lyra   │ │
│  │ Halfling Rogue  │ │ Aasimar Cleric  │ │ Dwarf Fighter   │ │ Elf Wizard│ │
│  │ @sarah • Active │ │ @mike • Active  │ │ @dave • Hiatus  │ │ Unclaimed │ │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ └───────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────┬─────────────────────────────────────────┐
│        RECENT EVENTS              │           RECENT SESSIONS               │
│  ⬤ Siege of Thornhold   Dec 20   │  ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│  ○ Met Lord Varen       Dec 20   │  │ 15 │ │ 14 │ │ 13 │ │ 12 │           │
│  ○ Secret passage       Dec 15   │  │ ✓  │ │ ✓  │ │ ✓  │ │ ⚠️ │           │
│  ⬤ Grimstone Bridge     Dec 15   │  └────┘ └────┘ └────┘ └────┘           │
│                     View All →    │                            View All →   │
└───────────────────────────────────┴─────────────────────────────────────────┘

┌───────────────────────────────────┬─────────────────────────────────────────┐
│      INTELLIGENCE STATUS          │          RECENT ACTIVITY                │
│  ✅ Available now                 │  👤 Sarah added notes (2h ago)          │
│     Last run: 2 days ago          │  👤 Mike added notes (5h ago)           │
│                                   │  🎭 You created NPC: Lord Varen         │
│  ⏱️ 3 timeline events  [Review]   │  👋 Dave joined campaign                │
│  🎭 1 new NPC          [Review]   │                                         │
│                   [Run Analysis]  │                                         │
└───────────────────────────────────┴─────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              FLOATING DOCK                                  │
│  [🔮] │ [👁️] [📊] [🎭] [📅] [⏱️] [🧠] [📜] [🗺️] [🖼️] [⚙️] │ [🏠] [⚔️]...    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Canvas Page (Simplified)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HEADER                                         │
│  [🔮]   Canvas                    [🔗 Connections ▼] [+ Add ▼]  [☰] [ED ▼] │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                         INFINITE CANVAS AREA                                │
│                                                                             │
│      ┌─────────┐     ┌─────────┐                                           │
│      │Character│     │Character│     ┌─────────────────────────┐           │
│      │  Card   │────▶│  Card   │     │       GROUP            │           │
│      └─────────┘     └─────────┘     │   ┌─────────┐          │           │
│                                      │   │Character│          │           │
│                                      │   │  Card   │          │           │
│                                      │   └─────────┘          │           │
│                                      └─────────────────────────┘           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              FLOATING DOCK                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Sessions Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              HEADER                                         │
│  [🔮]   Sessions                              [+ New Session]   [☰] [ED ▼] │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│                          SESSION LIST                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                              FLOATING DOCK                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary: What Changes

### Removed from Canvas Header
| Item | New Location |
|------|--------------|
| Share button | Burger menu + Dashboard widget |
| Intelligence button | Dock/Tab Bar (already there) + Dashboard widget |
| Members | Burger menu |
| Factions | Burger menu |
| Relationships | Burger menu |
| Resize Cards | Burger menu |
| Template badges | Dashboard header widget + Burger menu |

### Kept on Canvas Header
- Connections toggle (canvas-specific visualization)
- Add dropdown (Add Character, Add Group)

### Added Everywhere
- Consistent burger menu button (☰)
- Same burger menu content on all campaign pages

### Added to Dashboard
- Campaign Header widget (with Share, Edit buttons)
- Intelligence Status widget (shows AI status + suggestions)
- Recent Activity widget

### Navigation Unchanged
- Floating Dock (desktop) - stays as-is
- Mobile Tab Bar - stays as-is
- These handle page-to-page navigation

---

## Benefits

1. **Consistency** - Every page has same header structure
2. **Discoverability** - Burger menu always has management tools
3. **Focus** - Page headers only show relevant actions
4. **No duplication** - Intelligence in dock, not also in header
5. **Dashboard as hub** - Campaign overview and quick access
6. **Canvas as tool** - Focused on character/group editing

### Desktop (3 columns)
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CAMPAIGN HEADER (full width)                                                │
├─────────────────────────┬─────────────────────────┬─────────────────────────┤
│ QUICK ACTIONS           │ LATEST SESSION          │ CAMPAIGN STATS          │
├─────────────────────────┴─────────────────────────┴─────────────────────────┤
│ PARTY OVERVIEW (full width)                                                 │
├─────────────────────────┬───────────────────────────────────────────────────┤
│ RECENT EVENTS           │ RECENT SESSIONS (2 cols)                          │
├─────────────────────────┴───────────────────────────────────────────────────┤
│ RECENT ACTIVITY (full width) - DM only                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ DM TOOLBOX (full width) - DM only                                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tablet (2 columns)
Widgets stack into 2-column grid, full-width widgets remain full-width.

### Mobile (1 column)
All widgets stack vertically. Priority order determines display sequence.

---

## Widget Designs

---

### 1. CAMPAIGN HEADER (New)

**Purpose:** Display campaign identity, setting, and key metadata at a glance.

**Visibility:** All members

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────┐                                                                │
│ │          │  The Dragon's Awakening                                        │
│ │  IMAGE   │  High Fantasy • Dungeons & Dragons 5e                          │
│ │          │  ─────────────────────────────────────────────────────         │
│ └──────────┘  "Ancient dragons stir beneath the mountains as the party      │
│               uncovers a conspiracy that threatens the realm..."            │
│                                                                             │
│  📅 Started: Jan 15, 2024    🎮 15 Sessions    👥 5 Players    [Share]     │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Data Displayed:**
- Campaign image (or gradient placeholder)
- Campaign name (h1)
- Genre tag + Game system
- Campaign description/pitch (truncated to 2 lines)
- Start date (from first session or campaign created_at)
- Session count
- Player count (active members with player role)
- Share button (opens share modal or copies link)

**Empty State:** N/A - always has campaign data

**DM Variation:** Shows "Edit" button next to title

**Player Variation:** Same, no edit button

---

### 2. QUICK ACTIONS

**Purpose:** Fast access to common tasks based on role and permissions.

**Visibility:** All members (content varies by role)

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ⚡ Quick Actions                                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │  ＋     │  │  👥    │  │  🔗    │  │  🧠    │            │
│  │         │  │         │  │         │  │         │            │
│  │ New     │  │ Members │  │ Share   │  │ Intel   │            │
│  │ Session │  │         │  │         │  │         │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
│                                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │  🗺️    │  │  📜    │  │  ⏱️    │  │  🖼️    │            │
│  │         │  │         │  │         │  │         │            │
│  │ Map     │  │ Lore    │  │Timeline │  │ Gallery │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

**DM Actions (Row 1 - Primary):**
| Action | Icon | Destination | Permission |
|--------|------|-------------|------------|
| New Session | Plus | /sessions (triggers new) | can.addSession |
| Members | UsersRound | Opens PartyModal | Always (DM) |
| Share | Share2 | Opens ShareModal | Always (DM) |
| Intelligence | Brain | /intelligence | canUseAI |

**DM Actions (Row 2 - Navigation):**
| Action | Icon | Destination | Permission |
|--------|------|-------------|------------|
| Map | Map | /map | can.viewMaps |
| Lore | BookOpen | /lore | can.viewLore |
| Timeline | Clock | /timeline | can.viewTimeline |
| Gallery | Image | /gallery | can.viewGallery |

**Player Actions:**
| Action | Icon | Destination | Permission |
|--------|------|-------------|------------|
| Add Notes | FileText | /sessions | can.addOwnSessionNotes |
| My Character | User | /canvas (focused) | Always |
| Sessions | BookOpen | /sessions | can.viewSessions |
| Timeline | Clock | /timeline | can.viewTimeline |
| Lore | Scroll | /lore | can.viewLore |
| Map | Map | /map | can.viewMaps |

**Contextual Actions (Shown When Relevant):**
- "Review 3 player notes" - when DM has unread player notes
- "Continue Session 12" - when last session has no notes yet

---

### 3. LATEST SESSION (Renamed from "Next Session")

**Purpose:** Quick access to the most recent session with key details.

**Visibility:** Members with can.viewSessions

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📅 Latest Session                                    View All → │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SESSION 15                           December 20, 2024   │  │
│  │  ──────────────────────────────────────────────────────   │  │
│  │  The Siege of Thornhold                                   │  │
│  │                                                           │  │
│  │  The party defended the city walls against the orc        │  │
│  │  horde while searching for the traitor within...          │  │
│  │                                                           │  │
│  │  ┌──────────────┐  ┌──────────────┐                      │  │
│  │  │ 📝 Has Notes │  │ ⏱️ 4 hours  │                      │  │
│  │  └──────────────┘  └──────────────┘                      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  💡 Next scheduled: January 5, 2025 (in 2 weeks)               │
└─────────────────────────────────────────────────────────────────┘
```

**Data Displayed:**
- Session number (badge style)
- Session date
- Session title
- Summary (truncated to 2-3 lines)
- Status indicators: Has notes, Duration (if tracked)
- Next scheduled date (if `scheduled_date` field exists and is future)

**Empty State:**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📅 Latest Session                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    📅                                           │
│            No sessions yet                                      │
│                                                                 │
│     Record your first session to start tracking                 │
│              your campaign's story.                             │
│                                                                 │
│              [ Create First Session ]                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**DM Variation:** Shows "Add notes" link if session has no notes

**Player Variation:** Shows "Add my notes" if they haven't contributed

---

### 4. CAMPAIGN STATS (Renamed from "Campaign Health")

**Purpose:** Key metrics and health indicators for the campaign.

**Visibility:** All members (content varies)

**Layout - DM View:**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📊 Campaign Stats                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   👥 Party Members          5                                   │
│   🎭 Total Characters      23    (5 PCs, 18 NPCs)               │
│   📅 Sessions Played       15                                   │
│   ⏱️ Timeline Events       42                                   │
│   📍 Locations              8                                   │
│   📜 Lore Entries          12                                   │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  ⚠️ Campaign Health                                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ⚡ 3 NPCs need descriptions                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📝 2 sessions missing notes                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  OR (if healthy):                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✅ Campaign is well documented!                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Layout - Player View:**
```
┌─────────────────────────────────────────────────────────────────┐
│ 📊 Campaign Stats                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   👥 Party Members          5                                   │
│   📅 Sessions Played       15                                   │
│   ⏱️ Timeline Events       42                                   │
│   📝 Your Notes             8                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Health Checks (DM only):**
- NPCs without descriptions (< 50 chars)
- Sessions without notes (< 20 chars)
- Characters without images (optional, lower priority)
- Locations without descriptions

**Clicking a health warning:** Navigates to filtered view of items needing attention

---

### 5. PARTY OVERVIEW

**Purpose:** See all player characters at a glance with their players.

**Visibility:** Members with can.viewParty

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 👥 Party                                                       View All →  │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐          │
│  │ ┌────┐                      │  │ ┌────┐                      │          │
│  │ │IMG │ Thornwick Bramble    │  │ │IMG │ Seraphina Dawnlight  │          │
│  │ └────┘ Halfling Rogue       │  │ └────┘ Aasimar Cleric       │          │
│  │        ────────────────     │  │        ────────────────     │          │
│  │        Played by @sarah     │  │        Played by @mike      │          │
│  │        🟢 Active            │  │        🟢 Active            │          │
│  └─────────────────────────────┘  └─────────────────────────────┘          │
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐          │
│  │ ┌────┐                      │  │ ┌────┐                      │          │
│  │ │ TB │ Grimjaw Stonefist    │  │ │ SD │ Lyra Whisperwind     │          │
│  │ └────┘ Dwarf Fighter        │  │ └────┘ Elf Wizard           │          │
│  │        ────────────────     │  │        ────────────────     │          │
│  │        Played by @dave      │  │        Unassigned           │          │
│  │        🟡 On Hiatus         │  │        ⚪ Unclaimed          │          │
│  └─────────────────────────────┘  └─────────────────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Data Per Character:**
- Character image or initials
- Character name
- Race + Class (or role if not set)
- Player name (from campaign_members) or "Unassigned"
- Status: Active (green), On Hiatus (yellow), Unclaimed (gray), Away (orange)

**Character Status Options:**
- `active` - Currently playing
- `hiatus` - Player taking a break
- `away` - Missing this session
- `unclaimed` - No player assigned yet
- Custom status with custom color

**Empty State:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 👥 Party                                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                         👥                                                  │
│                  No party members yet                                       │
│                                                                             │
│         Add player characters on the Canvas to build                        │
│                    your adventuring party.                                  │
│                                                                             │
│                     [ Go to Canvas ]                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**DM Variation:** Can click character to edit, sees all statuses

**Player Variation:** Sees party members, own character highlighted

---

### 6. RECENT EVENTS (Timeline)

**Purpose:** Show recent story events from the timeline.

**Visibility:** Members with can.viewTimeline

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ⏱️ Recent Events                                  View Timeline →│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━●  │
│                                                                 │
│  ⬤ The Siege of Thornhold                      Dec 20, 2024   │
│    Major Event • Session 15                                     │
│                                                                 │
│  ○ Met Lord Varen at the Keep                   Dec 20, 2024   │
│    NPC Introduced                                               │
│                                                                 │
│  ○ Discovered the secret passage                Dec 15, 2024   │
│    Location Found                                               │
│                                                                 │
│  ⬤ Battle at Grimstone Bridge                   Dec 15, 2024   │
│    Major Event • Session 14                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Visual Elements:**
- Timeline line connecting events
- Major events: Filled circle (⬤) + purple accent
- Minor events: Empty circle (○)
- Event type tags: Major Event, NPC Introduced, Location Found, Item Acquired, etc.
- Session reference when applicable

**Shows:** 4-5 most recent events

**Empty State:**
```
┌─────────────────────────────────────────────────────────────────┐
│ ⏱️ Recent Events                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                         ⏱️                                      │
│               No timeline events yet                            │
│                                                                 │
│     Add key moments, discoveries, and plot points               │
│              to track your story's progress.                    │
│                                                                 │
│              [ Add First Event ]                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 7. RECENT SESSIONS

**Purpose:** Quick access to recent session notes.

**Visibility:** Members with can.viewSessions

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📖 Recent Sessions                                             View All →  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────┐  ┌───────────────────────────────┐  │
│  │ 15  The Siege of Thornhold        │  │ 14  Battle at Grimstone       │  │
│  │     December 20, 2024             │  │     December 15, 2024         │  │
│  │     📝 ✓ Has notes                │  │     📝 ✓ Has notes            │  │
│  └───────────────────────────────────┘  └───────────────────────────────┘  │
│                                                                             │
│  ┌───────────────────────────────────┐  ┌───────────────────────────────┐  │
│  │ 13  The Forest Temple             │  │ 12  Arrival at Thornhold      │  │
│  │     December 8, 2024              │  │     December 1, 2024          │  │
│  │     📝 ✓ Has notes                │  │     ⚠️ Needs notes            │  │
│  └───────────────────────────────────┘  └───────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Data Per Session:**
- Session number (prominent badge)
- Session title
- Date
- Status: Has notes (check), Needs notes (warning), Has player notes (badge count)

**Shows:** 4 most recent sessions in 2x2 grid

---

### 8. RECENT ACTIVITY (New - DM Only)

**Purpose:** Track what's happening in the campaign - player contributions, changes, etc.

**Visibility:** DM only

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔔 Recent Activity                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────┐  Sarah added notes to Session 15                        2h ago   │
│  │ 👤 │  "We fought bravely at the gates, but Thornwick nearly..."        │
│  └─────┘                                                          [View]   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ┌─────┐  Mike added notes to Session 15                         5h ago   │
│  │ 👤 │  "Seraphina called upon her divine power to..."                   │
│  └─────┘                                                          [View]   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ┌─────┐  You created NPC: Lord Varen                         Yesterday   │
│  │ 🎭 │  Noble, Antagonist                                                │
│  └─────┘                                                          [View]   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  ┌─────┐  Dave joined the campaign                             2 days ago  │
│  │ 👋 │  Claimed character: Grimjaw Stonefist                             │
│  └─────┘                                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Activity Types:**
| Type | Icon | Description |
|------|------|-------------|
| Player note added | 👤 | Player submitted session notes |
| Character created | 🎭 | New PC or NPC added |
| Member joined | 👋 | New member accepted invite |
| Session created | 📅 | New session recorded |
| Timeline event | ⏱️ | Event added to timeline |
| Lore updated | 📜 | Faction, location, or lore edited |
| Character claimed | 🔗 | Player linked to character |

**Data Source:** New `campaign_activity` table or computed from timestamps across tables

**Empty State:** "No recent activity" with subtle icon

---

### 9. DM TOOLBOX (New - DM Only)

**Purpose:** Quick access to DM-specific preparation and management tools.

**Visibility:** DM only

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🧰 DM Toolbox                                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │ 📋 Session Prep      │  │ 🎭 Quick NPC         │  │ 🎲 Random Tables │  │
│  │                      │  │                      │  │                  │  │
│  │ Checklist for next   │  │ Generate an NPC      │  │ Names, items,    │  │
│  │ session              │  │ on the fly           │  │ encounters       │  │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────┘  │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐  │
│  │ 📝 Pending Notes     │  │ 🗺️ Current Location │  │ ⚔️ Active Quests │  │
│  │                      │  │                      │  │                  │  │
│  │ 3 player notes to    │  │ Thornhold Castle     │  │ 2 main, 4 side   │  │
│  │ review               │  │ [Change]             │  │ quests active    │  │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Tools:**
| Tool | Purpose | Action |
|------|---------|--------|
| Session Prep | Pre-session checklist | Opens prep modal/page |
| Quick NPC | Fast NPC generation | Opens NPC generator (AI if available) |
| Random Tables | Name/item/encounter generators | Opens tables modal |
| Pending Notes | Review player submissions | Navigate to unreviewed notes |
| Current Location | Where is the party? | Quick update party location |
| Active Quests | Track ongoing storylines | Navigate to quest/plot tracker |

**Note:** This widget is for future features. Can be simplified initially to just show "Pending Notes" count and "Current Location" selector.

---

### 10. MY CHARACTER (Player Only)

**Purpose:** Player's personal character at a glance with quick actions.

**Visibility:** Players only (shown above the grid)

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🧙 My Character                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────┐                                                             │
│  │            │  Thornwick Bramble                                          │
│  │            │  Halfling Rogue • Level 7                                   │
│  │   IMAGE    │  ──────────────────────────────────────────────────         │
│  │            │  "A quick-fingered halfling with a heart of gold            │
│  │            │   and a pocket full of other people's gold."                │
│  └────────────┘                                                             │
│                                                                             │
│  🟢 Active                                                                  │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ View Character  │  │ Add Session     │  │ View in Vault   │             │
│  │                 │  │ Notes           │  │                 │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Data Displayed:**
- Character image (large)
- Character name
- Race + Class
- Brief description/tagline
- Current status
- Quick action buttons

**Empty State (No Character Assigned):**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🧙 My Character                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              👤                                             │
│                   No character assigned yet                                 │
│                                                                             │
│        Your DM will assign you a character, or you can                      │
│            link one from your Character Vault.                              │
│                                                                             │
│                    [ Browse Vault Characters ]                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### 11. WHAT HAPPENED LAST SESSION (Player Only - New)

**Purpose:** Help players remember what happened, especially if they missed a session.

**Visibility:** Players only

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📖 Previously, in [Campaign Name]...                           Session 15  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  The party defended the walls of Thornhold against the orc siege.           │
│  During the battle, Seraphina discovered that Lord Varen had been           │
│  secretly communicating with the enemy. The party now must decide           │
│  whether to confront him publicly or investigate further.                   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Key Events:                                                                │
│  • ⚔️ Siege of Thornhold - Major battle at the city walls                  │
│  • 🎭 Lord Varen exposed - Caught sending messages to orcs                  │
│  • 🗝️ Found secret passage - Beneath the castle barracks                   │
│                                                                             │
│                                                    [ Read Full Session ]    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Data Displayed:**
- Session number and campaign name
- Session summary (from DM notes or AI-generated)
- Key events from that session (from timeline, filtered by session)
- Link to full session

**Empty State:** Not shown if no sessions exist

---

## Widget Priority Order (Mobile)

For mobile, widgets are displayed in this priority order:

**Player View:**
1. My Character
2. What Happened Last Session
3. Quick Actions
4. Party Overview
5. Recent Sessions
6. Recent Events
7. Campaign Stats

**DM View:**
1. Campaign Header
2. Quick Actions
3. Latest Session
4. Recent Activity
5. Campaign Stats
6. Party Overview
7. Recent Sessions
8. Recent Events
9. DM Toolbox

---

## Shared Component Specifications

### Widget Container
```tsx
interface DashboardWidgetProps {
  title: string
  icon: LucideIcon
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  className?: string
  priority?: number // For mobile ordering
  collapsible?: boolean // Allow collapse on mobile
  children: React.ReactNode
}
```

### Styling Constants
- Background: `bg-[#0a0a0f]`
- Border: `border border-white/[0.08]`
- Border radius: `rounded-xl`
- Header border: `border-b border-white/[0.06]`
- Header padding: `px-4 py-3`
- Content padding: `p-4`
- Icon color: `text-[--arcane-purple]` (#9333ea)
- Action link: `text-purple-400 hover:text-purple-300`

### Empty State Pattern
```tsx
<div className="text-center py-8">
  <Icon className="w-10 h-10 text-gray-600 mx-auto mb-3" />
  <p className="text-gray-400 font-medium">{title}</p>
  <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">{description}</p>
  {action && (
    <Button className="mt-4" variant="secondary">{action.label}</Button>
  )}
</div>
```

---

## Data Requirements

### New Fields Needed

**sessions table:**
- `scheduled_date` (timestamptz, nullable) - For future session scheduling
- `duration_minutes` (integer, nullable) - Session length tracking

**campaigns table:**
- `current_location_id` (uuid, nullable, FK to locations) - Where is the party?

### New Tables Needed (Optional - for Activity Feed)

**campaign_activity:**
```sql
campaign_activity (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns,
  user_id UUID REFERENCES auth.users,
  activity_type TEXT NOT NULL, -- 'note_added', 'character_created', 'member_joined', etc.
  entity_type TEXT, -- 'session', 'character', 'timeline_event', etc.
  entity_id UUID,
  metadata JSONB, -- Additional context
  created_at TIMESTAMPTZ DEFAULT NOW()
)
```

**Or:** Compute activity from existing table timestamps (simpler, no new table)

---

## Implementation Notes

1. **Extract widgets to separate files** - Each widget becomes a component in `src/components/dashboard/`

2. **Widget registry pattern** - Allow dynamic widget rendering based on role/permissions

3. **Skeleton loading states** - Each widget should have a loading skeleton

4. **Error boundaries** - Widgets should fail gracefully without breaking the page

5. **Data fetching** - Consider parallel data fetching for all widgets

6. **Caching** - Dashboard data can be cached briefly (30s) since it's not real-time critical

---

## Summary of Changes from Current

| Current | Proposed |
|---------|----------|
| No campaign header | Full campaign info header with metadata |
| "Next Session" (misleading) | "Latest Session" with proper data |
| Basic Quick Actions | Contextual, role-aware Quick Actions with Share |
| Simple party list | Party with player assignments and status |
| No activity feed | DM-only Recent Activity widget |
| No DM tools | DM Toolbox for quick access |
| Player sees minimal | Players get "My Character" and "Previously..." widgets |
| Static widget order | Priority-based mobile ordering |
| No empty state consistency | Unified empty state pattern |

---

## Player Dashboard - Full Design

Players have different needs than DMs. Their dashboard should feel like **"my seat at the table"** not a campaign management tool.

### Player Widget Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CAMPAIGN HEADER (Player View)                       │
│  ┌────────┐  The Dragon's Awakening                                         │
│  │ IMAGE  │  High Fantasy • D&D 5e                                          │
│  └────────┘  "Ancient dragons stir beneath the mountains..."                │
│                                                                             │
│  📅 Next Session: Saturday, Jan 25 @ 7pm                   [Copy Invite]    │
│  📍 Roll20 + Discord Voice                                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 🧙 MY CHARACTER                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐                                                             │
│  │            │  Thornwick Bramble                                          │
│  │   IMAGE    │  Halfling Rogue                                             │
│  │            │  ────────────────────────────────────────                   │
│  └────────────┘  "A quick-fingered halfling with a heart of gold            │
│                   and a pocket full of other people's gold."                │
│                                                                             │
│  🟢 Active                                                                  │
│                                                                             │
│  [View on Canvas]       [Add Session Notes]       [Open in Vault]           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 📖 PREVIOUSLY ON...                                             Session 15  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  The party defended the walls of Thornhold against the orc siege.           │
│  During the battle, Seraphina discovered that Lord Varen had been           │
│  secretly communicating with the enemy. The party now faces a               │
│  difficult choice about how to handle the traitor.                          │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Key Moments:                                                               │
│  • ⚔️ Siege of Thornhold - Major battle at the city walls                  │
│  • 🎭 Lord Varen exposed - Caught sending messages to orcs                  │
│  • 🗝️ Secret passage found - Beneath the castle barracks                   │
│                                                                             │
│                                                    [Read Full Session →]    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 👥 THE PARTY                                        Next Session: Sat 7pm   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  Your Status:  🟢 Confirmed                        [Change Status ▼]  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ 👼 Seraphina    │  │ 🪓 Grimjaw      │  │ 🧝 Lyra         │             │
│  │ Aasimar Cleric  │  │ Dwarf Fighter   │  │ Elf Wizard      │             │
│  │ ────────────    │  │ ────────────    │  │ ────────────    │             │
│  │ Mike            │  │ Dave            │  │ Emma            │             │
│  │ 🟢 Confirmed    │  │ 🟡 Can't make   │  │ ⚪ No response  │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
│  3 of 4 confirmed • 1 unavailable                                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ ⚡ QUICK ACTIONS                                                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐          │
│  │   📝   │  │   📅    │  │   ⏱️   │  │   📜    │  │   🗺️   │          │
│  │        │  │         │  │         │  │         │  │         │          │
│  │  Add   │  │Sessions │  │Timeline │  │  Lore   │  │   Map   │          │
│  │ Notes  │  │         │  │         │  │         │  │         │          │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 📅 RECENT SESSIONS                                             View All →  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐    │
│  │ 15  The Siege of Thornhold    │  │ 14  Battle at Grimstone        │    │
│  │     December 20, 2024         │  │     December 15, 2024          │    │
│  └────────────────────────────────┘  └────────────────────────────────┘    │
│                                                                             │
│  ┌────────────────────────────────┐  ┌────────────────────────────────┐    │
│  │ 13  The Forest Temple         │  │ 12  Arrival at Thornhold       │    │
│  │     December 8, 2024          │  │     December 1, 2024           │    │
│  └────────────────────────────────┘  └────────────────────────────────┘    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Session Scheduling & Availability System

### How It Works

**DM sets up next session:**
1. From Dashboard → DM Toolbox widget
2. Or from burger menu → "Schedule Next Session"

**Players respond:**
1. See next session in Campaign Header widget
2. Update their status in Party widget dropdown

### Data Model

**campaigns table (new fields):**
```sql
next_session_date TIMESTAMPTZ,      -- When is next session
next_session_location TEXT,         -- "Roll20 + Discord" or "Dave's house"
next_session_notes TEXT             -- "Bring snacks!" or session prep notes
```

**campaign_members table (new field):**
```sql
next_session_status TEXT DEFAULT 'no_response'
-- Values: 'confirmed', 'unavailable', 'maybe', 'no_response'
```

### DM: Scheduling Next Session

**From DM Toolbox Widget:**
```
┌─────────────────────────────────────────────────────────────────┐
│ 🧰 DM TOOLBOX                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📅 NEXT SESSION                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Saturday, Jan 25 @ 7:00 PM                    [Edit]   │   │
│  │  Roll20 + Discord Voice                                 │   │
│  │  ──────────────────────────────────────────────────     │   │
│  │  Attendance: 3 confirmed, 1 unavailable, 1 pending      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Send Reminder]                      [Clear / Cancel Session]  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Schedule Session Modal:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Schedule Next Session                                     [✕]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Date & Time                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  January 25, 2025                          7:00 PM      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Location / Platform                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Roll20 + Discord Voice                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Notes for Players (optional)                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  We'll be finishing the Thornhold arc. Bring your       │   │
│  │  character backstory notes if you have them!            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                              [Cancel]  [Save & Notify Players]  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Player: Updating Status

**Dropdown in Party widget:**
```
┌────────────────────────┐
│  🟢 Confirmed          │  ← I'll be there
│  🟠 Maybe              │  ← Not sure yet
│  🟡 Can't make it      │  ← Unavailable
└────────────────────────┘
```

### DM: Viewing Attendance (Party Widget)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 👥 PARTY                                       Next: Sat Jan 25 @ 7pm      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Attendance: 3 ✓  1 ✗  1 ?                               [Send Reminder]   │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ 🧙 Thornwick    │  │ 👼 Seraphina    │  │ 🪓 Grimjaw      │             │
│  │ @sarah          │  │ @mike           │  │ @dave           │             │
│  │ 🟢 Confirmed    │  │ 🟢 Confirmed    │  │ 🟡 Can't make   │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### When No Session Scheduled

**Player sees:**
```
📅 Next Session: Not scheduled yet
```

**DM sees in Toolbox:**
```
📅 No session scheduled  [Schedule Next Session]
```

---

## Final Widget Count: 11 Total

**Shared (content varies by role):**
1. Campaign Header
2. Quick Actions
3. Party Overview (with availability)
4. Recent Sessions

**DM Only:**
5. Campaign Stats (health warnings)
6. Recent Events
7. Recent Activity
8. DM Toolbox (includes scheduling)
9. Intelligence Status

**Player Only:**
10. My Character
11. Previously On...

---

## Complete Data Changes Summary

**campaigns table:**
```sql
ALTER TABLE campaigns ADD COLUMN next_session_date TIMESTAMPTZ;
ALTER TABLE campaigns ADD COLUMN next_session_location TEXT;
ALTER TABLE campaigns ADD COLUMN next_session_notes TEXT;
```

**campaign_members table:**
```sql
ALTER TABLE campaign_members ADD COLUMN next_session_status TEXT DEFAULT 'no_response';
```

**sessions table:**
```sql
ALTER TABLE sessions ADD COLUMN scheduled_date TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN duration_minutes INTEGER;
```

---

## Page-by-Page Audit

### Current State Analysis

| Page | Current Actions | Keep on Page | Move to Burger |
|------|-----------------|--------------|----------------|
| **Canvas** | Share, Intelligence, Connections, Manage (Members, Labels, Factions, Relationships, Resize), Add (Character, Group), Template badges | Connections, Add dropdown | Share, Members, Labels, Factions, Relationships, Resize, Template badges |
| **Sessions** | Plan Session, Add Recap, Search | All ✓ | None |
| **Timeline** | View toggle, Character filter, AI Generate, Add Event | All ✓ | None |
| **Lore** | Analyze Lore (AI), Section toggles, List/Diagram toggle | All ✓ | None |
| **Map** | Map selector, View/Edit toggle, Settings, New Map, Delete | All ✓ | None |
| **Gallery** | Grid size toggle, Add Images | All ✓ | None |
| **Intelligence** | Model selector (admin), Reset, Analyze, Filters | All ✓ | None |
| **Settings** | All settings sections | All ✓ | N/A |
| **View** | Tab navigation only | All ✓ | None |

### Key Finding

**Canvas is the only page needing cleanup.** Other pages have appropriate page-specific actions. The burger menu consolidates campaign management tools that were incorrectly placed on Canvas.

### Final Page Header Actions

| Page | Header Actions (after cleanup) |
|------|-------------------------------|
| **Dashboard** | (none - actions in widgets) + [☰] |
| **Canvas** | [Connections ▼] [+ Add ▼] + [☰] |
| **Sessions** | [Plan Session] [Add Recap] + Search + [☰] |
| **Timeline** | [View ▼] [Filter ▼] [AI Generate] [+ Add Event] + [☰] |
| **Lore** | [Analyze Lore] + [☰] |
| **Map** | [Map ▼] [View/Edit] [Settings] [+ New Map] + [☰] |
| **Gallery** | [Grid Size] [+ Add Images] + [☰] |
| **Intelligence** | [Reset] [Analyze Campaign] + Filters + [☰] |
| **Settings** | (all settings content) + [☰] |

**Note:** [☰] = Burger menu button (same on every page)

---

## Implementation Checklist

### Phase 1: Core Components
- [ ] Create `CampaignMenuDrawer` component
- [ ] Create `CampaignPageHeader` component
- [ ] Add burger menu button to header

### Phase 2: Dashboard Widgets
- [ ] `DashboardWidget` (shared wrapper)
- [ ] `CampaignHeaderWidget`
- [ ] `QuickActionsWidget`
- [ ] `PartyOverviewWidget`
- [ ] `RecentSessionsWidget`
- [ ] `CampaignStatsWidget` (DM)
- [ ] `RecentEventsWidget` (DM)
- [ ] `RecentActivityWidget` (DM)
- [ ] `DmToolboxWidget` (DM)
- [ ] `IntelligenceStatusWidget` (DM + AI)
- [ ] `MyCharacterWidget` (Player)
- [ ] `PreviouslyOnWidget` (Player)
- [ ] `ScheduleSessionModal`

### Phase 3: Dashboard Page
- [ ] Rebuild dashboard with new widgets
- [ ] Implement DM vs Player layouts
- [ ] Add session scheduling functionality
- [ ] Add availability status for players

### Phase 4: Canvas Cleanup
- [ ] Remove Share button
- [ ] Remove Members from Manage dropdown
- [ ] Remove Factions from Manage dropdown
- [ ] Remove Relationships from Manage dropdown
- [ ] Remove Resize from Manage dropdown (move to burger)
- [ ] Keep Connections toggle
- [ ] Keep Add dropdown
- [ ] Keep Labels in Manage (for quick tagging)
- [ ] Add burger menu button
- [ ] Remove template badges from header

### Phase 5: Other Pages
- [ ] Add unified header to Sessions page
- [ ] Add unified header to Timeline page
- [ ] Add unified header to Lore page
- [ ] Add unified header to Map page
- [ ] Add unified header to Gallery page
- [ ] Add unified header to Intelligence page
- [ ] Add unified header to Settings page

### Phase 6: Database Migration
- [ ] Add `next_session_date` to campaigns
- [ ] Add `next_session_location` to campaigns
- [ ] Add `next_session_notes` to campaigns
- [ ] Add `next_session_status` to campaign_members
- [ ] Add `scheduled_date` to sessions
- [ ] Add `duration_minutes` to sessions

### Phase 7: Polish
- [ ] Empty states for all widgets
- [ ] Loading skeletons
- [ ] Mobile responsiveness
- [ ] Permission checks throughout
