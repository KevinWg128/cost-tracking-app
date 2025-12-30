/**
 * Authentication utilities for API routes
 * Provides token verification and group membership checks
 */

import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from './firebaseAdmin';
import { logger } from './logger';

interface AuthResult {
    uid: string;
    email?: string;
}

/**
 * Verify Firebase ID token from Authorization header
 * @param request - Next.js request object
 * @returns User info on success, null on failure
 */
export async function verifyAuthToken(request: NextRequest): Promise<AuthResult | null> {
    try {
        const authHeader = request.headers.get('Authorization');

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }

        const token = authHeader.split('Bearer ')[1];

        if (!token) {
            return null;
        }

        const decodedToken = await adminAuth.verifyIdToken(token);

        return {
            uid: decodedToken.uid,
            email: decodedToken.email,
        };
    } catch (error) {
        logger.error('Token verification failed', error);
        return null;
    }
}

/**
 * Check if a user is a member of a group
 * @param groupId - The group ID to check
 * @param userId - The user ID to check membership for
 * @returns true if user is a member, false otherwise
 */
export async function isGroupMember(groupId: string, userId: string): Promise<boolean> {
    try {
        const groupDoc = await adminDb.collection('groups').doc(groupId).get();

        if (!groupDoc.exists) {
            return false;
        }

        const groupData = groupDoc.data();
        const memberIds = groupData?.memberIds || [];

        return memberIds.includes(userId);
    } catch (error) {
        logger.error('Error checking group membership', error, { groupId, userId });
        return false;
    }
}

/**
 * Check if a user is the owner of a group
 * @param groupId - The group ID to check
 * @param userId - The user ID to check ownership for
 * @returns true if user is the owner, false otherwise
 */
export async function isGroupOwner(groupId: string, userId: string): Promise<boolean> {
    try {
        const groupDoc = await adminDb.collection('groups').doc(groupId).get();

        if (!groupDoc.exists) {
            return false;
        }

        const groupData = groupDoc.data();
        return groupData?.createdBy === userId;
    } catch (error) {
        logger.error('Error checking group ownership', error, { groupId, userId });
        return false;
    }
}

/**
 * Check if a user is an admin of a group
 * @param groupId - The group ID to check
 * @param userId - The user ID to check admin status for
 * @returns true if user is an admin, false otherwise
 */
export async function isGroupAdmin(groupId: string, userId: string): Promise<boolean> {
    try {
        const groupDoc = await adminDb.collection('groups').doc(groupId).get();

        if (!groupDoc.exists) {
            return false;
        }

        const groupData = groupDoc.data();
        const adminIds = groupData?.adminIds || [];

        return adminIds.includes(userId);
    } catch (error) {
        logger.error('Error checking admin status', error, { groupId, userId });
        return false;
    }
}

/**
 * Check if a user can manage members of a group (is owner or admin)
 * @param groupId - The group ID to check
 * @param userId - The user ID to check management permissions for
 * @returns true if user can manage members, false otherwise
 */
export async function canManageMembers(groupId: string, userId: string): Promise<boolean> {
    try {
        const groupDoc = await adminDb.collection('groups').doc(groupId).get();

        if (!groupDoc.exists) {
            return false;
        }

        const groupData = groupDoc.data();
        const isOwner = groupData?.createdBy === userId;
        const adminIds = groupData?.adminIds || [];
        const isAdmin = adminIds.includes(userId);

        return isOwner || isAdmin;
    } catch (error) {
        logger.error('Error checking management permissions', error, { groupId, userId });
        return false;
    }
}
