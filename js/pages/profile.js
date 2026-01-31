// Profile Page
import { authService } from '../services/auth.js';
import * as budget from '../services/budget.js';
import { formatCurrency, showToast, getFormData, downloadCSV, formatDate } from '../utils.js';

export async function render() {
    const profile = authService.getProfile();
    const user = authService.getUser();

    return `
        <div class="section-header">
            <div>
                <h2 class="section-title">Profile</h2>
                <p class="section-subtitle">Manage your personal info and financial goals</p>
            </div>
        </div>

        <div class="profile-section">
            <h3 class="profile-section-title">Personal Information</h3>
            <form id="profile-form">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Full Name</label>
                        <input type="text" name="full_name" class="form-input" value="${profile?.full_name || ''}" placeholder="Your name">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input type="email" class="form-input" value="${user?.email || ''}" disabled>
                        <div class="form-hint">Email cannot be changed</div>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary">Save Profile</button>
            </form>
        </div>

        <div class="profile-section">
            <h3 class="profile-section-title">Financial Goals</h3>
            <form id="goals-form">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Annual Income Target</label>
                        <input type="number" name="annual_income_target" class="form-input" step="1000" min="0"
                            value="${profile?.annual_income_target || ''}" placeholder="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Savings Rate Target (%)</label>
                        <input type="number" name="savings_rate_target" class="form-input" step="0.5" min="0" max="100"
                            value="${profile?.savings_rate_target || 10}" placeholder="10">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Retirement Date</label>
                        <input type="date" name="retirement_date" class="form-input"
                            value="${profile?.retirement_date || ''}">
                        <div class="form-hint" id="retirement-countdown"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Retirement Savings Goal</label>
                        <input type="number" name="retirement_savings_goal" class="form-input" step="1000" min="0"
                            value="${profile?.retirement_savings_goal || ''}" placeholder="0">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Travel Fund Goal</label>
                        <input type="number" name="travel_fund_goal" class="form-input" step="100" min="0"
                            value="${profile?.travel_fund_goal || ''}" placeholder="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Emergency Fund Goal</label>
                        <input type="number" name="emergency_fund_goal" class="form-input" step="100" min="0"
                            value="${profile?.emergency_fund_goal || ''}" placeholder="0">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Waffles' Fund Goal</label>
                        <input type="number" name="waffles_fund_goal" class="form-input" step="10" min="0"
                            value="${profile?.waffles_fund_goal || ''}" placeholder="0">
                        <div class="form-hint">\u{1F436} For treats, vet visits, and spoiling Waffles</div>
                    </div>
                    <div class="form-group"></div>
                </div>
                <button type="submit" class="btn btn-primary">Save Goals</button>
            </form>
        </div>

        <div class="profile-section">
            <h3 class="profile-section-title">Export Data</h3>
            <p class="text-muted mb-lg">Download your financial data as CSV files</p>
            <div class="export-grid">
                <button class="export-btn" id="export-income">
                    <span class="export-btn-icon">\u{1F4B5}</span>
                    Export Income
                </button>
                <button class="export-btn" id="export-expenses">
                    <span class="export-btn-icon">\u{1F4B8}</span>
                    Export Expenses
                </button>
                <button class="export-btn" id="export-savings">
                    <span class="export-btn-icon">\u{1F3D6}\u{FE0F}</span>
                    Export Savings
                </button>
            </div>
        </div>
    `;
}

export async function init() {
    const profile = authService.getProfile();

    // Profile form
    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = getFormData(e.target);
        await authService.updateProfile({ full_name: data.full_name });
    });

    // Goals form
    document.getElementById('goals-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = getFormData(e.target);
        await authService.updateProfile({
            annual_income_target: data.annual_income_target || 0,
            savings_rate_target: data.savings_rate_target || 10,
            retirement_date: data.retirement_date || null,
            retirement_savings_goal: data.retirement_savings_goal || 0,
            travel_fund_goal: data.travel_fund_goal || 0,
            emergency_fund_goal: data.emergency_fund_goal || 0,
            waffles_fund_goal: data.waffles_fund_goal || 0
        });
    });

    // Retirement countdown
    if (profile?.retirement_date) {
        const countdown = budget.getRetirementCountdown(profile.retirement_date);
        if (countdown) {
            document.getElementById('retirement-countdown').textContent = countdown.message;
        }
    }

    // Export buttons
    document.getElementById('export-income').addEventListener('click', exportIncome);
    document.getElementById('export-expenses').addEventListener('click', exportExpenses);
    document.getElementById('export-savings').addEventListener('click', exportSavings);
}

async function exportIncome() {
    const userId = authService.getUserId();
    const entries = await budget.getIncome(userId);
    if (entries.length === 0) {
        showToast('No income data to export', 'warning');
        return;
    }
    downloadCSV(
        'iverson-budget-income.csv',
        ['Date', 'Amount', 'Source', 'Description', 'Notes', 'Recurring'],
        entries.map(e => [e.entry_date, e.amount, e.source, e.description || '', e.notes || '', e.is_recurring ? 'Yes' : 'No'])
    );
    showToast('Income data exported', 'success');
}

async function exportExpenses() {
    const userId = authService.getUserId();
    const entries = await budget.getExpenses(userId);
    if (entries.length === 0) {
        showToast('No expense data to export', 'warning');
        return;
    }
    downloadCSV(
        'iverson-budget-expenses.csv',
        ['Date', 'Amount', 'Category', 'Description', 'Notes', 'Recurring'],
        entries.map(e => [e.entry_date, e.amount, e.category, e.description || '', e.notes || '', e.is_recurring ? 'Yes' : 'No'])
    );
    showToast('Expense data exported', 'success');
}

async function exportSavings() {
    const userId = authService.getUserId();
    const entries = await budget.getSavings(userId);
    if (entries.length === 0) {
        showToast('No savings data to export', 'warning');
        return;
    }
    downloadCSV(
        'iverson-budget-savings.csv',
        ['Date', 'Amount', 'Fund', 'Description', 'Notes'],
        entries.map(e => [e.entry_date, e.amount, budget.getFundLabel(e.fund_type), e.description || '', e.notes || ''])
    );
    showToast('Savings data exported', 'success');
}
