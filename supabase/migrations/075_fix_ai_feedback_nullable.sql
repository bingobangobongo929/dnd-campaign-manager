-- Fix ai_suggestion_feedback to allow feedback-only submissions
-- When a user clicks thumbs up/down without accepting/dismissing, we still want to record the feedback

-- Make action_taken nullable to support feedback-only records
ALTER TABLE ai_suggestion_feedback
ALTER COLUMN action_taken DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN ai_suggestion_feedback.action_taken IS
'Action user took on the suggestion. NULL means feedback was given without taking action yet.';
