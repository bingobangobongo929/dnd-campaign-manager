import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and supabase.auth.getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // API routes should not be redirected - they handle their own auth
  if (pathname.startsWith('/api/')) {
    return supabaseResponse
  }

  // Public routes - no authentication required
  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/share') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/cookies') ||
    pathname.startsWith('/changelog') ||
    pathname.startsWith('/suspended') ||
    pathname.includes('opengraph-image') ||
    pathname.includes('twitter-image') ||
    pathname.endsWith('/icon') ||
    pathname.endsWith('/icon.svg')

  // Auth flow routes (login, signup, verify) - special handling
  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password')

  // 2FA verify page
  const is2FAVerifyPage = pathname === '/login/verify'

  // Suspended page
  const isSuspendedPage = pathname === '/suspended'

  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // For authenticated users, check account status
  if (user && !isPublicRoute) {
    try {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('suspended_at, disabled_at, totp_enabled')
        .eq('user_id', user.id)
        .single()

      if (settings) {
        // Check if user is disabled - sign them out
        if (settings.disabled_at) {
          await supabase.auth.signOut()
          const url = request.nextUrl.clone()
          url.pathname = '/login'
          return NextResponse.redirect(url)
        }

        // Check if user is suspended - redirect to suspended page
        if (settings.suspended_at && !isSuspendedPage) {
          const url = request.nextUrl.clone()
          url.pathname = '/suspended'
          return NextResponse.redirect(url)
        }

        // If on suspended page but not suspended, redirect to home
        if (!settings.suspended_at && isSuspendedPage) {
          const url = request.nextUrl.clone()
          url.pathname = '/home'
          return NextResponse.redirect(url)
        }
      }
    } catch {
      // If we can't check settings, allow the request to continue
      // The page-level code will handle any additional checks
    }
  }

  // Redirect authenticated users away from auth pages (but not 2FA verify)
  if (user && isAuthRoute && !is2FAVerifyPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/home'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
