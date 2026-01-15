# CLAUDE.md - Project Documentation & Design System

## PROJECT OVERVIEW

D&D Campaign Manager - A comprehensive web app for Dungeon Masters and players to manage TTRPG campaigns, characters, sessions, and lore.

**Tech Stack:**
- Next.js 16 (App Router)
- TypeScript
- Supabase (PostgreSQL + Auth + Storage)
- TipTap rich text editor
- Tailwind CSS v4
- AI: Google Gemini Pro 3 (`gemini-3-pro-preview`), Claude Sonnet

---

## PROJECT STRUCTURE

```
src/
├── app/
│   ├── (dashboard)/           # Main authenticated routes
│   │   ├── campaigns/         # Campaign management
│   │   ├── characters/        # Campaign-specific characters
│   │   ├── vault/             # Character Vault (personal character storage)
│   │   │   ├── [id]/          # Character editor (uses CharacterEditor.tsx)
│   │   │   ├── import/        # AI-powered document import
│   │   │   └── new/           # Create new character
│   │   ├── oneshots/          # One-shot adventures
│   │   └── timeline/          # Campaign timeline view
│   └── api/
│       ├── ai/                # AI endpoints (chat, suggestions, analysis)
│       └── vault/             # Vault API routes
│           ├── parse-file/    # Gemini file upload & parsing
│           ├── import-structured/  # Import parsed data
│           └── import-parsed/ # Alternative import endpoint
├── components/
│   ├── vault/                 # Character vault components
│   │   ├── CharacterEditor.tsx    # Main editor (8 sections, 2000+ lines)
│   │   ├── NPCCard.tsx           # NPC display with relationship colors
│   │   ├── CompanionCard.tsx     # Companion display
│   │   ├── SessionNoteCard.tsx   # Session notes display
│   │   └── VaultEditor.tsx       # DEPRECATED - don't use
│   ├── intelligence/          # AI suggestion components
│   │   └── suggestion-card.tsx   # Approval flow card pattern
│   └── ui/                    # Shared UI components
└── lib/
    ├── ai/config.ts           # AI model configuration
    └── supabase/              # Supabase client utilities
```

---

## KEY FEATURES

### 1. Character Vault (`/vault`)
Personal character storage for players/DMs. Independent of campaigns.

**CharacterEditor.tsx** - The main editor with 8 sections:
- `backstory` - Main narrative, TL;DR bullets
- `details` - Appearance, personality, ideals, bonds, flaws
- `people` - NPCs and Companions (separate arrays)
- `journal` - Session notes (play_journal)
- `writings` - Letters, stories, poems, diary entries
- `stats` - Combat stats, inventory, gold
- `player` - Discord, timezone, experience, preferences
- `gallery` - Character images

### 2. Character Import (`/vault/import`)
AI-powered document import using Gemini Pro 3:
- **File upload**: Drag & drop .docx, .pdf, .png, .jpg, .jpeg, .webp
- **AI parsing**: Gemini extracts character data with zero data loss
- **Approval flow**: Section-by-section approve/reject before import
- **Sections**: Character, NPCs, Companions, Sessions, Writings, Tables

### 3. Campaign Intelligence
AI analysis of session notes to suggest character updates:
- Status changes
- Secrets revealed
- New NPCs detected
- Timeline events
- Relationship changes

---

## DATABASE SCHEMA (Key Tables)

### vault_characters
Main character storage with 50+ fields including:
- Basic: name, type (pc/npc), race, class, subclass, level, background
- Story: backstory, backstory_phases (JSONB), tldr, appearance, personality
- Character: ideals, bonds, flaws, goals, secrets, fears
- Voice: quotes, plot_hooks, gameplay_tips
- Links: theme_music_url, character_sheet_url, external_links
- Player: player_discord, player_timezone, player_experience
- Meta: status, status_color, source_file, raw_document_text

### vault_character_relationships
NPCs AND companions (unified table with `is_companion` flag):
- Basic: related_name, related_image_url, relationship_type, relationship_label
- NPC fields: nickname, faction_affiliations, location, occupation, origin
- NPC detail: needs, can_provide, goals, secrets, personality_traits, full_notes
- Companion fields: is_companion, companion_type, companion_species, companion_abilities
- Status: relationship_status (active/deceased/estranged/missing/complicated)

**Relationship Types** (with colors in NPCCard):
- family (red), mentor (blue), friend (green), enemy (orange)
- patron (purple), contact (cyan), ally (emerald), employer (yellow)
- love_interest (pink), rival (amber), acquaintance (slate), other (gray)

**Companion Types** (with colors in CompanionCard):
- familiar (purple), pet (pink), mount (amber), animal_companion (green)
- construct (blue), other (gray)

### play_journal
Session notes per character:
- session_number, session_date, title, campaign_name
- notes (main content), summary (brief)
- kill_count, loot, thoughts_for_next
- npcs_met (array), locations_visited (array)

### vault_character_writings
Creative writing attached to characters:
- title, writing_type, content, recipient
- Types: letter, story, poem, diary, journal, campfire_story, note, speech, song

### vault_character_images
Character portrait gallery with display_order.

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

**Usage:**
```typescript
import { getAIModel } from '@/lib/ai/config'
const model = getAIModel('googlePro')  // For document parsing
```

---

## API ROUTES

### Vault Import Routes
| Route | Purpose |
|-------|---------|
| `/api/vault/parse-file` | Upload file → Gemini parses → returns structured JSON |
| `/api/vault/import-structured` | Takes parsed JSON → creates character + relations |
| `/api/vault/import-parsed` | Alternative import, handles updates |

### AI Routes
| Route | Purpose |
|-------|---------|
| `/api/ai/chat` | General AI chat |
| `/api/ai/suggestions` | Campaign intelligence suggestions |
| `/api/ai/analyze-session` | Analyze session for character updates |

---

## READ THIS BEFORE ANY UI/STYLING WORK

This project has an established design system using CSS variables defined in `globals.css`.
**USE THE CSS VARIABLES AND EXISTING CLASSES - do not hardcode hex values.**

---

## CSS VARIABLES (defined in globals.css)

### Backgrounds - USE THESE:
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
bg-[--bg-elevated]  /* NOT bg-[#1a1a24] */
```

### Accent Colors:
```css
--arcane-purple: #8B5CF6
--arcane-gold: #d4a843
--arcane-ember: #EF4444
```

Usage:
```tsx
bg-[--arcane-purple]        /* Solid purple */
border-[--arcane-purple]    /* Purple border */
border-[--arcane-purple]/50 /* 50% opacity purple border */
```

### Borders:
```css
--border: #2a2a3a
```

Usage:
```tsx
border-[--border]    /* Standard border - 80+ uses in codebase */
```

### Text:
```css
--text-primary: #ffffff
--text-secondary: #a0a0b0
--text-tertiary: #6b6b7b
```

---

## EXISTING CSS CLASSES (use these instead of inline Tailwind)

### Page structure:
```tsx
<div className="page-header">
  <h1 className="page-title">Title</h1>
  <p className="page-subtitle">Subtitle</p>
</div>
```

### Buttons:
```tsx
<button className="btn btn-primary">Primary</button>
<button className="btn btn-secondary">Secondary</button>
<button className="fab"><Icon className="fab-icon" /></button>
```

### Forms:
```tsx
<div className="form-group">
  <label className="form-label">Label</label>
  <input className="form-input" />
</div>
<textarea className="form-textarea" />
```

### Empty states:
```tsx
<div className="empty-state">
  <Icon className="empty-state-icon" />
  <h3 className="empty-state-title">No items yet</h3>
  <p className="empty-state-description">Description text</p>
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

### Expandable card (see NPCCard, SessionNoteCard):
```tsx
<div className="bg-[--bg-surface] rounded-xl border border-[--border] hover:border-[--arcane-purple]/30 transition-all duration-200 overflow-hidden">
  {/* Header */}
  <div className="p-4">...</div>

  {/* Expand button */}
  <button className="w-full px-4 py-2 flex items-center justify-center gap-2 text-xs text-gray-500 hover:text-purple-400 bg-white/[0.02] hover:bg-white/[0.04] border-t border-[--border]">
    <ChevronDown className="w-4 h-4" />
    Expand Details
  </button>

  {/* Expanded content */}
  {expanded && (
    <div className="px-4 pb-4 space-y-4 border-t border-[--border] bg-white/[0.01]">
      ...
    </div>
  )}
</div>
```

### Section header with icon:
```tsx
<div className="flex items-center gap-4 mb-8">
  <div className="p-3 bg-purple-500/20 rounded-xl">
    <Icon className="w-6 h-6 text-purple-400" />
  </div>
  <h2 className="text-2xl font-bold text-white">SECTION NAME</h2>
  <div className="flex-1 h-px bg-gradient-to-r from-[--arcane-purple]/50 to-transparent" />
</div>
```

### Badge/tag styling:
```tsx
{/* Relationship type badge */}
<span className="text-xs px-2 py-0.5 rounded-md capitalize border bg-blue-500/15 text-blue-400 border-blue-500/20">
  mentor
</span>

{/* Status badge */}
<span className="text-xs px-2 py-0.5 bg-gray-500/15 text-gray-400 rounded capitalize">
  deceased
</span>
```

---

## SPACING PATTERNS

| Pattern | Usage |
|---------|-------|
| mb-4 | Standard gap between elements |
| mb-6 | Larger gap between related groups |
| space-y-4 | Vertical spacing in lists |
| mb-12/mb-16 | Section gaps |
| p-4 to p-6 | Panel padding |
| py-3 px-4 | Input padding |

---

## THEME RULES - CRITICAL

1. **ALWAYS use dark theme** - Never white/light backgrounds
2. **Use CSS variables** - `bg-[--bg-surface]` NOT `bg-[#0d0d14]`
3. **Use existing CSS classes** when they exist (btn, form-input, empty-state, etc.)
4. **Consistent borders** - `border-[--border]` is the standard
5. **Purple accents** - `--arcane-purple` (#8B5CF6) for highlights

---

## QUICK REFERENCE

| What | Use This |
|------|----------|
| Page background | `bg-[--bg-base]` |
| Panel background | `bg-[--bg-surface]` or `bg-white/[0.03]` |
| Borders | `border-[--border]` |
| Purple accent | `bg-[--arcane-purple]` or `bg-purple-500/20` |
| Button | `className="btn btn-primary"` |
| Form input | `className="form-input"` |
| Standard gap | `mb-4` or `mb-6` |
| Section gap | `mb-12` or `mb-16` |

---

## KNOWN ISSUES

### CharacterEditor.tsx
This component uses some hardcoded hex values instead of CSS variables. When editing:
- Replace `bg-[#0a0a0f]` with `bg-[--bg-base]`
- Replace `border-white/10` with `border-[--border]` where appropriate

### VaultEditor.tsx
**DEPRECATED** - Do not use. Use CharacterEditor.tsx instead.
