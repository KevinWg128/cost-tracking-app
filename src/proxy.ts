import { NextRequest, NextResponse } from 'next/server';

/**
 * Security headers to add to all responses
 */
const securityHeaders = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * Allowed Content-Types for mutating requests (POST, PUT, PATCH, DELETE)
 */
const ALLOWED_CONTENT_TYPES = [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain', // Required for Next.js server actions
];

/**
 * Paths that should skip Content-Type validation
 * (e.g., static assets, Next.js internals)
 */
const SKIP_CONTENT_TYPE_VALIDATION_PATHS = [
    '/_next',
    '/favicon.ico',
    '/api/auth', // Auth endpoints may have special requirements
];

/**
 * Check if the Content-Type header is valid for mutating requests
 */
function isValidContentType(contentType: string | null): boolean {
    if (!contentType) {
        return false;
    }

    // Content-Type can include charset, e.g., "application/json; charset=utf-8"
    const baseContentType = contentType.split(';')[0].trim().toLowerCase();

    return ALLOWED_CONTENT_TYPES.some(allowed =>
        baseContentType === allowed || baseContentType.startsWith(allowed)
    );
}

/**
 * Check if the request path should skip Content-Type validation
 */
function shouldSkipValidation(pathname: string): boolean {
    return SKIP_CONTENT_TYPE_VALIDATION_PATHS.some(path =>
        pathname.startsWith(path)
    );
}

/**
 * Validate Origin/Referer for CSRF-like protection on mutating requests
 */
function isValidOrigin(request: NextRequest): boolean {
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');
    const host = request.headers.get('host');

    // If no origin or referer, allow (for same-origin requests without CORS)
    if (!origin && !referer) {
        return true;
    }

    // Check if origin matches the host
    if (origin) {
        try {
            const originUrl = new URL(origin);
            if (host && originUrl.host === host) {
                return true;
            }
        } catch {
            return false;
        }
    }

    // Check if referer matches the host
    if (referer) {
        try {
            const refererUrl = new URL(referer);
            if (host && refererUrl.host === host) {
                return true;
            }
        } catch {
            return false;
        }
    }

    return false;
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const method = request.method;

    // Create response - either continue to the route or process the request
    const response = NextResponse.next();

    // Add security headers to all responses
    Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
    });

    // Skip validation for non-mutating requests and certain paths
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
        return response;
    }

    if (shouldSkipValidation(pathname)) {
        return response;
    }

    // Validate Origin/Referer for CSRF protection on mutating requests
    if (!isValidOrigin(request)) {
        console.warn(`[Middleware] Invalid origin/referer for ${method} ${pathname}`);
        return new NextResponse(
            JSON.stringify({ error: 'Invalid request origin' }),
            {
                status: 403,
                headers: {
                    'Content-Type': 'application/json',
                    ...securityHeaders
                }
            }
        );
    }

    // Validate Content-Type for mutating requests
    const contentType = request.headers.get('content-type');

    // Allow requests without body (e.g., DELETE without body)
    // Next.js server actions use text/plain
    if (contentType && !isValidContentType(contentType)) {
        console.warn(`[Middleware] Invalid Content-Type "${contentType}" for ${method} ${pathname}`);
        return new NextResponse(
            JSON.stringify({ error: 'Invalid Content-Type header' }),
            {
                status: 415,
                headers: {
                    'Content-Type': 'application/json',
                    ...securityHeaders
                }
            }
        );
    }

    // Check for HTTPS in production (via x-forwarded-proto)
    if (process.env.NODE_ENV === 'production') {
        const proto = request.headers.get('x-forwarded-proto');
        if (proto && proto !== 'https') {
            // Redirect to HTTPS
            const httpsUrl = new URL(request.url);
            httpsUrl.protocol = 'https:';
            return NextResponse.redirect(httpsUrl, 301);
        }
    }

    return response;
}

/**
 * Configure which paths the middleware runs on
 */
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
