import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, rateLimits } from '@/lib/rate-limit'
import type { FeedbackInsert, Json } from '@/types/database'

export const runtime = 'nodejs'

// POST - Create new feedback
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const rateLimit = checkRateLimit(`feedback:${user.id}`, {
      limit: 10,
      windowSeconds: 60 * 60, // 10 per hour
    })
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.', retryAfter: rateLimit.resetIn },
        { status: 429, headers: { 'Retry-After': String(rateLimit.resetIn) } }
      )
    }

    // Parse form data
    const formData = await request.formData()

    const type = formData.get('type') as string
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const priority = formData.get('priority') as string | null
    const affectedArea = formData.get('affectedArea') as string | null
    const frequency = formData.get('frequency') as string | null
    const reproduceSteps = formData.get('reproduceSteps') as string | null
    const expectedBehavior = formData.get('expectedBehavior') as string | null
    const actualBehavior = formData.get('actualBehavior') as string | null
    const contextJson = formData.get('context') as string

    // Validate required fields
    if (!type || !title || !description) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate type
    if (!['bug', 'feature', 'question', 'praise'].includes(type)) {
      return NextResponse.json({ error: 'Invalid feedback type' }, { status: 400 })
    }

    // Parse context
    let context: Record<string, unknown> = {}
    try {
      context = JSON.parse(contextJson || '{}')
    } catch {
      // Invalid context, continue without it
    }

    // Get user settings for context
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('username, tier, role')
      .eq('user_id', user.id)
      .single()

    // Prepare feedback data
    const feedbackData: FeedbackInsert = {
      user_id: user.id,
      type: type as 'bug' | 'feature' | 'question' | 'praise',
      title: title.trim(),
      description: description.trim(),
      priority: priority as 'low' | 'medium' | 'high' | 'critical' | null,
      affected_area: affectedArea,
      frequency: frequency as 'always' | 'sometimes' | 'once' | null,
      reproduce_steps: reproduceSteps || null,
      expected_behavior: expectedBehavior || null,
      actual_behavior: actualBehavior || null,
      // Context fields
      current_url: (context.currentUrl as string) || null,
      current_route: (context.currentRoute as string) || null,
      browser_info: (context.browserInfo as Json) || null,
      screen_resolution: (context.screenResolution as string) || null,
      viewport_size: (context.viewportSize as string) || null,
      session_duration_seconds: (context.sessionDurationSeconds as number) || null,
      console_errors: (context.consoleErrors as Json) || null,
      network_status: (context.networkStatus as string) || null,
      navigation_history: (context.navigationHistory as Json) || null,
      app_version: (context.appVersion as string) || null,
      // User context
      user_email: user.email || null,
      user_username: userSettings?.username || null,
      user_tier: userSettings?.tier || null,
      user_role: userSettings?.role || null,
    }

    // Insert feedback
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback')
      .insert(feedbackData)
      .select()
      .single()

    if (feedbackError) {
      console.error('Failed to create feedback:', feedbackError)
      return NextResponse.json({ error: 'Failed to create feedback' }, { status: 500 })
    }

    // Handle attachments
    const attachments: { id: string; isScreenshot: boolean }[] = []

    // Find all attachment entries in formData
    for (const key of formData.keys()) {
      if (key.startsWith('attachment_') && !key.includes('_isScreenshot')) {
        const file = formData.get(key) as File
        const isScreenshotKey = `${key}_isScreenshot`
        const isScreenshot = formData.get(isScreenshotKey) === 'true'

        if (file && file.size > 0) {
          // Upload to storage
          const fileName = `${feedback.id}/${Date.now()}-${file.name}`
          const { error: uploadError } = await supabase.storage
            .from('feedback-attachments')
            .upload(fileName, file)

          if (uploadError) {
            console.error('Failed to upload attachment:', uploadError)
            continue
          }

          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from('feedback-attachments')
            .getPublicUrl(fileName)

          // Insert attachment record
          const { data: attachment, error: attachmentError } = await supabase
            .from('feedback_attachments')
            .insert({
              feedback_id: feedback.id,
              storage_path: fileName,
              public_url: publicUrlData.publicUrl,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
              is_screenshot: isScreenshot,
            })
            .select()
            .single()

          if (!attachmentError && attachment) {
            attachments.push({ id: attachment.id, isScreenshot })
          }
        }
      }
    }

    return NextResponse.json({
      message: 'Feedback submitted successfully',
      feedback: {
        id: feedback.id,
        type: feedback.type,
        title: feedback.title,
        attachmentCount: attachments.length,
      },
    })
  } catch (error) {
    console.error('Feedback error:', error)
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 })
  }
}

// GET - Get user's own feedback
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's feedback with response counts
    const { data: feedback, error } = await supabase
      .from('feedback')
      .select(`
        *,
        feedback_attachments (id, public_url, is_screenshot),
        feedback_responses (id, content, created_at, is_status_change, old_status, new_status)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch feedback:', error)
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
    }

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error('Get feedback error:', error)
    return NextResponse.json({ error: 'Failed to get feedback' }, { status: 500 })
  }
}
