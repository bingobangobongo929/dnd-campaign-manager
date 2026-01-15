-- Vault Character Enhancements
-- Adds important_people, session_journal, fears, signature_items, open_questions, and character_tags

-- Important People - structured relationships
-- Format: [{name, relationship_type, notes}]
-- relationship_type: family, mentor, friend, enemy, romantic, patron, pet_familiar, other
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS important_people JSONB DEFAULT '[]'::jsonb;

-- Session Journal - track play sessions for this character
-- Format: [{date, campaign_name, session_number, title, notes, character_growth}]
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS session_journal JSONB DEFAULT '[]'::jsonb;

-- Fears and Phobias - specific character fears
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS fears TEXT[] DEFAULT '{}';

-- Signature Items - special equipment, familiars, etc.
-- Format: [{name, type, description}]
-- type: familiar, weapon, artifact, vehicle, companion, other
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS signature_items JSONB DEFAULT '[]'::jsonb;

-- Open Questions - unresolved plot hooks phrased as questions
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS open_questions TEXT[] DEFAULT '{}';

-- Character Tags - for categorization and filtering
-- Examples: blood-magic, pirate, changeling, royal-heritage, amnesia, military
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS character_tags TEXT[] DEFAULT '{}';

-- Age field
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS age INTEGER;

-- Pronouns
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS pronouns TEXT DEFAULT 'they/them';

-- Family - structured family relationships (subset of important_people but more specific)
-- Format: [{name, relation, status, notes}]
-- relation: mother, father, sibling, spouse, child, grandparent, uncle, aunt, cousin
-- status: alive, deceased, unknown, missing
ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS family JSONB DEFAULT '[]'::jsonb;

-- Draft status for incomplete characters
-- Update the status check constraint if needed (status is already TEXT, so just document valid values)
-- Valid values: active, retired, deceased, hiatus, draft

-- Create indexes for the new array fields
CREATE INDEX IF NOT EXISTS idx_vault_characters_character_tags ON vault_characters USING GIN (character_tags);
CREATE INDEX IF NOT EXISTS idx_vault_characters_fears ON vault_characters USING GIN (fears);

COMMENT ON COLUMN vault_characters.important_people IS 'Array of {name, relationship_type, notes} - types: family, mentor, friend, enemy, romantic, patron, pet_familiar, other';
COMMENT ON COLUMN vault_characters.session_journal IS 'Array of {date, campaign_name, session_number, title, notes, character_growth} for tracking play sessions';
COMMENT ON COLUMN vault_characters.signature_items IS 'Array of {name, type, description} - types: familiar, weapon, artifact, vehicle, companion, other';
COMMENT ON COLUMN vault_characters.family IS 'Array of {name, relation, status, notes} - relation: mother, father, sibling, etc. status: alive, deceased, unknown, missing';
