// ============================================================
// Next.js Middleware - Route Protection + Role Redirect
// File: apps/lms/src/middleware.ts
// ============================================================

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes accessible without authentication
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/auth/callback']

// Routes accessible only by specific roles
const ROLE_PROTECTED_ROUTES: Record<string, string[]> = {
  '/lecturer': ['lecturer', 'admin'],
  '/admin': ['admin'],
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes and API routes
  if (
    PUBLIC_ROUTES.some(r => pathname.startsWith(r)) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname === '/'
  ) {
    if (pathname === '/login' || pathname === '/register') {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll: () => request.cookies.getAll(), setAll: () => { } } }
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Use cached role from cookie to prevent DB hit on redirect
        const cachedRole = request.cookies.get('user_role')?.value || 'student'
        const home = cachedRole === 'lecturer' || cachedRole === 'admin' || cachedRole === 'staff'
          ? '/lecturer/dashboard'
          : '/dashboard'
        return NextResponse.redirect(new URL(home, request.url))
      }
    }
    return NextResponse.next()
  }

  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    // Clear stale role cache
    response.cookies.delete('user_role')
    return NextResponse.redirect(loginUrl)
  }

  // --- PERFORMANCE OPTIMIZATION ---
  // Read role from cookie cache instead of querying DB on every navigation
  let userRole = request.cookies.get('user_role')?.value

  if (!userRole) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (profile && !profile.is_active) {
      await supabase.auth.signOut()
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'account_deactivated')
      return NextResponse.redirect(loginUrl)
    }

    userRole = profile ? (profile.role as string) : 'student'

    // Cache the role in HTTP cookie to bypass DB next time
    // Security: 15 min cache only + httpOnly + secure + sameSite
    response.cookies.set('user_role', userRole, {
      path: '/',
      maxAge: 15 * 60,  // 15 minutes only (not 7 days!)
      httpOnly: true,   // Prevent XSS access
      secure: process.env.NODE_ENV === 'production',  // HTTPS only in prod
      sameSite: 'strict' // CSRF protection
    })
  }

  // Mahasiswa tidak boleh akses area dosen
  if (pathname.startsWith('/lecturer') && userRole === 'student') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Dosen/admin: profil di /lecturer/profile
  if (pathname === '/profile' && (userRole === 'lecturer' || userRole === 'admin' || userRole === 'staff')) {
    return NextResponse.redirect(new URL('/lecturer/profile', request.url))
  }

  // Check role-based access
  for (const [routePrefix, allowedRoles] of Object.entries(ROLE_PROTECTED_ROUTES)) {
    if (pathname.startsWith(routePrefix)) {
      if (!allowedRoles.includes(userRole)) {
        const redirectUrl = userRole === 'student' ? '/dashboard' : '/lecturer/dashboard'
        return NextResponse.redirect(new URL(redirectUrl, request.url))
      }
    }
  }

  // Handle root /dashboard redirect based on role
  if (pathname === '/dashboard' && (userRole === 'lecturer' || userRole === 'admin')) {
    return NextResponse.redirect(new URL('/lecturer/dashboard', request.url))
  }

  response.headers.set('x-user-id', user.id)
  response.headers.set('x-user-role', userRole)

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logo.png|logo-stmik-jayakarta.webp|backdrop-loginform.webp|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
