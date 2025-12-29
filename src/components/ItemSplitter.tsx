"use client";

import { useState, useEffect } from 'react';

interface Member {
    uid: string;
    name: string;
}

interface SplitAssignment {
    uid: string;
    amount: number;
    percent?: number;
}

export interface SplitItem {
    name: string;
    price: number;
    quantity: number;
    assignments: SplitAssignment[];
    splitType: 'equal' | 'exact' | 'percent';
    isShared: boolean;
}

interface ItemSplitterProps {
    item: SplitItem;
    members: Member[];
    onChange: (item: SplitItem) => void;
    currency: string;
}

export default function ItemSplitter({ item, members, onChange, currency }: ItemSplitterProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Initial assignment calculation (defaults to equal if empty)
    useEffect(() => {
        if (item.assignments.length === 0 && members.length > 0) {
            recalculateEqual(members.map(m => m.uid));
        }
    }, []);

    const recalculateEqual = (selectedUids: string[]) => {
        if (selectedUids.length === 0) {
            onChange({ ...item, assignments: [], splitType: 'equal' });
            return;
        }
        const splitAmount = item.price / selectedUids.length;
        const newAssignments = selectedUids.map(uid => ({
            uid,
            amount: splitAmount,
            percent: 100 / selectedUids.length
        }));
        // preserve splitType unless forcing equal
        onChange({ ...item, assignments: newAssignments, splitType: 'equal' });
    };

    const handleToggleMember = (uid: string) => {
        const currentUids = item.assignments.map(a => a.uid);
        let newUids;
        if (currentUids.includes(uid)) {
            newUids = currentUids.filter(id => id !== uid);
        } else {
            newUids = [...currentUids, uid];
        }

        if (item.splitType === 'equal') {
            recalculateEqual(newUids);
        } else {
            if (currentUids.includes(uid)) {
                onChange({ ...item, assignments: item.assignments.filter(a => a.uid !== uid) });
            } else {
                onChange({ ...item, assignments: [...item.assignments, { uid, amount: 0, percent: 0 }] });
            }
        }
    };

    const updateAmount = (uid: string, amount: number) => {
        const newAssignments = item.assignments.map(a =>
            a.uid === uid ? { ...a, amount } : a
        );
        onChange({ ...item, assignments: newAssignments, splitType: 'exact' });
    };

    const updatePercent = (uid: string, percent: number) => {
        const amount = (percent / 100) * item.price;
        const newAssignments = item.assignments.map(a =>
            a.uid === uid ? { ...a, amount, percent } : a
        );
        onChange({ ...item, assignments: newAssignments, splitType: 'percent' });
    };

    const totalAssigned = item.assignments.reduce((sum, a) => sum + a.amount, 0);
    const isTotalCorrect = Math.abs(totalAssigned - item.price) < 0.02; // Small tolerance

    const handleToggleShared = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange({ ...item, isShared: !item.isShared });
    };

    const isShared = item.isShared !== false; // Default to true for backwards compatibility

    return (
        <div className={`border border-gray-200 rounded-lg overflow-hidden transition-all shadow-sm ${isShared ? 'bg-white hover:shadow-md' : 'bg-gray-100 opacity-50'}`}>
            <div
                className={`p-4 flex justify-between items-center cursor-pointer ${isShared ? 'bg-gray-50 hover:bg-gray-100' : 'bg-gray-100'}`}
                onClick={() => isShared && setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3 flex-1">
                    <input
                        type="checkbox"
                        checked={isShared}
                        onClick={handleToggleShared}
                        onChange={() => { }}
                        className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                        title={isShared ? 'Click to exclude from splitting' : 'Click to include in splitting'}
                    />
                    <div>
                        <h4 className={`font-semibold ${isShared ? 'text-gray-800' : 'text-gray-500'}`}>{item.name}</h4>
                        <span className="text-sm text-gray-500">
                            ${item.price.toFixed(2)} {isShared ? `• ${item.assignments.length} people` : '• Not shared'}
                        </span>
                    </div>
                </div>
                {isShared && (
                    <div className={`text-blue-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                        ▼
                    </div>
                )}
            </div>

            {isShared && isOpen && (
                <div className="p-4 border-t border-gray-100">
                    <div className="flex gap-2 mb-4 text-sm">
                        <button
                            type="button"
                            onClick={() => recalculateEqual(item.assignments.map(a => a.uid))}
                            className={`px-3 py-1 rounded-full border ${item.splitType === 'equal' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                        >
                            Equal
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange({ ...item, splitType: 'exact' })}
                            className={`px-3 py-1 rounded-full border ${item.splitType === 'exact' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                        >
                            Exact
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange({ ...item, splitType: 'percent' })}
                            className={`px-3 py-1 rounded-full border ${item.splitType === 'percent' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                        >
                            %
                        </button>
                    </div>

                    {/* Member Selection */}
                    <div className="mb-4">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Shared By</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {members.map(member => {
                                const isSelected = item.assignments.some(a => a.uid === member.uid);
                                return (
                                    <button
                                        key={member.uid}
                                        type="button"
                                        onClick={() => handleToggleMember(member.uid)}
                                        className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'}`}
                                    >
                                        {member.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Split details per assigned member */}
                    <div className="space-y-2">
                        {item.assignments.map(assignment => {
                            const memberName = members.find(m => m.uid === assignment.uid)?.name || assignment.uid;
                            return (
                                <div key={assignment.uid} className="flex justify-between items-center text-sm">
                                    <span className="text-gray-700">{memberName}</span>
                                    <div className="flex items-center gap-2">
                                        {item.splitType === 'percent' && (
                                            <div className="flex items-center">
                                                <input
                                                    type="number"
                                                    value={assignment.percent ? assignment.percent.toFixed(1) : 0}
                                                    onChange={(e) => updatePercent(assignment.uid, parseFloat(e.target.value))}
                                                    className="w-16 text-right border rounded p-1 text-sm bg-gray-50"
                                                />
                                                <span className="ml-1 text-gray-500">%</span>
                                            </div>
                                        )}
                                        {item.splitType === 'exact' && (
                                            <div className="flex items-center">
                                                <span className="mr-1 text-gray-500">$</span>
                                                <input
                                                    type="number"
                                                    value={assignment.amount.toFixed(2)}
                                                    onChange={(e) => updateAmount(assignment.uid, parseFloat(e.target.value))}
                                                    className="w-20 text-right border rounded p-1 text-sm bg-gray-50 text-gray-700"
                                                />
                                            </div>
                                        )}
                                        {item.splitType === 'equal' && (
                                            <span className="font-medium text-gray-900">${assignment.amount.toFixed(2)}</span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Validation Error */}
                    {!isTotalCorrect && (
                        <div className="mt-3 text-red-500 text-xs text-right font-medium">
                            Total assigned: ${totalAssigned.toFixed(2)} (Diff: ${(item.price - totalAssigned).toFixed(2)})
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
