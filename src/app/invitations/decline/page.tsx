'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { X, Loader2, AlertCircle, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function DeclineInvitationPage() {
    const { currentUser, loading: authLoading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'confirming' | 'loading' | 'success' | 'error' | 'unauthenticated'>('confirming');
    const [message, setMessage] = useState('');

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
    }, [currentUser, authLoading, token]);

    const declineInvitation = async () => {
        if (!currentUser || !token) return;

        setStatus('loading');

        try {
            const idToken = await currentUser.getIdToken();
            const response = await fetch(`/api/invitations/${token}/decline`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();

            if (result.success) {
                setStatus('success');
                setMessage('The invitation has been declined.');
            } else {
                setStatus('error');
                setMessage(result.error || 'Failed to decline invitation');
            }
        } catch {
            setStatus('error');
            setMessage('An unexpected error occurred. Please try again.');
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-600 mb-4" size={48} />
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Loading...</h1>
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
                        Please sign in to decline this invitation.
                    </p>
                    <Link
                        href={`/signin?redirect=${encodeURIComponent(`/invitations/decline?token=${token}`)}`}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        <LogIn size={20} />
                        Sign In
                    </Link>
                </div>
            </div>
        );
    }

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
                    <Loader2 className="animate-spin mx-auto text-gray-600 mb-4" size={48} />
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Declining Invitation...</h1>
                    <p className="text-gray-600">Please wait while we process your request.</p>
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
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Something Went Wrong</h1>
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

    if (status === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X className="text-gray-600" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Invitation Declined</h1>
                    <p className="text-gray-600 mb-6">{message}</p>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    // Confirming state
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="text-amber-600" size={32} />
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Decline Invitation?</h1>
                <p className="text-gray-600 mb-6">
                    Are you sure you want to decline this invitation? You can always ask to be invited again later.
                </p>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={declineInvitation}
                        className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                        Yes, Decline
                    </button>
                    <Link
                        href="/dashboard"
                        className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                        Cancel
                    </Link>
                </div>
            </div>
        </div>
    );
}
