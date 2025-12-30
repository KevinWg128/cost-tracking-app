/**
 * API route handler for managing member roles
 * PATCH /api/groups/[id]/members/[memberId]/role
 * Requires: Authentication + Caller must be owner
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/apiResponse';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { isValidFirestoreId } from '@/lib/validation';
import { verifyAuthToken, isGroupOwner } from '@/lib/auth';
import { logger, generateRequestId } from '@/lib/logger';

interface RouteContext {
    params: Promise<{ id: string; memberId: string }>;
}

interface RoleUpdateRequest {
    role: 'admin' | 'member';
}

export async function PATCH(request: NextRequest, context: RouteContext) {
    const requestId = generateRequestId();

    try {
        // Authenticate the caller
        const authResult = await verifyAuthToken(request);
        if (!authResult) {
            return errorResponse('Authentication required', ErrorCodes.UNAUTHORIZED);
        }

        const { id: groupId, memberId } = await context.params;
        const body: RoleUpdateRequest = await request.json();
        const { role } = body;

        // Validate input
        if (!isValidFirestoreId(groupId)) {
            return errorResponse('Invalid group ID', ErrorCodes.BAD_REQUEST);
        }
        if (!isValidFirestoreId(memberId)) {
            return errorResponse('Invalid member ID', ErrorCodes.BAD_REQUEST);
        }
        if (!role || !['admin', 'member'].includes(role)) {
            return errorResponse('Invalid role. Must be "admin" or "member"', ErrorCodes.BAD_REQUEST);
        }

        // Only owner can change roles
        const callerIsOwner = await isGroupOwner(groupId, authResult.uid);
        if (!callerIsOwner) {
            return errorResponse('Only the group owner can change member roles', ErrorCodes.FORBIDDEN);
        }

        // Fetch the group document
        const groupRef = adminDb.collection('groups').doc(groupId);
        const groupSnap = await groupRef.get();

        if (!groupSnap.exists) {
            return errorResponse('Group not found', ErrorCodes.NOT_FOUND);
        }

        const groupData = groupSnap.data()!;
        const ownerId = groupData.createdBy;
        const memberIds: string[] = groupData.memberIds || [];
        const adminIds: string[] = groupData.adminIds || [];

        // Check if the target member exists in the group
        if (!memberIds.includes(memberId)) {
            return errorResponse('Member not found in this group', ErrorCodes.NOT_FOUND);
        }

        // Cannot change owner's role
        if (memberId === ownerId) {
            return errorResponse('Cannot change the owner\'s role', ErrorCodes.FORBIDDEN);
        }

        const isCurrentlyAdmin = adminIds.includes(memberId);

        // Check if already in the desired role
        if (role === 'admin' && isCurrentlyAdmin) {
            return successResponse({ message: 'Member is already an admin' });
        }
        if (role === 'member' && !isCurrentlyAdmin) {
            return successResponse({ message: 'Member is already a regular member' });
        }

        // Update the role
        if (role === 'admin') {
            await groupRef.update({
                adminIds: FieldValue.arrayUnion(memberId),
            });
        } else {
            await groupRef.update({
                adminIds: FieldValue.arrayRemove(memberId),
            });
        }

        const action = role === 'admin' ? 'promoted_to_admin' : 'demoted_to_member';

        logger.audit('GROUP_MEMBER_ROLE_CHANGED', {
            requestId,
            groupId,
            memberId,
            changedBy: authResult.uid,
            newRole: role,
            previousRole: isCurrentlyAdmin ? 'admin' : 'member',
            action,
        });

        return successResponse({
            message: role === 'admin'
                ? 'Member promoted to admin successfully'
                : 'Member demoted to regular member successfully'
        });

    } catch (error: unknown) {
        logger.error('Error changing member role', error, { requestId });
        const message = error instanceof Error ? error.message : 'Failed to change member role';
        return errorResponse(message, ErrorCodes.INTERNAL_ERROR);
    }
}
