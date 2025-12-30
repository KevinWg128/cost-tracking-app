"use server";

import { Resend } from 'resend';
import { isValidEmail } from './validation';
import { logger } from './logger';

const resend = new Resend(process.env.RESEND_API_KEY);
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * Send signup invitation email to non-registered users
 * Includes a signup link with the invitation token
 */
export async function sendInviteEmail(
    recipientEmail: string,
    inviterName: string,
    groupName: string,
    invitationToken: string
) {
    // Validate email format
    if (!isValidEmail(recipientEmail)) {
        return { success: false, error: 'Invalid email address format' };
    }

    try {
        const signupUrl = `${baseUrl}/signup?email=${encodeURIComponent(recipientEmail)}&invitation=${invitationToken}`;

        const { data, error } = await resend.emails.send({
            from: 'Cost Tracker <onboarding@kw-in-toronto.com>',
            to: recipientEmail,
            subject: `${inviterName} invited you to join "${groupName}" on Cost Tracker`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
                    <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <h1 style="color: #2563eb; margin-bottom: 24px; font-size: 28px;">You're invited! 🎉</h1>
                        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                            <strong>${inviterName}</strong> has invited you to join the expense group 
                            <strong>"${groupName}"</strong> on Cost Tracker.
                        </p>
                        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                            Cost Tracker helps you split expenses with friends and keep track of who owes what.
                        </p>
                        <div style="margin-top: 32px; text-align: center;">
                            <a href="${signupUrl}" 
                               style="display: inline-block; background-color: #2563eb; color: white; 
                                      padding: 16px 32px; border-radius: 8px; text-decoration: none; 
                                      font-weight: 600; font-size: 16px;">
                                Sign Up & Join Group
                            </a>
                        </div>
                        <p style="font-size: 14px; color: #6b7280; margin-top: 32px; text-align: center;">
                            Already have an account? <a href="${baseUrl}/signin" style="color: #2563eb;">Sign in</a> to view your pending invitations.
                        </p>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                        <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                            This invitation will expire in 7 days.
                        </p>
                    </div>
                </div>
            `,
        });

        if (error) {
            logger.error('Error sending invite email', error, { recipientEmail, groupName });
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error sending invite email', error, { recipientEmail, groupName });
        return { success: false, error: errorMessage };
    }
}

/**
 * Send invitation email to registered users
 * Includes accept/decline buttons
 */
export async function sendRegisteredUserInviteEmail(
    recipientEmail: string,
    inviterName: string,
    groupName: string,
    invitationToken: string
) {
    // Validate email format
    if (!isValidEmail(recipientEmail)) {
        return { success: false, error: 'Invalid email address format' };
    }

    try {
        const acceptUrl = `${baseUrl}/invitations/accept?token=${invitationToken}`;
        const declineUrl = `${baseUrl}/invitations/decline?token=${invitationToken}`;

        const { data, error } = await resend.emails.send({
            from: 'Cost Tracker <onboarding@kw-in-toronto.com>',
            to: recipientEmail,
            subject: `${inviterName} invited you to join "${groupName}" on Cost Tracker`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
                    <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <h1 style="color: #2563eb; margin-bottom: 24px; font-size: 28px;">You're invited! 🎉</h1>
                        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                            <strong>${inviterName}</strong> has invited you to join the expense group 
                            <strong>"${groupName}"</strong> on Cost Tracker.
                        </p>
                        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                            Would you like to join this group?
                        </p>
                        <div style="margin-top: 32px; text-align: center;">
                            <a href="${acceptUrl}" 
                               style="display: inline-block; background-color: #16a34a; color: white; 
                                      padding: 14px 28px; border-radius: 8px; text-decoration: none; 
                                      font-weight: 600; font-size: 16px; margin-right: 12px;">
                                ✓ Accept Invitation
                            </a>
                            <a href="${declineUrl}" 
                               style="display: inline-block; background-color: #dc2626; color: white; 
                                      padding: 14px 28px; border-radius: 8px; text-decoration: none; 
                                      font-weight: 600; font-size: 16px;">
                                ✕ Decline
                            </a>
                        </div>
                        <p style="font-size: 14px; color: #6b7280; margin-top: 32px; text-align: center;">
                            You can also manage your invitations from your <a href="${baseUrl}/dashboard" style="color: #2563eb;">dashboard</a>.
                        </p>
                        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                        <p style="font-size: 12px; color: #9ca3af; text-align: center;">
                            This invitation will expire in 7 days.
                        </p>
                    </div>
                </div>
            `,
        });

        if (error) {
            logger.error('Error sending registered user invite email', error, { recipientEmail, groupName });
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error sending registered user invite email', error, { recipientEmail, groupName });
        return { success: false, error: errorMessage };
    }
}
