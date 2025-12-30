"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
    Users,
    Crown,
    Shield,
    User,
    Trash2,
    ArrowRightLeft,
    ChevronUp,
    ChevronDown,
    X,
    Loader2,
    AlertTriangle
} from 'lucide-react';

interface Member {
    uid: string;
    name: string;
    email?: string;
}

interface MemberBalance {
    uid: string;
    balance: number;
}

interface MemberManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    groupName: string;
    members: Member[];
    ownerId: string;
    adminIds: string[];
    onMemberUpdated: () => void;
}

type ConfirmationAction = {
    type: 'remove' | 'promote' | 'demote' | 'transfer';
    memberId: string;
    memberName: string;
};

export default function MemberManagementModal({
    isOpen,
    onClose,
    groupId,
    groupName,
    members,
    ownerId,
    adminIds,
    onMemberUpdated,
}: MemberManagementModalProps) {
    const { currentUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [confirmation, setConfirmation] = useState<ConfirmationAction | null>(null);
    const [balances, setBalances] = useState<MemberBalance[]>([]);
    const [loadingBalances, setLoadingBalances] = useState(true);

    // Determine current user's role
    const currentUserIsOwner = currentUser?.uid === ownerId;
    const currentUserIsAdmin = adminIds.includes(currentUser?.uid || '');
    const canManage = currentUserIsOwner || currentUserIsAdmin;

    // Fetch balances when modal opens
    useState(() => {
        if (isOpen && members.length > 0) {
            fetchBalances();
        }
    });

    const fetchBalances = async () => {
        setLoadingBalances(true);
        try {
            const token = await currentUser?.getIdToken();
            // We'll calculate balances client-side using the same logic as BalanceView
            // For now, show as loading
            setLoadingBalances(false);
        } catch {
            setLoadingBalances(false);
        }
    };

    const getAuthToken = async (): Promise<string | null> => {
        if (!currentUser) return null;
        try {
            return await currentUser.getIdToken();
        } catch {
            return null;
        }
    };

    const getMemberRole = (memberId: string): 'owner' | 'admin' | 'member' => {
        if (memberId === ownerId) return 'owner';
        if (adminIds.includes(memberId)) return 'admin';
        return 'member';
    };

    const getRoleBadge = (role: 'owner' | 'admin' | 'member') => {
        switch (role) {
            case 'owner':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                        <Crown size={12} />
                        Owner
                    </span>
                );
            case 'admin':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        <Shield size={12} />
                        Admin
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                        <User size={12} />
                        Member
                    </span>
                );
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        const token = await getAuthToken();
        if (!token) {
            setError('Authentication required');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to remove member');
            }

            setSuccess('Member removed successfully');
            setConfirmation(null);
            onMemberUpdated();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to remove member');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (memberId: string, newRole: 'admin' | 'member') => {
        const token = await getAuthToken();
        if (!token) {
            setError('Authentication required');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/groups/${groupId}/members/${memberId}/role`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role: newRole }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update role');
            }

            setSuccess(data.message || 'Role updated successfully');
            setConfirmation(null);
            onMemberUpdated();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update role');
        } finally {
            setLoading(false);
        }
    };

    const handleTransferOwnership = async (newOwnerId: string) => {
        const token = await getAuthToken();
        if (!token) {
            setError('Authentication required');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/groups/${groupId}/transfer-ownership`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ newOwnerId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to transfer ownership');
            }

            setSuccess('Ownership transferred successfully');
            setConfirmation(null);
            onMemberUpdated();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to transfer ownership');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmedAction = () => {
        if (!confirmation) return;

        switch (confirmation.type) {
            case 'remove':
                handleRemoveMember(confirmation.memberId);
                break;
            case 'promote':
                handleRoleChange(confirmation.memberId, 'admin');
                break;
            case 'demote':
                handleRoleChange(confirmation.memberId, 'member');
                break;
            case 'transfer':
                handleTransferOwnership(confirmation.memberId);
                break;
        }
    };

    const canRemoveMember = (memberId: string): boolean => {
        const role = getMemberRole(memberId);

        // Cannot remove owner
        if (role === 'owner') return false;

        // Cannot remove self
        if (memberId === currentUser?.uid) return false;

        // Owner can remove anyone except themselves
        if (currentUserIsOwner) return true;

        // Admin can only remove regular members
        if (currentUserIsAdmin && role === 'member') return true;

        return false;
    };

    const canChangeRole = (memberId: string): boolean => {
        // Only owner can change roles
        if (!currentUserIsOwner) return false;

        // Cannot change owner's role
        if (memberId === ownerId) return false;

        return true;
    };

    const canTransferOwnership = (memberId: string): boolean => {
        // Only owner can transfer
        if (!currentUserIsOwner) return false;

        // Cannot transfer to self
        if (memberId === currentUser?.uid) return false;

        return true;
    };

    const getConfirmationMessage = () => {
        if (!confirmation) return '';

        switch (confirmation.type) {
            case 'remove':
                return `Are you sure you want to remove ${confirmation.memberName} from the group? Their balance must be settled first.`;
            case 'promote':
                return `Are you sure you want to promote ${confirmation.memberName} to Admin? They will be able to remove regular members.`;
            case 'demote':
                return `Are you sure you want to demote ${confirmation.memberName} to a regular member? They will lose admin privileges.`;
            case 'transfer':
                return `Are you sure you want to transfer ownership to ${confirmation.memberName}? You will lose owner privileges and become a regular member.`;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl transform transition-all max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Manage Members</h2>
                            <p className="text-sm text-gray-500">{groupName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Messages */}
                {error && (
                    <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
                        <AlertTriangle size={16} />
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                        {success}
                    </div>
                )}

                {/* Confirmation Dialog */}
                {confirmation && (
                    <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm text-amber-800 mb-3">{getConfirmationMessage()}</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setConfirmation(null)}
                                disabled={loading}
                                className="flex-1 py-2 px-4 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmedAction}
                                disabled={loading}
                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${confirmation.type === 'remove' || confirmation.type === 'transfer'
                                        ? 'bg-red-600 text-white hover:bg-red-700'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                            >
                                {loading && <Loader2 size={14} className="animate-spin" />}
                                Confirm
                            </button>
                        </div>
                    </div>
                )}

                {/* Members List */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-3">
                        {members.map(member => {
                            const role = getMemberRole(member.uid);
                            const isCurrentUser = member.uid === currentUser?.uid;

                            return (
                                <div
                                    key={member.uid}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                            {member.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800">
                                                {member.name} {isCurrentUser && <span className="text-gray-500">(You)</span>}
                                            </p>
                                            {member.email && (
                                                <p className="text-sm text-gray-500">{member.email}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {getRoleBadge(role)}

                                        {canManage && !isCurrentUser && role !== 'owner' && (
                                            <div className="flex items-center gap-1 ml-2">
                                                {/* Role Change Buttons (Owner Only) */}
                                                {currentUserIsOwner && canChangeRole(member.uid) && (
                                                    <>
                                                        {role === 'member' ? (
                                                            <button
                                                                onClick={() => setConfirmation({
                                                                    type: 'promote',
                                                                    memberId: member.uid,
                                                                    memberName: member.name,
                                                                })}
                                                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                                                title="Promote to Admin"
                                                            >
                                                                <ChevronUp size={16} />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => setConfirmation({
                                                                    type: 'demote',
                                                                    memberId: member.uid,
                                                                    memberName: member.name,
                                                                })}
                                                                className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
                                                                title="Demote to Member"
                                                            >
                                                                <ChevronDown size={16} />
                                                            </button>
                                                        )}
                                                    </>
                                                )}

                                                {/* Transfer Ownership Button (Owner Only) */}
                                                {currentUserIsOwner && canTransferOwnership(member.uid) && (
                                                    <button
                                                        onClick={() => setConfirmation({
                                                            type: 'transfer',
                                                            memberId: member.uid,
                                                            memberName: member.name,
                                                        })}
                                                        className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                                                        title="Transfer Ownership"
                                                    >
                                                        <ArrowRightLeft size={16} />
                                                    </button>
                                                )}

                                                {/* Remove Button */}
                                                {canRemoveMember(member.uid) && (
                                                    <button
                                                        onClick={() => setConfirmation({
                                                            type: 'remove',
                                                            memberId: member.uid,
                                                            memberName: member.name,
                                                        })}
                                                        className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                                        title="Remove Member"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
                        {!canManage && (
                            <span className="text-amber-600">Only owners and admins can manage members</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
