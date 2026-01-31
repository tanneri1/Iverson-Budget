// Savings Page
import { authService } from '../services/auth.js';
import * as budget from '../services/budget.js';
import { formatCurrency, formatPercent, formatDate, getStartOfMonth, getEndOfMonth, getFormData, showModal, escapeHtml } from '../utils.js';

export async function render() {
    const fundOptions = budget.getAllFundTypes().map(f =>
        `<option value="${f.value}">${f.emoji} ${f.label}</option>`
    ).join('');

    return `
        <div class="section-header">
            <div>
                <h2 class="section-title">Savings</h2>
                <p class="section-subtitle">Build your financial future, one wave at a time</p>
            </div>
        </div>

        <div class="card card-accent mb-xl">
            <div class="card-header">
                <h3 class="card-title">Savings Rate</h3>
            </div>
            <div class="card-body">
                <div class="savings-gauge-container">
                    <div class="savings-gauge">
                        <svg viewBox="0 0 120 120">
                            <circle class="savings-gauge-bg" cx="60" cy="60" r="50"></circle>
                            <circle class="savings-gauge-fill" id="savings-gauge-fill" cx="60" cy="60" r="50"
                                stroke-dasharray="314.16" stroke-dashoffset="314.16"></circle>
                            <circle class="savings-gauge-target" id="savings-gauge-target" cx="60" cy="60" r="50"
                                stroke-dasharray="314.16" stroke-dashoffset="282.74"></circle>
                        </svg>
                        <div class="savings-gauge-center">
                            <div class="savings-gauge-percent" id="savings-percent">0%</div>
                            <div class="savings-gauge-label">Savings Rate</div>
                        </div>
                    </div>
                    <div class="savings-gauge-target-label" id="savings-target-label">10% Target</div>
                    <p id="savings-message" class="text-muted mt-sm" style="font-style: italic; text-align: center;"></p>
                </div>
            </div>
        </div>

        <div class="card card-accent mb-xl">
            <div class="card-header">
                <h3 class="card-title">Add Savings</h3>
            </div>
            <div class="card-body">
                <form id="savings-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Amount</label>
                            <input type="number" name="amount" class="form-input" step="0.01" min="0.01" required placeholder="0.00">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Fund</label>
                            <select name="fund_type" class="form-select" required>
                                ${fundOptions}
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
                    <button type="submit" class="btn btn-primary">Add Savings</button>
                </form>
            </div>
        </div>

        <div class="section-header">
            <h3 class="section-title">Fund Trackers</h3>
        </div>
        <div id="fund-trackers" class="fund-grid mb-xl"></div>

        <div class="section-header">
            <h3 class="section-title">Recent Savings Entries</h3>
        </div>
        <div id="savings-list" class="entry-list"></div>

        <div class="wave-decoration">
            <svg class="wave-back" viewBox="0 0 1440 80" preserveAspectRatio="none">
                <path fill="var(--seafoam)" d="M0,40 C360,80 720,0 1080,40 C1260,60 1350,20 1440,40 L1440,80 L0,80Z"/>
            </svg>
            <svg class="wave-front" viewBox="0 0 1440 80" preserveAspectRatio="none">
                <path fill="var(--teal)" d="M0,50 C240,10 480,70 720,30 C960,-10 1200,60 1440,30 L1440,80 L0,80Z"/>
            </svg>
        </div>
    `;
}

export async function init() {
    document.getElementById('savings-form').addEventListener('submit', handleAddSavings);
    await loadData();
}

async function handleAddSavings(e) {
    e.preventDefault();
    const form = e.target;
    const data = getFormData(form);
    const userId = authService.getUserId();
    const result = await budget.addSavings(userId, data);
    if (result) {
        form.reset();
        form.querySelector('[name="entry_date"]').value = new Date().toISOString().split('T')[0];
        await loadData();
    }
}

async function loadData() {
    const userId = authService.getUserId();
    const profile = authService.getProfile();
    const now = new Date();
    const startDate = getStartOfMonth(now).toISOString().split('T')[0];
    const endDate = getEndOfMonth(now).toISOString().split('T')[0];

    // Get monthly data for rate calculation
    const [monthIncome, monthSavings] = await Promise.all([
        budget.getIncome(userId, startDate, endDate),
        budget.getSavings(userId, startDate, endDate)
    ]);

    const totalIncome = budget.getTotalIncome(monthIncome);
    const totalSavings = budget.getTotalSavings(monthSavings);
    const savingsRate = budget.calculateSavingsRate(totalIncome, totalSavings);

    // Update gauge
    const circumference = 2 * Math.PI * 50;
    const rateForGauge = Math.min(savingsRate, 100);
    const offset = circumference - (rateForGauge / 100) * circumference;
    document.getElementById('savings-gauge-fill').style.strokeDashoffset = offset;
    document.getElementById('savings-percent').textContent = formatPercent(savingsRate);

    const targetRate = profile?.savings_rate_target || 10;
    const targetOffset = circumference - (targetRate / 100) * circumference;
    document.getElementById('savings-gauge-target').style.strokeDashoffset = targetOffset;
    document.getElementById('savings-target-label').textContent = `${targetRate}% Target`;

    document.getElementById('savings-message').textContent = budget.getSavingsMessage(savingsRate);

    // Fund trackers - get all-time totals for each fund
    const fundTypes = budget.getAllFundTypes();
    const fundDataPromises = fundTypes.map(f => budget.getSavingsByFund(userId, f.value));
    const fundDataResults = await Promise.all(fundDataPromises);

    const fundTrackers = document.getElementById('fund-trackers');
    fundTrackers.innerHTML = fundTypes.map((fund, i) => {
        const entries = fundDataResults[i];
        const total = budget.getTotalSavings(entries);
        const goalKey = `${fund.value}_fund_goal`;
        const goal = profile?.[goalKey] || 0;
        const progressPct = goal > 0 ? Math.min((total / goal) * 100, 100) : 0;

        let extraContent = '';
        if (fund.value === 'waffles') {
            extraContent = `<div class="fund-card-message">${budget.getWafflesMessage(total)}</div>`;
        } else if (fund.value === 'retirement') {
            const countdown = budget.getRetirementCountdown(profile?.retirement_date);
            if (countdown) {
                extraContent = `<div class="fund-card-message">${countdown.message}</div>`;
            }
        }

        return `
            <div class="fund-card ${fund.value}">
                <div class="fund-card-header">
                    <span class="fund-card-name">${fund.emoji} ${fund.label}</span>
                </div>
                <div class="fund-card-amount">${formatCurrency(total)}</div>
                ${goal > 0 ? `
                    <div class="fund-card-progress">
                        <div class="fund-card-progress-fill" style="width: ${progressPct}%"></div>
                    </div>
                    <div class="fund-card-goal">Goal: ${formatCurrency(goal)} (${Math.round(progressPct)}%)</div>
                ` : ''}
                ${extraContent}
            </div>
        `;
    }).join('');

    // Recent entries (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const recentEntries = await budget.getSavings(userId, threeMonthsAgo.toISOString().split('T')[0], endDate);

    const listEl = document.getElementById('savings-list');
    if (recentEntries.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">\u{1F3D6}\u{FE0F}</div>
                <h3 class="empty-state-title">No savings yet</h3>
                <p>Start building your financial wave above</p>
            </div>
        `;
    } else {
        listEl.innerHTML = recentEntries.map(entry => `
            <div class="entry-item">
                <div class="entry-item-icon">${budget.getFundEmoji(entry.fund_type)}</div>
                <div class="entry-item-info">
                    <div class="entry-item-title">
                        ${budget.getFundLabel(entry.fund_type)}
                        ${entry.description ? '<span class="text-muted"> &middot; ' + escapeHtml(entry.description) + '</span>' : ''}
                    </div>
                    <div class="entry-item-meta">${formatDate(entry.entry_date)}</div>
                </div>
                <div class="entry-item-amount savings">${formatCurrency(entry.amount)}</div>
                <div class="entry-item-actions">
                    <button class="btn btn-danger btn-sm" data-delete="${entry.id}">Delete</button>
                </div>
            </div>
        `).join('');

        listEl.querySelectorAll('[data-delete]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const action = await showModal('Delete Savings Entry', '<p>Are you sure you want to delete this savings entry?</p>', [
                    { id: 'delete', label: 'Delete', class: 'btn-danger' },
                    { id: 'cancel', label: 'Cancel' }
                ]);
                if (action === 'delete') {
                    await budget.deleteSavingsEntry(btn.dataset.delete);
                    await loadData();
                }
            });
        });
    }
}
