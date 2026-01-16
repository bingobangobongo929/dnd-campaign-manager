-- =====================================================
-- API USAGE TRACKING
-- Migration 021 - Track AI API usage and costs
-- =====================================================

-- Table to track all API usage by user
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Request details
  provider TEXT NOT NULL, -- 'anthropic', 'google', 'googlePro', etc.
  model TEXT NOT NULL, -- Specific model used
  endpoint TEXT NOT NULL, -- API endpoint called
  operation_type TEXT NOT NULL, -- 'analyze', 'parse', 'generate_image', etc.

  -- Token/usage metrics
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,

  -- Image generation metrics
  images_generated INTEGER DEFAULT 0,

  -- Cost tracking (in USD cents for precision)
  estimated_cost_cents INTEGER DEFAULT 0,

  -- Context
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  character_id UUID REFERENCES vault_characters(id) ON DELETE SET NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  response_time_ms INTEGER, -- How long the request took
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_provider ON api_usage(provider);
CREATE INDEX IF NOT EXISTS idx_api_usage_operation_type ON api_usage(operation_type);

-- Enable RLS
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Users can only view their own usage
CREATE POLICY "Users can view own api_usage"
ON api_usage FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own usage records
CREATE POLICY "Users can insert own api_usage"
ON api_usage FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Summary view for quick stats
CREATE OR REPLACE VIEW api_usage_summary AS
SELECT
  user_id,
  DATE_TRUNC('month', created_at) as month,
  provider,
  operation_type,
  COUNT(*) as request_count,
  SUM(total_tokens) as total_tokens,
  SUM(images_generated) as total_images,
  SUM(estimated_cost_cents) as total_cost_cents,
  AVG(response_time_ms) as avg_response_time_ms
FROM api_usage
GROUP BY user_id, DATE_TRUNC('month', created_at), provider, operation_type;

-- Grant access to the view
GRANT SELECT ON api_usage_summary TO authenticated;
