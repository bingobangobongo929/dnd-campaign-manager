import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

// GET - Verify waitlist email via token (redirects to landing page)
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://multiloop.app'

  if (!token || token.length !== 64) {
    // Invalid or missing token - redirect with error
    return NextResponse.redirect(`${baseUrl}/?waitlist=invalid`)
  }

  try {
    const supabase = createAdminClient()

    // Find the waitlist entry with this token
    const { data: entry, error: findError } = await supabase
      .from('waitlist')
      .select('id, email, verified, token_expires_at')
      .eq('verification_token', token)
      .single()

    if (findError || !entry) {
      // Token not found - redirect with error
      return NextResponse.redirect(`${baseUrl}/?waitlist=invalid`)
    }

    // Check if already verified
    if (entry.verified) {
      return NextResponse.redirect(`${baseUrl}/?waitlist=already-verified`)
    }

    // Check if token has expired
    if (entry.token_expires_at && new Date(entry.token_expires_at) < new Date()) {
      return NextResponse.redirect(`${baseUrl}/?waitlist=expired`)
    }

    // Mark as verified and clear the token
    const { error: updateError } = await supabase
      .from('waitlist')
      .update({
        verified: true,
        verification_token: null,
        token_expires_at: null
      })
      .eq('id', entry.id)

    if (updateError) {
      console.error('Failed to verify waitlist entry:', updateError)
      return NextResponse.redirect(`${baseUrl}/?waitlist=error`)
    }

    // Success - redirect with confirmation
    return NextResponse.redirect(`${baseUrl}/?waitlist=confirmed`)
  } catch (err) {
    console.error('Waitlist verification error:', err)
    return NextResponse.redirect(`${baseUrl}/?waitlist=error`)
  }
}
