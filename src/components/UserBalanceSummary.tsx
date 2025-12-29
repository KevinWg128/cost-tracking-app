"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile } from '@/lib/userProfile';

interface UserBalance {
    uid: string;
    name: string;
    balance: number; // Positive = they owe you, Negative = you owe them
}

interface UserBalanceSummaryProps {
    groupIds: string[];
}

export default function UserBalanceSummary({ groupIds }: UserBalanceSummaryProps) {
    const { currentUser } = useAuth();
    const [balances, setBalances] = useState<UserBalance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser || groupIds.length === 0) {
            setLoading(false);
            return;
        }

        // We need to listen to both expenses and payments across all groups
        const unsubscribers: (() => void)[] = [];

        // Query expenses for user's groups
        const qExpenses = query(
            collection(db, "expenses"),
            where("groupId", "in", groupIds.slice(0, 10)) // Firestore 'in' limit is 10
        );

        const qPayments = query(
            collection(db, "payments"),
            where("groupId", "in", groupIds.slice(0, 10))
        );

        let expenses: any[] = [];
        let payments: any[] = [];
        let allUserIds = new Set<string>();
        let userProfiles: Record<string, { firstName: string; lastName: string }> = {};

        const calculateBalances = async () => {
            // Collect all user IDs involved
            expenses.forEach(exp => {
                allUserIds.add(exp.payerId);
                exp.items?.forEach((item: any) => {
                    if (item.assignments) {
                        item.assignments.forEach((a: any) => allUserIds.add(a.uid));
                    } else if (item.assignedTo) {
                        item.assignedTo.forEach((uid: string) => allUserIds.add(uid));
                    }
                });
            });
            payments.forEach(pay => {
                allUserIds.add(pay.payerId);
                allUserIds.add(pay.payeeId);
            });

            // Fetch user profiles
            const profilePromises = Array.from(allUserIds).map(async (uid) => {
                if (uid === currentUser.uid) return;
                const profile = await getUserProfile(uid);
                if (profile) {
                    userProfiles[uid] = profile;
                }
            });
            await Promise.all(profilePromises);

            // Calculate net balance with each user
            // Positive balance with X = X owes you
            // Negative balance with X = You owe X
            const netBalances: Record<string, number> = {};

            expenses.forEach(exp => {
                exp.items?.forEach((item: any) => {
                    if (item.isShared === false) return;

                    if (item.assignments && Array.isArray(item.assignments)) {
                        item.assignments.forEach((assignment: any) => {
                            if (assignment.uid === currentUser.uid) {
                                // I was assigned this item
                                if (exp.payerId !== currentUser.uid) {
                                    // Someone else paid, I owe them
                                    netBalances[exp.payerId] = (netBalances[exp.payerId] || 0) - assignment.amount;
                                }
                            } else {
                                // Someone else was assigned
                                if (exp.payerId === currentUser.uid) {
                                    // I paid, they owe me
                                    netBalances[assignment.uid] = (netBalances[assignment.uid] || 0) + assignment.amount;
                                }
                            }
                        });
                    } else if (item.assignedTo) {
                        const share = item.price / item.assignedTo.length;
                        item.assignedTo.forEach((uid: string) => {
                            if (uid === currentUser.uid) {
                                if (exp.payerId !== currentUser.uid) {
                                    netBalances[exp.payerId] = (netBalances[exp.payerId] || 0) - share;
                                }
                            } else {
                                if (exp.payerId === currentUser.uid) {
                                    netBalances[uid] = (netBalances[uid] || 0) + share;
                                }
                            }
                        });
                    }
                });
            });

            // Process payments
            payments.forEach(pay => {
                if (pay.payerId === currentUser.uid) {
                    // I paid someone, reducing what I owe them (or they owe me less)
                    netBalances[pay.payeeId] = (netBalances[pay.payeeId] || 0) + pay.amount;
                } else if (pay.payeeId === currentUser.uid) {
                    // Someone paid me, reducing what they owe me
                    netBalances[pay.payerId] = (netBalances[pay.payerId] || 0) - pay.amount;
                }
            });

            // Convert to array with names
            const balanceArray: UserBalance[] = Object.entries(netBalances)
                .filter(([uid, bal]) => Math.abs(bal) > 0.01)
                .map(([uid, balance]) => {
                    const profile = userProfiles[uid];
                    const name = profile
                        ? `${profile.firstName} ${profile.lastName}`.trim()
                        : `User ${uid.slice(0, 4)}`;
                    return { uid, name, balance };
                })
                .sort((a, b) => b.balance - a.balance);

            setBalances(balanceArray);
            setLoading(false);
        };

        const unsubExp = onSnapshot(qExpenses, (snapshot) => {
            expenses = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            calculateBalances();
        });

        const unsubPay = onSnapshot(qPayments, (snapshot) => {
            payments = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            calculateBalances();
        });

        return () => {
            unsubExp();
            unsubPay();
        };
    }, [currentUser, groupIds]);

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse mb-8">
                <div className="h-6 w-40 bg-gray-200 rounded mb-4"></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-24 bg-gray-100 rounded-xl"></div>
                    <div className="h-24 bg-gray-100 rounded-xl"></div>
                </div>
            </div>
        );
    }

    if (groupIds.length === 0 || balances.length === 0) {
        return null;
    }

    const youAreOwed = balances.filter(b => b.balance > 0);
    const youOwe = balances.filter(b => b.balance < 0);
    const totalOwed = youAreOwed.reduce((sum, b) => sum + b.balance, 0);
    const totalOwe = Math.abs(youOwe.reduce((sum, b) => sum + b.balance, 0));

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Balance Summary</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* You are owed */}
                <div className="bg-green-50 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-semibold text-green-800">You are owed</h3>
                        <span className="text-lg font-bold text-green-600">${totalOwed.toFixed(2)}</span>
                    </div>
                    {youAreOwed.length === 0 ? (
                        <p className="text-sm text-green-600/70">No one owes you money</p>
                    ) : (
                        <div className="space-y-2">
                            {youAreOwed.map(b => (
                                <div key={b.uid} className="flex justify-between items-center text-sm">
                                    <span className="text-green-800">{b.name}</span>
                                    <span className="font-medium text-green-600">${b.balance.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* You owe */}
                <div className="bg-red-50 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-semibold text-red-800">You owe</h3>
                        <span className="text-lg font-bold text-red-600">${totalOwe.toFixed(2)}</span>
                    </div>
                    {youOwe.length === 0 ? (
                        <p className="text-sm text-red-600/70">You don&apos;t owe anyone</p>
                    ) : (
                        <div className="space-y-2">
                            {youOwe.map(b => (
                                <div key={b.uid} className="flex justify-between items-center text-sm">
                                    <span className="text-red-800">{b.name}</span>
                                    <span className="font-medium text-red-600">${Math.abs(b.balance).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
