"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface Member {
    uid: string;
    name: string;
}

interface BalanceViewProps {
    groupId: string;
    members: Member[];
    isOpen: boolean;
    onClose: () => void;
}

export default function BalanceView({ groupId, members, isOpen, onClose }: BalanceViewProps) {
    const { currentUser } = useAuth();
    const [expenses, setExpenses] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [recordingPayment, setRecordingPayment] = useState(false);

    // Payment Form State
    const [payeeId, setPayeeId] = useState('');
    const [amount, setAmount] = useState('');

    useEffect(() => {
        if (!isOpen) return;

        const qExp = query(collection(db, "expenses"), where("groupId", "==", groupId));
        const qPay = query(collection(db, "payments"), where("groupId", "==", groupId));

        const unsubExp = onSnapshot(qExp, (snap) => {
            setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        const unsubPay = onSnapshot(qPay, (snap) => {
            setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });

        return () => {
            unsubExp();
            unsubPay();
        };
    }, [groupId, isOpen]);

    const handleRecordPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !payeeId || !amount) return;

        try {
            await addDoc(collection(db, "payments"), {
                groupId,
                payerId: currentUser.uid,
                payeeId,
                amount: parseFloat(amount),
                date: serverTimestamp()
            });
            setRecordingPayment(false);
            setAmount('');
            setPayeeId('');
        } catch (err) {
            console.error(err);
            alert("Failed to record payment");
        }
    };

    if (!isOpen) return null;

    // Calculate Balances
    const balances: Record<string, number> = {};
    members.forEach(m => balances[m.uid] = 0);

    // 1. Process Expenses
    expenses.forEach(exp => {
        // Payer gets +Total
        balances[exp.payerId] = (balances[exp.payerId] || 0) + exp.totalAmount;

        // Members subtract their share
        exp.items.forEach((item: any) => {
            // If legacy item (no assignments), ignore or handle gracefully? 
            // We assume new structure.
            if (item.assignments && Array.isArray(item.assignments)) {
                item.assignments.forEach((assignment: any) => {
                    balances[assignment.uid] = (balances[assignment.uid] || 0) - assignment.amount;
                });
            } else if (item.assignedTo) { // Legacy fallback
                const splitInfo = item.assignedTo; // Array of UIDs
                const share = item.price / splitInfo.length;
                splitInfo.forEach((uid: string) => {
                    balances[uid] = (balances[uid] || 0) - share;
                });
            }
        });
    });

    // 2. Process Payments (Transfers)
    payments.forEach(pay => {
        // Payer (Sending money) -> +Credit (Paid debt)
        balances[pay.payerId] = (balances[pay.payerId] || 0) + pay.amount;
        // Payee (Receiving money) -> -Credit (Debt repaid, so share "increases" or net goes down?)
        // Use formula: Bal = Paid - Share. 
        // A pays B. A (Paid +50). B (Received +50).
        // Balance A += 50. Balance B -= 50?
        // Wait. A (Owes 100). Bal -100.
        // A pays 50. Bal becomes -50. So YES, A gets +50.
        // B (Owed 100). Bal +100.
        // B receives 50. Bal becomes +50. So YES, B gets -50.
        balances[pay.payeeId] = (balances[pay.payeeId] || 0) - pay.amount;
    });

    // Determine debts
    // Positive balance = You are owed. Negative = You owe.

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Group Balances</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>

                <div className="space-y-4 mb-8">
                    {members.map(member => {
                        const bal = balances[member.uid] || 0;
                        const isOwed = bal > 0.01;
                        const isOwing = bal < -0.01;
                        return (
                            <div key={member.uid} className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                                <span className="font-medium text-gray-700">
                                    {member.name} {member.uid === currentUser?.uid ? '(You)' : ''}
                                </span>
                                <span className={`font-bold ${isOwed ? 'text-green-600' : isOwing ? 'text-red-600' : 'text-gray-500'}`}>
                                    {isOwed ? `gets $${bal.toFixed(2)}` : isOwing ? `owes $${Math.abs(bal).toFixed(2)}` : 'Settled'}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {!recordingPayment ? (
                    <button
                        onClick={() => setRecordingPayment(true)}
                        className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 shadow-md transition-all"
                    >
                        Record a Payment
                    </button>
                ) : (
                    <form onSubmit={handleRecordPayment} className="bg-gray-50 p-4 rounded-xl space-y-4 animate-fadeIn">
                        <h3 className="font-semibold text-gray-800">Record Payment</h3>

                        <div>
                            <label className="block text-sm text-gray-600 mb-1">To (Payee)</label>
                            <select
                                value={payeeId}
                                onChange={e => setPayeeId(e.target.value)}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                required
                            >
                                <option value="">Select User</option>
                                {members.filter(m => m.uid !== currentUser?.uid).map(m => (
                                    <option key={m.uid} value={m.uid}>{m.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Amount</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="0.00"
                                required
                                step="0.01"
                            />
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setRecordingPayment(false)}
                                className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm"
                            >
                                Save Payment
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
