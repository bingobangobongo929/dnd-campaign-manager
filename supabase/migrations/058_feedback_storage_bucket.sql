-- =====================================================
-- FEEDBACK ATTACHMENTS STORAGE BUCKET
-- =====================================================

-- Create the storage bucket for feedback attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'feedback-attachments',
  'feedback-attachments',
  true,  -- Public so admins can view without auth tokens
  5242880,  -- 5MB max per file (5 * 1024 * 1024)
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Drop existing policies if they exist (for clean re-run)
DROP POLICY IF EXISTS "Users can upload feedback attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view feedback attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own feedback attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete any feedback attachment" ON storage.objects;

-- Policy: Authenticated users can upload to their own feedback folder
-- Path format: {feedback_id}/{timestamp}-{filename}
-- We verify the user owns the feedback before allowing upload
CREATE POLICY "Users can upload feedback attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'feedback-attachments'
  AND (
    -- Extract feedback_id from path (first segment before /)
    EXISTS (
      SELECT 1 FROM feedback
      WHERE feedback.id::text = (string_to_array(name, '/'))[1]
      AND feedback.user_id = auth.uid()
      AND feedback.status = 'new'  -- Only allow uploads to new feedback
    )
  )
);

-- Policy: Anyone can view attachments (bucket is public for admin viewing)
-- In practice, URLs aren't guessable (UUIDs) and feedback is private anyway
CREATE POLICY "Anyone can view feedback attachments"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'feedback-attachments');

-- Policy: Users can delete attachments on their own NEW feedback
CREATE POLICY "Users can delete their own feedback attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'feedback-attachments'
  AND EXISTS (
    SELECT 1 FROM feedback
    WHERE feedback.id::text = (string_to_array(name, '/'))[1]
    AND feedback.user_id = auth.uid()
    AND feedback.status = 'new'
  )
);

-- Policy: Admins can delete any attachment
CREATE POLICY "Admins can delete any feedback attachment"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'feedback-attachments'
  AND EXISTS (
    SELECT 1 FROM user_settings
    WHERE user_id = auth.uid()
    AND role IN ('moderator', 'super_admin')
  )
);

-- =====================================================
-- ABUSE PREVENTION: Limit attachments per feedback
-- =====================================================

-- Function to check attachment count before insert
CREATE OR REPLACE FUNCTION check_feedback_attachment_limit()
RETURNS TRIGGER AS $$
DECLARE
  attachment_count INTEGER;
  max_attachments CONSTANT INTEGER := 5;  -- Max 5 attachments per feedback
BEGIN
  SELECT COUNT(*) INTO attachment_count
  FROM feedback_attachments
  WHERE feedback_id = NEW.feedback_id;

  IF attachment_count >= max_attachments THEN
    RAISE EXCEPTION 'Maximum of % attachments per feedback reached', max_attachments;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS enforce_attachment_limit ON feedback_attachments;

-- Create trigger
CREATE TRIGGER enforce_attachment_limit
  BEFORE INSERT ON feedback_attachments
  FOR EACH ROW
  EXECUTE FUNCTION check_feedback_attachment_limit();

-- =====================================================
-- ABUSE PREVENTION: Limit total feedback per user per day
-- =====================================================

-- Function to check daily feedback limit
CREATE OR REPLACE FUNCTION check_daily_feedback_limit()
RETURNS TRIGGER AS $$
DECLARE
  today_count INTEGER;
  max_per_day CONSTANT INTEGER := 20;  -- Max 20 feedback per day per user
BEGIN
  SELECT COUNT(*) INTO today_count
  FROM feedback
  WHERE user_id = NEW.user_id
  AND created_at >= CURRENT_DATE
  AND created_at < CURRENT_DATE + INTERVAL '1 day';

  IF today_count >= max_per_day THEN
    RAISE EXCEPTION 'Daily feedback limit of % reached. Please try again tomorrow.', max_per_day;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS enforce_daily_feedback_limit ON feedback;

-- Create trigger
CREATE TRIGGER enforce_daily_feedback_limit
  BEFORE INSERT ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION check_daily_feedback_limit();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION check_feedback_attachment_limit() IS 'Limits attachments to 5 per feedback item to prevent storage abuse';
COMMENT ON FUNCTION check_daily_feedback_limit() IS 'Limits users to 20 feedback submissions per day to prevent spam';
