# UX Design Principles

> Core principles for serving both beginners and experts without alienating either.

## The Core Problem

| User Type | Fear | What They Need |
|-----------|------|----------------|
| Beginner | Overwhelmed by complexity | Simple start, gradual discovery |
| Expert | Tool is too basic for them | Visible depth, powerful features |

**The trap:** Progressive disclosure that HIDES features solves for beginners but loses experts.

---

## Principle 1: Show Capabilities, Simplify Content

**Navigation shows ALL features. Content areas start simple.**

```
SIDEBAR (Expert sees depth)     CONTENT AREA (Beginner isn't overwhelmed)
├── Canvas                      ┌─────────────────────────────────────┐
├── Sessions                    │  Factions                           │
├── Arcs            ←visible    │                                     │
├── Locations       ←visible    │  No factions yet.                   │
├── Factions        ←visible    │                                     │
├── Quests          ←visible    │  Factions help you track political  │
├── NPCs                        │  powers, guilds, and organizations  │
├── Timeline                    │  in your world.                     │
├── Maps                        │                                     │
├── Lore                        │  [+ Create First Faction]           │
└── Settings                    │                                     │
                                └─────────────────────────────────────┘
```

**Result:**
- Expert: "Oh, this has factions, quests, arcs - this is serious"
- Beginner: "I'll just use Sessions for now, but I can see there's more when I'm ready"

---

## Principle 2: Presets Configure, Don't Restrict

Presets are starting configurations, not limitations.

| Preset | Default Modules Enabled | Target User |
|--------|------------------------|-------------|
| My First Campaign | Canvas, Sessions, NPCs, Lore | Brand new DM |
| Quick Adventure | Canvas, Sessions, NPCs | Short campaigns |
| Story Campaign | + Arcs, Timeline, Quests | Narrative-focused |
| Dungeon Delve | + Maps, Locations, Encounters | Dungeon crawlers |
| Political Intrigue | + Factions, Relationships | Court intrigue |
| Sandbox World | + Locations (hierarchical), Random Tables | Hex crawl |
| West Marches | + Scheduling, Shared State | Open table |
| Expert/Blank | Everything enabled | Experienced DMs |

**Key:** User can ALWAYS enable more modules in settings. Presets just set sensible defaults.

---

## Principle 3: No Completion Pressure

**Never show:**
- Completion percentages
- "Your campaign is X% complete"
- Required field indicators (beyond name)
- "You haven't filled out..." warnings

**Instead show:**
- Optional milestone tracking (user-defined)
- Session count (neutral fact)
- "Last updated" timestamps
- Activity feed (what's been added recently)

---

## Principle 4: Empty States Are Inviting

Every empty section should:
1. Explain what the feature does (one sentence)
2. Suggest why they might want it
3. Provide one clear action

**Good empty state:**
```
Quests

Track objectives, missions, and plot threads your party is pursuing.

Quests help you remember what the party said they'd do, who asked them,
and what happens when they succeed or fail.

[+ Create First Quest]
```

**Bad empty state:**
```
Quests

No quests found.

[+ Add Quest]
```

---

## Principle 5: Flexible Creation Flow

Users start wherever they want:
- Some write backstory first
- Some add NPCs first
- Some upload maps first
- Some just name it and play

**The creation landing page (future) should:**
- Not enforce order
- Show all entry points
- Group related things naturally
- Let user jump to any section

**NOT a wizard.** More like a dashboard with quick-add options.

---

## Principle 6: Modules Can Be Disabled

If a user truly doesn't want a feature, they can hide it from navigation.

Settings → Modules:
- [ ] Arcs
- [x] Sessions
- [ ] Factions
- [x] NPCs
- [ ] Quests
- [x] Locations
- [ ] Timeline
- [x] Maps
- [x] Lore

Disabled modules:
- Don't appear in navigation
- Don't appear in search
- Data isn't deleted (re-enabling restores it)

---

## Principle 7: Depth Is Discoverable, Not Hidden

Advanced features should be:
- Visible in the UI (even if collapsed/secondary)
- Mentioned in empty states where relevant
- Documented in tooltips/help
- Shown in template gallery examples

**Example:** Relationship types between characters
- Default: Simple "knows" relationship
- Advanced: Relationship types (ally, rival, family, etc.) visible as dropdown
- Expert sees it exists, beginner can ignore the dropdown

---

## Summary: The Balance

| Aspect | Beginner-Friendly | Expert-Friendly |
|--------|-------------------|-----------------|
| Navigation | All features visible | All features visible |
| Content | Starts empty, clean | Can be complex immediately |
| Presets | Sensible defaults | "Expert" preset shows all |
| Empty states | Explains, invites | Doesn't block, quick add |
| Required fields | Name only | Name only |
| Customization | Can disable unused | Can enable everything |
| Completion | No pressure metrics | No pressure metrics |
