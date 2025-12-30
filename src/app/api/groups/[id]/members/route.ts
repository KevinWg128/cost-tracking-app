/**
 * API route handler for adding members to a group
 * POST /api/groups/[id]/members
 * Requires: Authentication + Caller must be a group member
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/apiResponse';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { isValidFirestoreId } from '@/lib/validation';
import { verifyAuthToken, isGroupMember } from '@/lib/auth';
import { logger, generateRequestId } from '@/lib/logger';

interface AddMemberRequest {
    userId: string;
}

interface RouteContext {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
    const requestId = generateRequestId();

    try {
        // Authenticate the caller
        const authResult = await verifyAuthToken(request);
        if (!authResult) {
            return errorResponse('Authentication required', ErrorCodes.UNAUTHORIZED);
        }

        const { id: groupId } = await context.params;
        const body: AddMemberRequest = await request.json();
        const { userId } = body;

        // Validate Firestore IDs
        if (!isValidFirestoreId(groupId)) {
            return errorResponse('Invalid group ID', ErrorCodes.BAD_REQUEST);
        }
        if (!isValidFirestoreId(userId)) {
            return errorResponse('Invalid user ID', ErrorCodes.BAD_REQUEST);
        }

        // Verify caller is a member of the group
        const callerIsMember = await isGroupMember(groupId, authResult.uid);
        if (!callerIsMember) {
            return errorResponse('You must be a member of this group to add members', ErrorCodes.FORBIDDEN);
        }

        const groupRef = doc(db, 'groups', groupId);

        // Check if group exists and user is already a member
        const groupSnap = await getDoc(groupRef);
        if (!groupSnap.exists()) {
            return errorResponse('Group not found', ErrorCodes.NOT_FOUND);
        }

        const groupData = groupSnap.data();
        if (groupData.memberIds?.includes(userId)) {
            return errorResponse('User is already a member of this group', ErrorCodes.BAD_REQUEST);
        }

        await updateDoc(groupRef, {
            memberIds: arrayUnion(userId),
        });

        logger.audit('GROUP_MEMBER_ADDED', {
            requestId,
            groupId,
            userId,
            addedBy: authResult.uid,
            action: 'member_added',
        });

        return successResponse({ message: 'Member added successfully' });

    } catch (error: unknown) {
        logger.error('Error adding member', error, { requestId });
        const message = error instanceof Error ? error.message : 'Failed to add member';
        return errorResponse(message, ErrorCodes.INTERNAL_ERROR);
    }
}
