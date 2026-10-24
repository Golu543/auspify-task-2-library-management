import React, { useEffect, useState } from 'react';
import { api, exportToCsv, formatDate } from '../api.js';
import { DownloadIcon } from './Icons.jsx';

export default function ReportsView({ notify }) {
  const [report, setReport] = useState(null);
  const [allBooks, setAllBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [repRes, bookRes] = await Promise.all([
        api.getReportsSummary(),
        api.getBooks()
      ]);
      setReport(repRes.data);
      setAllBooks(bookRes.data);
    } catch (err) {
      notify('error', err.message || 'Failed to generate library reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  if (loading) {
    return <div className="state-box">Generating inventory and circulation reports...</div>;
  }

  if (!report) {
    return <div className="state-box">Unable to generate report data.</div>;
  }

  const handleExportBooksCsv = () => {
    exportToCsv('library_books_inventory.csv', allBooks, [
      { key: 'isbn', label: 'ISBN' },
      { key: 'title', label: 'Title' },
      { key: 'author', label: 'Author' },
      { key: 'category', label: 'Category' },
      { key: 'publisher', label: 'Publisher' },
      { key: 'publication_year', label: 'Year' },
      { key: 'total_copies', label: 'Total Copies' },
      { key: 'available_copies', label: 'Available Copies' }
    ]);
    notify('success', 'Downloaded library_books_inventory.csv');
  };

  const handleExportActiveLoansCsv = () => {
    exportToCsv('active_and_overdue_loans.csv', report.active_loans, [
      { key: 'id', label: 'Loan ID' },
      { key: 'book_title', label: 'Book Title' },
      { key: 'isbn', label: 'ISBN' },
      { key: 'member_name', label: 'Member Name' },
      { key: 'member_code', label: 'Member Code' },
      { key: 'issue_date', label: 'Issue Date' },
      { key: 'due_date', label: 'Due Date' },
      { key: 'loan_status', label: 'Status' }
    ]);
    notify('success', 'Downloaded active_and_overdue_loans.csv');
  };

  return (
    <div className="view-section">
      {/* CSV Export Header Card */}
      <div className="card quick-actions-bar">
        <div>
          <h3>System Reports & CSV Data Exports</h3>
          <p className="muted-text">
            Export real-time MySQL inventory stock and active/overdue loan audits as CSV spreadsheets.
          </p>
        </div>
        <div className="action-btn-group">
          <button className="btn btn-primary" onClick={handleExportBooksCsv}>
            <DownloadIcon /> Export Book Inventory (CSV)
          </button>
          <button className="btn btn-secondary" onClick={handleExportActiveLoansCsv}>
            <DownloadIcon /> Export Active & Overdue Loans (CSV)
          </button>
        </div>
      </div>

      {/* Category Inventory Breakdown */}
      <div className="card">
        <h3>Category-Wise Stock Utilization Report</h3>
        <p className="muted-text" style={{ marginBottom: '16px' }}>
          Distribution of book titles, total copies, available shelf stock, and circulation rate.
        </p>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Unique Titles</th>
                <th>Total Physical Copies</th>
                <th>Available Copies</th>
                <th>Currently Issued</th>
                <th>Utilization Rate</th>
              </tr>
            </thead>
            <tbody>
              {report.category_breakdown.map((cat) => {
                const total = Number(cat.total_copies);
                const avail = Number(cat.available_copies);
                const issued = total - avail;
                const utilRate = total > 0 ? Math.round((issued / total) * 100) : 0;

                return (
                  <tr key={cat.category}>
                    <td>
                      <strong>{cat.category}</strong>
                    </td>
                    <td>{cat.titles_count}</td>
                    <td>{total}</td>
                    <td>{avail}</td>
                    <td>{issued}</td>
                    <td>
                      <div className="progress-cell">
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{ width: `${utilRate}%` }}
                          />
                        </div>
                        <span className="sub-meta">{utilRate}% issued</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active & Overdue Loans Audit */}
      <div className="card">
        <h3>Active & Overdue Loans Audit Report</h3>
        <p className="muted-text" style={{ marginBottom: '16px' }}>
          All unreturned books ordered by earliest due date. Overdue items are highlighted first.
        </p>

        {report.active_loans.length === 0 ? (
          <div className="empty-box">No active or overdue loans at this time.</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Loan ID</th>
                  <th>Book Title & ISBN</th>
                  <th>Member</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Schedule Status</th>
                </tr>
              </thead>
              <tbody>
                {report.active_loans.map((loan) => {
                  const isOverdue = loan.loan_status === 'Overdue';
                  return (
                    <tr key={loan.id}>
                      <td className="mono">#{loan.id}</td>
                      <td>
                        <strong>{loan.book_title}</strong>
                        <div className="sub-meta">{loan.isbn}</div>
                      </td>
                      <td>
                        <strong>{loan.member_name}</strong>
                        <div className="sub-meta">{loan.member_code}</div>
                      </td>
                      <td>{formatDate(loan.issue_date)}</td>
                      <td>{formatDate(loan.due_date)}</td>
                      <td>
                        <span
                          className={`status-pill ${
                            isOverdue ? 'badge-crimson' : 'badge-amber'
                          }`}
                        >
                          {isOverdue
                            ? `Overdue (${loan.days_overdue} days)`
                            : `On-Time (${Math.abs(loan.days_overdue)} days left)`}
                        </span>
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