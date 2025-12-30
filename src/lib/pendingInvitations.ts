/**
 * Pending Invitations Library
 * 
 * Handles creation, retrieval, and management of pending group invitations.
 */

import {
    doc,
    collection,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where,
    serverTimestamp,
    Timestamp,
    arrayUnion
} from 'firebase/firestore';
import { db } from './firebase';
import { logger } from './logger';
import { randomBytes } from 'crypto';

// Invitation expires after 7 days
const INVITATION_EXPIRY_DAYS = 7;

export interface PendingInvitation {
    id: string;
    groupId: string;
    groupName: string;
    inviterUid: string;
    inviterName: string;
    inviteeUid?: string;      // Set for registered users
    inviteeEmail: string;      // Always set
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    token: string;
    createdAt: Timestamp;
    expiresAt: Timestamp;
}

export interface CreateInvitationParams {
    groupId: string;
    groupName: string;
    inviterUid: string;
    inviterName: string;
    inviteeEmail: string;
    inviteeUid?: string;
}

/**
 * Generates a secure random token for invitation links
 */
function generateInvitationToken(): string {
    return randomBytes(32).toString('hex');
}

/**
 * Creates a new pending invitation
 */
export async function createPendingInvitation(
    params: CreateInvitationParams
): Promise<{ success: boolean; token?: string; error?: string; existingInvitation?: boolean }> {
    try {
        // Check for existing pending invitation for the same group and email
        const existingQuery = query(
            collection(db, 'pendingInvitations'),
            where('groupId', '==', params.groupId),
            where('inviteeEmail', '==', params.inviteeEmail),
            where('status', '==', 'pending')
        );

        const existingSnap = await getDocs(existingQuery);
        if (!existingSnap.empty) {
            return {
                success: false,
                error: 'An invitation is already pending for this user',
                existingInvitation: true
            };
        }

        const token = generateInvitationToken();
        const now = Timestamp.now();
        const expiresAt = Timestamp.fromDate(
            new Date(now.toDate().getTime() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
        );

        const invitationData = {
            groupId: params.groupId,
            groupName: params.groupName,
            inviterUid: params.inviterUid,
            inviterName: params.inviterName,
            inviteeEmail: params.inviteeEmail,
            ...(params.inviteeUid && { inviteeUid: params.inviteeUid }),
            status: 'pending' as const,
            token,
            createdAt: serverTimestamp(),
            expiresAt,
        };

        await addDoc(collection(db, 'pendingInvitations'), invitationData);

        logger.info('Pending invitation created', {
            groupId: params.groupId,
            inviteeEmail: params.inviteeEmail,
        });

        return { success: true, token };
    } catch (error) {
        logger.error('Error creating pending invitation', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create invitation'
        };
    }
}

/**
 * Get a pending invitation by its token
 */
export async function getInvitationByToken(
    token: string
): Promise<PendingInvitation | null> {
    try {
        const invitationsQuery = query(
            collection(db, 'pendingInvitations'),
            where('token', '==', token)
        );

        const snapshot = await getDocs(invitationsQuery);

        if (snapshot.empty) {
            return null;
        }

        const doc = snapshot.docs[0];
        return {
            id: doc.id,
            ...doc.data()
        } as PendingInvitation;
    } catch (error) {
        logger.error('Error getting invitation by token', error);
        return null;
    }
}

/**
 * Get pending invitations for a user by their UID
 */
export async function getPendingInvitationsForUser(
    uid: string
): Promise<PendingInvitation[]> {
    try {
        const invitationsQuery = query(
            collection(db, 'pendingInvitations'),
            where('inviteeUid', '==', uid),
            where('status', '==', 'pending')
        );

        const snapshot = await getDocs(invitationsQuery);
        const now = Timestamp.now();

        return snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            } as PendingInvitation))
            .filter(inv => inv.expiresAt.toMillis() > now.toMillis());
    } catch (error) {
        logger.error('Error getting pending invitations for user', error);
        return [];
    }
}

/**
 * Get pending invitations for a user by their email
 * Used for non-registered users who just signed up
 */
export async function getPendingInvitationsForEmail(
    email: string
): Promise<PendingInvitation[]> {
    try {
        const invitationsQuery = query(
            collection(db, 'pendingInvitations'),
            where('inviteeEmail', '==', email.toLowerCase()),
            where('status', '==', 'pending')
        );

        const snapshot = await getDocs(invitationsQuery);
        const now = Timestamp.now();

        return snapshot.docs
            .map(doc => ({
                id: doc.id,
                ...doc.data()
            } as PendingInvitation))
            .filter(inv => inv.expiresAt.toMillis() > now.toMillis());
    } catch (error) {
        logger.error('Error getting pending invitations for email', error);
        return [];
    }
}

/**
 * Accept a pending invitation
 */
export async function acceptInvitation(
    token: string,
    acceptingUserId: string
): Promise<{ success: boolean; error?: string; groupId?: string; groupName?: string }> {
    try {
        const invitation = await getInvitationByToken(token);

        if (!invitation) {
            return { success: false, error: 'Invitation not found' };
        }

        if (invitation.status !== 'pending') {
            return { success: false, error: `Invitation has already been ${invitation.status}` };
        }

        // Check if expired
        const now = Timestamp.now();
        if (invitation.expiresAt.toMillis() < now.toMillis()) {
            // Update status to expired
            await updateDoc(doc(db, 'pendingInvitations', invitation.id), {
                status: 'expired'
            });
            return { success: false, error: 'Invitation has expired' };
        }

        // Add user to group
        const groupRef = doc(db, 'groups', invitation.groupId);
        const groupSnap = await getDoc(groupRef);

        if (!groupSnap.exists()) {
            return { success: false, error: 'Group no longer exists' };
        }

        // Check if already a member
        const groupData = groupSnap.data();
        if (groupData.memberIds?.includes(acceptingUserId)) {
            // Update invitation status and return success
            await updateDoc(doc(db, 'pendingInvitations', invitation.id), {
                status: 'accepted'
            });
            return {
                success: true,
                groupId: invitation.groupId,
                groupName: invitation.groupName
            };
        }

        // Add to group members
        await updateDoc(groupRef, {
            memberIds: arrayUnion(acceptingUserId)
        });

        // Update invitation status
        await updateDoc(doc(db, 'pendingInvitations', invitation.id), {
            status: 'accepted',
            inviteeUid: acceptingUserId  // Update in case it wasn't set
        });

        logger.audit('INVITATION_ACCEPTED', {
            invitationId: invitation.id,
            groupId: invitation.groupId,
            acceptedBy: acceptingUserId
        });

        return {
            success: true,
            groupId: invitation.groupId,
            groupName: invitation.groupName
        };
    } catch (error) {
        logger.error('Error accepting invitation', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to accept invitation'
        };
    }
}

/**
 * Decline a pending invitation
 */
export async function declineInvitation(
    token: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const invitation = await getInvitationByToken(token);

        if (!invitation) {
            return { success: false, error: 'Invitation not found' };
        }

        if (invitation.status !== 'pending') {
            return { success: false, error: `Invitation has already been ${invitation.status}` };
        }

        // Update invitation status
        await updateDoc(doc(db, 'pendingInvitations', invitation.id), {
            status: 'declined'
        });

        logger.info('Invitation declined', {
            invitationId: invitation.id,
            groupId: invitation.groupId
        });

        return { success: true };
    } catch (error) {
        logger.error('Error declining invitation', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to decline invitation'
        };
    }
}

/**
 * Link pending invitations to a newly registered user
 * Called after signup when we have the user's UID
 */
export async function linkInvitationsToUser(
    email: string,
    userId: string
): Promise<number> {
    try {
        const invitations = await getPendingInvitationsForEmail(email);

        let linkedCount = 0;
        for (const invitation of invitations) {
            if (!invitation.inviteeUid) {
                await updateDoc(doc(db, 'pendingInvitations', invitation.id), {
                    inviteeUid: userId
                });
                linkedCount++;
            }
        }

        if (linkedCount > 0) {
            logger.info('Linked pending invitations to user', {
                email,
                userId,
                count: linkedCount
            });
        }

        return linkedCount;
    } catch (error) {
        logger.error('Error linking invitations to user', error);
        return 0;
    }
}
