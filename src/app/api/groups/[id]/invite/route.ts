/**
 * API route handler for sending group invitations
 * POST /api/groups/[id]/invite
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/apiResponse';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { sendInviteEmail } from '@/lib/resend';
import { getUserProfile } from '@/lib/userProfile';
import { isValidEmail, isValidFirestoreId } from '@/lib/validation';

interface InviteRequest {
    email: string;
    inviterUserId: string;
}

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const { id: groupId } = await context.params;
        const body: InviteRequest = await request.json();
        const { email, inviterUserId } = body;

        // Validate inputs
        if (!isValidEmail(email)) {
            return errorResponse('Invalid email format', ErrorCodes.BAD_REQUEST);
        }
        if (!isValidFirestoreId(inviterUserId)) {
            return errorResponse('Invalid inviter user ID', ErrorCodes.BAD_REQUEST);
        }
        if (!isValidFirestoreId(groupId)) {
            return errorResponse('Invalid group ID', ErrorCodes.BAD_REQUEST);
        }

        // Get inviter's name
        const inviterProfile = await getUserProfile(inviterUserId);
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
