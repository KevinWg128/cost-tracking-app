"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';

interface Expense {
    id: string;
    description: string;
    totalAmount: number;
    payerId: string; // We'll need to fetch user names or store them
    date: any;
    items: any[];
}

interface ExpenseListProps {
    groupId: string;
}

export default function ExpenseList({ groupId }: ExpenseListProps) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

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
        <div className="space-y-4">
            {expenses.map((expense) => (
                <div key={expense.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 font-medium">
                            {/* Ideally show payer avatar or initial */}
                            ?
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-900">{expense.description}</h4>
                            <p className="text-xs text-gray-400">
                                {expense.date?.toDate ? format(expense.date.toDate(), 'PPP') : 'Unknown date'}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                            ${expense.totalAmount.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                            paid by you {/* Placeholder logic */}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
