/**
 * API route handler for accepting an invitation
 * POST /api/invitations/[token]/accept
 * Requires: Authentication
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/apiResponse';
import { acceptInvitation } from '@/lib/pendingInvitations';
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

        const result = await acceptInvitation(token, authResult.uid);

        if (!result.success) {
            logger.warn('Failed to accept invitation', {
                requestId,
                error: result.error,
                userId: authResult.uid
            });
            return errorResponse(result.error || 'Failed to accept invitation', ErrorCodes.BAD_REQUEST);
        }

        logger.info('Invitation accepted via API', {
            requestId,
            groupId: result.groupId,
            userId: authResult.uid
        });

        return successResponse({
            message: `You have joined "${result.groupName}"!`,
            groupId: result.groupId,
            groupName: result.groupName
        });

    } catch (error: unknown) {
        logger.error('Error accepting invitation', error, { requestId });
        const message = error instanceof Error ? error.message : 'Failed to accept invitation';
        return errorResponse(message, ErrorCodes.INTERNAL_ERROR);
    }
}
