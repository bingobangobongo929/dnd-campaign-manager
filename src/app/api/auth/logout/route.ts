import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Sign out the user
  await supabase.auth.signOut()

  // Get redirect URL from query params, default to login
  const { searchParams } = new URL(request.url)
  const redirectTo = searchParams.get('redirect') || '/login'

  // Validate redirect URL (only allow relative paths for security)
  const safeRedirect = redirectTo.startsWith('/') ? redirectTo : '/login'

  // Build absolute URL for redirect
  const origin = request.headers.get('origin') ||
    `https://${request.headers.get('host')}` ||
    'https://multiloop.app'

  return NextResponse.redirect(`${origin}${safeRedirect}`)
}
