-- =====================================================
-- FEEDBACK SYSTEM
-- In-app feedback, bug reports, feature requests
-- =====================================================

-- Main feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Classification
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'question', 'praise')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'in_progress', 'fixed', 'closed', 'wont_fix')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  -- Content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reproduce_steps TEXT,
  expected_behavior TEXT,
  actual_behavior TEXT,
  frequency TEXT CHECK (frequency IN ('always', 'sometimes', 'once')),
  affected_area TEXT,

  -- Technical context (auto-captured)
  current_url TEXT,
  current_route TEXT,
  browser_info JSONB,
  screen_resolution TEXT,
  viewport_size TEXT,
  session_duration_seconds INTEGER,
  console_errors JSONB,
  network_status TEXT,
  navigation_history JSONB,
  app_version TEXT,

  -- User context (snapshot at submission time)
  user_email TEXT,
  user_username TEXT,
  user_tier TEXT,
  user_role TEXT,

  -- Admin fields
  assigned_to UUID REFERENCES auth.users(id),
  internal_notes TEXT,
  resolution_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ
);

-- Indexes for efficient queries
CREATE INDEX idx_feedback_user ON feedback(user_id, created_at DESC);
CREATE INDEX idx_feedback_status ON feedback(status, created_at DESC);
CREATE INDEX idx_feedback_type ON feedback(type, status);
CREATE INDEX idx_feedback_priority ON feedback(priority, status) WHERE priority IS NOT NULL;
CREATE INDEX idx_feedback_assigned ON feedback(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX idx_feedback_created ON feedback(created_at DESC);

-- =====================================================
-- FEEDBACK ATTACHMENTS - Screenshots and files
-- =====================================================
CREATE TABLE IF NOT EXISTS feedback_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,

  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  is_screenshot BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_attachments_feedback ON feedback_attachments(feedback_id);

-- =====================================================
-- FEEDBACK RESPONSES - Admin replies and status changes
-- =====================================================
CREATE TABLE IF NOT EXISTS feedback_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id UUID NOT NULL REFERENCES feedback(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  is_status_change BOOLEAN DEFAULT false,
  old_status TEXT,
  new_status TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_responses_feedback ON feedback_responses(feedback_id, created_at);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON feedback FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own feedback
CREATE POLICY "Users can insert feedback"
ON feedback FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own NEW feedback (before admin responds)
CREATE POLICY "Users can update their own new feedback"
ON feedback FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND status = 'new' AND first_response_at IS NULL)
WITH CHECK (user_id = auth.uid());

-- Users can delete their own NEW feedback
CREATE POLICY "Users can delete their own new feedback"
ON feedback FOR DELETE TO authenticated
USING (user_id = auth.uid() AND status = 'new' AND first_response_at IS NULL);

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON feedback FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_settings
    WHERE user_id = auth.uid()
    AND role IN ('moderator', 'super_admin')
  )
);

-- Admins can update all feedback
CREATE POLICY "Admins can update all feedback"
ON feedback FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_settings
    WHERE user_id = auth.uid()
    AND role IN ('moderator', 'super_admin')
  )
);

-- Admins can delete feedback
CREATE POLICY "Admins can delete feedback"
ON feedback FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_settings
    WHERE user_id = auth.uid()
    AND role IN ('moderator', 'super_admin')
  )
);

-- Attachments: Users can view their own
CREATE POLICY "Users can view their own attachments"
ON feedback_attachments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM feedback
    WHERE feedback.id = feedback_id
    AND feedback.user_id = auth.uid()
  )
);

-- Attachments: Admins can view all
CREATE POLICY "Admins can view all attachments"
ON feedback_attachments FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_settings
    WHERE user_id = auth.uid()
    AND role IN ('moderator', 'super_admin')
  )
);

-- Attachments: Users can insert for their own feedback
CREATE POLICY "Users can insert attachments for own feedback"
ON feedback_attachments FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM feedback
    WHERE feedback.id = feedback_id
    AND feedback.user_id = auth.uid()
  )
);

-- Attachments: Users can delete their own (only for new feedback)
CREATE POLICY "Users can delete their own attachments"
ON feedback_attachments FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM feedback
    WHERE feedback.id = feedback_id
    AND feedback.user_id = auth.uid()
    AND feedback.status = 'new'
  )
);

-- Responses: Users can view non-internal responses on their feedback
CREATE POLICY "Users can view responses on their feedback"
ON feedback_responses FOR SELECT TO authenticated
USING (
  (is_internal = false AND EXISTS (
    SELECT 1 FROM feedback
    WHERE feedback.id = feedback_id
    AND feedback.user_id = auth.uid()
  ))
  OR
  EXISTS (
    SELECT 1 FROM user_settings
    WHERE user_id = auth.uid()
    AND role IN ('moderator', 'super_admin')
  )
);

-- Responses: Only admins can insert
CREATE POLICY "Admins can insert responses"
ON feedback_responses FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_settings
    WHERE user_id = auth.uid()
    AND role IN ('moderator', 'super_admin')
  )
);

-- Responses: Admins can update their own responses
CREATE POLICY "Admins can update their own responses"
ON feedback_responses FOR UPDATE TO authenticated
USING (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM user_settings
    WHERE user_id = auth.uid()
    AND role IN ('moderator', 'super_admin')
  )
);

-- =====================================================
-- STORAGE BUCKET for feedback attachments
-- =====================================================
-- Note: Run this in Supabase Dashboard SQL editor or via API:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('feedback-attachments', 'feedback-attachments', true);

-- Storage policies will need to be created via dashboard or separate migration

-- =====================================================
-- TRIGGER: Update updated_at on feedback changes
-- =====================================================
CREATE OR REPLACE FUNCTION update_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedback_updated_at
  BEFORE UPDATE ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE feedback IS 'User-submitted feedback, bug reports, feature requests';
COMMENT ON TABLE feedback_attachments IS 'Screenshots and files attached to feedback';
COMMENT ON TABLE feedback_responses IS 'Admin responses and status change history';
COMMENT ON COLUMN feedback.type IS 'bug, feature, question, or praise';
COMMENT ON COLUMN feedback.status IS 'new, reviewing, in_progress, fixed, closed, wont_fix';
COMMENT ON COLUMN feedback.priority IS 'low, medium, high, critical (mainly for bugs)';
COMMENT ON COLUMN feedback.console_errors IS 'Last 10 console errors captured at submission time';
COMMENT ON COLUMN feedback.navigation_history IS 'Last 5 pages visited before submission';
COMMENT ON COLUMN feedback_responses.is_internal IS 'Internal notes not visible to users';
