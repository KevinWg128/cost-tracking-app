"use client";

import { useState } from 'react';
import { Plus, Trash2, Receipt } from 'lucide-react';

interface ExpenseItem {
    name: string;
    price: number;
    quantity: number;
}

interface ManualExpenseData {
    merchant: string;
    date: string;
    total: number;
    category: string;
    items: ExpenseItem[];
}

interface ManualExpenseFormProps {
    onSubmit: (data: ManualExpenseData) => void;
    onCancel: () => void;
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

export default function ManualExpenseForm({ onSubmit, onCancel }: ManualExpenseFormProps) {
    const [merchant, setMerchant] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState<string>('Other');
    const [items, setItems] = useState<ExpenseItem[]>([
        { name: '', price: 0, quantity: 1 }
    ]);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const addItem = () => {
        setItems([...items, { name: '', price: 0, quantity: 1 }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, field: keyof ExpenseItem, value: string | number) => {
        const newItems = [...items];
        if (field === 'name') {
            newItems[index].name = value as string;
        } else if (field === 'price') {
            newItems[index].price = parseFloat(value as string) || 0;
        } else if (field === 'quantity') {
            newItems[index].quantity = parseInt(value as string) || 1;
        }
        setItems(newItems);
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const validate = (): boolean => {
        const newErrors: { [key: string]: string } = {};

        if (!merchant.trim()) {
            newErrors.merchant = 'Merchant name is required';
        }

        if (!date) {
            newErrors.date = 'Date is required';
        }

        const validItems = items.filter(item => item.name.trim() && item.price > 0);
        if (validItems.length === 0) {
            newErrors.items = 'At least one item with a name and price is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        // Filter out empty items
        const validItems = items.filter(item => item.name.trim() && item.price > 0);

        onSubmit({
            merchant: merchant.trim(),
            date,
            total: calculateTotal(),
            category,
            items: validItems
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header with icon */}
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <div className="p-2 bg-blue-50 rounded-xl">
                    <Receipt className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-gray-900">Manual Entry</h3>
                    <p className="text-sm text-gray-500">Enter expense details below</p>
                </div>
            </div>

            {/* Basic Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Merchant / Store Name *
                    </label>
                    <input
                        type="text"
                        value={merchant}
                        onChange={(e) => setMerchant(e.target.value)}
                        placeholder="e.g., Walmart, Starbucks"
                        className={`w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700 transition-all ${errors.merchant ? 'border-red-400 bg-red-50' : 'border-gray-200'
                            }`}
                    />
                    {errors.merchant && (
                        <p className="mt-1 text-sm text-red-500">{errors.merchant}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date *
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className={`w-full border rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700 transition-all ${errors.date ? 'border-red-400 bg-red-50' : 'border-gray-200'
                            }`}
                    />
                    {errors.date && (
                        <p className="mt-1 text-sm text-red-500">{errors.date}</p>
                    )}
                </div>
            </div>

            {/* Category */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                </label>
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700 bg-white transition-all"
                >
                    {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            {/* Items Section */}
            <div>
                <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                        Items *
                    </label>
                    <button
                        type="button"
                        onClick={addItem}
                        className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Item
                    </button>
                </div>

                {errors.items && (
                    <p className="mb-3 text-sm text-red-500">{errors.items}</p>
                )}

                <div className="space-y-3">
                    {items.map((item, index) => (
                        <div
                            key={index}
                            className="flex gap-3 items-start p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-all"
                        >
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={item.name}
                                    onChange={(e) => updateItem(index, 'name', e.target.value)}
                                    placeholder="Item name"
                                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700"
                                />
                            </div>
                            <div className="w-24">
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={item.price || ''}
                                        onChange={(e) => updateItem(index, 'price', e.target.value)}
                                        placeholder="0.00"
                                        className="w-full border border-gray-200 rounded-lg p-2 pl-7 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700 text-right"
                                    />
                                </div>
                            </div>
                            <div className="w-16">
                                <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-700 text-center"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => removeItem(index)}
                                disabled={items.length === 1}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Column labels */}
                <div className="flex gap-3 mt-2 text-xs text-gray-400 px-3">
                    <div className="flex-1">Name</div>
                    <div className="w-24 text-right">Price</div>
                    <div className="w-16 text-center">Qty</div>
                    <div className="w-8"></div>
                </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <span className="font-medium text-gray-700">Calculated Total</span>
                <span className="text-2xl font-bold text-blue-600">
                    ${calculateTotal().toFixed(2)}
                </span>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-5 py-2.5 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium transition-all"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium shadow-md hover:shadow-lg transition-all"
                >
                    Continue to Split
                </button>
            </div>
        </form>
    );
}
