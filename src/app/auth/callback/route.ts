import { NextRequest, NextResponse } from 'next/server'

// OAuth callback route - OAuth is currently disabled
// This route exists to prevent 404 errors if users have old OAuth links
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url)

  // OAuth is disabled - redirect to login
  return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('OAuth sign-in is currently disabled. Please use email and password.')}`)
}
