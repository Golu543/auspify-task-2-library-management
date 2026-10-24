import React, { useEffect, useState } from 'react';
import { api, formatDate } from '../api.js';
import { PlusIcon, SearchIcon } from './Icons.jsx';

const INITIAL_MEMBER_FORM = {
  member_code: '',
  full_name: '',
  email: '',
  phone: '',
  department: 'Computer Science & Engineering',
  status: 'Active'
};

export default function MembersView({ notify }) {
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [formData, setFormData] = useState(INITIAL_MEMBER_FORM);
  const [memberProfile, setMemberProfile] = useState(null);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const res = await api.getMembers(search, statusFilter);
      setMembers(res.data);
    } catch (err) {
      notify('error', err.message || 'Failed to load members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [search, statusFilter]);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createMember(formData);
      notify('success', res.message);
      setFormData(INITIAL_MEMBER_FORM);
      setIsRegisterOpen(false);
      loadMembers();
    } catch (err) {
      notify('error', err.message);
    }
  };

  const openHistoryModal = async (memberId) => {
    try {
      const res = await api.getMemberDetails(memberId);
      setMemberProfile(res.data);
    } catch (err) {
      notify('error', err.message || 'Failed to load member borrowing history.');
    }
  };

  return (
    <div className="view-section">
      <div className="card">
        <div className="toolbar-row">
          <div className="search-filter-group">
            <div className="input-with-icon">
              <SearchIcon />
              <input
                type="text"
                placeholder="Search by member name, code, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search members"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by member status"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>

          <button className="btn btn-primary" onClick={() => setIsRegisterOpen(true)}>
            <PlusIcon /> Register Member
          </button>
        </div>

        {loading ? (
          <div className="empty-box">Loading registered members...</div>
        ) : members.length === 0 ? (
          <div className="empty-box">No library members found.</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member ID</th>
                  <th>Full Name & Email</th>
                  <th>Phone</th>
                  <th>Department</th>
                  <th>Account Status</th>
                  <th>Joined On</th>
                  <th>Borrowing History</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id}>
                    <td className="mono">{m.member_code}</td>
                    <td>
                      <strong>{m.full_name}</strong>
                      <div className="sub-meta">{m.email}</div>
                    </td>
                    <td>{m.phone}</td>
                    <td>{m.department}</td>
                    <td>
                      <span
                        className={`status-pill ${
                          m.status === 'Active' ? 'badge-emerald' : 'badge-crimson'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td>{formatDate(m.created_at)}</td>
                    <td>
                      <button
                        className="btn-action btn-action-indigo"
                        onClick={() => openHistoryModal(m.id)}
                      >
                        View Loans
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Member Modal */}
      {isRegisterOpen && (
        <div className="modal-backdrop" onClick={() => setIsRegisterOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Register New Library Member</h3>
              <button className="close-btn" onClick={() => setIsRegisterOpen(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleRegisterSubmit} className="modal-form">
              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="member_code">Member Code *</label>
                  <input
                    id="member_code"
                    type="text"
                    placeholder="e.g., MEM2026009"
                    value={formData.member_code}
                    onChange={(e) => setFormData({ ...formData, member_code: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="status">Membership Status</label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="full_name">Full Name *</label>
                <input
                  id="full_name"
                  type="text"
                  placeholder="Enter full name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    id="email"
                    type="email"
                    placeholder="student@college.edu"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="phone">Phone (10–15 digits) *</label>
                  <input
                    id="phone"
                    type="tel"
                    pattern="[0-9]{10,15}"
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="department">Academic Department *</label>
                <input
                  id="department"
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  Complete Registration
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsRegisterOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Borrowing History Modal */}
      {memberProfile && (
        <div className="modal-backdrop" onClick={() => setMemberProfile(null)}>
          <div className="modal-panel modal-panel-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>
                  {memberProfile.full_name} ({memberProfile.member_code})
                </h3>
                <p className="muted-text">
                  {memberProfile.department} • {memberProfile.email}
                </p>
              </div>
              <button className="close-btn" onClick={() => setMemberProfile(null)}>
                ×
              </button>
            </div>

            {memberProfile.history.length === 0 ? (
              <div className="empty-box">This member has not borrowed any books yet.</div>
            ) : (
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Book Title</th>
                      <th>ISBN</th>
                      <th>Issued On</th>
                      <th>Due Date</th>
                      <th>Returned On</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberProfile.history.map((item) => {
                      const label =
                        item.status === 'Returned'
                          ? 'Returned'
                          : item.is_overdue
                          ? 'Overdue'
                          : 'Issued';
                      const pill =
                        label === 'Returned'
                          ? 'badge-emerald'
                          : label === 'Overdue'
                          ? 'badge-crimson'
                          : 'badge-amber';

                      return (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.book_title}</strong>
                          </td>
                          <td className="mono">{item.isbn}</td>
                          <td>{formatDate(item.issue_date)}</td>
                          <td>{formatDate(item.due_date)}</td>
                          <td>{formatDate(item.return_date)}</td>
                          <td>
                            <span className={`status-pill ${pill}`}>{label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setMemberProfile(null)}>
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}