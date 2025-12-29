"use client";

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import ExpenseList from '@/components/ExpenseList';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import BalanceView from '@/components/BalanceView';
import InviteMemberModal from '@/components/InviteMemberModal';
import { getUserProfile } from '@/lib/userProfile';
import { UserPlus } from 'lucide-react';

interface Group {
    id: string;
    name: string;
    memberIds: string[];
    currency: string;
}

interface Member {
    uid: string;
    name: string;
}

export default function GroupDetails() {
    const params = useParams();
    const id = params?.id as string;

    const [group, setGroup] = useState<Group | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [showBalances, setShowBalances] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (!id) return;

        const fetchGroupAndMembers = async () => {
            try {
                const docRef = doc(db, "groups", id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const groupData = { id: docSnap.id, ...docSnap.data() } as Group;
                    setGroup(groupData);

                    // Fetch user profiles for all members
                    const memberPromises = groupData.memberIds.map(async (uid) => {
                        const profile = await getUserProfile(uid);
                        if (profile) {
                            return {
                                uid,
                                name: `${profile.firstName} ${profile.lastName}`.trim() || `User ${uid.slice(0, 4)}`
                            };
                        }
                        return { uid, name: `User ${uid.slice(0, 4)}` };
                    });
                    const membersData = await Promise.all(memberPromises);
                    setMembers(membersData);
                } else {
                    console.error("Group not found");
                }
            } catch (error) {
                console.error("Error fetching group:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchGroupAndMembers();
    }, [id, refreshKey]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-4 w-32 bg-gray-200 rounded mb-4"></div>
                    <div className="h-8 w-48 bg-gray-300 rounded"></div>
                </div>
            </div>
        );
    }

    if (!group) {
        return <div className="min-h-screen flex items-center justify-center">Group not found.</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8 text-gray-900">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
                    <div>
                        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">← Back to Dashboard</Link>
                        <h1 className="text-3xl font-extrabold mt-2 text-gray-900 tracking-tight">{group.name}</h1>
                        <p className="text-sm text-gray-500 mt-1">{group.memberIds.length} members • {group.currency}</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                        >
                            <UserPlus size={16} />
                            Invite
                        </button>
                        <button
                            onClick={() => setShowBalances(true)}
                            className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                        >
                            Balances
                        </button>
                        <Link
                            href={`/groups/${id}/add-expense`}
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
                        >
                            + Add Expense
                        </Link>
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-1 md:p-6 min-h-[500px]">
                    <ExpenseList groupId={id} members={members} />
                </div>
            </div>

            <BalanceView
                isOpen={showBalances}
                onClose={() => setShowBalances(false)}
                groupId={id}
                members={members}
            />

            <InviteMemberModal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                groupId={id}
                onMemberAdded={() => setRefreshKey(prev => prev + 1)}
            />
        </div>
    )
}
