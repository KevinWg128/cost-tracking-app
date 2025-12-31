/**
 * API route handler for getting pending invitations
 * GET /api/invitations
 * Requires: Authentication
 * 
 * Returns all pending invitations for the authenticated user
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/apiResponse';
import { getPendingInvitationsForUser, getPendingInvitationsForEmail } from '@/lib/pendingInvitations';
import { getUserProfileAdmin } from '@/lib/userProfileAdmin';
import { verifyAuthToken } from '@/lib/auth';
import { logger, generateRequestId } from '@/lib/logger';

export async function GET(request: NextRequest) {
    const requestId = generateRequestId();

    try {
        // Authenticate the caller
        const authResult = await verifyAuthToken(request);
        if (!authResult) {
            return errorResponse('Authentication required', ErrorCodes.UNAUTHORIZED);
        }

        // Get invitations by UID
        const invitationsByUid = await getPendingInvitationsForUser(authResult.uid);

        // Also check by email (for invitations created before user registered)
        const userProfile = await getUserProfileAdmin(authResult.uid);
        let invitationsByEmail: typeof invitationsByUid = [];

        if (userProfile?.email) {
            invitationsByEmail = await getPendingInvitationsForEmail(userProfile.email);
        }

        // Combine and deduplicate (by invitation ID)
        const allInvitations = [...invitationsByUid];
        const seenIds = new Set(invitationsByUid.map(inv => inv.id));

        for (const inv of invitationsByEmail) {
            if (!seenIds.has(inv.id)) {
                allInvitations.push(inv);
                seenIds.add(inv.id);
            }
        }

        // Sort by creation date (newest first)
        allInvitations.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());

        logger.info('Fetched pending invitations', {
            requestId,
            userId: authResult.uid,
            count: allInvitations.length
        });

        // Transform for response (exclude token for security)
        const responseInvitations = allInvitations.map(inv => ({
            id: inv.id,
            groupId: inv.groupId,
            groupName: inv.groupName,
            inviterName: inv.inviterName,
            createdAt: inv.createdAt.toDate().toISOString(),
            expiresAt: inv.expiresAt.toDate().toISOString(),
            token: inv.token  // Include token for accept/decline actions
        }));

        return successResponse({ invitations: responseInvitations });

    } catch (error: unknown) {
        logger.error('Error fetching invitations', error, { requestId });
        const message = error instanceof Error ? error.message : 'Failed to fetch invitations';
        return errorResponse(message, ErrorCodes.INTERNAL_ERROR);
    }
}
