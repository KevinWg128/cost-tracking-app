"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { searchUserByEmail, addMemberToGroup, sendGroupInvitation, SearchUserResult } from '@/server/inviteActions';
import { UserPlus, Search, Mail, Check, X, Loader2 } from 'lucide-react';

interface InviteMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    onMemberAdded: () => void;
}

export default function InviteMemberModal({ isOpen, onClose, groupId, onMemberAdded }: InviteMemberModalProps) {
    const { currentUser } = useAuth();
    const [email, setEmail] = useState('');
    const [searchResult, setSearchResult] = useState<SearchUserResult | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;

        setLoading(true);
        setSearchResult(null);
        setNotFound(false);
        setMessage(null);

        try {
            const result = await searchUserByEmail(email);
            if (result.success) {
                if (result.user) {
                    setSearchResult(result.user);
                } else {
                    setNotFound(true);
                }
            } else {
                setMessage({ type: 'error', text: result.error || 'Error searching for user' });
            }
        } catch {
            setMessage({ type: 'error', text: 'An unexpected error occurred' });
        } finally {
            setLoading(false);
        }
    };

    const handleAddMember = async () => {
        if (!searchResult) return;

        setActionLoading(true);
        setMessage(null);

        try {
            const result = await addMemberToGroup(groupId, searchResult.uid);
            if (result.success) {
                setMessage({ type: 'success', text: `${searchResult.firstName || 'User'} has been added to the group!` });
                onMemberAdded();
                // Reset form after success
                setTimeout(() => {
                    setEmail('');
                    setSearchResult(null);
                    setMessage(null);
                }, 2000);
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to add member' });
            }
        } catch {
            setMessage({ type: 'error', text: 'An unexpected error occurred' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleSendInvite = async () => {
        if (!currentUser) return;

        setActionLoading(true);
        setMessage(null);

        try {
            const result = await sendGroupInvitation(email, currentUser.uid, groupId);
            if (result.success) {
                setMessage({ type: 'success', text: `Invitation sent to ${email}!` });
                // Reset form after success
                setTimeout(() => {
                    setEmail('');
                    setNotFound(false);
                    setMessage(null);
                }, 2000);
            } else {
                setMessage({ type: 'error', text: result.error || 'Failed to send invitation' });
            }
        } catch {
            setMessage({ type: 'error', text: 'An unexpected error occurred' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleClose = () => {
        setEmail('');
        setSearchResult(null);
        setNotFound(false);
        setMessage(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 relative">
                {/* Close button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-100 rounded-xl">
                        <UserPlus className="text-blue-600" size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">Invite Member</h2>
                </div>

                {/* Search form */}
                <form onSubmit={handleSearch} className="mb-6">
                    <label htmlFor="memberEmail" className="block text-sm font-medium text-gray-700 mb-2">
                        Search by Email
                    </label>
                    <div className="flex gap-2">
                        <input
                            id="memberEmail"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                            placeholder="friend@example.com"
                            required
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                        </button>
                    </div>
                </form>

                {/* Search result - User found */}
                {searchResult && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl mb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-gray-800">
                                    {searchResult.firstName} {searchResult.lastName}
                                </p>
                                <p className="text-sm text-gray-500">{searchResult.email}</p>
                            </div>
                            <button
                                onClick={handleAddMember}
                                disabled={actionLoading}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                            >
                                {actionLoading ? (
                                    <Loader2 className="animate-spin" size={16} />
                                ) : (
                                    <>
                                        <Check size={16} />
                                        Add to Group
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Search result - User not found */}
                {notFound && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                        <p className="text-gray-700 mb-3">
                            No user found with this email. Would you like to send them an invitation?
                        </p>
                        <button
                            onClick={handleSendInvite}
                            disabled={actionLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                        >
                            {actionLoading ? (
                                <Loader2 className="animate-spin" size={16} />
                            ) : (
                                <>
                                    <Mail size={16} />
                                    Send Invite Email
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Message */}
                {message && (
                    <div
                        className={`p-4 rounded-xl ${message.type === 'success'
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}
                    >
                        {message.text}
                    </div>
                )}

                {/* Cancel button */}
                <div className="flex justify-end mt-6">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
