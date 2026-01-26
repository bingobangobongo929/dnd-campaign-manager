# Competitor UX Research: Beginner vs Expert Problem

> How other tools handle serving both beginners and experts.

## Key Finding: Avoid Completion Pressure

**Most tools do NOT show completion percentages.**

| Tool | Completion Tracking |
|------|---------------------|
| World Anvil | Word count goals (optional), TODO lists |
| Kanka | Binary quest completion only |
| LegendKeeper | None |
| Obsidian RPG Manager | Story circle stages (optional) |

**Why:** Completion percentages create anxiety. Users feel their campaign is "lacking" even when it's perfectly playable.

**What works instead:**
- Optional TODO lists
- Word count goals (user-set, not imposed)
- Milestone markers (binary: done/not done)

---

## Minimum to Create a Campaign

| Tool | Minimum Required |
|------|------------------|
| World Anvil | Name only |
| Kanka | Name only |
| LegendKeeper | Create project, start typing |
| Notion | Duplicate template |

**Pattern:** The barrier to entry is as low as possible. One field.

---

## How Optional Depth is Presented

### World Anvil
- Templates have many fields, but explicitly states "all prompts are optional"
- Fields grouped in collapsible sections
- User feedback: some frustration with "eternally blank fields"

### Kanka
- ~20 modules that can be **disabled entirely** in settings
- Attributes system lets users define their own tracking fields
- Preset selection at onboarding disables irrelevant modules

### LegendKeeper
- "Just open a document and start typing"
- Features discoverable through use, not imposed upfront

---

## Story Arcs / Organization Features

**Yes, competitors have this concept:**

| Tool | Feature Name | Structure |
|------|--------------|-----------|
| World Anvil | Plots & Subplots | Master plot + subplots, plot tree visualization |
| World Anvil | Chronicles | Merges maps + timelines, tracks party actions |
| Kanka | Quests | Quest > Subquests, elements collection |
| Obsidian RPG Manager | Story Structure | Campaign > Adventures > Chapters > Sessions > Scenes |
| Obsidian RPG Manager | Story Circle | 8-stage narrative structure per scene |

**Conclusion:** Story arcs ARE common. Most tools support some form of hierarchical organization within campaigns.

---

## Free vs Paid Tiers

| Tool | Free Tier | Paid Tier | Key Difference |
|------|-----------|-----------|----------------|
| World Anvil | 42 articles, public only | Unlimited, private | Article limits, privacy |
| Kanka | Unlimited campaigns, all core features | Family trees, CSS, marketplace | Core features FREE |
| LegendKeeper | 14-day trial | $9/month | No free tier after trial |
| Obsidian | Free core app | Sync/Publish paid | Plugins free |

**Best model for trust:** Kanka - "designed for free users", all core features available.

---

## Onboarding Approaches

### World Anvil
- 6-lesson wizard with checklist
- User type selection (Author/GM/Worldbuilder/Player) changes UI
- Digital badge on completion

### Kanka (v3.6, Dec 2025)
- Quick, skippable onboarding
- **Preset selection** that:
  - Disables some modules
  - Renames player role
  - Sets default permissions
- "Getting Started" widget with discovery tasks

### LegendKeeper
- Minimal - 14-day trial, start typing
- Learning through use

**Best practice:** Kanka's preset approach. User picks a style, app pre-configures relevant features.

---

## Progressive Disclosure Patterns

**Definition:** "Initially show only the most important options. Offer specialized options upon request."

| Tool | How They Do It |
|------|----------------|
| World Anvil | User type selection changes default UI |
| Kanka | Modules can be disabled, presets at onboarding |
| LegendKeeper | Clean default, advanced features in menus |
| Obsidian | Simple core, complexity via plugins |

**Key insight:** 2 levels of disclosure is optimal. More than 3 causes users to get lost.

---

## Recommendations for This Project

### To Avoid Completion Pressure
- No completion percentages
- All fields optional
- Empty states feel intentional, not incomplete
- Optional TODO/milestone tracking

### To Serve Beginners
- Minimum viable creation: just a name
- Preset selection at onboarding ("First Campaign", "Dungeon Crawl", etc.)
- Getting Started widget with discoverable tasks
- Guided templates without being restrictive

### To Serve Experts
- All features available (modules can be enabled)
- Advanced organizational tools (story arcs, relationship webs)
- Custom fields/attributes
- No artificial limits on complexity

### Story Arc Implementation
Competitors prove this is valuable. Recommend:
- Campaign > Arcs (optional layer)
- Each arc has: name, description, status, sessions range
- Can be ignored if user prefers flat structure
- NOT required - just organizational convenience
