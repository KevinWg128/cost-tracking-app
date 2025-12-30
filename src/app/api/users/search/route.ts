/**
 * API route handler for searching users by email
 * GET /api/users/search?email=...
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/apiResponse';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { isValidEmail } from '@/lib/validation';
import { logger } from '@/lib/logger';

export interface SearchUserResult {
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');

        // Validate email parameter
        if (!email) {
            return errorResponse('Email parameter is required', ErrorCodes.BAD_REQUEST);
        }

        if (!isValidEmail(email)) {
            return errorResponse('Invalid email format', ErrorCodes.BAD_REQUEST);
        }

        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return successResponse({ user: null });
        }

        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        const user: SearchUserResult = {
            uid: userDoc.id,
            email: userData.email,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
        };

        return successResponse({ user });

    } catch (error: unknown) {
        logger.error('Error searching user', error);
        const message = error instanceof Error ? error.message : 'Search failed';
        return errorResponse(message, ErrorCodes.INTERNAL_ERROR);
    }
}
