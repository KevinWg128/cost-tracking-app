/**
 * API route handler for sending group invitations
 * POST /api/groups/[id]/invite
 * Requires: Authentication + Caller must be a group member
 * 
 * Creates a pending invitation and sends an email to the invitee.
 * For registered users: Email contains accept/decline links
 * For non-registered users: Email contains signup link with invitation token
 */

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, ErrorCodes } from '@/lib/apiResponse';
import { adminDb } from '@/lib/firebaseAdmin';
import { sendInviteEmail, sendRegisteredUserInviteEmail } from '@/lib/resend';
import { getUserProfileAdmin } from '@/lib/userProfileAdmin';
import { createPendingInvitation } from '@/lib/pendingInvitations';
import { isValidEmail, isValidFirestoreId } from '@/lib/validation';
import { verifyAuthToken, isGroupMember } from '@/lib/auth';
import { logger, generateRequestId } from '@/lib/logger';

interface InviteRequest {
    email: string;
}

interface RouteContext {
    params: Promise<{ id: string }>;
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
        const body: InviteRequest = await request.json();
        const { email } = body;
        const normalizedEmail = email.toLowerCase().trim();

        // Validate inputs
        if (!isValidEmail(normalizedEmail)) {
            return errorResponse('Invalid email format', ErrorCodes.BAD_REQUEST);
        }
        if (!isValidFirestoreId(groupId)) {
            return errorResponse('Invalid group ID', ErrorCodes.BAD_REQUEST);
        }

        // Verify caller is a member of the group
        const callerIsMember = await isGroupMember(groupId, authResult.uid);
        if (!callerIsMember) {
            return errorResponse('You must be a member of this group to send invites', ErrorCodes.FORBIDDEN);
        }

        // Get inviter's name from their profile (using authenticated user's UID)
        // Use Admin version to bypass rules
        const inviterProfile = await getUserProfileAdmin(authResult.uid);
        const inviterName = inviterProfile
            ? `${inviterProfile.firstName} ${inviterProfile.lastName}`.trim() || 'A friend'
            : 'A friend';

        // Get group name using Admin SDK
        const groupSnap = await adminDb.collection('groups').doc(groupId).get();

        if (!groupSnap.exists) {
            return errorResponse('Group not found', ErrorCodes.NOT_FOUND);
        }

        const groupData = groupSnap.data();
        const groupName = groupData?.name || 'an expense group';

        // Check if user is already a member
        if (groupData?.memberIds?.includes(authResult.uid)) {
            // Check if the email being invited is the caller themselves
            const callerProfile = await getUserProfileAdmin(authResult.uid);
            if (callerProfile?.email?.toLowerCase() === normalizedEmail) {
                return errorResponse('You cannot invite yourself', ErrorCodes.BAD_REQUEST);
            }
        }

        // Check if user already exists in the system
        const userQuerySnap = await adminDb.collection('users')
            .where('email', '==', normalizedEmail)
            .get();

        let inviteeUid: string | undefined;
        let isRegisteredUser = false;

        if (!userQuerySnap.empty) {
            const existingUser = userQuerySnap.docs[0];
            inviteeUid = existingUser.id;
            isRegisteredUser = true;

            // Check if user is already a member of the group
            if (groupData?.memberIds?.includes(inviteeUid)) {
                return errorResponse('User is already a member of this group', ErrorCodes.BAD_REQUEST);
            }
        }

        // Create pending invitation
        const invitationResult = await createPendingInvitation({
            groupId,
            groupName,
            inviterUid: authResult.uid,
            inviterName,
            inviteeEmail: normalizedEmail,
            inviteeUid,
        });

        if (!invitationResult.success) {
            if (invitationResult.existingInvitation) {
                return errorResponse('An invitation is already pending for this user', ErrorCodes.BAD_REQUEST);
            }
            return errorResponse(invitationResult.error || 'Failed to create invitation', ErrorCodes.INTERNAL_ERROR);
        }

        // Send the appropriate email
        let emailResult;
        if (isRegisteredUser) {
            // Send email with accept/decline links
            emailResult = await sendRegisteredUserInviteEmail(
                normalizedEmail,
                inviterName,
                groupName,
                invitationResult.token!
            );
        } else {
            // Send signup invitation email
            emailResult = await sendInviteEmail(
                normalizedEmail,
                inviterName,
                groupName,
                invitationResult.token!
            );
        }

        if (!emailResult.success) {
            logger.warn('Failed to send invitation email', {
                requestId,
                groupId,
                email: normalizedEmail,
                error: emailResult.error
            });
            // Note: Invitation is still created, email just failed
            return successResponse({
                message: 'Invitation created but email could not be sent. The user can still accept via their dashboard.',
                emailSent: false
            });
        }

        logger.info('Invitation sent successfully', {
            requestId,
            groupId,
            email: normalizedEmail,
            invitedBy: authResult.uid,
            isRegisteredUser,
        });

        return successResponse({
            message: isRegisteredUser
                ? 'Invitation sent! The user will need to accept it to join the group.'
                : 'Invitation sent! Once they sign up, they can accept the invitation.',
            emailSent: true,
            isRegisteredUser
        });

    } catch (error: unknown) {
        logger.error('Error sending invitation', error, { requestId });
        const message = error instanceof Error ? error.message : 'Failed to send invitation';
        return errorResponse(message, ErrorCodes.INTERNAL_ERROR);
    }
}

