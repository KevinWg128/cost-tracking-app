/**
 * API route handler for sending group invitations
 * POST /api/groups/[id]/invite
 * Requires: Authentication + Caller must be a group member
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/apiResponse';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { sendInviteEmail } from '@/lib/resend';
import { getUserProfile } from '@/lib/userProfile';
import { isValidEmail, isValidFirestoreId } from '@/lib/validation';
import { verifyAuthToken, isGroupMember } from '@/lib/auth';

interface InviteRequest {
    email: string;
}

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
    try {
        // Authenticate the caller
        const authResult = await verifyAuthToken(request);
        if (!authResult) {
            return errorResponse('Authentication required', ErrorCodes.UNAUTHORIZED);
        }

        const { id: groupId } = await context.params;
        const body: InviteRequest = await request.json();
        const { email } = body;

        // Validate inputs
        if (!isValidEmail(email)) {
            return errorResponse('Invalid email format', ErrorCodes.BAD_REQUEST);
        }
        if (!isValidFirestoreId(groupId)) {
            return errorResponse('Invalid group ID', ErrorCodes.BAD_REQUEST);
        }

        // Verify caller is a member of the group
        const callerIsMember = await isGroupMember(groupId, authResult.uid);
        if (!callerIsMember) {
            return errorResponse('You must be a member of this group to send invites', ErrorCodes.FORBIDDEN);
        }

        // Get inviter's name from their profile (using authenticated user's UID)
        const inviterProfile = await getUserProfile(authResult.uid);
        const inviterName = inviterProfile
            ? `${inviterProfile.firstName} ${inviterProfile.lastName}`.trim() || 'A friend'
            : 'A friend';

        // Get group name
        const groupRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupRef);

        if (!groupSnap.exists()) {
            return errorResponse('Group not found', ErrorCodes.NOT_FOUND);
        }

        const groupName = groupSnap.data().name || 'an expense group';

        // Send the email
        const result = await sendInviteEmail(email, inviterName, groupName);

        if (!result.success) {
            return errorResponse(result.error || 'Failed to send invitation', ErrorCodes.INTERNAL_ERROR);
        }

        return successResponse({ message: 'Invitation sent successfully' });

    } catch (error: unknown) {
        console.error('Error sending invitation:', error);
        const message = error instanceof Error ? error.message : 'Failed to send invitation';
        return errorResponse(message, ErrorCodes.INTERNAL_ERROR);
    }
}
