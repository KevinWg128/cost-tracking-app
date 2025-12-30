/**
 * API route handler for declining an invitation
 * POST /api/invitations/[token]/decline
 * Requires: Authentication
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/apiResponse';
import { declineInvitation } from '@/lib/pendingInvitations';
import { verifyAuthToken } from '@/lib/auth';
import { logger, generateRequestId } from '@/lib/logger';

interface RouteContext {
    params: Promise<{ token: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
    const requestId = generateRequestId();

    try {
        // Authenticate the caller
        const authResult = await verifyAuthToken(request);
        if (!authResult) {
            return errorResponse('Authentication required', ErrorCodes.UNAUTHORIZED);
        }

        const { token } = await context.params;

        if (!token || token.length < 32) {
            return errorResponse('Invalid invitation token', ErrorCodes.BAD_REQUEST);
        }

        const result = await declineInvitation(token);

        if (!result.success) {
            logger.warn('Failed to decline invitation', {
                requestId,
                error: result.error,
                userId: authResult.uid
            });
            return errorResponse(result.error || 'Failed to decline invitation', ErrorCodes.BAD_REQUEST);
        }

        logger.info('Invitation declined via API', {
            requestId,
            userId: authResult.uid
        });

        return successResponse({
            message: 'Invitation declined'
        });

    } catch (error: unknown) {
        logger.error('Error declining invitation', error, { requestId });
        const message = error instanceof Error ? error.message : 'Failed to decline invitation';
        return errorResponse(message, ErrorCodes.INTERNAL_ERROR);
    }
}
