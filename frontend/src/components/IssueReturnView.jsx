import React, { useEffect, useState } from 'react';
import { api, formatDate } from '../api.js';
import { SearchIcon } from './Icons.jsx';

export default function IssueReturnView({ notify }) {
  const [transactions, setTransactions] = useState([]);
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [issueForm, setIssueForm] = useState({
    book_id: '',
    member_id: '',
    due_days: 14,
    remarks: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [txRes, booksRes, membersRes] = await Promise.all([
        api.getTransactions(statusFilter, search),
        api.getBooks(),
        api.getMembers('', 'Active')
      ]);
      setTransactions(txRes.data);
      setBooks(booksRes.data);
      setMembers(membersRes.data);
    } catch (err) {
      notify('error', err.message || 'Failed to load circulation data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, search]);

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!issueForm.book_id || !issueForm.member_id) {
      notify('error', 'Please select both a Book and an Active Member.');
      return;
    }

    try {
      const res = await api.issueBook({
        book_id: Number(issueForm.book_id),
        member_id: Number(issueForm.member_id),
        due_days: Number(issueForm.due_days),
        remarks: issueForm.remarks
      });
      notify('success', res.message);
      setIssueForm({ book_id: '', member_id: '', due_days: 14, remarks: '' });
      loadData();
    } catch (err) {
      notify('error', err.message);
    }
  };

  const handleReturnBook = async (tx) => {
    if (
      !window.confirm(
        `Confirm return of "${tx.book_title}" borrowed by ${tx.member_name}?`
      )
    ) {
      return;
    }

    try {
      const res = await api.returnBook(tx.id);
      notify('success', res.message);
      loadData();
    } catch (err) {
      notify('error', err.message);
    }
  };

  // Calculate preview due date
  const previewDueDate = new Date();
  previewDueDate.setDate(previewDueDate.getDate() + (Number(issueForm.due_days) || 14));

  return (
    <div className="view-section issue-grid">
      {/* Left Card: Issue Book Form */}
      <div className="card">
        <h3>Issue Book Copy</h3>
        <p className="muted-text" style={{ marginBottom: '16px' }}>
          Select an available title and an active library member to record a new loan.
        </p>

        <form onSubmit={handleIssueSubmit} className="modal-form">
          <div className="form-field">
            <label htmlFor="book_id">Select Book Title *</label>
            <select
              id="book_id"
              value={issueForm.book_id}
              onChange={(e) => setIssueForm({ ...issueForm, book_id: e.target.value })}
              required
            >
              <option value="">-- Choose a book --</option>
              {books.map((b) => (
                <option key={b.id} value={b.id} disabled={b.available_copies <= 0}>
                  {b.title} ({b.available_copies} of {b.total_copies} available)
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="member_id">Select Active Member *</label>
            <select
              id="member_id"
              value={issueForm.member_id}
              onChange={(e) => setIssueForm({ ...issueForm, member_id: e.target.value })}
              required
            >
              <option value="">-- Choose a member --</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.member_code})
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="due_days">Loan Duration (Days) *</label>
            <input
              id="due_days"
              type="number"
              min="1"
              max="60"
              value={issueForm.due_days}
              onChange={(e) => setIssueForm({ ...issueForm, due_days: e.target.value })}
              required
            />
            <span className="sub-meta">
              Calculated Due Date: <strong>{formatDate(previewDueDate)}</strong>
            </span>
          </div>

          <div className="form-field">
            <label htmlFor="remarks">Circulation Remarks (Optional)</label>
            <input
              id="remarks"
              type="text"
              placeholder="e.g., Semester exam reference"
              value={issueForm.remarks}
              onChange={(e) => setIssueForm({ ...issueForm, remarks: e.target.value })}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '6px' }}>
            Confirm & Issue Book
          </button>
        </form>
      </div>

      {/* Right Card: Active & Historical Transactions Ledger */}
      <div className="card">
        <div className="toolbar-row">
          <div className="tab-pills">
            {['', 'Issued', 'Overdue', 'Returned'].map((tab) => (
              <button
                key={tab || 'All'}
                type="button"
                className={`tab-pill ${statusFilter === tab ? 'active' : ''}`}
                onClick={() => setStatusFilter(tab)}
              >
                {tab || 'All Loans'}
              </button>
            ))}
          </div>

          <div className="input-with-icon">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search book, ISBN, or member..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search transactions"
            />
          </div>
        </div>

        {loading ? (
          <div className="empty-box">Loading circulation records...</div>
        ) : transactions.length === 0 ? (
          <div className="empty-box">No transactions match the selected filter.</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Book Details</th>
                  <th>Borrower</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => {
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
                      <td>
                        <span className={`status-pill ${badgeClass}`}>{statusLabel}</span>
                      </td>
                      <td>
                        {tx.status === 'Issued' ? (
                          <button
                            className="btn-action btn-action-emerald"
                            onClick={() => handleReturnBook(tx)}
                          >
                            Mark Returned
                          </button>
                        ) : (
                          <span className="sub-meta">
                            Returned {formatDate(tx.return_date)}
                          </span>
                        )}
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