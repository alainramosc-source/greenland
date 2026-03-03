import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// Simple in-memory rate limiter for API routes
const rateLimitMap = new Map();

function rateLimit(ip, limit = 100, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, []);
    }

    const timestamps = rateLimitMap.get(ip).filter(t => t > windowStart);
    rateLimitMap.set(ip, timestamps);

    if (timestamps.length >= limit) {
        return false; // Rate limited
    }

    timestamps.push(now);
    return true; // Allowed
}

// Clean up old entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of rateLimitMap.entries()) {
        const recent = timestamps.filter(t => t > now - 60000);
        if (recent.length === 0) {
            rateLimitMap.delete(ip);
        } else {
            rateLimitMap.set(ip, recent);
        }
    }
}, 60000);

export default async function proxy(request) {
    const { pathname } = request.nextUrl;

    // Rate limit API routes (100 requests per minute per IP)
    if (pathname.startsWith('/api/')) {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || request.headers.get('x-real-ip')
            || 'unknown';

        if (!rateLimit(ip, 100, 60000)) {
            return NextResponse.json(
                { error: 'Demasiadas solicitudes. Intenta de nuevo en un momento.' },
                { status: 429 }
            );
        }
    }

    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Protect /dashboard routes
    if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // Redirect /login to /dashboard if already logged in
    if (request.nextUrl.pathname.startsWith('/login') && user) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return response
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
