const API_BASE = 'http://localhost:5001/api';

async function request(endpoint, options = {}) {
  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'API request failed.');
  }
  return data;
}

export const api = {
  getDashboardStats: () => request('/dashboard/stats'),

  getBooks: (search = '', category = '') => {
    const params = new URLSearchParams();
    if (search.trim()) params.append('search', search.trim());
    if (category.trim()) params.append('category', category.trim());
    return request(`/books?${params.toString()}`);
  },

  createBook: (payload) =>
    request('/books', { method: 'POST', body: JSON.stringify(payload) }),

  updateBook: (id, payload) =>
    request(`/books/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),

  deleteBook: (id) =>
    request(`/books/${id}`, { method: 'DELETE' }),

  getMembers: (search = '', status = '') => {
    const params = new URLSearchParams();
    if (search.trim()) params.append('search', search.trim());
    if (status.trim()) params.append('status', status.trim());
    return request(`/members?${params.toString()}`);
  },

  getMemberDetails: (id) => request(`/members/${id}`),

  createMember: (payload) =>
    request('/members', { method: 'POST', body: JSON.stringify(payload) }),

  getTransactions: (status = '', search = '') => {
    const params = new URLSearchParams();
    if (status.trim()) params.append('status', status.trim());
    if (search.trim()) params.append('search', search.trim());
    return request(`/transactions?${params.toString()}`);
  },

  issueBook: (payload) =>
    request('/transactions/issue', { method: 'POST', body: JSON.stringify(payload) }),

  returnBook: (id) =>
    request(`/transactions/return/${id}`, { method: 'POST' }),

  getReportsSummary: () => request('/reports/summary')
};

export function exportToCsv(filename, rows, headers) {
  if (!rows || rows.length === 0) return;

  const escapeCell = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val).replace(/"/g, '""');
    return /[,"\n]/.test(str) ? `"${str}"` : str;
  };

  const csvContent = [
    headers.map((h) => escapeCell(h.label)).join(','),
    ...rows.map((row) => headers.map((h) => escapeCell(row[h.key])).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return String(dateStr).slice(0, 10);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });
}