import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, welcomeEmail } from '@/lib/email'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/home'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription || error)}`)
  }

  if (code) {
    const supabase = await createClient()

    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Exchange error:', exchangeError)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(exchangeError.message)}`)
    }

    if (data.user) {
      // Check if user settings exist, create if not
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', data.user.id)
        .single()

      if (settingsError && settingsError.code === 'PGRST116') {
        // User settings don't exist, create them (new user)
        const now = new Date().toISOString()
        await supabase.from('user_settings').insert({
          user_id: data.user.id,
          role: 'user',
          tier: 'free',
          ai_provider: 'anthropic',
          theme: 'dark',
          totp_enabled: false,
          marketing_consent: false,
          email_verified: true, // OAuth email is verified
          email_verified_at: now,
          terms_accepted_at: now,
          privacy_accepted_at: now,
          last_login_at: now
        })

        // Send welcome email to new OAuth users
        if (data.user.email) {
          const userName = data.user.user_metadata?.full_name || data.user.email.split('@')[0]
          const { subject, html } = welcomeEmail(userName)
          await sendEmail({ to: data.user.email, subject, html })
        }
      } else if (settings) {
        // Update last login
        await supabase
          .from('user_settings')
          .update({ last_login_at: new Date().toISOString() })
          .eq('user_id', data.user.id)
      }
    }

    // Redirect to the requested page or home
    return NextResponse.redirect(`${origin}${next}`)
  }

  // No code provided, redirect to login
  return NextResponse.redirect(`${origin}/login`)
}
