"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReceiptUpload from '@/components/ReceiptUpload';
import ManualExpenseForm from '@/components/ManualExpenseForm';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Upload, PenLine, Users, User, XCircle, Percent, Hash, X } from 'lucide-react';

import ItemSplitter, { SplitItem } from '@/components/ItemSplitter';
import { getUserProfile } from '@/lib/userProfile';

interface ExpenseItem {
    name: string;
    price: number;
    quantity: number;
    assignedTo: string[]; // UIDs
}

const EXPENSE_CATEGORIES = [
    'Grocery',
    'Dining',
    'Travel',
    'Entertainment',
    'Shopping',
    'Utilities',
    'Internet',
    'Healthcare',
    'Transportation',
    'Other'
] as const;

type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

interface ParsedData {
    merchant: string;
    date: string;
    total: number;
    category: ExpenseCategory;
    items: SplitItem[];
}

type EntryMode = 'upload' | 'manual';

export default function AddExpensePage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const { currentUser } = useAuth();

    const [step, setStep] = useState<'input' | 'review'>('input');
    const [entryMode, setEntryMode] = useState<EntryMode>('upload');
    const [parsedData, setParsedData] = useState<ParsedData | null>(null);
    const [receiptUrl, setReceiptUrl] = useState('');
    const [groupMembers, setGroupMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Split modal state
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [splitModalType, setSplitModalType] = useState<'shares' | 'percent'>('shares');
    const [memberValues, setMemberValues] = useState<Record<string, number>>({});

    // Fetch group members with their profile names
    useEffect(() => {
        if (!id) return;
        const fetchGroupAndMembers = async () => {
            const docRef = doc(db, "groups", id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                // Fetch user profiles for all member IDs
                const memberPromises = data.memberIds.map(async (uid: string) => {
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
                setGroupMembers(membersData);
            }
        };
        fetchGroupAndMembers();
    }, [id]);

    const handleParsed = (data: any, url: string) => {
        // Transform items to include Assignments and SplitType
        const itemsWithSplit: SplitItem[] = data.items.map((item: any) => ({
            ...item,
            assignments: [],
            splitType: 'equal',
            isShared: true
        }));
        setParsedData({
            ...data,
            category: data.category || 'Other',
            items: itemsWithSplit
        });
        setReceiptUrl(url);
        setStep('review');
    };

    const handleManualSubmit = (data: { merchant: string; date: string; total: number; category: string; items: { name: string; price: number; quantity: number }[] }) => {
        // Transform items to include Assignments and SplitType
        const itemsWithSplit: SplitItem[] = data.items.map((item) => ({
            ...item,
            assignments: [],
            splitType: 'equal' as const,
            isShared: true
        }));
        setParsedData({
            merchant: data.merchant,
            date: data.date,
            total: data.total,
            category: (data.category as ExpenseCategory) || 'Other',
            items: itemsWithSplit
        });
        setReceiptUrl(''); // No receipt URL for manual entry
        setStep('review');
    };

    const handleSave = async () => {
        if (!currentUser || !parsedData) return;
        setLoading(true);
        try {
            await addDoc(collection(db, "expenses"), {
                groupId: id,
                payerId: currentUser.uid,
                description: parsedData.merchant || "Unknown Store",
                totalAmount: parsedData.total,
                category: parsedData.category,
                date: parsedData.date ? new Date(parsedData.date) : serverTimestamp(),
                items: parsedData.items,
                receiptImageUrl: receiptUrl || null,
                createdAt: serverTimestamp()
            });
            router.push(`/groups/${id}`);
        } catch (e) {
            console.error(e);
            alert("Error saving expense");
        } finally {
            setLoading(false);
        }
    };

    // Quick split action handlers
    const handleSplitAllEqually = () => {
        if (!parsedData) return;
        const newItems = parsedData.items.map(item => {
            if (!item.isShared) return item;
            const splitAmount = item.price / groupMembers.length;
            const assignments = groupMembers.map(m => ({
                uid: m.uid,
                amount: splitAmount,
                percent: 100 / groupMembers.length
            }));
            return { ...item, assignments, splitType: 'equal' as const };
        });
        setParsedData({ ...parsedData, items: newItems });
    };

    const handleAssignAllToMe = () => {
        if (!parsedData || !currentUser) return;
        const newItems = parsedData.items.map(item => {
            if (!item.isShared) return item;
            return {
                ...item,
                assignments: [{ uid: currentUser.uid, amount: item.price, percent: 100 }],
                splitType: 'equal' as const
            };
        });
        setParsedData({ ...parsedData, items: newItems });
    };

    const handleClearAllAssignments = () => {
        if (!parsedData) return;
        const newItems = parsedData.items.map(item => ({
            ...item,
            assignments: [],
            splitType: 'equal' as const
        }));
        setParsedData({ ...parsedData, items: newItems });
    };

    const openSplitModal = (type: 'shares' | 'percent') => {
        // Initialize member values
        const initialValues: Record<string, number> = {};
        groupMembers.forEach(m => {
            initialValues[m.uid] = type === 'shares' ? 1 : Math.round(100 / groupMembers.length);
        });
        setMemberValues(initialValues);
        setSplitModalType(type);
        setShowSplitModal(true);
    };

    const handleApplySplit = () => {
        if (!parsedData) return;

        // Calculate percentages based on type
        let percentages: Record<string, number> = {};

        if (splitModalType === 'shares') {
            const totalShares = Object.values(memberValues).reduce((sum, v) => sum + v, 0);
            if (totalShares === 0) return;
            Object.entries(memberValues).forEach(([uid, shares]) => {
                percentages[uid] = (shares / totalShares) * 100;
            });
        } else {
            percentages = { ...memberValues };
            const totalPercent = Object.values(percentages).reduce((sum, v) => sum + v, 0);
            if (Math.abs(totalPercent - 100) > 0.5) {
                alert('Percentages must sum to 100%');
                return;
            }
        }

        // Apply to all shared items
        const newItems = parsedData.items.map(item => {
            if (!item.isShared) return item;
            const assignments = Object.entries(percentages)
                .filter(([, percent]) => percent > 0)
                .map(([uid, percent]) => ({
                    uid,
                    amount: (percent / 100) * item.price,
                    percent
                }));
            return { ...item, assignments, splitType: 'percent' as const };
        });

        setParsedData({ ...parsedData, items: newItems });
        setShowSplitModal(false);
    };

    if (!id) return <div>Invalid Group ID</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-3xl mx-auto">
                <div className="mb-6">
                    <Link href={`/groups/${id}`} className="text-sm text-gray-500 hover:text-gray-700">Cancel</Link>
                    <h1 className="text-3xl text-gray-700 font-bold mt-2">Add New Expense</h1>
                </div>

                {step === 'input' && (
                    <div className="bg-white p-8 rounded-2xl shadow-sm">
                        {/* Entry Mode Tabs */}
                        <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
                            <button
                                onClick={() => setEntryMode('upload')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-all ${entryMode === 'upload'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <Upload className="w-4 h-4" />
                                Upload Receipt
                            </button>
                            <button
                                onClick={() => setEntryMode('manual')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-all ${entryMode === 'manual'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                <PenLine className="w-4 h-4" />
                                Enter Manually
                            </button>
                        </div>

                        {/* Receipt Upload Mode */}
                        {entryMode === 'upload' && currentUser && (
                            <ReceiptUpload onParsed={handleParsed} currentUser={currentUser} />
                        )}

                        {/* Manual Entry Mode */}
                        {entryMode === 'manual' && (
                            <ManualExpenseForm
                                onSubmit={handleManualSubmit}
                                onCancel={() => router.push(`/groups/${id}`)}
                            />
                        )}
                    </div>
                )}

                {step === 'review' && parsedData && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Merchant</label>
                                <input
                                    type="text"
                                    value={parsedData.merchant}
                                    onChange={e => setParsedData({ ...parsedData, merchant: e.target.value })}
                                    className="mt-1 w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none text-gray-700"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Total</label>
                                <input
                                    type="number"
                                    value={parsedData.total}
                                    onChange={e => setParsedData({ ...parsedData, total: parseFloat(e.target.value) })}
                                    className="mt-1 w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none text-gray-700"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Category</label>
                                <select
                                    value={parsedData.category}
                                    onChange={e => setParsedData({ ...parsedData, category: e.target.value as ExpenseCategory })}
                                    className="mt-1 w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none text-gray-700 bg-white"
                                >
                                    {EXPENSE_CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                <h3 className="font-semibold text-lg text-gray-700">Split Items</h3>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={handleSplitAllEqually}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                                        title="Split all items equally among all members"
                                    >
                                        <Users className="w-4 h-4" />
                                        Split Equally
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openSplitModal('shares')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                                        title="Split by shares (e.g., family of 3 = 3 shares)"
                                    >
                                        <Hash className="w-4 h-4" />
                                        By Shares
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => openSplitModal('percent')}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                                        title="Split by custom percentages"
                                    >
                                        <Percent className="w-4 h-4" />
                                        By %
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleAssignAllToMe}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all"
                                        title="Assign all items to me only"
                                    >
                                        <User className="w-4 h-4" />
                                        Assign to Me
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleClearAllAssignments}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
                                        title="Clear all assignments"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Clear
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {parsedData.items.map((item, index) => (
                                    <ItemSplitter
                                        key={index}
                                        item={item}
                                        members={groupMembers}
                                        currency="CAD"
                                        onChange={(newItem) => {
                                            const newItems = [...parsedData.items];
                                            newItems[index] = newItem;
                                            setParsedData({ ...parsedData, items: newItems });
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                            <button onClick={() => setStep('input')} className="px-5 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Back</button>
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium shadow-md transition-all"
                            >
                                {loading ? 'Saving...' : 'Confirm & Save'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Split Configuration Modal */}
            {showSplitModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-800">
                                {splitModalType === 'shares' ? 'Split by Shares' : 'Split by Percentage'}
                            </h3>
                            <button
                                onClick={() => setShowSplitModal(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <p className="text-sm text-gray-500">
                                {splitModalType === 'shares'
                                    ? 'Set the number of shares for each member. For example, a family of 3 would get 3 shares.'
                                    : 'Set the percentage for each member. Total must equal 100%.'}
                            </p>

                            <div className="space-y-3">
                                {groupMembers.map(member => (
                                    <div key={member.uid} className="flex items-center justify-between gap-4">
                                        <span className="text-sm font-medium text-gray-700 flex-1">{member.name}</span>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step={splitModalType === 'shares' ? '1' : '0.1'}
                                                value={memberValues[member.uid] || 0}
                                                onChange={(e) => setMemberValues({
                                                    ...memberValues,
                                                    [member.uid]: parseFloat(e.target.value) || 0
                                                })}
                                                className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                            />
                                            <span className="text-sm text-gray-500 w-12">
                                                {splitModalType === 'shares' ? 'shares' : '%'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {splitModalType === 'shares' && (
                                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                                    <strong>Preview:</strong>{' '}
                                    {(() => {
                                        const total = Object.values(memberValues).reduce((sum, v) => sum + v, 0);
                                        if (total === 0) return 'No shares assigned';
                                        return groupMembers
                                            .filter(m => memberValues[m.uid] > 0)
                                            .map(m => `${m.name}: ${((memberValues[m.uid] / total) * 100).toFixed(1)}%`)
                                            .join(', ');
                                    })()}
                                </div>
                            )}

                            {splitModalType === 'percent' && (
                                <div className={`text-sm p-3 rounded-lg ${Math.abs(Object.values(memberValues).reduce((sum, v) => sum + v, 0) - 100) < 0.5
                                        ? 'bg-green-50 text-green-700'
                                        : 'bg-red-50 text-red-700'
                                    }`}>
                                    Total: {Object.values(memberValues).reduce((sum, v) => sum + v, 0).toFixed(1)}%
                                    {Math.abs(Object.values(memberValues).reduce((sum, v) => sum + v, 0) - 100) >= 0.5 && ' (must be 100%)'}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 p-4 border-t border-gray-100 bg-gray-50">
                            <button
                                onClick={() => setShowSplitModal(false)}
                                className="flex-1 px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleApplySplit}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium shadow-sm"
                            >
                                Apply to All Items
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
