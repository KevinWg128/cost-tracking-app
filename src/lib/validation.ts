/**
 * Input validation utilities for external sources
 * Addresses security checklist: "Inputs from external sources are validated"
 */

/**
 * Validate that a URL is properly formatted and from an allowed domain
 * Used for S3 presigned URLs passed to Gemini API
 */
export function isValidImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
        return false;
    }

    try {
        const parsed = new URL(url);

        // Allow only HTTPS (or HTTP for localhost in development)
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
            return false;
        }

        // Allow only S3 bucket URLs and localhost for development
        const allowedDomainPatterns = [
            /\.s3\..*\.amazonaws\.com$/,  // S3 bucket URLs
            /^s3\..*\.amazonaws\.com$/,   // S3 regional endpoints
            /^localhost$/,                 // Local development
            /^127\.0\.0\.1$/,              // Local development
        ];

        const isAllowedDomain = allowedDomainPatterns.some(pattern =>
            pattern.test(parsed.hostname)
        );

        return isAllowedDomain;
    } catch {
        return false;
    }
}

/**
 * Validate email format using standard pattern
 * RFC 5322 compliant basic validation
 */
export function isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
        return false;
    }

    // Max email length per RFC 5321
    if (email.length > 254) {
        return false;
    }

    // Standard email regex pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Validate base64 encoded image data
 * Returns validation result with optional error message
 */
export function isValidBase64Image(base64: string): { valid: boolean; error?: string } {
    if (!base64 || typeof base64 !== 'string') {
        return { valid: false, error: 'Image data is required' };
    }

    // Maximum size: 10MB base64 (roughly 13.3MB when encoded)
    const MAX_SIZE = 10 * 1024 * 1024 * 1.33;

    if (base64.length > MAX_SIZE) {
        return { valid: false, error: 'Image too large (max 10MB)' };
    }

    // Check for valid image data URL prefix or raw base64
    const validImagePrefixes = [
        'data:image/jpeg',
        'data:image/jpg',
        'data:image/png',
        'data:image/webp',
        'data:image/gif',
    ];

    const hasDataUrlPrefix = validImagePrefixes.some(prefix =>
        base64.toLowerCase().startsWith(prefix)
    );

    // If it has a data URL prefix, validate the structure
    if (hasDataUrlPrefix) {
        if (!base64.includes(';base64,')) {
            return { valid: false, error: 'Invalid base64 image format' };
        }
        return { valid: true };
    }

    // If no prefix, check if it looks like raw base64
    // Base64 characters: A-Z, a-z, 0-9, +, /, and = for padding
    const base64Regex = /^[A-Za-z0-9+/]+=*$/;
    const sampleToCheck = base64.slice(0, 1000).replace(/\s/g, '');

    if (!base64Regex.test(sampleToCheck)) {
        return { valid: false, error: 'Invalid image data format' };
    }

    return { valid: true };
}

/**
 * Validate filename to prevent path traversal attacks
 * Only allows safe characters in filenames
 */
export function isValidFileName(fileName: string): boolean {
    if (!fileName || typeof fileName !== 'string') {
        return false;
    }

    // Max filename length
    if (fileName.length > 255 || fileName.length === 0) {
        return false;
    }

    // Prevent path traversal
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
        return false;
    }

    // Only allow safe characters: alphanumeric, dash, underscore, period
    const safePattern = /^[a-zA-Z0-9_\-\.]+$/;
    return safePattern.test(fileName);
}

/**
 * Validate Firestore document ID
 * IDs must be 1-1500 bytes, no forward slashes
 */
export function isValidFirestoreId(id: string): boolean {
    if (!id || typeof id !== 'string') {
        return false;
    }

    // Firestore ID constraints
    if (id.length === 0 || id.length > 1500) {
        return false;
    }

    // No forward slashes allowed
    if (id.includes('/')) {
        return false;
    }

    // No leading/trailing whitespace
    if (id.trim() !== id) {
        return false;
    }

    // Must not be . or ..
    if (id === '.' || id === '..') {
        return false;
    }

    return true;
}
