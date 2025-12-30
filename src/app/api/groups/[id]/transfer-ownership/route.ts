/**
 * API route handler for transferring group ownership
 * POST /api/groups/[id]/transfer-ownership
 * Requires: Authentication + Caller must be current owner
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/apiResponse';
import { adminDb } from '@/lib/firebaseAdmin';
import { isValidFirestoreId } from '@/lib/validation';
import { verifyAuthToken, isGroupOwner } from '@/lib/auth';
import { logger, generateRequestId } from '@/lib/logger';

interface RouteContext {
    params: Promise<{ id: string }>;
}

interface TransferOwnershipRequest {
    newOwnerId: string;
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
        const body: TransferOwnershipRequest = await request.json();
        const { newOwnerId } = body;

        // Validate input
        if (!isValidFirestoreId(groupId)) {
            return errorResponse('Invalid group ID', ErrorCodes.BAD_REQUEST);
        }
        if (!isValidFirestoreId(newOwnerId)) {
            return errorResponse('Invalid new owner ID', ErrorCodes.BAD_REQUEST);
        }

        // Only current owner can transfer ownership
        const callerIsOwner = await isGroupOwner(groupId, authResult.uid);
        if (!callerIsOwner) {
            return errorResponse('Only the current owner can transfer ownership', ErrorCodes.FORBIDDEN);
        }

        // Fetch the group document
        const groupRef = adminDb.collection('groups').doc(groupId);
        const groupSnap = await groupRef.get();

        if (!groupSnap.exists) {
            return errorResponse('Group not found', ErrorCodes.NOT_FOUND);
        }

        const groupData = groupSnap.data()!;
        const currentOwnerId = groupData.createdBy;
        const memberIds: string[] = groupData.memberIds || [];

        // Cannot transfer to yourself
        if (newOwnerId === currentOwnerId) {
            return errorResponse('New owner must be different from current owner', ErrorCodes.BAD_REQUEST);
        }

        // New owner must be a member of the group
        if (!memberIds.includes(newOwnerId)) {
            return errorResponse('New owner must be a member of the group', ErrorCodes.BAD_REQUEST);
        }

        // Transfer ownership
        await groupRef.update({
            createdBy: newOwnerId,
        });

        logger.audit('GROUP_OWNERSHIP_TRANSFERRED', {
            requestId,
            groupId,
            previousOwnerId: currentOwnerId,
            newOwnerId,
            transferredBy: authResult.uid,
            action: 'ownership_transferred',
        });

        return successResponse({
            message: 'Ownership transferred successfully',
            newOwnerId,
        });

    } catch (error: unknown) {
        logger.error('Error transferring ownership', error, { requestId });
        const message = error instanceof Error ? error.message : 'Failed to transfer ownership';
        return errorResponse(message, ErrorCodes.INTERNAL_ERROR);
    }
}
