import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const waitlistSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
})

// Rate limit: 3 requests per hour per IP
const WAITLIST_RATE_LIMIT = { limit: 3, windowSeconds: 60 * 60 }

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwardedFor?.split(',')[0] || realIp || 'unknown'

    // Rate limiting
    const rateLimit = checkRateLimit(`waitlist:${ip}`, WAITLIST_RATE_LIMIT)
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const result = waitlistSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || 'Invalid email' },
        { status: 400 }
      )
    }

    const { email } = result.data
    const normalizedEmail = email.toLowerCase().trim()

    // Use admin client to bypass RLS for insert
    const supabase = createAdminClient()

    // Check if email already exists
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id')
      .eq('email', normalizedEmail)
      .single()

    if (existing) {
      // Already on waitlist - return success anyway (don't reveal this)
      return NextResponse.json({ success: true })
    }

    // Insert into waitlist
    const { error } = await supabase
      .from('waitlist')
      .insert({ email: normalizedEmail })

    if (error) {
      console.error('Waitlist insert error:', error)
      // Handle unique constraint violation gracefully
      if (error.code === '23505') {
        return NextResponse.json({ success: true })
      }
      return NextResponse.json(
        { error: 'Failed to join waitlist' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Waitlist error:', err)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
