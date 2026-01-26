-- Migration: Auto Session-Quest Links (Option C)
-- Automatically creates session_quest links when quest status changes during an active session

-- Function to automatically link quests to sessions on status change
CREATE OR REPLACE FUNCTION auto_link_quest_to_session()
RETURNS TRIGGER AS $$
DECLARE
  active_session_id UUID;
  progress_type_value TEXT;
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Find an active session for this campaign (phase = 'playing')
  SELECT id INTO active_session_id
  FROM sessions
  WHERE campaign_id = NEW.campaign_id
    AND phase = 'playing'
  ORDER BY session_number DESC
  LIMIT 1;

  -- If no active session, try to find the most recent completed session from today
  IF active_session_id IS NULL THEN
    SELECT id INTO active_session_id
    FROM sessions
    WHERE campaign_id = NEW.campaign_id
      AND phase = 'completed'
      AND date = CURRENT_DATE
    ORDER BY session_number DESC
    LIMIT 1;
  END IF;

  -- If still no session found, exit
  IF active_session_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine progress_type based on status change
  progress_type_value := CASE
    WHEN NEW.status = 'active' AND OLD.status = 'available' THEN 'started'
    WHEN NEW.status = 'completed' THEN 'completed'
    WHEN NEW.status = 'failed' THEN 'failed'
    WHEN NEW.status = 'active' THEN 'progressed'
    ELSE 'progressed'
  END;

  -- Insert or update the session_quest link
  INSERT INTO session_quests (session_id, quest_id, progress_type)
  VALUES (active_session_id, NEW.id, progress_type_value)
  ON CONFLICT (session_id, quest_id)
  DO UPDATE SET progress_type = EXCLUDED.progress_type
  WHERE session_quests.progress_type != 'completed'
    AND session_quests.progress_type != 'failed';
  -- Don't downgrade completed/failed to something else

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for quest status changes
DROP TRIGGER IF EXISTS quest_status_change_trigger ON quests;
CREATE TRIGGER quest_status_change_trigger
  AFTER UPDATE ON quests
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_quest_to_session();

COMMENT ON FUNCTION auto_link_quest_to_session() IS 'Automatically creates session_quest links when quest status changes during an active session. Maps status transitions to progress types: available→active = started, →completed = completed, →failed = failed, other = progressed.';

-- ============================================
-- AUTO SESSION-ENCOUNTER LINKING
-- When encounter status changes to 'used' during an active session
-- ============================================

CREATE OR REPLACE FUNCTION auto_link_encounter_to_session()
RETURNS TRIGGER AS $$
DECLARE
  active_session_id UUID;
  status_value TEXT;
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Find an active session for this campaign (phase = 'playing')
  SELECT id INTO active_session_id
  FROM sessions
  WHERE campaign_id = NEW.campaign_id
    AND phase = 'playing'
  ORDER BY session_number DESC
  LIMIT 1;

  -- If no active session, try to find the most recent completed session from today
  IF active_session_id IS NULL THEN
    SELECT id INTO active_session_id
    FROM sessions
    WHERE campaign_id = NEW.campaign_id
      AND phase = 'completed'
      AND date = CURRENT_DATE
    ORDER BY session_number DESC
    LIMIT 1;
  END IF;

  -- If still no session found, exit
  IF active_session_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine status based on encounter status change
  status_value := CASE
    WHEN NEW.status = 'used' THEN 'used'
    WHEN NEW.status = 'skipped' THEN 'skipped'
    WHEN NEW.status = 'prepared' THEN 'planned'
    ELSE 'used'
  END;

  -- Insert or update the session_encounter link
  INSERT INTO session_encounters (session_id, encounter_id, status_in_session)
  VALUES (active_session_id, NEW.id, status_value)
  ON CONFLICT (session_id, encounter_id)
  DO UPDATE SET status_in_session = EXCLUDED.status_in_session;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for encounter status changes
DROP TRIGGER IF EXISTS encounter_status_change_trigger ON encounters;
CREATE TRIGGER encounter_status_change_trigger
  AFTER UPDATE ON encounters
  FOR EACH ROW
  EXECUTE FUNCTION auto_link_encounter_to_session();

COMMENT ON FUNCTION auto_link_encounter_to_session() IS 'Automatically creates session_encounter links when encounter status changes during an active session. Maps: →used = used, →skipped = skipped, →prepared = planned.';
