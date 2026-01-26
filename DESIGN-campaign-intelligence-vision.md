# Campaign Intelligence Vision

> The core philosophy for how the system should work.

## The Problem

Creating a rich, interconnected campaign world requires:
- Locations linked to factions
- Characters linked to locations
- Secrets linked to entities
- Quests linked to NPCs and locations
- Relationships formed at places, relevant to quests
- etc.

**Manual linking is tedious.** DMs won't do it. The world stays flat.

## The Solution: AI-Assisted World Building

**The DM's job:** Write session notes naturally.

**The system's job:** Extract connections and suggest them.

### How It Works

```
1. DM writes session notes:
   "The party visited the Yawning Portal and met Durnan, who told them
   about the Thieves Guild operating from the Docks district. He warned
   them that Xanathar's agents have been seen near the warehouse."

2. Campaign Intelligence extracts:
   - Location mentioned: "Yawning Portal" (exists? create?)
   - NPC mentioned: "Durnan" (exists? link to Yawning Portal?)
   - Faction mentioned: "Thieves Guild" (exists? link to "Docks"?)
   - Location mentioned: "Docks district" (exists? create?)
   - Faction mentioned: "Xanathar's agents" (exists? Xanathar Guild?)
   - Location mentioned: "warehouse" (create? parent: Docks?)

3. System presents suggestions:
   ┌─────────────────────────────────────────────────────────────┐
   │ Session 5 Intelligence Suggestions (8)                      │
   ├─────────────────────────────────────────────────────────────┤
   │ ☐ Link NPC "Durnan" to location "Yawning Portal"           │
   │ ☐ Create faction "Thieves Guild"                            │
   │ ☐ Link "Thieves Guild" to location "Docks"                  │
   │ ☐ Create location "Docks district" (parent: Waterdeep)      │
   │ ☐ Link faction "Xanathar Guild" to location "warehouse"     │
   │ ☐ Add quest hook: "Investigate Xanathar activity"           │
   │ ☐ Mark secret: "Xanathar agents near warehouse" (revealed)  │
   │ ☐ Add item mentioned: (none detected)                       │
   │                                                              │
   │ [Accept All] [Review Each] [Dismiss All]                    │
   └─────────────────────────────────────────────────────────────┘

4. DM reviews:
   - Accept most suggestions
   - Reject "Create faction Thieves Guild" (already exists as "Shadow Thieves")
   - Modify "warehouse" to link to existing "Old Warehouse" location

5. World updates automatically:
   - Durnan now shows "Location: Yawning Portal"
   - Thieves Guild (Shadow Thieves) now shows "Territory: Docks"
   - Timeline event created: "Learned about Xanathar activity"
   - Quest hook added to quest board
```

## Key Principles

### 1. Session Notes Are The Source of Truth
DMs already write session notes. That's their primary workflow. Everything else should flow FROM that.

### 2. Suggestions, Not Automation
AI suggests. DM approves. Nothing changes without consent.

### 3. Bulk Operations
"Accept All" for DMs who trust the AI. "Review Each" for those who want control.

### 4. Learn From Corrections
When DM changes "Thieves Guild" to "Shadow Thieves", the system learns that these are the same thing.

### 5. Retroactive Intelligence
Can run intelligence on old sessions to backfill connections.

## What This Means For Feature Design

Every feature we design should consider:
- Can this be auto-detected from session notes?
- Can Campaign Intelligence suggest this connection?
- What's the approval workflow?

### Examples

| Feature | Manual Entry | AI-Assisted |
|---------|--------------|-------------|
| Location-NPC link | DM edits NPC, sets location | AI: "Durnan mentioned at Yawning Portal - link?" |
| Faction-Location link | DM edits faction, adds territory | AI: "Thieves Guild operates from Docks - link?" |
| Item discovery | DM creates item, assigns to character | AI: "Party found +1 sword - create item? assign to Fighter?" |
| Quest creation | DM manually creates quest | AI: "Durnan asked party to investigate - create quest?" |
| Secret revelation | DM marks secret as revealed | AI: "Party learned about Xanathar - mark secret revealed?" |
| Relationship | DM creates relationship | AI: "Durnan warned about Xanathar - create rivalry relationship?" |

## The "Dizzying Updates" Problem

User concern: "I don't want it to be dizzying to keep up with update wise"

**Solution:**
- All updates flow through the suggestion queue
- DM processes suggestions when they want (after session, during prep)
- Can batch accept/reject
- Can ignore suggestions entirely if they prefer manual
- Suggestions expire or auto-dismiss after X days if not reviewed

## Integration With Existing Intelligence

Current Campaign Intelligence already:
- Suggests character consistency checks
- Suggests plot hooks
- Detects lore conflicts
- Suggests relationship gaps

**Expansion:**
- Detect entity mentions (NPCs, locations, factions, items)
- Suggest entity creation
- Suggest entity linking
- Suggest quest creation from hooks
- Suggest secret revelations
- Suggest timeline events

## The Vision

> "I just write my session notes, and the campaign world builds itself."

That's the goal. DM does the creative work (running the game, writing notes). System does the bookkeeping (linking, organizing, tracking).
