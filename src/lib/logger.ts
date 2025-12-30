/**
 * Structured Logger Utility
 * Provides consistent logging with context, timestamps, and sensitive data filtering.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'audit';

export interface LogContext {
    userId?: string;
    requestId?: string;
    ip?: string;
    action?: string;
    email?: string;
    groupId?: string;
    [key: string]: unknown;
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: LogContext;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

// Patterns to detect and mask sensitive data
const SENSITIVE_PATTERNS = [
    { pattern: /api[_-]?key/i, replacement: '[API_KEY]' },
    { pattern: /password/i, replacement: '[PASSWORD]' },
    { pattern: /secret/i, replacement: '[SECRET]' },
    { pattern: /token/i, replacement: '[TOKEN]' },
    { pattern: /authorization/i, replacement: '[AUTH]' },
];

/**
 * Mask sensitive values in context objects
 */
function maskSensitiveData(context: LogContext): LogContext {
    const masked = { ...context };

    for (const key of Object.keys(masked)) {
        const value = masked[key];

        // Check if key matches sensitive patterns
        for (const { pattern } of SENSITIVE_PATTERNS) {
            if (pattern.test(key)) {
                masked[key] = '[REDACTED]';
                break;
            }
        }

        // Mask email addresses (show only domain)
        if (key === 'email' && typeof value === 'string') {
            const parts = value.split('@');
            if (parts.length === 2) {
                masked[key] = `***@${parts[1]}`;
            }
        }
    }

    return masked;
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Extract client IP from request headers
 */
export function getClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }
    return 'unknown';
}

/**
 * Format log entry for output
 */
function formatLog(entry: LogEntry): string {
    const isDev = process.env.NODE_ENV !== 'production';

    if (isDev) {
        // Human-readable format for development
        const contextStr = entry.context
            ? ` ${JSON.stringify(maskSensitiveData(entry.context))}`
            : '';
        const errorStr = entry.error
            ? ` | Error: ${entry.error.message}`
            : '';
        return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}${errorStr}`;
    }

    // JSON format for production (enables log aggregation)
    return JSON.stringify({
        ...entry,
        context: entry.context ? maskSensitiveData(entry.context) : undefined,
    });
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, context?: LogContext, error?: unknown) {
    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        context,
    };

    if (error) {
        if (error instanceof Error) {
            entry.error = {
                name: error.name,
                message: error.message,
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined,
            };
        } else {
            entry.error = {
                name: 'UnknownError',
                message: String(error),
            };
        }
    }

    const formatted = formatLog(entry);

    switch (level) {
        case 'debug':
            if (process.env.NODE_ENV !== 'production') {
                console.debug(formatted);
            }
            break;
        case 'info':
            console.info(formatted);
            break;
        case 'warn':
            console.warn(formatted);
            break;
        case 'error':
            console.error(formatted);
            break;
        case 'audit':
            // Audit logs always go to info with special prefix
            console.info(`[AUDIT] ${formatted}`);
            break;
    }
}

/**
 * Structured logger instance
 */
export const logger = {
    /**
     * Debug-level logging (only in development)
     */
    debug(message: string, context?: LogContext) {
        log('debug', message, context);
    },

    /**
     * Info-level logging
     */
    info(message: string, context?: LogContext) {
        log('info', message, context);
    },

    /**
     * Warning-level logging
     */
    warn(message: string, context?: LogContext) {
        log('warn', message, context);
    },

    /**
     * Error-level logging
     */
    error(message: string, error?: unknown, context?: LogContext) {
        log('error', message, context, error);
    },

    /**
     * Audit-level logging for security events
     * Use for: sign-in, sign-out, password changes, permission changes, etc.
     */
    audit(event: string, context: LogContext) {
        log('audit', event, {
            ...context,
            auditTimestamp: new Date().toISOString(),
        });
    },
};

export default logger;
