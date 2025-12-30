'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Check, Loader2, AlertCircle, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function AcceptInvitationPage() {
    const { currentUser, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'unauthenticated'>('loading');
    const [message, setMessage] = useState('');
    const [groupId, setGroupId] = useState<string | null>(null);
    const [groupName, setGroupName] = useState<string | null>(null);

    useEffect(() => {
        if (authLoading) return;

        if (!currentUser) {
            setStatus('unauthenticated');
            return;
        }

        if (!token) {
            setStatus('error');
            setMessage('Invalid invitation link. Please check your email for the correct link.');
            return;
        }

        acceptInvitation();
    }, [currentUser, authLoading, token]);

    const acceptInvitation = async () => {
        if (!currentUser || !token) return;

        try {
            const idToken = await currentUser.getIdToken();
            const response = await fetch(`/api/invitations/${token}/accept`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                setStatus('success');
                setMessage(result.message);
                setGroupId(result.groupId);
                setGroupName(result.groupName);
            } else {
                setStatus('error');
                setMessage(result.error || 'Failed to accept invitation');
            }
        } catch {
            setStatus('error');
            setMessage('An unexpected error occurred. Please try again.');
        }
    };

    if (authLoading || (status === 'loading' && currentUser)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-600 mb-4" size={48} />
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Accepting Invitation...</h1>
                    <p className="text-gray-600">Please wait while we process your request.</p>
                </div>
            </div>
        );
    }

    if (status === 'unauthenticated') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
                    <LogIn className="mx-auto text-blue-600 mb-4" size={48} />
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Sign In Required</h1>
                    <p className="text-gray-600 mb-6">
                        Please sign in to accept this invitation.
                    </p>
                    <Link
                        href={`/signin?redirect=${encodeURIComponent(`/invitations/accept?token=${token}`)}`}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        <LogIn size={20} />
                        Sign In
                    </Link>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="text-red-600" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Unable to Accept Invitation</h1>
                    <p className="text-gray-600 mb-6">{message}</p>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                    >
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="text-green-600" size={32} />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome to the Group! 🎉</h1>
                <p className="text-gray-600 mb-6">
                    {message || `You have successfully joined "${groupName}"`}
                </p>
                <Link
                    href={groupId ? `/groups/${groupId}` : '/dashboard'}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                    {groupId ? 'View Group' : 'Go to Dashboard'}
                </Link>
            </div>
        </div>
    );
}
