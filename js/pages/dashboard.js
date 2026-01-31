// Dashboard Page
import { authService } from '../services/auth.js';
import * as budget from '../services/budget.js';
import { formatCurrency, formatPercent, getStartOfMonth, getEndOfMonth, getCategoryEmoji, getCategoryClass } from '../utils.js';

export async function render() {
    return `
        <div id="dashboard-greeting" class="greeting-banner">
            <h2 class="greeting-title">Loading...</h2>
            <p class="greeting-subtitle">Ride the wave to financial freedom</p>
        </div>

        <div id="dashboard-stats" class="stat-grid">
            <div class="stat-card income">
                <div class="stat-card-label">Monthly Income</div>
                <div class="stat-card-value" id="stat-income">--</div>
                <div class="stat-card-sub">This month</div>
            </div>
            <div class="stat-card expenses">
                <div class="stat-card-label">Monthly Expenses</div>
                <div class="stat-card-value" id="stat-expenses">--</div>
                <div class="stat-card-sub">This month</div>
            </div>
            <div class="stat-card savings">
                <div class="stat-card-label">Savings Rate</div>
                <div class="stat-card-value" id="stat-savings-rate">--</div>
                <div class="stat-card-sub">Target: 10%+</div>
            </div>
            <div class="stat-card remaining">
                <div class="stat-card-label">Remaining</div>
                <div class="stat-card-value" id="stat-remaining">--</div>
                <div class="stat-card-sub">After expenses & savings</div>
            </div>
        </div>

        <div class="card card-accent mb-xl">
            <div class="card-header">
                <h3 class="card-title">Income vs Expenses</h3>
            </div>
            <div class="card-body">
                <div id="comparison-bar" class="comparison-bar-container">
                    <div class="comparison-bar-labels">
                        <span class="income-label" id="comp-income-label">Income: --</span>
                        <span class="expense-label" id="comp-expense-label">Expenses: --</span>
                    </div>
                    <div class="comparison-bar">
                        <div class="comparison-bar-fill healthy" id="comp-bar-fill" style="width: 0%"></div>
                    </div>
                </div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-xl); margin-bottom: var(--space-xl);">
            <div class="card card-accent">
                <div class="card-header">
                    <h3 class="card-title">Savings Rate</h3>
                </div>
                <div class="card-body">
                    <div class="savings-gauge-container" id="dashboard-gauge">
                        <div class="savings-gauge">
                            <svg viewBox="0 0 120 120">
                                <circle class="savings-gauge-bg" cx="60" cy="60" r="50"></circle>
                                <circle class="savings-gauge-fill" id="gauge-fill" cx="60" cy="60" r="50"
                                    stroke-dasharray="314.16" stroke-dashoffset="314.16"></circle>
                                <circle class="savings-gauge-target" id="gauge-target" cx="60" cy="60" r="50"
                                    stroke-dasharray="314.16" stroke-dashoffset="282.74"></circle>
                            </svg>
                            <div class="savings-gauge-center">
                                <div class="savings-gauge-percent" id="gauge-percent">0%</div>
                                <div class="savings-gauge-label">Savings Rate</div>
                            </div>
                        </div>
                        <div class="savings-gauge-target-label">10% Target</div>
                        <p id="gauge-message" class="text-muted mt-sm" style="font-style: italic; text-align: center;"></p>
                    </div>
                </div>
            </div>

            <div class="card card-accent">
                <div class="card-header">
                    <h3 class="card-title">Spending by Category</h3>
                </div>
                <div class="card-body">
                    <div id="category-breakdown" class="category-grid"></div>
                </div>
            </div>
        </div>

        <div id="waffles-card-container"></div>

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
    const userId = authService.getUserId();
    const profile = authService.getProfile();
    const now = new Date();
    const startDate = getStartOfMonth(now).toISOString().split('T')[0];
    const endDate = getEndOfMonth(now).toISOString().split('T')[0];

    // Set greeting
    const hour = now.getHours();
    let greeting = 'Good evening';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 17) greeting = 'Good afternoon';
    const name = profile?.full_name || 'there';

    const greetingEl = document.getElementById('dashboard-greeting');
    greetingEl.querySelector('.greeting-title').textContent = `${greeting}, ${name}!`;

    // Fetch data
    const [incomeData, expenseData, savingsData] = await Promise.all([
        budget.getIncome(userId, startDate, endDate),
        budget.getExpenses(userId, startDate, endDate),
        budget.getSavings(userId, startDate, endDate)
    ]);

    const totalIncome = budget.getTotalIncome(incomeData);
    const totalExpenses = budget.getTotalExpenses(expenseData);
    const totalSavings = budget.getTotalSavings(savingsData);
    const savingsRate = budget.calculateSavingsRate(totalIncome, totalSavings);
    const remaining = budget.getRemainingBudget(totalIncome, totalExpenses, totalSavings);
    const health = budget.getBudgetHealthLevel(totalIncome, totalExpenses);

    // Update stat cards
    document.getElementById('stat-income').textContent = formatCurrency(totalIncome);
    document.getElementById('stat-expenses').textContent = formatCurrency(totalExpenses);
    document.getElementById('stat-savings-rate').textContent = formatPercent(savingsRate);
    document.getElementById('stat-remaining').textContent = formatCurrency(remaining);

    // Update comparison bar
    document.getElementById('comp-income-label').textContent = `Income: ${formatCurrency(totalIncome)}`;
    document.getElementById('comp-expense-label').textContent = `Expenses: ${formatCurrency(totalExpenses)}`;
    const barFill = document.getElementById('comp-bar-fill');
    const expenseRatio = totalIncome > 0 ? Math.min((totalExpenses / totalIncome) * 100, 100) : 0;
    barFill.style.width = `${expenseRatio}%`;
    barFill.className = `comparison-bar-fill ${health}`;
    barFill.textContent = totalIncome > 0 ? `${Math.round(expenseRatio)}%` : '';

    // Update savings gauge
    const circumference = 2 * Math.PI * 50; // 314.16
    const rateForGauge = Math.min(savingsRate, 100);
    const offset = circumference - (rateForGauge / 100) * circumference;
    document.getElementById('gauge-fill').style.strokeDashoffset = offset;
    document.getElementById('gauge-percent').textContent = formatPercent(savingsRate);

    const targetRate = profile?.savings_rate_target || 10;
    const targetOffset = circumference - (targetRate / 100) * circumference;
    document.getElementById('gauge-target').style.strokeDashoffset = targetOffset;

    document.getElementById('gauge-message').textContent = budget.getSavingsMessage(savingsRate);

    // Category breakdown
    const categories = budget.getExpensesByCategory(expenseData);
    const maxCatAmount = categories.length > 0 ? categories[0].total : 1;
    const categoryBreakdown = document.getElementById('category-breakdown');

    if (categories.length === 0) {
        categoryBreakdown.innerHTML = '<p class="text-muted text-center">No expenses this month</p>';
    } else {
        categoryBreakdown.innerHTML = categories.slice(0, 6).map(cat => `
            <div class="category-card">
                <div class="category-card-icon">${getCategoryEmoji(cat.category)}</div>
                <div class="category-card-info">
                    <div class="category-card-name">${cat.category}</div>
                    <div class="category-card-amount">${formatCurrency(cat.total)}</div>
                    <div class="category-card-bar">
                        <div class="category-card-bar-fill" style="width: ${(cat.total / maxCatAmount) * 100}%; background: var(--cat-${getCategoryClass(cat.category)});"></div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Waffles card
    const savingsByType = budget.getSavingsByType(savingsData);
    const allTimeSavings = await budget.getSavingsByFund(userId, 'waffles');
    const wafflesTotal = budget.getTotalSavings(allTimeSavings);
    const wafflesContainer = document.getElementById('waffles-card-container');

    wafflesContainer.innerHTML = `
        <div class="fund-card waffles mb-xl">
            <div class="fund-card-header">
                <span class="fund-card-name">\u{1F436} Waffles' Treat Fund</span>
            </div>
            <div class="fund-card-amount">${formatCurrency(wafflesTotal)}</div>
            ${profile?.waffles_fund_goal ? `
                <div class="fund-card-progress">
                    <div class="fund-card-progress-fill" style="width: ${Math.min((wafflesTotal / profile.waffles_fund_goal) * 100, 100)}%"></div>
                </div>
                <div class="fund-card-goal">Goal: ${formatCurrency(profile.waffles_fund_goal)}</div>
            ` : ''}
            <div class="fund-card-message">${budget.getWafflesMessage(wafflesTotal)}</div>
        </div>
    `;
}
