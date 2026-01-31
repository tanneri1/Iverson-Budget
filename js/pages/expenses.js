// Expenses Page
import { authService } from '../services/auth.js';
import * as budget from '../services/budget.js';
import { formatCurrency, formatDate, getStartOfMonth, getEndOfMonth, getFormData, showModal, escapeHtml, getCategoryEmoji, getCategoryClass, getAllCategories } from '../utils.js';

let currentMonth = new Date();
let activeFilter = null;

const EXPENSE_CATEGORIES = [
    'Housing', 'Groceries', 'Dining', 'Travel', 'Surf', 'Yoga',
    'Pet Care (Waffles)', 'Auto', 'Medical', 'Insurance',
    'Utilities', 'Entertainment', 'Gifts (Kids)', 'General'
];

export async function render() {
    const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const categoryOptions = EXPENSE_CATEGORIES.map(c =>
        `<option value="${c}">${getCategoryEmoji(c)} ${c}</option>`
    ).join('');

    return `
        <div class="section-header">
            <div>
                <h2 class="section-title">Expenses</h2>
                <p class="section-subtitle">Track and categorize your spending</p>
            </div>
        </div>

        <div id="expense-warning"></div>

        <div class="card card-accent mb-xl">
            <div class="card-header">
                <h3 class="card-title">Add Expense</h3>
            </div>
            <div class="card-body">
                <form id="expense-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Amount</label>
                            <input type="number" name="amount" class="form-input" step="0.01" min="0.01" required placeholder="0.00">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Category</label>
                            <select name="category" class="form-select" required>
                                ${categoryOptions}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Date</label>
                            <input type="date" name="entry_date" class="form-input" value="${new Date().toISOString().split('T')[0]}" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Description</label>
                            <input type="text" name="description" class="form-input" placeholder="What was this for?">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Notes</label>
                            <input type="text" name="notes" class="form-input" placeholder="Optional notes">
                        </div>
                        <div class="form-group" style="display: flex; align-items: flex-end;">
                            <label class="form-checkbox">
                                <input type="checkbox" name="is_recurring" value="true">
                                Recurring expense
                            </label>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary">Add Expense</button>
                </form>
            </div>
        </div>

        <div class="month-nav">
            <button class="month-nav-btn" id="prev-month">&larr;</button>
            <h3 class="month-nav-title" id="month-label">${monthLabel}</h3>
            <button class="month-nav-btn" id="next-month">&rarr;</button>
        </div>

        <div class="card card-accent mb-xl">
            <div class="card-header">
                <h3 class="card-title">Budget Status</h3>
            </div>
            <div class="card-body">
                <div id="budget-comparison" class="comparison-bar-container">
                    <div class="comparison-bar-labels">
                        <span class="income-label" id="budget-income-label">Income: --</span>
                        <span class="expense-label" id="budget-expense-label">Expenses: --</span>
                    </div>
                    <div class="comparison-bar">
                        <div class="comparison-bar-fill healthy" id="budget-bar-fill" style="width: 0%"></div>
                    </div>
                </div>
            </div>
        </div>

        <div class="section-header">
            <h3 class="section-title">Category Breakdown</h3>
        </div>
        <div id="category-breakdown" class="category-grid mb-xl"></div>

        <div class="section-header">
            <h3 class="section-title">Entries</h3>
        </div>

        <div id="filter-bar" class="filter-bar mb-md"></div>
        <div id="expense-list" class="entry-list"></div>
    `;
}

export async function init() {
    document.getElementById('expense-form').addEventListener('submit', handleAddExpense);
    document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => changeMonth(1));

    await loadData();
}

async function handleAddExpense(e) {
    e.preventDefault();
    const form = e.target;
    const data = getFormData(form);
    data.is_recurring = form.querySelector('[name="is_recurring"]').checked;

    const userId = authService.getUserId();
    const result = await budget.addExpense(userId, data);
    if (result) {
        form.reset();
        form.querySelector('[name="entry_date"]').value = new Date().toISOString().split('T')[0];
        await loadData();
    }
}

function changeMonth(delta) {
    currentMonth.setMonth(currentMonth.getMonth() + delta);
    document.getElementById('month-label').textContent = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    loadData();
}

async function loadData() {
    const userId = authService.getUserId();
    const startDate = getStartOfMonth(currentMonth).toISOString().split('T')[0];
    const endDate = getEndOfMonth(currentMonth).toISOString().split('T')[0];

    const [expenses, income] = await Promise.all([
        budget.getExpenses(userId, startDate, endDate),
        budget.getIncome(userId, startDate, endDate)
    ]);

    const totalExpenses = budget.getTotalExpenses(expenses);
    const totalIncome = budget.getTotalIncome(income);
    const health = budget.getBudgetHealthLevel(totalIncome, totalExpenses);
    const categories = budget.getExpensesByCategory(expenses);

    // Warning banner
    const warningEl = document.getElementById('expense-warning');
    if (totalIncome > 0 && totalExpenses > totalIncome * 0.9) {
        const isOver = totalExpenses > totalIncome;
        warningEl.innerHTML = `
            <div class="warning-banner ${isOver ? 'danger' : ''}">
                <span class="warning-banner-icon">${isOver ? '\u{1F6A8}' : '\u{26A0}\u{FE0F}'}</span>
                <div>
                    <strong>${isOver ? 'Over budget!' : 'Approaching income limit!'}</strong>
                    You've spent ${formatCurrency(totalExpenses)} of your ${formatCurrency(totalIncome)} income this month.
                </div>
            </div>
        `;
    } else {
        warningEl.innerHTML = '';
    }

    // Budget comparison bar
    document.getElementById('budget-income-label').textContent = `Income: ${formatCurrency(totalIncome)}`;
    document.getElementById('budget-expense-label').textContent = `Expenses: ${formatCurrency(totalExpenses)}`;
    const barFill = document.getElementById('budget-bar-fill');
    const ratio = totalIncome > 0 ? Math.min((totalExpenses / totalIncome) * 100, 100) : 0;
    barFill.style.width = `${ratio}%`;
    barFill.className = `comparison-bar-fill ${health}`;
    barFill.textContent = totalIncome > 0 ? `${Math.round(ratio)}%` : '';

    // Category breakdown
    const categoryEl = document.getElementById('category-breakdown');
    if (categories.length === 0) {
        categoryEl.innerHTML = '<p class="text-muted">No expenses this month</p>';
    } else {
        const maxAmount = categories[0].total;
        categoryEl.innerHTML = categories.map(cat => `
            <div class="category-card">
                <div class="category-card-icon">${getCategoryEmoji(cat.category)}</div>
                <div class="category-card-info">
                    <div class="category-card-name">${escapeHtml(cat.category)}</div>
                    <div class="category-card-amount">${formatCurrency(cat.total)}</div>
                    <div class="category-card-bar">
                        <div class="category-card-bar-fill" style="width: ${(cat.total / maxAmount) * 100}%; background: var(--cat-${getCategoryClass(cat.category)});"></div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Filter bar
    const usedCategories = [...new Set(expenses.map(e => e.category))];
    const filterBar = document.getElementById('filter-bar');
    filterBar.innerHTML = `
        <button class="filter-chip ${!activeFilter ? 'active' : ''}" data-filter="">All</button>
        ${usedCategories.map(cat =>
            `<button class="filter-chip ${activeFilter === cat ? 'active' : ''}" data-filter="${cat}">${getCategoryEmoji(cat)} ${cat}</button>`
        ).join('')}
    `;

    filterBar.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            activeFilter = chip.dataset.filter || null;
            loadData();
        });
    });

    // Entry list
    const filtered = activeFilter ? expenses.filter(e => e.category === activeFilter) : expenses;
    const listEl = document.getElementById('expense-list');

    if (filtered.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">\u{1F4B8}</div>
                <h3 class="empty-state-title">No expenses</h3>
                <p>${activeFilter ? `No ${activeFilter} expenses this month` : 'Add your first expense above'}</p>
            </div>
        `;
    } else {
        listEl.innerHTML = filtered.map(entry => `
            <div class="entry-item">
                <div class="entry-item-icon">${getCategoryEmoji(entry.category)}</div>
                <div class="entry-item-info">
                    <div class="entry-item-title">
                        ${escapeHtml(entry.description || entry.category)}
                        <span class="category-badge ${getCategoryClass(entry.category)}">${entry.category}</span>
                        ${entry.is_recurring ? '<span class="category-badge general">Recurring</span>' : ''}
                    </div>
                    <div class="entry-item-meta">${formatDate(entry.entry_date)}${entry.notes ? ' &middot; ' + escapeHtml(entry.notes) : ''}</div>
                </div>
                <div class="entry-item-amount expense">${formatCurrency(entry.amount)}</div>
                <div class="entry-item-actions">
                    <button class="btn btn-ghost btn-sm" data-edit="${entry.id}">Edit</button>
                    <button class="btn btn-danger btn-sm" data-delete="${entry.id}">Delete</button>
                </div>
            </div>
        `).join('');

        listEl.querySelectorAll('[data-delete]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const action = await showModal('Delete Expense', '<p>Are you sure you want to delete this expense?</p>', [
                    { id: 'delete', label: 'Delete', class: 'btn-danger' },
                    { id: 'cancel', label: 'Cancel' }
                ]);
                if (action === 'delete') {
                    await budget.deleteExpense(btn.dataset.delete);
                    await loadData();
                }
            });
        });

        listEl.querySelectorAll('[data-edit]').forEach(btn => {
            btn.addEventListener('click', () => handleEditExpense(btn.dataset.edit, expenses));
        });
    }
}

async function handleEditExpense(id, entries) {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    const categoryOptions = EXPENSE_CATEGORIES.map(c =>
        `<option value="${c}" ${entry.category === c ? 'selected' : ''}>${getCategoryEmoji(c)} ${c}</option>`
    ).join('');

    const formHtml = `
        <div class="form-group">
            <label class="form-label">Amount</label>
            <input type="number" id="edit-amount" class="form-input" step="0.01" value="${entry.amount}" required>
        </div>
        <div class="form-group">
            <label class="form-label">Category</label>
            <select id="edit-category" class="form-select">${categoryOptions}</select>
        </div>
        <div class="form-group">
            <label class="form-label">Date</label>
            <input type="date" id="edit-date" class="form-input" value="${entry.entry_date}">
        </div>
        <div class="form-group">
            <label class="form-label">Description</label>
            <input type="text" id="edit-desc" class="form-input" value="${escapeHtml(entry.description || '')}">
        </div>
        <div class="form-group">
            <label class="form-label">Notes</label>
            <input type="text" id="edit-notes" class="form-input" value="${escapeHtml(entry.notes || '')}">
        </div>
    `;

    const action = await showModal('Edit Expense', formHtml, [
        { id: 'save', label: 'Save', class: 'btn-primary' },
        { id: 'cancel', label: 'Cancel' }
    ]);

    if (action === 'save') {
        const updates = {
            amount: parseFloat(document.getElementById('edit-amount').value),
            category: document.getElementById('edit-category').value,
            entry_date: document.getElementById('edit-date').value,
            description: document.getElementById('edit-desc').value || null,
            notes: document.getElementById('edit-notes').value || null
        };
        await budget.updateExpense(id, updates);
        await loadData();
    }
}

export function cleanup() {
    currentMonth = new Date();
    activeFilter = null;
}
