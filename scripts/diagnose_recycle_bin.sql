-- ==========================================
-- DIAGNOSE & FIX RECYCLE BIN
-- Run this in Supabase SQL Editor
-- ==========================================

-- STEP 1: Check if deleted_at column exists on oneshots
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'oneshots' AND column_name = 'deleted_at';

-- If the above returns 0 rows, the column doesn't exist.
-- Run STEP 2 to add it.

-- ==========================================
-- STEP 2: Add deleted_at column if missing
-- ==========================================

ALTER TABLE oneshots ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE vault_characters ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ==========================================
-- STEP 3: Test that a oneshot can be soft-deleted
-- Replace 'YOUR_ONESHOT_ID' with an actual oneshot ID
-- ==========================================

-- First, find your oneshots:
SELECT id, title, deleted_at FROM oneshots LIMIT 10;

-- Then test updating deleted_at (replace the ID):
-- UPDATE oneshots SET deleted_at = NOW() WHERE id = 'YOUR_ONESHOT_ID_HERE';

-- Verify it worked:
-- SELECT id, title, deleted_at FROM oneshots WHERE id = 'YOUR_ONESHOT_ID_HERE';

-- To undo (restore):
-- UPDATE oneshots SET deleted_at = NULL WHERE id = 'YOUR_ONESHOT_ID_HERE';
