import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface UserProfile {
    email: string;
    firstName: string;
    lastName: string;
    photoURL?: string;
    createdAt?: ReturnType<typeof serverTimestamp>;
    updatedAt?: ReturnType<typeof serverTimestamp>;
}

/**
 * Fetches a user profile from the Firestore 'users' collection.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
    }
    return null;
}

/**
 * Updates a user profile's firstName and lastName in Firestore.
 */
export async function updateUserProfile(
    userId: string,
    data: {
        firstName: string;
        lastName: string;
    }
): Promise<void> {
    const userRef = doc(db, 'users', userId);

    await setDoc(
        userRef,
        {
            firstName: data.firstName,
            lastName: data.lastName,
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
}

/**
 * Creates or updates a user profile in the Firestore 'users' collection.
 * Uses merge: true to avoid overwriting existing data on subsequent sign-ins.
 */
export async function createUserProfile(
    userId: string,
    data: {
        email: string;
        firstName: string;
        lastName: string;
        photoURL?: string;
    }
): Promise<void> {
    const userRef = doc(db, 'users', userId);

    await setDoc(
        userRef,
        {
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            ...(data.photoURL && { photoURL: data.photoURL }),
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );

    // Set createdAt only if it doesn't exist (first time creation)
    await setDoc(
        userRef,
        {
            createdAt: serverTimestamp(),
        },
        { merge: true }
    );
}

