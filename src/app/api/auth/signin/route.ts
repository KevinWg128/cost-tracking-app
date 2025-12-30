import { NextRequest, NextResponse } from 'next/server';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
    checkRateLimit,
    recordFailedAttempt,
    resetAttempts,
    getRateLimitKey,
    getClientIP,
    RATE_LIMIT_CONFIG,
} from '@/lib/rateLimit';
import { logger, generateRequestId } from '@/lib/logger';

export async function POST(request: NextRequest) {
    const requestId = generateRequestId();

    try {
        const { email, password } = await request.json();

        // Validate input
        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Get client IP for rate limiting
        const clientIP = getClientIP(request.headers);
        const rateLimitKey = getRateLimitKey(clientIP, email);

        // Check rate limit before attempting login
        const limitCheck = checkRateLimit(rateLimitKey);
        if (!limitCheck.allowed) {
            logger.audit('SIGNIN_RATE_LIMITED', {
                requestId,
                ip: clientIP,
                email,
                action: 'signin_blocked',
            });

            return NextResponse.json(
                {
                    error: 'Too many login attempts. Please try again later.',
                    lockoutRemaining: limitCheck.lockoutRemaining,
                    remainingAttempts: 0,
                },
                { status: 429 }
            );
        }

        // Attempt sign in using Firebase client SDK
        // Note: We use client SDK here as it handles password verification
        // The Admin SDK doesn't support password-based sign-in directly
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            // Reset attempts on successful login
            resetAttempts(rateLimitKey);

            logger.audit('SIGNIN_SUCCESS', {
                requestId,
                userId: userCredential.user.uid,
                email,
                ip: clientIP,
                action: 'signin_success',
            });

            return NextResponse.json({
                success: true,
                uid: userCredential.user.uid,
                email: userCredential.user.email,
            });
        } catch (authError: any) {
            // Record failed attempt
            const failedResult = recordFailedAttempt(rateLimitKey);

            // Determine appropriate error message
            let errorMessage = 'Invalid email or password';
            let errorCode = authError.code || 'unknown';

            if (authError.code === 'auth/user-not-found') {
                errorMessage = 'Invalid email or password';
            } else if (authError.code === 'auth/wrong-password') {
                errorMessage = 'Invalid email or password';
            } else if (authError.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email format';
            } else if (authError.code === 'auth/user-disabled') {
                errorMessage = 'This account has been disabled';
            } else if (authError.code === 'auth/invalid-credential') {
                errorMessage = 'Invalid email or password';
            }

            logger.audit('SIGNIN_FAILED', {
                requestId,
                email,
                ip: clientIP,
                action: 'signin_failed',
                errorCode,
                remainingAttempts: failedResult.remainingAttempts,
                isLockedOut: failedResult.isLockedOut,
            });

            // Include lockout info if applicable
            if (failedResult.isLockedOut) {
                return NextResponse.json(
                    {
                        error: `Too many login attempts. Please try again in ${Math.ceil(failedResult.lockoutRemaining! / 60)} minutes.`,
                        lockoutRemaining: failedResult.lockoutRemaining,
                        remainingAttempts: 0,
                    },
                    { status: 429 }
                );
            }

            return NextResponse.json(
                {
                    error: errorMessage,
                    remainingAttempts: failedResult.remainingAttempts,
                    maxAttempts: RATE_LIMIT_CONFIG.maxAttempts,
                },
                { status: 401 }
            );
        }
    } catch (error) {
        logger.error('Sign-in error', error, { requestId });
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}

