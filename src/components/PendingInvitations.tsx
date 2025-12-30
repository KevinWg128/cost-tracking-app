'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Check, X, Loader2, Clock, Users } from 'lucide-react';

interface PendingInvitationItem {
    id: string;
    groupId: string;
    groupName: string;
    inviterName: string;
    createdAt: string;
    expiresAt: string;
    token: string;
}

interface PendingInvitationsProps {
    onInvitationAccepted?: (groupId: string) => void;
}

export default function PendingInvitations({ onInvitationAccepted }: PendingInvitationsProps) {
    const { currentUser } = useAuth();
    const [invitations, setInvitations] = useState<PendingInvitationItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        if (currentUser) {
            fetchInvitations();
        }
    }, [currentUser]);

    const fetchInvitations = async () => {
        if (!currentUser) return;

        try {
            const token = await currentUser.getIdToken();
            const response = await fetch('/api/invitations', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const result = await response.json();
            if (result.success) {
                setInvitations(result.invitations || []);
            }
        } catch (error) {
            console.error('Error fetching invitations:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (invitation: PendingInvitationItem) => {
        if (!currentUser) return;

        setProcessingId(invitation.id);

        try {
            const token = await currentUser.getIdToken();
            const response = await fetch(`/api/invitations/${invitation.token}/accept`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            if (result.success) {
                // Remove from list with animation
                setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
                onInvitationAccepted?.(invitation.groupId);
            }
        } catch (error) {
            console.error('Error accepting invitation:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const handleDecline = async (invitation: PendingInvitationItem) => {
        if (!currentUser) return;

        setProcessingId(invitation.id);

        try {
            const token = await currentUser.getIdToken();
            const response = await fetch(`/api/invitations/${invitation.token}/decline`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            if (result.success) {
                // Remove from list with animation
                setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
            }
        } catch (error) {
            console.error('Error declining invitation:', error);
        } finally {
            setProcessingId(null);
        }
    };

    const getTimeRemaining = (expiresAt: string): string => {
        const now = new Date();
        const expires = new Date(expiresAt);
        const diff = expires.getTime() - now.getTime();

        if (diff <= 0) return 'Expired';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} left`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} left`;
        return 'Expires soon';
    };

    if (loading) {
        return null; // Don't show loading state for this component
    }

    if (invitations.length === 0) {
        return null; // Don't render anything if no invitations
    }

    return (
        <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
                <Mail className="text-blue-600" size={24} />
                <h2 className="text-xl font-bold text-gray-800">Pending Invitations</h2>
                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {invitations.length}
                </span>
            </div>

            <div className="space-y-3">
                {invitations.map((invitation) => (
                    <div
                        key={invitation.id}
                        className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm transition-all duration-300 hover:shadow-md"
                    >
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                                    <Users className="text-blue-600" size={20} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-semibold text-gray-800 truncate">
                                        {invitation.groupName}
                                    </h3>
                                    <p className="text-sm text-gray-600 truncate">
                                        Invited by <span className="font-medium">{invitation.inviterName}</span>
                                    </p>
                                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                        <Clock size={12} />
                                        <span>{getTimeRemaining(invitation.expiresAt)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {processingId === invitation.id ? (
                                    <Loader2 className="animate-spin text-gray-400" size={24} />
                                ) : (
                                    <>
                                        <button
                                            onClick={() => handleAccept(invitation)}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
                                        >
                                            <Check size={16} />
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => handleDecline(invitation)}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                                        >
                                            <X size={16} />
                                            Decline
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
