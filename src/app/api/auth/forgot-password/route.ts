import { NextRequest, NextResponse } from 'next/server';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
    checkRateLimit,
    recordFailedAttempt,
    getRateLimitKey,
    getClientIP,
} from '@/lib/rateLimit';
import { isValidEmail } from '@/lib/validation';
import { logger, generateRequestId } from '@/lib/logger';

// Rate limit configuration for password reset (more restrictive)
const MAX_RESET_ATTEMPTS = 3;

export async function POST(request: NextRequest) {
    const requestId = generateRequestId();

    try {
        const { email } = await request.json();

        // Validate input
        if (!email) {
            return NextResponse.json(
                { error: 'Email is required' },
                { status: 400 }
            );
        }

        // Validate email format
        if (!isValidEmail(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Get client IP for rate limiting
        const clientIP = getClientIP(request.headers);
        const rateLimitKey = getRateLimitKey(clientIP, `reset:${email}`);

        // Check rate limit before attempting password reset
        const limitCheck = checkRateLimit(rateLimitKey);

        // Use more restrictive limit for password reset
        if (!limitCheck.allowed || limitCheck.remainingAttempts <= (5 - MAX_RESET_ATTEMPTS)) {
            return NextResponse.json(
                {
                    error: 'Too many password reset requests. Please try again later.',
                },
                { status: 429 }
            );
        }

        // Record this attempt
        recordFailedAttempt(rateLimitKey);

        try {
            // Send password reset email via Firebase
            await sendPasswordResetEmail(auth, email);

            logger.audit('PASSWORD_RESET_REQUESTED', {
                requestId,
                email,
                ip: clientIP,
                action: 'password_reset_sent',
            });
        } catch (firebaseError: any) {
            // Log the error for debugging but don't reveal to user
            logger.error('Firebase password reset error', firebaseError, {
                requestId,
                email,
                errorCode: firebaseError.code,
            });
            // We don't return an error to the user to prevent email enumeration
            // Even if the email doesn't exist, we return success
        }

        // Always return success to prevent email enumeration
        return NextResponse.json({
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent.',
        });
    } catch (error) {
        logger.error('Password reset error', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}
