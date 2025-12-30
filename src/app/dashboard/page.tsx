"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import CreateGroupModal from '@/components/CreateGroupModal';
import MonthlySpendingChart from '@/components/MonthlySpendingChart';
import UserBalanceSummary from '@/components/UserBalanceSummary';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Group {
    id: string;
    name: string;
    createdAt: any;
    memberIds: string[];
}

export default function Dashboard() {
    const { currentUser, logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await logout();
            router.push('/');
        } catch (error) {
            console.error('Failed to logout:', error);
        }
    };
    const [groups, setGroups] = useState<Group[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, "groups"),
            where("memberIds", "array-contains", currentUser.uid),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const groupsData: Group[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Group));
            setGroups(groupsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const groupIds = groups.map(g => g.id);

    if (!currentUser) {
        return <div className="min-h-screen flex items-center justify-center">Please log in to view dashboard.</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Your Groups</h1>
                        <p className="text-gray-500 mt-2 text-lg">Manage your shared expenses and groups.</p>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-3">
                        <Link
                            href="/profile"
                            className="px-4 py-2.5 text-gray-600 font-medium rounded-xl hover:bg-gray-100 transition-colors"
                        >
                            Profile
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2.5 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors"
                        >
                            Logout
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                        >
                            + Create Group
                        </button>
                    </div>

                    {/* Mobile Hamburger Menu */}
                    <div className="md:hidden relative">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            aria-label="Toggle menu"
                        >
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                {isMobileMenuOpen ? (
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                ) : (
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                )}
                            </svg>
                        </button>

                        {/* Mobile Dropdown Menu */}
                        {isMobileMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                                <Link
                                    href="/profile"
                                    className="block px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Profile
                                </Link>
                                <button
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        setIsModalOpen(true);
                                    }}
                                    className="w-full text-left px-4 py-3 text-blue-600 font-medium hover:bg-blue-50 transition-colors"
                                >
                                    + Create Group
                                </button>
                                <button
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        handleLogout();
                                    }}
                                    className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                                >
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {/* Monthly Spending Chart */}
                {!loading && groupIds.length > 0 && (
                    <MonthlySpendingChart groupIds={groupIds} />
                )}

                {/* Balance Summary */}
                {!loading && groupIds.length > 0 && (
                    <UserBalanceSummary groupIds={groupIds} />
                )}

                {/* Groups Section */}
                {!loading && groups.length > 0 && (
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Groups</h2>
                )}

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-48 bg-gray-200 rounded-2xl"></div>
                        ))}
                    </div>
                ) : groups.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100">
                        <h3 className="text-2xl font-bold text-gray-800 mb-3">No groups yet</h3>
                        <p className="text-gray-500 mb-8">Create a group to start tracking expenses with friends.</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-6 py-3 bg-blue-100 text-blue-700 font-semibold rounded-xl hover:bg-blue-200 transition-colors"
                        >
                            Create your first group
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groups.map((group) => (
                            <Link
                                key={group.id}
                                href={`/groups/${group.id}`}
                                className="group block bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        {group.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-xs font-medium px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
                                        {group.memberIds.length} members
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                                    {group.name}
                                </h3>
                                <p className="text-sm text-gray-400">
                                    Created {group.createdAt?.toDate ? new Date(group.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                                </p>
                            </Link>
                        ))}
                    </div>
                )}

                <CreateGroupModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onGroupCreated={() => { }}
                />
            </div>
        </div>
    );
}
