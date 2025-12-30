/**
 * API route handler for linking pending invitations to a new user
 * POST /api/invitations/link
 * 
 * Called after signup to link pending invitations to the user's UID
 * This is a public endpoint (no auth required) because it's called during signup
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/apiResponse';
import { linkInvitationsToUser } from '@/lib/pendingInvitations';
import { isValidEmail, isValidFirestoreId } from '@/lib/validation';
import { logger, generateRequestId } from '@/lib/logger';

interface LinkRequest {
    userId: string;
    email: string;
}

export async function POST(request: NextRequest) {
    const requestId = generateRequestId();

    try {
        const body: LinkRequest = await request.json();
        const { userId, email } = body;

        // Validate inputs
        if (!isValidFirestoreId(userId)) {
            return errorResponse('Invalid user ID', ErrorCodes.BAD_REQUEST);
        }
        if (!isValidEmail(email)) {
            return errorResponse('Invalid email format', ErrorCodes.BAD_REQUEST);
        }

        const linkedCount = await linkInvitationsToUser(email.toLowerCase(), userId);

        logger.info('Linked pending invitations to new user', {
            requestId,
            userId,
            email,
            linkedCount
        });

        return successResponse({
            message: linkedCount > 0
                ? `${linkedCount} invitation(s) linked to your account`
                : 'No pending invitations found',
            linkedCount
        });

    } catch (error: unknown) {
        logger.error('Error linking invitations', error, { requestId });
        const message = error instanceof Error ? error.message : 'Failed to link invitations';
        return errorResponse(message, ErrorCodes.INTERNAL_ERROR);
    }
}
