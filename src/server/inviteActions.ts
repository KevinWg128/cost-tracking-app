"use server";

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { sendInviteEmail } from '@/lib/resend';
import { getUserProfile } from '@/lib/userProfile';
import { isValidEmail, isValidFirestoreId } from '@/lib/validation';

export interface SearchUserResult {
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
}

/**
 * Search for a user by email
 */
export async function searchUserByEmail(email: string): Promise<{
    success: boolean;
    user?: SearchUserResult;
    error?: string;
}> {
    // Validate email format
    if (!isValidEmail(email)) {
        return { success: false, error: 'Invalid email format' };
    }

    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: true, user: undefined };
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        return {
            success: true,
            user: {
                uid: userDoc.id,
                email: userData.email,
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
            }
        };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error("Error searching user:", error);
        return { success: false, error: errorMessage };
    }
}

/**
 * Add a member to a group
 */
export async function addMemberToGroup(
    groupId: string,
    userId: string
): Promise<{ success: boolean; error?: string }> {
    // Validate Firestore IDs
    if (!isValidFirestoreId(groupId)) {
        return { success: false, error: 'Invalid group ID' };
    }
    if (!isValidFirestoreId(userId)) {
        return { success: false, error: 'Invalid user ID' };
    }

    try {
        const groupRef = doc(db, 'groups', groupId);

        // Check if user is already a member
        const groupSnap = await getDoc(groupRef);
        if (!groupSnap.exists()) {
            return { success: false, error: 'Group not found' };
        }

        const groupData = groupSnap.data();
        if (groupData.memberIds?.includes(userId)) {
            return { success: false, error: 'User is already a member of this group' };
        }

        await updateDoc(groupRef, {
            memberIds: arrayUnion(userId)
        });

        return { success: true };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error("Error adding member:", error);
        return { success: false, error: errorMessage };
    }
}

/**
 * Send invitation email to non-registered user
 */
export async function sendGroupInvitation(
    email: string,
    inviterUserId: string,
    groupId: string
): Promise<{ success: boolean; error?: string }> {
    // Validate inputs
    if (!isValidEmail(email)) {
        return { success: false, error: 'Invalid email format' };
    }
    if (!isValidFirestoreId(inviterUserId)) {
        return { success: false, error: 'Invalid inviter user ID' };
    }
    if (!isValidFirestoreId(groupId)) {
        return { success: false, error: 'Invalid group ID' };
    }

    try {
        // Get inviter's name
        const inviterProfile = await getUserProfile(inviterUserId);
        const inviterName = inviterProfile
            ? `${inviterProfile.firstName} ${inviterProfile.lastName}`.trim() || 'A friend'
            : 'A friend';

        // Get group name
        const groupRef = doc(db, 'groups', groupId);
        const groupSnap = await getDoc(groupRef);

        if (!groupSnap.exists()) {
            return { success: false, error: 'Group not found' };
        }

        const groupName = groupSnap.data().name || 'an expense group';

        // Send the email
        const result = await sendInviteEmail(email, inviterName, groupName);

        return result;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error("Error sending invitation:", error);
        return { success: false, error: errorMessage };
    }
}
