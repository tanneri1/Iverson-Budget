// Budget Service - Business logic for income, expenses, and savings
import { incomeEntries, expenseEntries, savingsEntries } from '../lib/supabase.js';
import { showToast } from '../utils.js';

// ============================================
// INCOME CRUD
// ============================================
export async function addIncome(userId, data) {
    try {
        const entry = await incomeEntries.create({ user_id: userId, ...data });
        showToast('Income added', 'success');
        return entry;
    } catch (error) {
        showToast('Failed to add income: ' + error.message, 'error');
        return null;
    }
}

export async function getIncome(userId, startDate, endDate) {
    try {
        return await incomeEntries.list(userId, startDate, endDate);
    } catch (error) {
        showToast('Failed to load income', 'error');
        return [];
    }
}

export async function updateIncome(id, updates) {
    try {
        const entry = await incomeEntries.update(id, updates);
        showToast('Income updated', 'success');
        return entry;
    } catch (error) {
        showToast('Failed to update income: ' + error.message, 'error');
        return null;
    }
}

export async function deleteIncome(id) {
    try {
        await incomeEntries.delete(id);
        showToast('Income entry deleted', 'success');
        return true;
    } catch (error) {
        showToast('Failed to delete: ' + error.message, 'error');
        return false;
    }
}

// ============================================
// EXPENSE CRUD
// ============================================
export async function addExpense(userId, data) {
    try {
        const entry = await expenseEntries.create({ user_id: userId, ...data });
        showToast('Expense added', 'success');
        return entry;
    } catch (error) {
        showToast('Failed to add expense: ' + error.message, 'error');
        return null;
    }
}

export async function getExpenses(userId, startDate, endDate) {
    try {
        return await expenseEntries.list(userId, startDate, endDate);
    } catch (error) {
        showToast('Failed to load expenses', 'error');
        return [];
    }
}

export async function updateExpense(id, updates) {
    try {
        const entry = await expenseEntries.update(id, updates);
        showToast('Expense updated', 'success');
        return entry;
    } catch (error) {
        showToast('Failed to update expense: ' + error.message, 'error');
        return null;
    }
}

export async function deleteExpense(id) {
    try {
        await expenseEntries.delete(id);
        showToast('Expense deleted', 'success');
        return true;
    } catch (error) {
        showToast('Failed to delete: ' + error.message, 'error');
        return false;
    }
}

// ============================================
// SAVINGS CRUD
// ============================================
export async function addSavings(userId, data) {
    try {
        const entry = await savingsEntries.create({ user_id: userId, ...data });
        showToast('Savings added', 'success');
        return entry;
    } catch (error) {
        showToast('Failed to add savings: ' + error.message, 'error');
        return null;
    }
}

export async function getSavings(userId, startDate, endDate) {
    try {
        return await savingsEntries.list(userId, startDate, endDate);
    } catch (error) {
        showToast('Failed to load savings', 'error');
        return [];
    }
}

export async function getSavingsByFund(userId, fundType) {
    try {
        return await savingsEntries.listByFund(userId, fundType);
    } catch (error) {
        showToast('Failed to load fund data', 'error');
        return [];
    }
}

export async function deleteSavingsEntry(id) {
    try {
        await savingsEntries.delete(id);
        showToast('Savings entry deleted', 'success');
        return true;
    } catch (error) {
        showToast('Failed to delete: ' + error.message, 'error');
        return false;
    }
}

// ============================================
// AGGREGATION METHODS
// ============================================
export function getTotalIncome(entries) {
    return entries.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
}

export function getTotalExpenses(entries) {
    return entries.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
}

export function getTotalSavings(entries) {
    return entries.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
}

export function getExpensesByCategory(entries) {
    const map = {};
    entries.forEach(e => {
        const cat = e.category || 'General';
        map[cat] = (map[cat] || 0) + parseFloat(e.amount || 0);
    });
    return Object.entries(map)
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total);
}

export function getIncomeBySource(entries) {
    const map = {};
    entries.forEach(e => {
        const src = e.source || 'Other';
        map[src] = (map[src] || 0) + parseFloat(e.amount || 0);
    });
    return Object.entries(map)
        .map(([source, total]) => ({ source, total }))
        .sort((a, b) => b.total - a.total);
}

export function getSavingsByType(entries) {
    const map = {};
    entries.forEach(e => {
        const fund = e.fund_type || 'general';
        map[fund] = (map[fund] || 0) + parseFloat(e.amount || 0);
    });
    return map;
}

// ============================================
// CALCULATION METHODS
// ============================================
export function calculateSavingsRate(totalIncome, totalSavings) {
    if (totalIncome <= 0) return 0;
    return (totalSavings / totalIncome) * 100;
}

export function isSpendingUnderIncome(totalIncome, totalExpenses) {
    return totalExpenses <= totalIncome;
}

export function getBudgetHealthLevel(totalIncome, totalExpenses) {
    if (totalIncome <= 0) return 'neutral';
    const ratio = totalExpenses / totalIncome;
    if (ratio <= 0.7) return 'healthy';
    if (ratio <= 0.9) return 'warning';
    return 'danger';
}

export function getRemainingBudget(totalIncome, totalExpenses, totalSavings) {
    return totalIncome - totalExpenses - totalSavings;
}

// ============================================
// FUND HELPERS
// ============================================
const FUND_TYPES = {
    retirement: { label: 'Retirement Fund', emoji: '\u{1F3D6}\u{FE0F}' },
    travel: { label: 'Travel Fund', emoji: '\u{2708}\u{FE0F}' },
    emergency: { label: 'Emergency Fund', emoji: '\u{1F6E1}\u{FE0F}' },
    waffles: { label: "Waffles' Treat Fund", emoji: '\u{1F436}' },
    general: { label: 'General Savings', emoji: '\u{1F4B0}' }
};

export function getFundLabel(fundType) {
    return FUND_TYPES[fundType]?.label || 'General Savings';
}

export function getFundEmoji(fundType) {
    return FUND_TYPES[fundType]?.emoji || '\u{1F4B0}';
}

export function getAllFundTypes() {
    return Object.entries(FUND_TYPES).map(([key, val]) => ({
        value: key,
        label: val.label,
        emoji: val.emoji
    }));
}

// Waffles personality messages
export function getWafflesMessage(amount) {
    if (amount >= 500) return "Waffles is living the good life! Premium treats incoming!";
    if (amount >= 200) return "Waffles approves! That's a lot of belly rubs worth of treats!";
    if (amount >= 100) return "Waffles is wagging! Treat jar is looking full!";
    if (amount >= 50) return "Good start! Waffles can smell the treats already!";
    if (amount > 0) return "Every dollar counts toward Waffles' happiness!";
    return "Waffles is giving you puppy eyes... time to save!";
}

// Savings rate messages (surf themed)
export function getSavingsMessage(rate) {
    if (rate >= 30) return "Riding a massive wave! Incredible savings!";
    if (rate >= 20) return "Catching great waves! Well above target!";
    if (rate >= 10) return "Riding the wave! You hit your 10% target!";
    if (rate >= 5) return "Paddle harder! Getting close to the 10% target.";
    if (rate > 0) return "Getting your feet wet. Keep building that savings wave!";
    return "Still on the shore. Time to paddle out!";
}

// Retirement countdown
export function getRetirementCountdown(retirementDate) {
    if (!retirementDate) return null;
    const now = new Date();
    const target = new Date(retirementDate);
    const diffMs = target - now;
    if (diffMs <= 0) return { years: 0, months: 0, message: "The endless summer has begun!" };

    const years = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
    const months = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));
    const message = `${years} year${years !== 1 ? 's' : ''} and ${months} month${months !== 1 ? 's' : ''} until the endless summer`;
    return { years, months, message };
}
