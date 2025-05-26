import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Protect admin dashboard routes
  if (request.nextUrl.pathname.startsWith('/admin/dashboard')) {
    const hasSession = request.cookies.has('admin_session');
    
    if (!hasSession) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }
  
  // Get the hostname
  const hostname = request.headers.get('host') || ''
  
  // Handle both lyricless.app and app.lyricless.app
  if (hostname === 'app.lyricless.app' || hostname === 'lyricless.app' || hostname === 'www.lyricless.app') {
    // Both domains serve the same content, so no redirect needed
    // This ensures OG images work correctly from either domain
    return NextResponse.next()
  }
  
  // For any other domain in production, redirect to the main domain
  if (process.env.NODE_ENV === 'production' && !hostname.includes('localhost')) {
    return NextResponse.redirect(new URL(request.url.replace(hostname, 'lyricless.app')))
  }
  
  return NextResponse.next()
}

// Only run middleware on specific paths if needed
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_next).*)',
  ],
}