import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendEmail, waitlistConfirmationEmail } from '@/lib/email'
import { z } from 'zod'
import crypto from 'crypto'

const waitlistSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
})

// Rate limit: 3 requests per hour per IP
const WAITLIST_RATE_LIMIT = { limit: 3, windowSeconds: 60 * 60 }
// Rate limit for email sending per email address: 1 per 5 minutes
const EMAIL_RATE_LIMIT = { limit: 1, windowSeconds: 60 * 5 }
// Token validity: 24 hours
const TOKEN_EXPIRY_HOURS = 24

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwardedFor?.split(',')[0] || realIp || 'unknown'

    // Rate limiting by IP
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

    // Rate limit per email to prevent spam
    const emailRateLimit = checkRateLimit(`waitlist-email:${normalizedEmail}`, EMAIL_RATE_LIMIT)
    if (!emailRateLimit.success) {
      // Don't reveal if email exists, just say confirmation sent
      return NextResponse.json({
        success: true,
        message: 'If this email is not already registered, you will receive a confirmation email shortly.'
      })
    }

    // Use admin client to bypass RLS for insert
    const supabase = createAdminClient()

    // Check if email already exists and is verified
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id, verified, verification_sent_at')
      .eq('email', normalizedEmail)
      .single()

    if (existing?.verified) {
      // Already verified - return success (don't reveal this)
      return NextResponse.json({
        success: true,
        message: 'If this email is not already registered, you will receive a confirmation email shortly.'
      })
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken()
    const tokenExpiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000).toISOString()
    const now = new Date().toISOString()

    if (existing) {
      // Update existing unverified entry with new token
      await supabase
        .from('waitlist')
        .update({
          verification_token: verificationToken,
          token_expires_at: tokenExpiresAt,
          verification_sent_at: now
        })
        .eq('id', existing.id)
    } else {
      // Insert new unverified entry
      const { error } = await supabase
        .from('waitlist')
        .insert({
          email: normalizedEmail,
          verified: false,
          verification_token: verificationToken,
          token_expires_at: tokenExpiresAt,
          verification_sent_at: now
        })

      if (error) {
        console.error('Waitlist insert error:', error)
        // Handle unique constraint violation gracefully
        if (error.code === '23505') {
          return NextResponse.json({
            success: true,
            message: 'If this email is not already registered, you will receive a confirmation email shortly.'
          })
        }
        return NextResponse.json(
          { error: 'Failed to join waitlist' },
          { status: 500 }
        )
      }
    }

    // Send confirmation email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://multiloop.app'
    const verifyUrl = `${baseUrl}/api/waitlist/verify?token=${verificationToken}`

    const emailContent = waitlistConfirmationEmail(verifyUrl)
    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: emailContent.subject,
      html: emailContent.html
    })

    if (!emailResult.success) {
      console.error('Failed to send waitlist confirmation email:', emailResult.error)
      // Still return success to user (don't reveal email delivery issues)
    }

    return NextResponse.json({
      success: true,
      message: 'Please check your email to confirm your spot on the waitlist.'
    })
  } catch (err) {
    console.error('Waitlist error:', err)
    return NextResponse.json(
      { error: 'An error occurred' },
      { status: 500 }
    )
  }
}
