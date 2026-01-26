# Audit: Factions, Relationships, Secrets, Player Notes

> Current state of these 4 existing features.

---

## 1. FACTIONS

### What Exists
- `campaign_factions` table with 10 faction types (guild, kingdom, cult, family, etc.)
- `faction_memberships` table with roles, titles, ranks
- `faction_relations` table for inter-faction relationships (allied, hostile, war, etc.)
- Hierarchical factions (parent_faction_id)
- Visibility controls (is_known_to_party, dm_notes, visibility levels)

### UI
- `FactionManager.tsx` - Create, edit, delete, browse factions
- `FactionMembershipEditor.tsx` - Join/create/manage character memberships

### Working Well
- Complete CRUD operations
- Hierarchical support
- Secret membership flag
- 10 faction types with icons
- Character membership with roles/titles

### Gaps
- No UI for inter-faction relationships (table exists, no UI)
- No faction stats (wealth, power, influence)
- No faction-quest linking
- No faction resources/attributes
- Limited lore fields

---

## 2. RELATIONSHIPS (Character-to-Character)

### What Exists
- `relationship_templates` table with 25 pre-seeded templates
- `canvas_relationships` table with full metadata
- Asymmetric/symmetric relationship support (Father/Child, Friend/Friend)
- Bidirectional pairing system (pair_id links both directions)
- Status tracking (active, ended, complicated, secret)
- Category organization (family, professional, romantic, conflict, social)

### UI
- `RelationshipManager.tsx` - View all relationships, search, filter
- `RelationshipDiagram.tsx` - Force-directed graph visualization
- `RelationshipEditor.tsx` - Character-level editor

### Working Well
- 25 pre-defined templates
- Beautiful relationship diagram
- Asymmetric relationship handling
- Secret relationship flag
- Full CRUD with search/filter

### Gaps
- No relationship strength/intensity metric
- No relationship evolution history
- No relationship-quest linking
- No player-visible relationship view
- No relationship timeline visualization

---

## 3. SECRETS

### What Exists
- `entity_secrets` table for any entity type (character, session, faction, location, etc.)
- Revelation tracking with session linking (revealed_at, revealed_in_session_id)
- Three visibility levels (dm_only, party, public)
- Field-level secrets (can attach secret to specific field like "backstory")

### UI
- `SecretManager.tsx` - Create, reveal, delete secrets
- Revelation modal with session selection

### Working Well
- Generic secrets for any entity type
- Revelation tracking with session linking
- Three-level visibility
- Clean API-based architecture

### Gaps
- No secret categories/organization
- No partial revelation (can't reveal hints)
- No secret dependencies (reveal A before B)
- No player-side "what I've learned" tracking
- No secret urgency/importance flags
- Character.secrets field doesn't use entity_secrets table (inconsistent)

---

## 4. PLAYER NOTES & CONTRIBUTIONS

### What Exists
- `player_session_notes` table with multi-source support
- Source tracking: manual, discord_import, whatsapp_import, email_import, dm_added
- Attribution separate from creator
- Party sharing control (is_shared_with_party)
- `campaign_members` with 5 roles: owner, co_dm, player, contributor, guest

### UI
- Notes integrated into session forms
- Campaign member management

### Working Well
- Multi-source import (Discord, WhatsApp, email)
- Source tracking
- Player attribution
- Role-based membership
- Attendance tracking

### Gaps
- No dedicated player notes page
- No player lore contributions
- No player character journals
- No shared party documents (party fund, resources)
- No player-to-player messaging
- No note categories/tags
- No player timeline contributions
- No structured session feedback

---

## Cross-Feature Observations

1. **Consistent visibility pattern**: public, party, dm_only used everywhere
2. **DM notes pattern**: Multiple tables have dm_notes fields
3. **Features are somewhat siloed**: Factions don't link to relationships, secrets don't link to quests
4. **Limited player agency**: Most features are DM-focused

---

## Integration Opportunities (For New Systems)

| Feature | Could Link To |
|---------|--------------|
| Factions | Locations (headquarters), Quests (faction missions), Characters (members) |
| Relationships | Quests (relationship-based objectives), Timeline (when relationships formed) |
| Secrets | Quests (secret objectives), Locations (hidden features), Timeline (revelation events) |
| Player Notes | Timeline (player-recorded events), Lore (player theories) |
