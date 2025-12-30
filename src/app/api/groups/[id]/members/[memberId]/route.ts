/**
 * API route handler for managing individual group members
 * DELETE /api/groups/[id]/members/[memberId]
 * Requires: Authentication + Caller must be owner or admin
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/apiResponse';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { isValidFirestoreId } from '@/lib/validation';
import { verifyAuthToken, isGroupOwner, isGroupAdmin } from '@/lib/auth';
import { isMemberBalanceSettled, getMemberBalance } from '@/lib/balanceUtils';
import { logger, generateRequestId } from '@/lib/logger';

interface RouteContext {
    params: Promise<{ id: string; memberId: string }>;
}

export async function DELETE(request: NextRequest, context: RouteContext) {
    const requestId = generateRequestId();

    try {
        // Authenticate the caller
        const authResult = await verifyAuthToken(request);
        if (!authResult) {
            return errorResponse('Authentication required', ErrorCodes.UNAUTHORIZED);
        }

        const { id: groupId, memberId } = await context.params;

        // Validate Firestore IDs
        if (!isValidFirestoreId(groupId)) {
            return errorResponse('Invalid group ID', ErrorCodes.BAD_REQUEST);
        }
        if (!isValidFirestoreId(memberId)) {
            return errorResponse('Invalid member ID', ErrorCodes.BAD_REQUEST);
        }

        // Fetch the group document
        const groupRef = adminDb.collection('groups').doc(groupId);
        const groupSnap = await groupRef.get();

        if (!groupSnap.exists) {
            return errorResponse('Group not found', ErrorCodes.NOT_FOUND);
        }

        const groupData = groupSnap.data()!;
        const ownerId = groupData.createdBy;
        const adminIds: string[] = groupData.adminIds || [];
        const memberIds: string[] = groupData.memberIds || [];

        // Check if the target member exists in the group
        if (!memberIds.includes(memberId)) {
            return errorResponse('Member not found in this group', ErrorCodes.NOT_FOUND);
        }

        // Prevent owner from being removed
        if (memberId === ownerId) {
            return errorResponse('Cannot remove the group owner', ErrorCodes.FORBIDDEN);
        }

        // Prevent self-removal
        if (memberId === authResult.uid) {
            return errorResponse('Cannot remove yourself from the group', ErrorCodes.FORBIDDEN);
        }

        // Check caller's permissions
        const callerIsOwner = authResult.uid === ownerId;
        const callerIsAdmin = adminIds.includes(authResult.uid);
        const targetIsAdmin = adminIds.includes(memberId);

        if (!callerIsOwner && !callerIsAdmin) {
            return errorResponse('You do not have permission to remove members', ErrorCodes.FORBIDDEN);
        }

        // Admins cannot remove other admins or the owner
        if (callerIsAdmin && !callerIsOwner && targetIsAdmin) {
            return errorResponse('Admins cannot remove other admins', ErrorCodes.FORBIDDEN);
        }

        // Check if member's balance is settled
        const isSettled = await isMemberBalanceSettled(groupId, memberId);
        if (!isSettled) {
            const balance = await getMemberBalance(groupId, memberId);
            const balanceMessage = balance > 0
                ? `Member is owed $${balance.toFixed(2)}. Settle balances before removal.`
                : `Member owes $${Math.abs(balance).toFixed(2)}. Settle balances before removal.`;
            return errorResponse(balanceMessage, ErrorCodes.BAD_REQUEST);
        }

        // Remove member from memberIds and adminIds (if applicable)
        const updates: Record<string, FieldValue> = {
            memberIds: FieldValue.arrayRemove(memberId),
        };

        if (targetIsAdmin) {
            updates.adminIds = FieldValue.arrayRemove(memberId);
        }

        await groupRef.update(updates);

        logger.audit('GROUP_MEMBER_REMOVED', {
            requestId,
            groupId,
            memberId,
            removedBy: authResult.uid,
            wasAdmin: targetIsAdmin,
            action: 'member_removed',
        });

        return successResponse({ message: 'Member removed successfully' });

    } catch (error: unknown) {
        logger.error('Error removing member', error, { requestId });
        const message = error instanceof Error ? error.message : 'Failed to remove member';
        return errorResponse(message, ErrorCodes.INTERNAL_ERROR);
    }
}
