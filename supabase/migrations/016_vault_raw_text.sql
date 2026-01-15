-- Add raw_document_text to preserve ALL original content
-- This ensures nothing is lost during import

ALTER TABLE vault_characters
  ADD COLUMN IF NOT EXISTS raw_document_text TEXT,
  ADD COLUMN IF NOT EXISTS gold INTEGER DEFAULT 0;

-- Add comment explaining purpose
COMMENT ON COLUMN vault_characters.raw_document_text IS 'Full original document text preserved during import - ensures no data loss';
