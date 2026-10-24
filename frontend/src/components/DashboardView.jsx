import React, { useEffect, useState } from 'react';
import { api, formatDate } from '../api.js';

export default function DashboardView({ onNavigate, notify }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboardStats();
      setStats(res.data);
    } catch (err) {
      notify('error', err.message || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return <div className="state-box">Loading library metrics...</div>;
  }

  if (!stats) {
    return (
      <div className="state-box">
        <p>Unable to load library metrics.</p>
        <button className="btn btn-primary" onClick={loadStats}>
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="view-section">
      {/* Top Summary Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-label">Unique Book Titles</span>
          <strong className="metric-value">{stats.total_titles}</strong>
          <span className="metric-sub">{stats.total_physical_copies} Total Physical Copies</span>
        </div>

        <div className="metric-card metric-emerald">
          <span className="metric-label">Available Stock</span>
          <strong className="metric-value">{stats.available_copies}</strong>
          <span className="metric-sub">Ready for immediate issue</span>
        </div>

        <div className="metric-card metric-indigo">
          <span className="metric-label">Currently Issued</span>
          <strong className="metric-value">{stats.issued_books}</strong>
          <span className="metric-sub">{stats.returned_books} lifetime returns</span>
        </div>

        <div className="metric-card metric-crimson">
          <span className="metric-label">Overdue Loans</span>
          <strong className="metric-value">{stats.overdue_books}</strong>
          <span className="metric-sub">Past scheduled due date</span>
        </div>

        <div className="metric-card">
          <span className="metric-label">Registered Members</span>
          <strong className="metric-value">{stats.total_members}</strong>
          <span className="metric-sub">{stats.active_members} Active borrowing accounts</span>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="card quick-actions-bar">
        <div>
          <h3>Quick Library Operations</h3>
          <p className="muted-text">Jump directly to common circulation and catalog workflows.</p>
        </div>
        <div className="action-btn-group">
          <button className="btn btn-primary" onClick={() => onNavigate('transactions')}>
            Issue or Return Book
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('books')}>
            Manage Book Catalog
          </button>
          <button className="btn btn-secondary" onClick={() => onNavigate('reports')}>
            View Inventory Reports
          </button>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="card">
        <div className="card-header-row">
          <div>
            <h3>Recent Circulation Activity</h3>
            <p className="muted-text">Latest 5 book issue and return transactions recorded in MySQL.</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('transactions')}>
            View Full Ledger
          </button>
        </div>

        {stats.recent_transactions.length === 0 ? (
          <div className="empty-box">No circulation transactions recorded yet.</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Book Title & ISBN</th>
                  <th>Member</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Return Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_transactions.map((tx) => {
                  const statusLabel =
                    tx.status === 'Returned'
                      ? 'Returned'
                      : tx.is_overdue
                      ? 'Overdue'
                      : 'Issued';
                  const badgeClass =
                    statusLabel === 'Returned'
                      ? 'badge-emerald'
                      : statusLabel === 'Overdue'
                      ? 'badge-crimson'
                      : 'badge-amber';

                  return (
                    <tr key={tx.id}>
                      <td className="mono">#{tx.id}</td>
                      <td>
                        <strong>{tx.book_title}</strong>
                        <div className="sub-meta">{tx.isbn}</div>
                      </td>
                      <td>
                        <strong>{tx.member_name}</strong>
                        <div className="sub-meta">{tx.member_code}</div>
                      </td>
                      <td>{formatDate(tx.issue_date)}</td>
                      <td>{formatDate(tx.due_date)}</td>
                      <td>{formatDate(tx.return_date)}</td>
                      <td>
                        <span className={`status-pill ${badgeClass}`}>{statusLabel}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}