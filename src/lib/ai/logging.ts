import { createClient } from '@/lib/supabase/server'
import type {
  AiUsageLogInsert,
  AiOperationType,
  AiOperationStatus,
  ImportSessionInsert,
  ImportType,
  ImportTargetType,
  ImportStatus
} from '@/types/database'

// =====================================================
// AI USAGE LOGGING
// =====================================================

interface LogAiUsageParams {
  userId: string
  operationType: AiOperationType
  modelUsed?: string
  inputTokens?: number
  outputTokens?: number
  costUsd?: number
  durationMs?: number
  status?: AiOperationStatus
  errorMessage?: string
  campaignId?: string
  characterId?: string
  oneshotId?: string
  metadata?: Record<string, unknown>
}

/**
 * Log an AI operation to the database
 * Returns the log ID for linking to other tables (like suggestion feedback)
 */
export async function logAiUsage(params: LogAiUsageParams): Promise<string | null> {
  try {
    const supabase = await createClient()

    const logData: AiUsageLogInsert = {
      user_id: params.userId,
      operation_type: params.operationType,
      model_used: params.modelUsed || null,
      input_tokens: params.inputTokens || null,
      output_tokens: params.outputTokens || null,
      cost_usd: params.costUsd || null,
      duration_ms: params.durationMs || null,
      status: params.status || 'success',
      error_message: params.errorMessage || null,
      campaign_id: params.campaignId || null,
      character_id: params.characterId || null,
      oneshot_id: params.oneshotId || null,
      metadata: (params.metadata || {}) as Record<string, unknown>,
    }

    const { data, error } = await supabase
      .from('ai_usage_logs')
      .insert(logData)
      .select('id')
      .single()

    if (error) {
      console.error('Failed to log AI usage:', error)
      return null
    }

    return data.id
  } catch (error) {
    console.error('Error logging AI usage:', error)
    return null
  }
}

/**
 * Create a timing wrapper for AI operations
 * Returns an object with start/end methods to track duration
 */
export function createAiTimer() {
  const startTime = Date.now()

  return {
    startTime,
    getElapsed: () => Date.now() - startTime,
  }
}

/**
 * Estimate cost based on model and tokens
 * These are approximate costs per 1M tokens - adjust as needed
 */
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // Anthropic
  'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00 },
  'claude-3-sonnet': { input: 3.00, output: 15.00 },
  // Google
  'gemini-2.0-flash': { input: 0.075, output: 0.30 },
  'gemini-3-pro-preview': { input: 1.25, output: 5.00 },
  'gemini-pro': { input: 0.50, output: 1.50 },
}

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const costs = MODEL_COSTS[model] || MODEL_COSTS['gemini-2.0-flash']
  const inputCost = (inputTokens / 1_000_000) * costs.input
  const outputCost = (outputTokens / 1_000_000) * costs.output
  return inputCost + outputCost
}

// =====================================================
// IMPORT SESSION TRACKING
// =====================================================

interface StartImportSessionParams {
  userId: string
  importType: ImportType
  targetType: ImportTargetType
  fileSizeBytes?: number
}

/**
 * Start tracking an import session for funnel analytics
 */
export async function startImportSession(params: StartImportSessionParams): Promise<string | null> {
  try {
    const supabase = await createClient()

    const sessionData: ImportSessionInsert = {
      user_id: params.userId,
      import_type: params.importType,
      target_type: params.targetType,
      status: 'started',
      file_size_bytes: params.fileSizeBytes || null,
      started_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('import_sessions')
      .insert(sessionData)
      .select('id')
      .single()

    if (error) {
      console.error('Failed to start import session:', error)
      return null
    }

    return data.id
  } catch (error) {
    console.error('Error starting import session:', error)
    return null
  }
}

interface UpdateImportSessionParams {
  sessionId: string
  status: ImportStatus
  usageLogId?: string
  parseDurationMs?: number
}

/**
 * Update an import session's status
 */
export async function updateImportSession(params: UpdateImportSessionParams): Promise<boolean> {
  try {
    const supabase = await createClient()

    const updateData: Record<string, unknown> = {
      status: params.status,
    }

    // Set appropriate timestamp based on status
    switch (params.status) {
      case 'parsed':
        updateData.parsed_at = new Date().toISOString()
        if (params.parseDurationMs) {
          updateData.parse_duration_ms = params.parseDurationMs
        }
        break
      case 'reviewed':
        updateData.reviewed_at = new Date().toISOString()
        break
      case 'saved':
      case 'cancelled':
        updateData.completed_at = new Date().toISOString()
        break
    }

    if (params.usageLogId) {
      updateData.usage_log_id = params.usageLogId
    }

    const { error } = await supabase
      .from('import_sessions')
      .update(updateData)
      .eq('id', params.sessionId)

    if (error) {
      console.error('Failed to update import session:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating import session:', error)
    return false
  }
}

// =====================================================
// SUGGESTION FEEDBACK
// =====================================================

interface LogSuggestionFeedbackParams {
  userId: string
  usageLogId?: string
  suggestionType: string
  suggestionContent?: string
  actionTaken: 'accepted' | 'edited' | 'dismissed'
  feedback?: 'positive' | 'negative'
  editDetails?: string
}

/**
 * Log feedback on an AI suggestion
 */
export async function logSuggestionFeedback(params: LogSuggestionFeedbackParams): Promise<boolean> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('ai_suggestion_feedback')
      .insert({
        user_id: params.userId,
        usage_log_id: params.usageLogId || null,
        suggestion_type: params.suggestionType,
        suggestion_content: params.suggestionContent || null,
        action_taken: params.actionTaken,
        feedback: params.feedback || null,
        edit_details: params.editDetails || null,
      })

    if (error) {
      console.error('Failed to log suggestion feedback:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error logging suggestion feedback:', error)
    return false
  }
}

// =====================================================
// WRAPPED AI OPERATION HELPER
// =====================================================

interface AiOperationResult<T> {
  success: boolean
  data?: T
  error?: string
  usageLogId?: string
}

interface AiOperationContext {
  userId: string
  operationType: AiOperationType
  model: string
  campaignId?: string
  characterId?: string
  oneshotId?: string
}

/**
 * Wrap an AI operation with automatic logging and error handling
 */
export async function withAiLogging<T>(
  context: AiOperationContext,
  operation: () => Promise<{ result: T; inputTokens: number; outputTokens: number }>
): Promise<AiOperationResult<T>> {
  const timer = createAiTimer()

  try {
    const { result, inputTokens, outputTokens } = await operation()

    const durationMs = timer.getElapsed()
    const costUsd = estimateCost(context.model, inputTokens, outputTokens)

    const usageLogId = await logAiUsage({
      userId: context.userId,
      operationType: context.operationType,
      modelUsed: context.model,
      inputTokens,
      outputTokens,
      costUsd,
      durationMs,
      status: 'success',
      campaignId: context.campaignId,
      characterId: context.characterId,
      oneshotId: context.oneshotId,
    })

    return {
      success: true,
      data: result,
      usageLogId: usageLogId || undefined,
    }
  } catch (error) {
    const durationMs = timer.getElapsed()
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await logAiUsage({
      userId: context.userId,
      operationType: context.operationType,
      modelUsed: context.model,
      durationMs,
      status: 'error',
      errorMessage,
      campaignId: context.campaignId,
      characterId: context.characterId,
      oneshotId: context.oneshotId,
    })

    return {
      success: false,
      error: errorMessage,
    }
  }
}
