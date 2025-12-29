"use client";

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { getUserProfile } from '@/lib/userProfile';

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

interface ExpenseDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    expense: Expense | null;
    members: Member[];
}

export default function ExpenseDetailModal({ isOpen, onClose, expense, members }: ExpenseDetailModalProps) {
    const [payerName, setPayerName] = useState<string>('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!expense) return;

        const fetchPayerName = async () => {
            setLoading(true);
            const profile = await getUserProfile(expense.payerId);
            if (profile) {
                setPayerName(`${profile.firstName} ${profile.lastName}`.trim() || `User ${expense.payerId.slice(0, 4)}`);
            } else {
                setPayerName(`User ${expense.payerId.slice(0, 4)}`);
            }
            setLoading(false);
        };

        fetchPayerName();
    }, [expense]);

    if (!isOpen || !expense) return null;

    const getMemberName = (uid: string) => {
        const member = members.find(m => m.uid === uid);
        return member?.name || `User ${uid.slice(0, 4)}`;
    };

    const formatDate = (date: any) => {
        if (!date) return 'Unknown date';
        if (date.toDate) return format(date.toDate(), 'PPP');
        if (date instanceof Date) return format(date, 'PPP');
        return 'Unknown date';
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold">{expense.description}</h2>
                            <p className="text-blue-100 text-sm mt-1">{formatDate(expense.date)}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white transition-colors p-1"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                        <div>
                            <span className="text-blue-200 text-sm">Total Amount</span>
                            <p className="text-3xl font-bold">${expense.totalAmount.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                            <span className="text-blue-200 text-sm">Paid by</span>
                            <p className="text-lg font-semibold">
                                {loading ? (
                                    <span className="inline-block w-20 h-5 bg-blue-400/50 rounded animate-pulse"></span>
                                ) : payerName}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[50vh]">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                        Items ({expense.items?.length || 0})
                    </h3>

                    {expense.items && expense.items.length > 0 ? (
                        <div className="space-y-4">
                            {expense.items.map((item, index) => {
                                const isShared = item.isShared !== false;
                                return (
                                    <div
                                        key={index}
                                        className={`rounded-xl border p-4 transition-all ${isShared
                                                ? 'bg-white border-gray-200'
                                                : 'bg-gray-50 border-gray-100 opacity-60'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h4 className="font-semibold text-gray-900">{item.name}</h4>
                                                {!isShared && (
                                                    <span className="text-xs text-gray-400">Not shared</span>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-gray-900">${item.price.toFixed(2)}</span>
                                                {item.quantity > 1 && (
                                                    <span className="text-xs text-gray-500 ml-1">×{item.quantity}</span>
                                                )}
                                            </div>
                                        </div>

                                        {isShared && item.assignments && item.assignments.length > 0 && (
                                            <div className="border-t border-gray-100 pt-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs text-gray-500 uppercase tracking-wide">Split</span>
                                                    <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                                                        {item.splitType}
                                                    </span>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {item.assignments.map((assignment, aIndex) => (
                                                        <div
                                                            key={aIndex}
                                                            className="flex justify-between items-center text-sm"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                                                    {getMemberName(assignment.uid).charAt(0).toUpperCase()}
                                                                </div>
                                                                <span className="text-gray-700">{getMemberName(assignment.uid)}</span>
                                                            </div>
                                                            <span className="font-medium text-gray-900">
                                                                ${assignment.amount.toFixed(2)}
                                                                {item.splitType === 'percent' && assignment.percent && (
                                                                    <span className="text-gray-400 text-xs ml-1">
                                                                        ({assignment.percent.toFixed(0)}%)
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            <p>No item details available</p>
                        </div>
                    )}

                    {/* Receipt Image */}
                    {expense.receiptImageUrl && (
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                Receipt
                            </h3>
                            <a
                                href={expense.receiptImageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                View Receipt Image
                            </a>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
