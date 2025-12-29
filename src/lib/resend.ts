"use server";

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send signup invitation email
 */
export async function sendInviteEmail(
    recipientEmail: string,
    inviterName: string,
    groupName: string
) {
    try {
        const signupUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/signup?email=${encodeURIComponent(recipientEmail)}`;

        const { data, error } = await resend.emails.send({
            from: 'Cost Tracker <onboarding@kw-in-toronto.com>',
            to: recipientEmail,
            subject: `${inviterName} invited you to join "${groupName}" on Cost Tracker`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #2563eb; margin-bottom: 24px;">You're invited!</h1>
                    <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                        <strong>${inviterName}</strong> has invited you to join the expense group 
                        <strong>"${groupName}"</strong> on Cost Tracker.
                    </p>
                    <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                        Cost Tracker helps you split expenses with friends and keep track of who owes what.
                    </p>
                    <a href="${signupUrl}" 
                       style="display: inline-block; background-color: #2563eb; color: white; 
                              padding: 14px 28px; border-radius: 8px; text-decoration: none; 
                              font-weight: 600; margin-top: 20px;">
                        Sign Up Now
                    </a>
                    <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
                        Already have an account? Just sign in and ask ${inviterName} to add you to the group.
                    </p>
                </div>
            `,
        });

        if (error) {
            console.error("Error sending invite email:", error);
            return { success: false, error: error.message };
        }

        return { success: true, data };
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error("Error sending invite email:", error);
        return { success: false, error: errorMessage };
    }
}
