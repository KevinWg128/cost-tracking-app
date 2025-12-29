/**
 * API Response utilities for standardized responses
 */

import { NextResponse } from 'next/server';

/**
 * Security headers for API responses
 */
const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
};

/**
 * Create a successful JSON response
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
    return NextResponse.json(
        { success: true, ...data },
        {
            status,
            headers: securityHeaders
        }
    );
}

/**
 * Create an error JSON response
 */
export function errorResponse(
    message: string,
    status: number = 400,
    details?: Record<string, unknown>
): NextResponse {
    return NextResponse.json(
        {
            success: false,
            error: message,
            ...(details && { details })
        },
        {
            status,
            headers: securityHeaders
        }
    );
}

/**
 * Standard error codes
 */
export const ErrorCodes = {
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500,
} as const;
