import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AiSuggestionFeedbackInsert } from '@/types/database'

// POST - Record feedback on an AI suggestion
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      usageLogId,
      suggestionType,
      suggestionContent,
      actionTaken,
      feedback,
      editDetails,
    } = body as {
      usageLogId?: string
      suggestionType: string
      suggestionContent: string
      actionTaken: 'accepted' | 'edited' | 'dismissed'
      feedback?: 'positive' | 'negative'
      editDetails?: string
    }

    if (!suggestionType) {
      return NextResponse.json({
        error: 'suggestionType is required'
      }, { status: 400 })
    }

    const feedbackData: AiSuggestionFeedbackInsert = {
      user_id: user.id,
      usage_log_id: usageLogId || null,
      suggestion_type: suggestionType,
      suggestion_content: suggestionContent,
      action_taken: actionTaken,
      feedback: feedback || null,
      edit_details: editDetails || null,
    }

    const { data: result, error } = await supabase
      .from('ai_suggestion_feedback')
      .insert(feedbackData)
      .select()
      .single()

    if (error) {
      console.error('Failed to record feedback:', error)
      return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 })
    }

    return NextResponse.json({ feedback: result })
  } catch (error) {
    console.error('Record feedback error:', error)
    return NextResponse.json({ error: 'Failed to record feedback' }, { status: 500 })
  }
}

// GET - Get feedback stats (for admin/analytics)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    if (!userSettings?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get feedback grouped by suggestion type
    const { data: feedbackByType } = await supabase
      .from('ai_suggestion_feedback')
      .select('suggestion_type, action_taken, feedback')
      .gte('created_at', startDate.toISOString())

    // Calculate stats
    const stats: Record<string, {
      total: number
      accepted: number
      edited: number
      dismissed: number
      positive: number
      negative: number
    }> = {}

    feedbackByType?.forEach(f => {
      if (!stats[f.suggestion_type]) {
        stats[f.suggestion_type] = {
          total: 0,
          accepted: 0,
          edited: 0,
          dismissed: 0,
          positive: 0,
          negative: 0,
        }
      }

      stats[f.suggestion_type].total++

      if (f.action_taken === 'accepted') stats[f.suggestion_type].accepted++
      else if (f.action_taken === 'edited') stats[f.suggestion_type].edited++
      else if (f.action_taken === 'dismissed') stats[f.suggestion_type].dismissed++

      if (f.feedback === 'positive') stats[f.suggestion_type].positive++
      else if (f.feedback === 'negative') stats[f.suggestion_type].negative++
    })

    return NextResponse.json({
      stats,
      totalFeedback: feedbackByType?.length || 0,
      period: `${days} days`,
    })
  } catch (error) {
    console.error('Get feedback stats error:', error)
    return NextResponse.json({ error: 'Failed to get feedback stats' }, { status: 500 })
  }
}
