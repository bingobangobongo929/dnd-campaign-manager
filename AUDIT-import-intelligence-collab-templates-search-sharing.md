# Audit: Import/Export, Intelligence, Collaboration, Templates, Search, Sharing

> Current state of the remaining 6 systems.

---

## 1. IMPORT/EXPORT

### What Exists
- **JSON Export** - Full user data export via `/api/user/export`
- **Character Import** - Comprehensive 150+ field support, relationship creation, duplicate detection
- **External Format Imports** - Allycan and Lancer formats supported
- **File Parsing** - Document parsing for structured import

### Working Well
- Zero data loss architecture
- Multiple import format support
- Upsert workflow (create or update)
- Activity logging

### Missing
- PDF export (marked as tier-gated but not implemented)
- Batch import from multiple files
- Import verification before commit
- Campaign export (only JSON, no PDF)
- Template marketplace import

---

## 2. CAMPAIGN INTELLIGENCE (AI)

### What Exists
- **Suggestion Types:** status_change, secret_revealed, story_hook, quote, important_person, relationship
- **Multi-Provider:** Anthropic (Claude) default, Google (Gemini) configurable
- **Confidence Scoring:** high, medium, low
- **Audit Trail:** current_value, suggested_value, final_value
- **AI Access:** Manually granted, NOT tied to subscription tier

### Working Well
- Robust database schema
- Multiple suggestion types
- Confidence scoring
- Decoupled from tier system

### Missing
- Pending status removed (suggestions applied immediately)
- Only 6 suggestion types (limited)
- No bulk apply/reject
- No learning from user decisions
- No scheduled generation
- **Entity detection not implemented** (NPCs, locations, factions from text)

---

## 3. COLLABORATION

### What Exists
- **Roles:** owner, co_dm, player, contributor, guest
- **Invite System:** Email, Discord ID, invite codes with expiry
- **Player Session Notes:** Multi-source attribution, party sharing
- **DM Secrets:** Entity-level visibility (dm_only, party, public)
- **Discord Integration:** ID linking, username tracking

### Working Well
- Rich role system
- Multiple invite pathways
- Secret/visibility system
- Player note attribution

### Missing
- **No real-time collaboration** (co-editing)
- No presence awareness (who's online)
- No change notifications
- No approval workflow for member actions
- Discord OAuth not implemented (just ID storage)
- Co-DM role exists but no co-editing functionality

---

## 4. TEMPLATES/PRESETS

### What Exists
- **Content Modes:** active, inactive, template
- **Immutable Snapshots:** Versioned, frozen states for stable sharing
- **Save System:** Reference until "Start Playing" creates instance
- **Version Management:** Auto-cleanup unused snapshots
- **Attribution:** Creator credit on derivative works

### Working Well
- Immutable snapshots prevent corruption
- Efficient save system
- Update notifications for new versions
- Attribution system

### Missing
- **No marketplace/discovery UI** (API exists)
- No categories/tags organization
- No ratings/reviews
- No template drafts (all or nothing)
- No template forking/variants
- No "save as template" button visible in UI

---

## 5. SEARCH/NAVIGATION

### What Exists
- **Recent Items:** Per-user, auto-tracked, 10 most recent
- **Activity Log:** Filtered by entity type, days range

### Working Well
- Recent items automatic
- Persistent storage

### CRITICAL GAPS
- **NO Global Search**
- **NO Full-Text Search**
- **NO Campaign-Scoped Search**
- **NO Character Search by fields**
- **NO Advanced Filters**
- **NO Autocomplete/Suggestions**
- Navigation is homepage-based only

---

## 6. PUBLISHING/SHARING

### What Exists
- **Share System:** Unique codes, expiry, view counts, analytics
- **Password Protection:** Hash-based
- **Share Types:** party (live) vs template (snapshot)
- **View Analytics:** Per-share, unique visitors, trends
- **Attribution:** Creator username captured

### Working Well
- Comprehensive analytics
- Multiple share types
- Password protection
- Expiry enforcement
- Attribution system

### Missing
- **No public profiles**
- **No content discovery** (browse/search templates)
- No share collections
- No comments/ratings
- No social features

---

## Summary Status

| Feature | Completeness | Critical Gap? |
|---------|--------------|---------------|
| Import/Export | 70% | No |
| Campaign Intelligence | 60% | Yes - limited suggestion types |
| Collaboration | 40% | Yes - no real-time |
| Templates/Presets | 70% | Yes - no discovery |
| **Search/Navigation** | **20%** | **CRITICAL - no global search** |
| Publishing/Sharing | 75% | Moderate - no discovery |
