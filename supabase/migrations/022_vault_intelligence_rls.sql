-- =====================================================
-- VAULT CHARACTER INTELLIGENCE RLS POLICIES
-- Migration 022 - Allow intelligence_suggestions for vault characters
-- =====================================================

-- The original RLS policies only check campaign_id.
-- We need to also allow access via vault_character_id for character intelligence.

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own intelligence suggestions" ON intelligence_suggestions;
DROP POLICY IF EXISTS "Users can insert own intelligence suggestions" ON intelligence_suggestions;
DROP POLICY IF EXISTS "Users can update own intelligence suggestions" ON intelligence_suggestions;
DROP POLICY IF EXISTS "Users can delete own intelligence suggestions" ON intelligence_suggestions;

-- Recreate policies to support both campaigns AND vault characters
CREATE POLICY "Users can view own intelligence suggestions"
  ON intelligence_suggestions FOR SELECT
  USING (
    -- Campaign-based access (original)
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = intelligence_suggestions.campaign_id
      AND campaigns.user_id = auth.uid()
    )
    OR
    -- Vault character-based access (new)
    EXISTS (
      SELECT 1 FROM vault_characters
      WHERE vault_characters.id = intelligence_suggestions.vault_character_id
      AND vault_characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own intelligence suggestions"
  ON intelligence_suggestions FOR INSERT
  WITH CHECK (
    -- Campaign-based access (original)
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = intelligence_suggestions.campaign_id
      AND campaigns.user_id = auth.uid()
    )
    OR
    -- Vault character-based access (new)
    EXISTS (
      SELECT 1 FROM vault_characters
      WHERE vault_characters.id = intelligence_suggestions.vault_character_id
      AND vault_characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own intelligence suggestions"
  ON intelligence_suggestions FOR UPDATE
  USING (
    -- Campaign-based access (original)
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = intelligence_suggestions.campaign_id
      AND campaigns.user_id = auth.uid()
    )
    OR
    -- Vault character-based access (new)
    EXISTS (
      SELECT 1 FROM vault_characters
      WHERE vault_characters.id = intelligence_suggestions.vault_character_id
      AND vault_characters.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own intelligence suggestions"
  ON intelligence_suggestions FOR DELETE
  USING (
    -- Campaign-based access (original)
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = intelligence_suggestions.campaign_id
      AND campaigns.user_id = auth.uid()
    )
    OR
    -- Vault character-based access (new)
    EXISTS (
      SELECT 1 FROM vault_characters
      WHERE vault_characters.id = intelligence_suggestions.vault_character_id
      AND vault_characters.user_id = auth.uid()
    )
  );
