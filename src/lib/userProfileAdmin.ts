import { adminDb } from './firebaseAdmin';
import { UserProfile } from './userProfile';

/**
 * Fetches a user profile from the Firestore 'users' collection using Admin SDK.
 * This bypasses Firestore security rules, suitable for server-side API routes.
 */
export async function getUserProfileAdmin(userId: string): Promise<UserProfile | null> {
    try {
        const userDoc = await adminDb.collection('users').doc(userId).get();

        if (userDoc.exists) {
            return userDoc.data() as UserProfile;
        }
        return null;
    } catch (error) {
        console.error('Error fetching user profile (admin):', error);
        return null;
    }
}
