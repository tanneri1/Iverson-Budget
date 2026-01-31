// Utility functions

// Toast notifications
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Currency formatting
export function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount || 0);
}

// Percent formatting
export function formatPercent(value) {
    return `${(value || 0).toFixed(1)}%`;
}

// Date formatting
export function formatDate(date, options = {}) {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        weekday: options.weekday,
        year: options.year || 'numeric',
        month: options.month || 'short',
        day: options.day || 'numeric'
    });
}

export function formatTime(date) {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
    });
}

export function getRelativeDate(date) {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return formatDate(date);
}

// Date range helpers
export function getStartOfMonth(date = new Date()) {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function getEndOfMonth(date = new Date()) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1, 0);
    d.setHours(23, 59, 59, 999);
    return d;
}

export function getStartOfYear(date = new Date()) {
    const d = new Date(date);
    d.setMonth(0, 1);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function getEndOfYear(date = new Date()) {
    const d = new Date(date);
    d.setMonth(11, 31);
    d.setHours(23, 59, 59, 999);
    return d;
}

export function monthsUntil(targetDate) {
    const now = new Date();
    const target = new Date(targetDate);
    const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
    return Math.max(0, months);
}

// Category helpers
const CATEGORY_MAP = {
    'Housing': { class: 'housing', emoji: '\u{1F3E0}' },
    'Travel': { class: 'travel', emoji: '\u{2708}\u{FE0F}' },
    'Surf': { class: 'surf', emoji: '\u{1F3C4}' },
    'Yoga': { class: 'yoga', emoji: '\u{1F9D8}' },
    'Pet Care (Waffles)': { class: 'waffles', emoji: '\u{1F436}' },
    'Dining': { class: 'dining', emoji: '\u{1F37D}\u{FE0F}' },
    'Medical': { class: 'medical', emoji: '\u{1FA7A}' },
    'Auto': { class: 'auto', emoji: '\u{1F697}' },
    'Gifts (Kids)': { class: 'gifts', emoji: '\u{1F381}' },
    'Insurance': { class: 'insurance', emoji: '\u{1F6E1}\u{FE0F}' },
    'Utilities': { class: 'utilities', emoji: '\u{26A1}' },
    'Groceries': { class: 'groceries', emoji: '\u{1F6D2}' },
    'Entertainment': { class: 'entertainment', emoji: '\u{1F3AC}' },
    'General': { class: 'general', emoji: '\u{1F4B0}' }
};

export function getCategoryClass(category) {
    return CATEGORY_MAP[category]?.class || 'general';
}

export function getCategoryEmoji(category) {
    return CATEGORY_MAP[category]?.emoji || '\u{1F4B0}';
}

export function getAllCategories() {
    return Object.keys(CATEGORY_MAP);
}

// Modal helper
export function showModal(title, content, actions = []) {
    const container = document.getElementById('modal-container');

    const actionsHtml = actions.map(action =>
        `<button class="btn ${action.class || 'btn-secondary'}" data-action="${action.id}">${action.label}</button>`
    ).join('');

    container.innerHTML = `
        <div class="modal-overlay">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close" data-action="close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${actionsHtml ? `<div class="modal-footer">${actionsHtml}</div>` : ''}
            </div>
        </div>
    `;

    return new Promise(resolve => {
        container.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => {
                container.innerHTML = '';
                resolve(btn.dataset.action);
            });
        });
    });
}

export function closeModal() {
    document.getElementById('modal-container').innerHTML = '';
}

// Form helpers
export function getFormData(form) {
    const formData = new FormData(form);
    const data = {};
    for (const [key, value] of formData.entries()) {
        if (value === '') {
            data[key] = null;
        } else if (!isNaN(value) && value !== '') {
            data[key] = parseFloat(value);
        } else {
            data[key] = value;
        }
    }
    return data;
}

// Debounce
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Loading state
export function setLoading(element, isLoading) {
    if (isLoading) {
        element.dataset.originalText = element.textContent;
        element.textContent = 'Loading...';
        element.disabled = true;
    } else {
        element.textContent = element.dataset.originalText || element.textContent;
        element.disabled = false;
    }
}

// Escape HTML
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// CSV export helper
export function downloadCSV(filename, headers, rows) {
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}
