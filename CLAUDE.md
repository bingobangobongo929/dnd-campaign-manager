# CLAUDE.md - D&D Campaign Manager

> **Planning docs:** For detailed feature designs, see `/PLANNING-*.md`, `/DESIGN-*.md`, `/RESEARCH-*.md`, `/AUDIT-*.md` files in project root.

## PROJECT OVERVIEW

**Vision:** Be the ONLY site people come to for TTRPG planning, running, and playing - from beginners to veterans.

**What we ARE:** Campaign organization, character stories/narratives, session management, player collaboration, AI assistance for DMs.

**What we are NOT:**
- Not a VTT (virtual tabletop) - we complement tools like Roll20/Foundry, not replace them
- Not a character builder with stats/levels - that's D&D Beyond's space
- We're everything BEYOND those tools - the storytelling, organization, and collaboration layer

**Users:** DMs and players have equal priority. Don't favor one over the other in tradeoffs.

**Content types:** Campaigns, adventures, and oneshots are fundamentally similar (oneshots = short campaigns). Treat them consistently.

**Monetization:** Freemium model. Free tier must be genuinely useful. Premium unlocks power features (AI, storage, advanced sharing).

---

## UX PRINCIPLES (Critical)

### 1. Show Capabilities, Simplify Content
- **Navigation shows ALL features** (expert sees depth immediately)
- **Content areas start clean** (beginner isn't overwhelmed)
- Expert: "This has factions, quests, arcs - this is serious"
- Beginner: "I'll use Sessions for now, but there's more when I'm ready"

### 2. No Completion Pressure
**Never show:** completion percentages, "X% complete", required field warnings (beyond name)
**Instead show:** last updated timestamps, session count (neutral facts)

### 3. Presets Configure, Don't Restrict
Campaign presets (My First Campaign, Story Campaign, Dungeon Delve, etc.) set sensible defaults. Users can ALWAYS enable more modules in settings.

### 4. Empty States Are Inviting
Every empty section must: explain what it does (one sentence), suggest why they might want it, provide one clear action.

### 5. Flexible Creation Flow
Users start wherever they want (backstory, NPCs, maps, just a name). **NOT a wizard.** No enforced order.

### 6. Depth Is Discoverable, Not Hidden
Advanced features visible in UI (even if collapsed/secondary), mentioned in empty states, documented in tooltips.

### Legal Constraints
- **System-agnostic** - Support multiple game systems, stay legally safe
- **Cannot use**: "D&D", "Dungeons & Dragons", Beholder, Mind Flayer, Forgotten Realms, etc.
- Use SRD (CC-BY-4.0) content or stay generic

---

## PRODUCT GOALS

### Intelligence: The "One Place" Principle
Every content type (campaigns, oneshots, adventures) has an **Intelligence** feature. This is the ONE place users "have to" check after their content is built and being played.

**The Vision:** "I just write my session notes, and the campaign world builds itself."
- **DM's job:** Write session notes naturally, run the game, do creative work
- **System's job:** Extract connections, suggest updates, do bookkeeping

**Core Principles:**
1. **Session notes are the source of truth** - Everything flows FROM session notes
2. **Suggestions, not automation** - AI suggests, DM approves, nothing changes without consent
3. **Bulk operations** - "Accept All" for trust, "Review Each" for control
4. **Learn from corrections** - When DM changes "Thieves Guild" to "Shadow Thieves", system learns

**Why this matters:** Manual linking is tedious. DMs won't do it. The world stays flat. Intelligence fixes this.

**What Intelligence reads (full context):**
- ALL characters (full profiles, goals, secrets, faction memberships)
- ALL sessions (notes, summaries, dates)
- ALL relationships (canvas relationships with labels/categories)
- ALL factions (memberships, hierarchies)
- ALL timeline events (to avoid duplicate suggestions)
- Character tags, story hooks, important people, quotes

**18 suggestion types:**
- Campaign: status_change, secret_revealed, story_hook, quote, important_person, relationship, timeline_event, completeness, consistency, npc_detected, location_detected, plot_hook, enrichment, timeline_issue
- Character: grammar, formatting, lore_conflict, redundancy

**What Intelligence can CREATE:**
- Update character fields (status, secrets, notes, etc.)
- Create new canvas_relationships
- Create new timeline_events
- Append to arrays (quotes, story_hooks, important_people)

### Share Pages Must Reflect Features
Every feature that displays character/campaign/oneshot data has a corresponding **share page** that external viewers see. When we add new sections or fields, the share page config must be updated to display them properly.

### Player Contribution Philosophy
**Key insight:** Players want agency over THEIR CHARACTER, not world content. Even with wiki access, most don't use it.

**Focus on (high value):**
- Character ownership (player fully controls their character page)
- Simple shared resources (party loot, quest log)
- Session recaps from player perspective
- Private character journal

**Don't over-build:**
- Complex wiki contribution systems
- Formal approval queues for player edits
- Player-editable world lore

### Feature Design Question
Every new feature should ask: **Can this be auto-detected from session notes?**

| Feature | Manual Entry | AI-Assisted |
|---------|--------------|-------------|
| NPC-Location link | DM edits NPC, sets location | AI: "Durnan mentioned at Yawning Portal - link?" |
| Quest creation | DM manually creates quest | AI: "Durnan asked party to investigate - create quest?" |
| Secret revelation | DM marks secret as revealed | AI: "Party learned about Xanathar - mark revealed?" |

---

## DEPENDENCY CHAINS (When X changes, also update Y)

These are known ripple effects. When working on one area, check the related areas:

| When You Change... | Also Check/Update... |
|--------------------|----------------------|
| Character editor sections | Share page config (`UnifiedShareModal.tsx` lines 63-124), mobile editor, CharacterViewer, export format |
| Vault character fields | Campaign character fields (format parity), claiming flow, Intelligence context prompts |
| Campaign structure | Oneshot structure, adventure structure (they should be consistent) |
| New data field added | Share pages (manual config required), export/import, Intelligence context, mobile views |
| UI component | Mobile variant, keyboard shortcuts if applicable |
| Canvas features | Mobile Kanban fallback behavior |
| Session note structure | Player notes, DM notes, Intelligence parsing (reads all notes for suggestions) |
| Visibility/permissions | Share pages, RLS policies, player vs DM views |
| Navigation/routes | MobileTabBar context, breadcrumbs, recent items |
| Relationship types | Check both systems: vault (13 types) vs campaign (6 categories) |
| Status options | 3 systems: vault DEFAULT_STATUSES, campaign STATUS_OPTIONS, display STATUS_COLORS |
| RELATIONSHIP_COLORS | Duplicated in 12+ files - canonical source: `src/lib/character-display.tsx` |
| COMPANION_TYPE_COLORS | Duplicated in 8+ files - canonical source: `src/lib/character-display.tsx` |

### Share Page Updates (Critical)
When adding new character/campaign sections:
1. Add to section array in `src/components/share/UnifiedShareModal.tsx`
2. Add rendering logic in share page (`src/app/share/c/[code]/page.tsx` or `campaign/[code]/page.tsx`)
3. Add to section toggle logic (default on: `!== false`, default off: `=== true`)
4. No automatic detection - must be explicit

### Export/Import Data Loss Risks
When working on character data:
- **Relationships NOT exported** - user must recreate manually
- **Re-import overwrites** - DELETES existing relationships, journal, writings
- **Campaign-only fields lost**: dm_notes, story_hooks, canvas position, play_status
- **Age conversion**: campaign (number) ↔ vault (string) - "25 years old" → NaN

---

**Tech Stack:**
- Next.js 15 (App Router)
- TypeScript
- Supabase (PostgreSQL + Auth + Storage + RLS)
- TipTap rich text editor
- React Flow (infinite canvas, desktop only)
- Tailwind CSS
- Zustand (state management)
- Vercel AI SDK (streaming responses)

---

## CROSS-CUTTING CONCERNS (CHECK THESE)

When working on ANY of these areas, verify the related concerns:

| Working On | Also Check |
|------------|------------|
| **Character Editor** | Campaign character fields must have format parity with vault (rich text, lists, status enums) |
| **Vault Characters** | Export/import must not lose data. Fields: summary, notes, backstory, images, relationships, spells, writings |
| **Any Desktop UI** | Check mobile layout exists. 20 pages have `.mobile.tsx` variants. Check MobileTabBar context. |
| **Rich Text Fields** | Store as HTML strings (Tiptap). Only `summary` and `notes` use rich text. DM notes are plain text. |
| **Canvas Changes** | Mobile uses Kanban fallback, not ReactFlow. Test both views. |
| **Share/Invite** | Check visibility levels (public/party/dm_only). Verify RLS policies. |
| **Character Claiming** | Three export types: In-Play (linked), Session 0 (snapshot), Current State. Each has different sync behavior. |
| **Session Notes** | Player notes vs DM notes have different visibility. Check `player_session_notes` table. |
| **AI Features** | Check tier limits, cooldowns, usage tracking. Stream responses use Vercel AI SDK SSE format. |
| **Navigation** | FloatingDock (desktop) vs MobileTabBar (mobile). AppLayout switches based on `useIsMobile()`. |
| **New Features** | Consider tier limits (AI, storage, share links). Free tier should work; premium adds power. |

---

## DATA MODEL KEY POINTS

### Two Character Systems
- **Campaign Characters** (`characters` table): ~30 fields, tied to campaigns, have canvas position
- **Vault Characters** (`vault_characters` table): 130+ fields, user's personal library, reusable

### Character Flow: Campaign ↔ Vault

**Philosophy:** Characters should flow seamlessly between vault, campaigns, adventures, and oneshots. Support data in all contexts without losing information.

```
Campaign Character → "Claim" → Vault Character
                  ↓
    Three options:
    1. In-Play (linked, read-only) - character is actively being played
    2. Session 0 (snapshot) - pre-campaign state before changes
    3. Current State (export) - take away anytime (session 5, end of campaign, etc.)
```

When `vault_character_id` is set on campaign character, they're linked.
When vault character has `campaign_links` JSON, it shows which campaigns reference it.

**Key principle:** Users can export their character from a campaign at ANY point and as often as they want.

### Field Format Consistency
| Field Type | Storage Format | Used In |
|------------|---------------|---------|
| Rich text (summary, notes) | HTML string | Vault chars, campaign chars |
| DM notes | Plain text | Sessions, characters, factions |
| Lists (quotes, important_people) | JSON arrays | Vault chars |
| Relationships | Separate tables | `canvas_relationships`, `vault_character_relationships` |
| Images | Supabase storage URLs | `image_url`, `detail_image_url` |

### Visibility System
Many entities have: `visibility` ('public' | 'party' | 'dm_only') + `dm_notes` (string)
- Characters, timeline events, campaign lore, factions all use this pattern
- Canvas relationships do NOT have visibility (known gap)

### Known Inconsistencies
1. **Relationship tables:** `character_relationships` (simple) vs `canvas_relationships` (rich with templates) - canvas is newer
2. **Image handling:** Vault has both legacy fields AND `vault_character_images` table - use new table
3. **Play status:** Campaign chars have `play_status` enum, vault chars have plain `status` string
4. **Two relationship type systems (intentional):**
   - Vault: family, mentor, friend, enemy, patron, contact, ally, employer, love_interest, rival, acquaintance, party_member, other
   - Campaign canvas: family, professional, romantic, conflict, social, other (broader categories for visualization)

---

## MOBILE COVERAGE STATUS

**Approach:** Case-by-case. Some features (like canvas) are desktop-only. Others (like viewing characters during a session) must work on mobile.

**Has Mobile Variants (20 pages):**
- Home, Campaigns list, Campaign canvas/gallery/intelligence/lore/sessions/timeline
- Vault list, Vault character gallery/intelligence/relationships/sessions
- Adventures, Oneshots, New campaign

**Missing Mobile Variants:**
- Campaign Dashboard (21 widgets may be cramped)
- Campaign Settings
- Complex modals: RelationshipManager, FactionManager, Share modals

**Mobile Patterns:**
- `useIsMobile()` hook for conditional rendering
- `.mobile.tsx` suffix for page variants
- MobileLayout, MobileCard, MobileBottomSheet components in `/src/components/mobile/`

---

## STATE MANAGEMENT

**Zustand Store** (`/src/store/index.ts`):
- `characters[]`, `sessions[]`, `tags[]` - campaign data
- `currentCampaign` - active campaign context
- `aiEnabled`, `aiProvider`, `currency` - persisted to localStorage
- `recentItems[]` - synced to database

**Data Fetching:** Native fetch + custom hooks (no React Query/SWR)
- `useUser()`, `useUserSettings()`, `useMembership()` for auth/settings
- `useAutoSave()` with conflict detection (version checking)
- `useAI()` for streaming AI responses

---

## PROJECT STRUCTURE

```
src/
├── app/
│   ├── (dashboard)/           # Main authenticated routes
│   │   ├── campaigns/         # Campaign list + per-campaign pages
│   │   │   └── [id]/          # Canvas, sessions, timeline, settings, etc.
│   │   ├── vault/             # Character vault
│   │   │   ├── [id]/          # Character editor
│   │   │   └── import/        # AI-powered document import
│   │   ├── oneshots/          # One-shot adventures
│   │   └── home/              # Dashboard home
│   └── api/
│       ├── ai/                # AI endpoints (chat, suggestions, analysis)
│       ├── campaigns/         # Campaign CRUD + members + sharing
│       ├── vault/             # Vault API routes
│       └── content/           # Duplicate, archive, templates
├── components/
│   ├── campaign/              # RelationshipManager, FactionManager, CharacterClaiming
│   ├── canvas/                # React Flow canvas (desktop only)
│   ├── character/             # Character panel/modal for campaigns
│   ├── mobile/                # iOS-style mobile components
│   ├── vault/                 # CharacterEditor, CharacterCard, NPCCard, etc.
│   ├── intelligence/          # AI suggestion components
│   └── ui/                    # Shared UI components
├── hooks/                     # useAutoSave, useMembership, useAI, useIsMobile
├── store/                     # Zustand store
└── types/
    └── database.ts            # Auto-generated from Supabase (4500+ lines)
```

---

## API PATTERNS

**Auth Check Pattern:**
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
const adminClient = createAdminClient() // bypass RLS for verified users
```

**AI Streaming:** All `/api/ai/*` routes return SSE streams (Vercel AI SDK format)

**Key Routes:**
| Route | Purpose |
|-------|---------|
| `/api/vault/parse-file` | Upload file → Gemini parses → returns structured JSON |
| `/api/campaigns/[id]/characters/[id]/claim` | Creates vault characters with linking |
| `/api/content/duplicate` | Cascading copy with ID remapping |
| `/api/ai/chat` | DM assistant with campaign context |

---

## AI CONFIGURATION

Located in `src/lib/ai/config.ts`:

```typescript
AI_PROVIDERS = {
  anthropic: { model: 'claude-sonnet-4-5-20250929' },  // Creative writing
  google: { model: 'gemini-2.0-flash' },               // Fast general
  googlePro: { model: 'gemini-3-pro-preview' },        // Document parsing
}
```

---

## DATABASE SCHEMA (Key Tables)

### vault_characters (130+ fields)
- Basic: name, type (pc/npc), race, class, subclass, level, background
- Story: backstory, summary, notes, tldr, appearance, personality
- Character: ideals, bonds, flaws, goals, secrets, fears
- Links: campaign_links (JSONB), linked_campaign_id
- Meta: status, status_color, source_type, character_lineage_id

### characters (campaign characters, ~30 fields)
- Core: name, type, campaign_id, vault_character_id
- Canvas: position_x, position_y, canvas_width, canvas_height
- Status: play_status, visibility, controlled_by_user_id

### vault_character_relationships
NPCs AND companions (unified table with `is_companion` flag):
- Basic: related_name, relationship_type, relationship_label
- NPC fields: nickname, faction_affiliations, location, occupation
- Companion fields: is_companion, companion_type, companion_species

---

## WHEN ADDING FEATURES

1. **New field on characters?** Add to BOTH `characters` AND `vault_characters` if it should sync
2. **New UI component?** Check if mobile variant needed (use `useIsMobile()`)
3. **New API route?** Follow auth pattern, add to appropriate route group
4. **New rich text field?** Use Tiptap, store as HTML, add to both character types
5. **New visibility-controlled content?** Add `visibility` and `dm_notes` fields

---

## DESIGN SYSTEM - CSS VARIABLES

**USE THESE CSS VARIABLES - do not hardcode hex values.**

### Backgrounds:
```css
--bg-void: #050507      /* Darkest - rarely used */
--bg-base: #0a0a0f      /* Page background */
--bg-surface: #12121a   /* Card/panel background */
--bg-elevated: #1a1a24  /* Elevated panels */
--bg-hover: #222230     /* Hover states */
```

Usage in Tailwind:
```tsx
bg-[--bg-base]      /* NOT bg-[#0a0a0f] */
bg-[--bg-surface]   /* NOT bg-[#0d0d14] */
```

### Accent Colors:
```css
--arcane-purple: #8B5CF6
--arcane-gold: #d4a843
--arcane-ember: #EF4444
```

### Borders:
```css
--border: #2a2a3a
```

Usage: `border-[--border]` (80+ uses in codebase)

### Text:
```css
--text-primary: #ffffff
--text-secondary: #a0a0b0
--text-tertiary: #6b6b7b
```

---

## EXISTING CSS CLASSES

### Buttons:
```tsx
<button className="btn btn-primary">Primary</button>
<button className="btn btn-secondary">Secondary</button>
```

### Forms:
```tsx
<div className="form-group">
  <label className="form-label">Label</label>
  <input className="form-input" />
</div>
```

### Page structure:
```tsx
<div className="page-header">
  <h1 className="page-title">Title</h1>
</div>
```

### Empty states:
```tsx
<div className="empty-state">
  <Icon className="empty-state-icon" />
  <h3 className="empty-state-title">No items</h3>
</div>
```

---

## COMPONENT PATTERNS

### Card/Panel:
```tsx
<div className="bg-[--bg-surface] border border-[--border] rounded-xl p-6">
  {/* content */}
</div>
```

### Expandable card:
```tsx
<div className="bg-[--bg-surface] rounded-xl border border-[--border] hover:border-[--arcane-purple]/30">
  <div className="p-4">Header</div>
  <button className="w-full px-4 py-2 text-xs text-gray-500 hover:text-purple-400">
    Expand Details
  </button>
  {expanded && <div className="px-4 pb-4">Content</div>}
</div>
```

---

## THEME RULES - CRITICAL

1. **ALWAYS use dark theme** - Never white/light backgrounds
2. **Use CSS variables** - `bg-[--bg-surface]` NOT `bg-[#0d0d14]`
3. **Use existing CSS classes** when they exist (btn, form-input, empty-state, etc.)
4. **Consistent borders** - `border-[--border]` is the standard
5. **Purple accents** - `--arcane-purple` (#8B5CF6) for highlights

---

## COMMANDS

```bash
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint
npx supabase gen types typescript --local > src/types/database.ts  # Regenerate types
```

---

## KNOWN TECHNICAL DEBT

1. **player_session_notes** has source fields for Discord/WhatsApp/email import that DON'T EXIST YET
2. **character.secrets** TEXT field vs **entity_secrets** table - inconsistent, needs review
3. **Faction relations UI** - `faction_relations` table exists but NO UI to manage inter-faction relationships
4. **VaultEditor.tsx** - DEPRECATED, use CharacterEditor.tsx instead

---

## SYSTEMS IN PLANNING (See /PLANNING-*.md, /DESIGN-*.md files)

**Designed (ready for implementation):**
- Locations (hierarchical: World > Region > City > Building > Room)
- Quests (types, status flow, objectives, rewards)
- Encounters (combat/social/exploration, consistent with oneshots)
- Story Arcs (organization layer, builds on Timeline eras)

**Rough level (decisions made, needs detailed design):**
- Items/Treasure (AI-suggested from session notes)
- Handouts (library + organization, NOT live display - VTTs do that)
- In-game Calendar (optional module, ~20-30% DM adoption)
- Session Zero (also recruitment tool, share link for finding players)
- Random Tables (prep tool, rolls from YOUR campaign content)

**Deferred:**
- Oneshots redesign (after campaigns locked in)
