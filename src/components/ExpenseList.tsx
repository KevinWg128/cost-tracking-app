"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import ExpenseDetailModal from './ExpenseDetailModal';

interface SplitAssignment {
    uid: string;
    amount: number;
    percent?: number;
}

interface ExpenseItem {
    name: string;
    price: number;
    quantity: number;
    assignments: SplitAssignment[];
    splitType: 'equal' | 'exact' | 'percent';
    isShared?: boolean;
}

interface Expense {
    id: string;
    description: string;
    totalAmount: number;
    payerId: string;
    date: any;
    items: ExpenseItem[];
    receiptImageUrl?: string;
}

interface Member {
    uid: string;
    name: string;
}

interface ExpenseListProps {
    groupId: string;
    members: Member[];
}

export default function ExpenseList({ groupId, members }: ExpenseListProps) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const q = query(
            collection(db, "expenses"),
            where("groupId", "==", groupId),
            orderBy("date", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const expenseData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Expense));
            setExpenses(expenseData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [groupId]);

    const handleExpenseClick = (expense: Expense) => {
        setSelectedExpense(expense);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedExpense(null);
    };

    if (loading) {
        return <div className="animate-pulse space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl"></div>)}</div>;
    }

    if (expenses.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300">
                <p className="text-gray-500">No expenses yet. Add one to get started!</p>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-4">
                {expenses.map((expense) => (
                    <div
                        key={expense.id}
                        onClick={() => handleExpenseClick(expense)}
                        className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 font-medium group-hover:bg-indigo-100 transition-colors">
                                {expense.items?.length || '?'}
                            </div>
                            <div>
                                <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{expense.description}</h4>
                                <p className="text-xs text-gray-400">
                                    {expense.date?.toDate ? format(expense.date.toDate(), 'PPP') : 'Unknown date'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <div className="text-lg font-bold text-gray-900">
                                    ${expense.totalAmount.toFixed(2)}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {expense.items?.length || 0} items
                                </div>
                            </div>
                            <div className="text-gray-300 group-hover:text-blue-400 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <ExpenseDetailModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                expense={selectedExpense}
                members={members}
            />
        </>
    );
}
