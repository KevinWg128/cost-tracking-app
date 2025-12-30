/**
 * Authentication utilities for API routes
 * Provides token verification and group membership checks
 */

import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from './firebaseAdmin';

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
        console.error('Token verification failed:', error);
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
        console.error('Error checking group membership:', error);
        return false;
    }
}
