-- Migration: Campaign Intelligence
-- Adds table for tracking AI-generated suggestions from session analysis

-- ============================================================================
-- 1. CREATE INTELLIGENCE SUGGESTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS intelligence_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  character_id UUID REFERENCES characters(id) ON DELETE CASCADE,

  -- Suggestion classification
  suggestion_type TEXT NOT NULL, -- 'status_change', 'secret_revealed', 'story_hook', 'quote', 'important_person', 'relationship'
  field_name TEXT NOT NULL, -- The actual field to update: 'status', 'secrets', 'story_hooks', etc.

  -- Values
  current_value JSONB, -- Current value of the field (for comparison/audit)
  suggested_value JSONB NOT NULL, -- The proposed new value

  -- Source and reasoning
  source_excerpt TEXT NOT NULL, -- The exact text from session notes that triggered this
  ai_reasoning TEXT, -- Brief explanation of why this was detected
  confidence TEXT DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),

  -- Workflow state
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'rejected')),
  final_value JSONB, -- If edited before applying, what was actually applied

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_intelligence_suggestions_campaign ON intelligence_suggestions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_suggestions_session ON intelligence_suggestions(session_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_suggestions_character ON intelligence_suggestions(character_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_suggestions_status ON intelligence_suggestions(status);

-- ============================================================================
-- 2. ROW LEVEL SECURITY POLICIES
-- ============================================================================

ALTER TABLE intelligence_suggestions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view suggestions in their campaigns"
    ON intelligence_suggestions FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM campaigns WHERE campaigns.id = intelligence_suggestions.campaign_id AND campaigns.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert suggestions in their campaigns"
    ON intelligence_suggestions FOR INSERT
    WITH CHECK (EXISTS (
      SELECT 1 FROM campaigns WHERE campaigns.id = intelligence_suggestions.campaign_id AND campaigns.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update suggestions in their campaigns"
    ON intelligence_suggestions FOR UPDATE
    USING (EXISTS (
      SELECT 1 FROM campaigns WHERE campaigns.id = intelligence_suggestions.campaign_id AND campaigns.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete suggestions in their campaigns"
    ON intelligence_suggestions FOR DELETE
    USING (EXISTS (
      SELECT 1 FROM campaigns WHERE campaigns.id = intelligence_suggestions.campaign_id AND campaigns.user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
