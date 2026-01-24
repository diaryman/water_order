import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Check if accessing admin routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
        // Skip checking for login page itself
        if (request.nextUrl.pathname === '/admin/login') {
            return NextResponse.next()
        }

        // Check for admin session cookie
        const isAdmin = request.cookies.has('admin_session')

        if (!isAdmin) {
            return NextResponse.redirect(new URL('/admin/login', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: '/admin/:path*',
}
