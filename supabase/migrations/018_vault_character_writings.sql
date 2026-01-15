-- =====================================================
-- VAULT CHARACTER IMPORT COMPLETENESS
-- Migration 018 - Character Writings & Additional Fields
-- =====================================================
-- This migration adds fields found during comprehensive
-- document analysis that were missing from the schema:
-- - Character writings (letters, stories, poems)
-- - Rumors (true/false statements)
-- - Player meta info (OOC)
-- - DM Q&A responses
-- - Gameplay tips
-- - Open questions from backstory
-- =====================================================

-- =====================================================
-- PART 1: ADD MISSING FIELDS TO vault_characters
-- =====================================================

-- ----- CHARACTER WRITINGS -----
-- Stores letters, campfire stories, poems, diary entries
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS character_writings JSONB;
-- Format: [{title: "Letter to Nana", type: "letter", content: "...", recipient: "Nana", date_written: "Session 5"}]

COMMENT ON COLUMN vault_characters.character_writings IS
  'Character writings: [{title, type (letter/story/poem/diary), content, recipient, date_written}]';

-- ----- RUMORS -----
-- True/false statements about the character for the world
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS rumors JSONB;
-- Format: [{statement: "She will poison your food", is_true: false}]

COMMENT ON COLUMN vault_characters.rumors IS
  'Rumors about the character: [{statement, is_true: boolean}]';

-- ----- DM Q&A -----
-- Questions and answers from DM questionnaires
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS dm_qa JSONB;
-- Format: [{question: "Why stick with the group?", answer: "She has nothing else..."}]

COMMENT ON COLUMN vault_characters.dm_qa IS
  'DM questionnaire responses: [{question, answer}]';

-- ----- PLAYER META INFO (OOC) -----
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS player_discord TEXT,
  ADD COLUMN IF NOT EXISTS player_timezone TEXT,
  ADD COLUMN IF NOT EXISTS player_experience TEXT,
  ADD COLUMN IF NOT EXISTS player_preferences JSONB;
-- Format: {fun_in_dnd: "...", annoys_me: "...", ideal_party: "...", ideal_dm: "..."}

COMMENT ON COLUMN vault_characters.player_discord IS 'Player Discord handle (OOC info)';
COMMENT ON COLUMN vault_characters.player_timezone IS 'Player timezone (OOC info)';
COMMENT ON COLUMN vault_characters.player_experience IS 'Player TTRPG experience level (OOC info)';
COMMENT ON COLUMN vault_characters.player_preferences IS 'Player preferences: {fun_in_dnd, annoys_me, ideal_party, ideal_dm}';

-- ----- GAMEPLAY TIPS -----
-- Combat tips, mechanical reminders for playing the character
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS gameplay_tips TEXT[];

COMMENT ON COLUMN vault_characters.gameplay_tips IS
  'Combat tips and mechanical reminders for playing this character';

-- ----- OPEN QUESTIONS -----
-- Unanswered questions from backstory for future exploration
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS open_questions TEXT[];

COMMENT ON COLUMN vault_characters.open_questions IS
  'Unanswered questions from backstory for future exploration';

-- ----- PRONOUNS (ensure exists) -----
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS pronouns TEXT;

COMMENT ON COLUMN vault_characters.pronouns IS 'Character pronouns (she/her, he/him, they/them)';

-- ----- CREW/PARTY RELATIONS -----
-- Notes about relationships with other party members
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS party_relations JSONB;
-- Format: [{name: "Lapik", notes: "Got a tadpole in his head...", relationship: "rocky"}]

COMMENT ON COLUMN vault_characters.party_relations IS
  'Relations with party members: [{name, notes, relationship}]';

-- ----- KILL SCORE / COMBAT STATS -----
-- Track combat statistics
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS combat_stats JSONB;
-- Format: {kills: 3, deaths: 1, unconscious: 2, last_updated_session: 14}

COMMENT ON COLUMN vault_characters.combat_stats IS
  'Combat statistics: {kills, deaths, unconscious, last_updated_session}';

-- =====================================================
-- PART 2: CREATE character_writings TABLE (optional normalized approach)
-- =====================================================
-- For users who want to manage writings separately

CREATE TABLE IF NOT EXISTS vault_character_writings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  character_id UUID NOT NULL REFERENCES vault_characters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  writing_type TEXT DEFAULT 'other', -- letter, story, poem, diary, note, speech, other
  content TEXT NOT NULL,
  recipient TEXT, -- For letters
  in_universe_date TEXT, -- Date within the story
  session_reference TEXT, -- e.g., "Session 5", "After arc 2"
  is_sent BOOLEAN DEFAULT false, -- For letters, was it sent?
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vault_writings_character ON vault_character_writings(character_id);
CREATE INDEX IF NOT EXISTS idx_vault_writings_user ON vault_character_writings(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_writings_type ON vault_character_writings(writing_type);

-- RLS for vault_character_writings
ALTER TABLE vault_character_writings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own character writings"
  ON vault_character_writings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own character writings"
  ON vault_character_writings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own character writings"
  ON vault_character_writings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own character writings"
  ON vault_character_writings FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE vault_character_writings IS
  'In-character writings: letters, stories, poems, diary entries with context';

-- =====================================================
-- PART 3: ADD INDEXES FOR NEW FIELDS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_vault_characters_pronouns ON vault_characters(pronouns);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
