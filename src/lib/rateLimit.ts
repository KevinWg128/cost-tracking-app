/**
 * In-memory rate limiter for login attempts
 * Uses a sliding window approach to track failed login attempts
 */

interface AttemptRecord {
    attempts: number;
    firstAttemptTime: number;
    lockedUntil?: number;
}

// In-memory store for rate limiting
// Key format: "ip:email"
const attemptStore = new Map<string, AttemptRecord>();

// Configuration
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Generate a rate limit key from IP and email
 */
export function getRateLimitKey(ip: string, email: string): string {
    return `${ip}:${email.toLowerCase()}`;
}

/**
 * Check if a login attempt is allowed
 * Returns { allowed: boolean, remainingAttempts: number, lockoutRemaining?: number }
 */
export function checkRateLimit(key: string): {
    allowed: boolean;
    remainingAttempts: number;
    lockoutRemaining?: number;
} {
    const now = Date.now();
    const record = attemptStore.get(key);

    // No previous attempts
    if (!record) {
        return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
    }

    // Check if currently locked out
    if (record.lockedUntil && record.lockedUntil > now) {
        return {
            allowed: false,
            remainingAttempts: 0,
            lockoutRemaining: Math.ceil((record.lockedUntil - now) / 1000), // seconds
        };
    }

    // Check if window has expired (reset attempts)
    if (now - record.firstAttemptTime > WINDOW_MS) {
        attemptStore.delete(key);
        return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
    }

    // Check remaining attempts
    const remainingAttempts = MAX_ATTEMPTS - record.attempts;

    if (remainingAttempts <= 0) {
        // Should be locked out
        const lockoutRemaining = Math.ceil(
            (record.firstAttemptTime + WINDOW_MS - now) / 1000
        );
        return {
            allowed: false,
            remainingAttempts: 0,
            lockoutRemaining,
        };
    }

    return { allowed: true, remainingAttempts };
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(key: string): {
    isLockedOut: boolean;
    remainingAttempts: number;
    lockoutRemaining?: number;
} {
    const now = Date.now();
    const record = attemptStore.get(key);

    if (!record || now - record.firstAttemptTime > WINDOW_MS) {
        // Start a new window
        attemptStore.set(key, {
            attempts: 1,
            firstAttemptTime: now,
        });
        return { isLockedOut: false, remainingAttempts: MAX_ATTEMPTS - 1 };
    }

    // Increment attempts
    record.attempts += 1;

    if (record.attempts >= MAX_ATTEMPTS) {
        // Lock the account
        record.lockedUntil = record.firstAttemptTime + WINDOW_MS;
        attemptStore.set(key, record);

        const lockoutRemaining = Math.ceil((record.lockedUntil - now) / 1000);
        return {
            isLockedOut: true,
            remainingAttempts: 0,
            lockoutRemaining,
        };
    }

    attemptStore.set(key, record);
    return {
        isLockedOut: false,
        remainingAttempts: MAX_ATTEMPTS - record.attempts,
    };
}

/**
 * Reset attempts after successful login
 */
export function resetAttempts(key: string): void {
    attemptStore.delete(key);
}

/**
 * Get client IP from request headers
 * Handles various proxy headers
 */
export function getClientIP(headers: Headers): string {
    // Check various headers set by proxies
    const xForwardedFor = headers.get('x-forwarded-for');
    if (xForwardedFor) {
        // x-forwarded-for can contain multiple IPs, take the first one
        return xForwardedFor.split(',')[0].trim();
    }

    const xRealIP = headers.get('x-real-ip');
    if (xRealIP) {
        return xRealIP;
    }

    // Fallback for development
    return '127.0.0.1';
}

/**
 * Clean up expired records (optional, for memory management)
 * Call this periodically in production
 */
export function cleanupExpiredRecords(): void {
    const now = Date.now();
    for (const [key, record] of attemptStore.entries()) {
        if (now - record.firstAttemptTime > WINDOW_MS) {
            attemptStore.delete(key);
        }
    }
}

// Export constants for testing and configuration display
export const RATE_LIMIT_CONFIG = {
    maxAttempts: MAX_ATTEMPTS,
    windowMs: WINDOW_MS,
    windowMinutes: WINDOW_MS / 60000,
};
