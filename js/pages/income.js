// Income Page
import { authService } from '../services/auth.js';
import * as budget from '../services/budget.js';
import { formatCurrency, formatDate, getStartOfMonth, getEndOfMonth, getFormData, showModal, escapeHtml } from '../utils.js';

let currentMonth = new Date();

export async function render() {
    const monthLabel = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return `
        <div class="section-header">
            <div>
                <h2 class="section-title">Income</h2>
                <p class="section-subtitle">Track your earnings and income sources</p>
            </div>
        </div>

        <div class="card card-accent mb-xl">
            <div class="card-header">
                <h3 class="card-title">Add Income</h3>
            </div>
            <div class="card-body">
                <form id="income-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Amount</label>
                            <input type="number" name="amount" class="form-input" step="0.01" min="0.01" required placeholder="0.00">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Source</label>
                            <select name="source" class="form-select" required>
                                <option value="Salary">Salary</option>
                                <option value="Bonus">Bonus</option>
                                <option value="Side Income">Side Income</option>
                                <option value="Investment">Investment</option>
                                <option value="Rental">Rental</option>
                                <option value="Other">Other</option>
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
                            <input type="text" name="description" class="form-input" placeholder="Optional description">
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
                                Recurring income
                            </label>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary">Add Income</button>
                </form>
            </div>
        </div>

        <div class="month-nav">
            <button class="month-nav-btn" id="prev-month">&larr;</button>
            <h3 class="month-nav-title" id="month-label">${monthLabel}</h3>
            <button class="month-nav-btn" id="next-month">&rarr;</button>
        </div>

        <div class="stat-grid mb-xl">
            <div class="stat-card income">
                <div class="stat-card-label">Monthly Total</div>
                <div class="stat-card-value" id="monthly-total">--</div>
            </div>
        </div>

        <div class="section-header">
            <h3 class="section-title">Source Breakdown</h3>
        </div>
        <div id="source-breakdown" class="category-grid mb-xl"></div>

        <div class="section-header">
            <h3 class="section-title">Entries</h3>
        </div>
        <div id="income-list" class="entry-list"></div>
    `;
}

export async function init() {
    document.getElementById('income-form').addEventListener('submit', handleAddIncome);
    document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => changeMonth(1));

    await loadData();
}

async function handleAddIncome(e) {
    e.preventDefault();
    const form = e.target;
    const data = getFormData(form);

    // Handle checkbox
    data.is_recurring = form.querySelector('[name="is_recurring"]').checked;

    const userId = authService.getUserId();
    const result = await budget.addIncome(userId, data);
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

    const entries = await budget.getIncome(userId, startDate, endDate);
    const total = budget.getTotalIncome(entries);
    const sources = budget.getIncomeBySource(entries);

    // Monthly total
    document.getElementById('monthly-total').textContent = formatCurrency(total);

    // Source breakdown
    const sourceEl = document.getElementById('source-breakdown');
    if (sources.length === 0) {
        sourceEl.innerHTML = '<p class="text-muted">No income this month</p>';
    } else {
        const maxAmount = sources[0].total;
        sourceEl.innerHTML = sources.map(s => `
            <div class="category-card">
                <div class="category-card-icon">\u{1F4B5}</div>
                <div class="category-card-info">
                    <div class="category-card-name">${escapeHtml(s.source)}</div>
                    <div class="category-card-amount">${formatCurrency(s.total)}</div>
                    <div class="category-card-bar">
                        <div class="category-card-bar-fill" style="width: ${(s.total / maxAmount) * 100}%; background: var(--success);"></div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Entry list
    const listEl = document.getElementById('income-list');
    if (entries.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">\u{1F4B5}</div>
                <h3 class="empty-state-title">No income entries</h3>
                <p>Add your first income entry above</p>
            </div>
        `;
    } else {
        listEl.innerHTML = entries.map(entry => `
            <div class="entry-item">
                <div class="entry-item-icon">\u{1F4B5}</div>
                <div class="entry-item-info">
                    <div class="entry-item-title">
                        ${escapeHtml(entry.source)}
                        ${entry.is_recurring ? '<span class="category-badge general">Recurring</span>' : ''}
                    </div>
                    <div class="entry-item-meta">
                        ${formatDate(entry.entry_date)}
                        ${entry.description ? ' &middot; ' + escapeHtml(entry.description) : ''}
                    </div>
                </div>
                <div class="entry-item-amount income">${formatCurrency(entry.amount)}</div>
                <div class="entry-item-actions">
                    <button class="btn btn-ghost btn-sm" data-edit="${entry.id}">Edit</button>
                    <button class="btn btn-danger btn-sm" data-delete="${entry.id}">Delete</button>
                </div>
            </div>
        `).join('');

        // Event listeners
        listEl.querySelectorAll('[data-delete]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const action = await showModal('Delete Income', '<p>Are you sure you want to delete this income entry?</p>', [
                    { id: 'delete', label: 'Delete', class: 'btn-danger' },
                    { id: 'cancel', label: 'Cancel' }
                ]);
                if (action === 'delete') {
                    await budget.deleteIncome(btn.dataset.delete);
                    await loadData();
                }
            });
        });

        listEl.querySelectorAll('[data-edit]').forEach(btn => {
            btn.addEventListener('click', () => handleEditIncome(btn.dataset.edit, entries));
        });
    }
}

async function handleEditIncome(id, entries) {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    const formHtml = `
        <div class="form-group">
            <label class="form-label">Amount</label>
            <input type="number" id="edit-amount" class="form-input" step="0.01" value="${entry.amount}" required>
        </div>
        <div class="form-group">
            <label class="form-label">Source</label>
            <select id="edit-source" class="form-select">
                ${['Salary','Bonus','Side Income','Investment','Rental','Other'].map(s =>
                    `<option value="${s}" ${entry.source === s ? 'selected' : ''}>${s}</option>`
                ).join('')}
            </select>
        </div>
        <div class="form-group">
            <label class="form-label">Date</label>
            <input type="date" id="edit-date" class="form-input" value="${entry.entry_date}">
        </div>
        <div class="form-group">
            <label class="form-label">Description</label>
            <input type="text" id="edit-desc" class="form-input" value="${escapeHtml(entry.description || '')}">
        </div>
    `;

    const action = await showModal('Edit Income', formHtml, [
        { id: 'save', label: 'Save', class: 'btn-primary' },
        { id: 'cancel', label: 'Cancel' }
    ]);

    if (action === 'save') {
        const updates = {
            amount: parseFloat(document.getElementById('edit-amount').value),
            source: document.getElementById('edit-source').value,
            entry_date: document.getElementById('edit-date').value,
            description: document.getElementById('edit-desc').value || null
        };
        await budget.updateIncome(id, updates);
        await loadData();
    }
}

export function cleanup() {
    currentMonth = new Date();
}
