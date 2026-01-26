-- ============================================================================
-- Migration 084: Add dm_notes and secrets to encounters
-- ============================================================================

ALTER TABLE encounters ADD COLUMN IF NOT EXISTS dm_notes TEXT;
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS secrets TEXT;
