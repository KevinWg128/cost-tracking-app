"use client";

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface CategorySpending {
    category: string;
    amount: number;
    color: string;
}

interface MonthlySpendingChartProps {
    groupIds: string[];
}

// Color palette for categories
const CATEGORY_COLORS: Record<string, string> = {
    'Grocery': '#10B981',      // Emerald
    'Dining': '#F59E0B',       // Amber
    'Travel': '#3B82F6',       // Blue
    'Entertainment': '#8B5CF6', // Violet
    'Shopping': '#EC4899',     // Pink
    'Utilities': '#6366F1',    // Indigo
    'Internet': '#14B8A6',     // Teal
    'Healthcare': '#EF4444',   // Red
    'Transportation': '#F97316', // Orange
    'Other': '#6B7280',        // Gray
};

// Dynamic colors for categories not in the predefined list
const DYNAMIC_COLORS = [
    '#0EA5E9',  // Sky Blue
    '#22C55E',  // Green
    '#A855F7',  // Purple
    '#F43F5E',  // Rose
    '#84CC16',  // Lime
    '#06B6D4',  // Cyan
    '#D946EF',  // Fuchsia
    '#EAB308',  // Yellow
    '#78716C',  // Stone
    '#64748B',  // Slate
    '#FB7185',  // Rose Light
    '#34D399',  // Emerald Light
    '#A78BFA',  // Violet Light
    '#FBBF24',  // Amber Light
    '#2DD4BF',  // Teal Light
];

// Track assigned colors for dynamic categories
const dynamicColorAssignments: Record<string, string> = {};
let dynamicColorIndex = 0;

// Get color for a category - either predefined or dynamically assigned
const getCategoryColor = (category: string): string => {
    // Check if it's a predefined category
    if (CATEGORY_COLORS[category]) {
        return CATEGORY_COLORS[category];
    }

    // Check if we've already assigned a color to this category
    if (dynamicColorAssignments[category]) {
        return dynamicColorAssignments[category];
    }

    // Assign a new color from the dynamic palette
    const color = DYNAMIC_COLORS[dynamicColorIndex % DYNAMIC_COLORS.length];
    dynamicColorAssignments[category] = color;
    dynamicColorIndex++;

    return color;
};

export default function MonthlySpendingChart({ groupIds }: MonthlySpendingChartProps) {
    const { currentUser } = useAuth();
    const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalSpending, setTotalSpending] = useState(0);
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

    useEffect(() => {
        if (!currentUser || groupIds.length === 0) {
            setLoading(false);
            return;
        }

        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        // Query expenses where user is the payer
        const q = query(
            collection(db, "expenses"),
            where("payerId", "==", currentUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const expenses = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as any[];

            // Filter for current month and user's groups
            const monthExpenses = expenses.filter(exp => {
                if (!exp.date?.toDate) return false;
                const expDate = exp.date.toDate();
                return expDate >= monthStart &&
                    expDate <= monthEnd &&
                    groupIds.includes(exp.groupId);
            });

            // Group by category
            const categoryTotals: Record<string, number> = {};
            monthExpenses.forEach(exp => {
                const category = exp.category || 'Other';
                categoryTotals[category] = (categoryTotals[category] || 0) + (exp.totalAmount || 0);
            });

            // Convert to array and sort by amount
            const categoryData: CategorySpending[] = Object.entries(categoryTotals)
                .map(([category, amount]) => ({
                    category,
                    amount,
                    color: getCategoryColor(category)
                }))
                .sort((a, b) => b.amount - a.amount);

            setCategorySpending(categoryData);
            setTotalSpending(monthExpenses.reduce((sum, exp) => sum + (exp.totalAmount || 0), 0));
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser, groupIds]);

    // Calculate pie chart paths
    const calculatePieSlices = () => {
        if (totalSpending === 0) return [];

        const slices: { path: string; color: string; category: string; amount: number; percentage: number; midAngle: number }[] = [];
        let currentAngle = -90; // Start from top

        categorySpending.forEach(cat => {
            const percentage = (cat.amount / totalSpending) * 100;
            const angle = (cat.amount / totalSpending) * 360;

            const startAngle = currentAngle;
            const endAngle = currentAngle + angle;

            // Calculate arc path
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            const x1 = 50 + 40 * Math.cos(startRad);
            const y1 = 50 + 40 * Math.sin(startRad);
            const x2 = 50 + 40 * Math.cos(endRad);
            const y2 = 50 + 40 * Math.sin(endRad);

            const largeArc = angle > 180 ? 1 : 0;

            const path = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;
            const midAngle = startAngle + angle / 2;

            slices.push({
                path,
                color: cat.color,
                category: cat.category,
                amount: cat.amount,
                percentage,
                midAngle
            });

            currentAngle += angle;
        });

        return slices;
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
                <div className="h-6 w-48 bg-gray-200 rounded mb-4"></div>
                <div className="h-48 bg-gray-100 rounded-xl"></div>
            </div>
        );
    }

    if (groupIds.length === 0) {
        return null;
    }

    const currentMonth = format(new Date(), 'MMMM yyyy');
    const pieSlices = calculatePieSlices();

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Monthly Spending</h2>
                    <p className="text-sm text-gray-500">{currentMonth}</p>
                </div>
                <div className="text-right">
                    <span className="text-3xl font-extrabold text-gray-900">
                        ${totalSpending.toFixed(2)}
                    </span>
                    <p className="text-sm text-gray-500">Total spent</p>
                </div>
            </div>

            {totalSpending === 0 ? (
                <div className="flex items-center justify-center h-48 bg-gray-50 rounded-xl">
                    <p className="text-gray-400">No spending this month yet</p>
                </div>
            ) : (
                <div className="flex items-center gap-8">
                    {/* Pie Chart */}
                    <div className="relative w-48 h-48 flex-shrink-0">
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-0">
                            {pieSlices.map((slice, idx) => (
                                <path
                                    key={idx}
                                    d={slice.path}
                                    fill={slice.color}
                                    className="transition-all duration-200 cursor-pointer"
                                    style={{
                                        opacity: hoveredCategory === null || hoveredCategory === slice.category ? 1 : 0.4,
                                        transform: hoveredCategory === slice.category ? 'scale(1.03)' : 'scale(1)',
                                        transformOrigin: 'center'
                                    }}
                                    onMouseEnter={() => setHoveredCategory(slice.category)}
                                    onMouseLeave={() => setHoveredCategory(null)}
                                />
                            ))}
                            {/* Center circle for donut effect */}
                            <circle cx="50" cy="50" r="20" fill="white" />
                        </svg>
                        {/* Center text */}
                        {hoveredCategory && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-xs text-gray-500">{hoveredCategory}</span>
                                <span className="text-sm font-bold text-gray-900">
                                    ${categorySpending.find(c => c.category === hoveredCategory)?.amount.toFixed(2)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Legend */}
                    <div className="flex-1 grid grid-cols-2 gap-2">
                        {categorySpending.map((cat, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer hover:bg-gray-50"
                                style={{
                                    opacity: hoveredCategory === null || hoveredCategory === cat.category ? 1 : 0.5
                                }}
                                onMouseEnter={() => setHoveredCategory(cat.category)}
                                onMouseLeave={() => setHoveredCategory(null)}
                            >
                                <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: cat.color }}
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium text-gray-700 truncate">{cat.category}</div>
                                    <div className="text-xs text-gray-500">
                                        ${cat.amount.toFixed(2)} ({((cat.amount / totalSpending) * 100).toFixed(0)}%)
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
