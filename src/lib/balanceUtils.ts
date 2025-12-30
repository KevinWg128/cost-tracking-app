/**
 * Balance Utilities for Group Members
 * 
 * Provides server-side balance calculation for validating member removal
 */

import { adminDb } from './firebaseAdmin';
import { logger } from './logger';

interface ExpenseItem {
    price: number;
    isShared?: boolean;
    assignments?: Array<{ uid: string; amount: number }>;
    assignedTo?: string[];
}

interface Expense {
    payerId: string;
    totalAmount: number;
    items: ExpenseItem[];
}

interface Payment {
    payerId: string;
    payeeId: string;
    amount: number;
}

/**
 * Calculate a member's balance in a group
 * Positive = member is owed money, Negative = member owes money
 * @param groupId - The group ID
 * @param memberId - The member's user ID
 * @returns The member's balance (positive = owed, negative = owes)
 */
export async function getMemberBalance(groupId: string, memberId: string): Promise<number> {
    try {
        // Fetch all expenses for this group
        const expensesSnap = await adminDb
            .collection('expenses')
            .where('groupId', '==', groupId)
            .get();

        const expenses: Expense[] = expensesSnap.docs.map(doc => doc.data() as Expense);

        // Fetch all payments for this group
        const paymentsSnap = await adminDb
            .collection('payments')
            .where('groupId', '==', groupId)
            .get();

        const payments: Payment[] = paymentsSnap.docs.map(doc => doc.data() as Payment);

        let balance = 0;

        // Process expenses
        expenses.forEach(exp => {
            // If member is the payer, they get +totalAmount (they paid for everyone)
            if (exp.payerId === memberId) {
                balance += exp.totalAmount;
            }

            // Subtract member's share from items
            exp.items.forEach(item => {
                // Skip items that are not shared
                if (item.isShared === false) return;

                // New structure with assignments
                if (item.assignments && Array.isArray(item.assignments)) {
                    item.assignments.forEach(assignment => {
                        if (assignment.uid === memberId) {
                            balance -= assignment.amount;
                        }
                    });
                }
                // Legacy fallback with assignedTo
                else if (item.assignedTo && Array.isArray(item.assignedTo)) {
                    if (item.assignedTo.includes(memberId)) {
                        const share = item.price / item.assignedTo.length;
                        balance -= share;
                    }
                }
            });
        });

        // Process payments
        payments.forEach(pay => {
            // If member paid someone (settled their debt)
            if (pay.payerId === memberId) {
                balance += pay.amount;
            }
            // If member received money (someone settled debt with them)
            if (pay.payeeId === memberId) {
                balance -= pay.amount;
            }
        });

        return balance;
    } catch (error) {
        logger.error('Error calculating member balance', error, { groupId, memberId });
        throw error;
    }
}

/**
 * Check if a member's balance is settled (zero or near-zero)
 * Uses a small threshold to account for floating-point precision
 * @param groupId - The group ID
 * @param memberId - The member's user ID
 * @returns true if balance is settled, false otherwise
 */
export async function isMemberBalanceSettled(groupId: string, memberId: string): Promise<boolean> {
    const THRESHOLD = 0.01; // $0.01 threshold for floating-point comparison

    try {
        const balance = await getMemberBalance(groupId, memberId);
        return Math.abs(balance) < THRESHOLD;
    } catch (error) {
        logger.error('Error checking if balance is settled', error, { groupId, memberId });
        // Return false on error to prevent accidental removal
        return false;
    }
}
