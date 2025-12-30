"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReceiptUpload from '@/components/ReceiptUpload';
import ManualExpenseForm from '@/components/ManualExpenseForm';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Upload, PenLine } from 'lucide-react';

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
                            <h3 className="font-semibold text-lg mb-4 text-gray-700">Split Items</h3>
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
        </div>
    );
}
