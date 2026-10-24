import React, { useState } from 'react';
import {
  DashboardIcon,
  BookIcon,
  UsersIcon,
  TransferIcon,
  ReportIcon
} from './components/Icons.jsx';
import DashboardView from './components/DashboardView.jsx';
import BooksView from './components/BooksView.jsx';
import MembersView from './components/MembersView.jsx';
import IssueReturnView from './components/IssueReturnView.jsx';
import ReportsView from './components/ReportsView.jsx';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon, subtitle: 'Real-time library overview & KPIs' },
  { id: 'books', label: 'Books Catalog', icon: BookIcon, subtitle: 'Add, search, filter, and manage book inventory' },
  { id: 'members', label: 'Members', icon: UsersIcon, subtitle: 'Register members and inspect borrowing history' },
  { id: 'transactions', label: 'Issue & Return', icon: TransferIcon, subtitle: 'Process book loans, returns, and overdue tracking' },
  { id: 'reports', label: 'Reports & CSV', icon: ReportIcon, subtitle: 'Stock utilization analytics and data export' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState({ type: '', message: '' });

  const notify = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast({ type: '', message: '' });
    }, 4500);
  };

  const currentNav = NAV_ITEMS.find((item) => item.id === activeTab) || NAV_ITEMS[0];

  return (
    <div className="layout-shell">
      {/* Left Navigation Sidebar */}
      <aside className="sidebar">
        <div className="brand-box">
       
          <h1 className="brand-title">Libris Admin</h1>
          <p className="brand-sub">Library Management System</p>
        </div>

        <nav className="sidebar-nav" aria-label="Main Navigation">
          {NAV_ITEMS.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-btn ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <IconComponent />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sys-indicator">
            <span className="dot-online" />
            <span>MySQL80 • Port 5001</span>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="workspace">
        <header className="topbar">
          <div>
            <h2>{currentNav.label}</h2>
            <p className="muted-text">{currentNav.subtitle}</p>
          </div>
        </header>

        {toast.message && (
          <div className={`toast-banner ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
            <span>{toast.message}</span>
            <button onClick={() => setToast({ type: '', message: '' })} className="toast-close">
              ×
            </button>
          </div>
        )}

        <main className="content-area">
          {activeTab === 'dashboard' && (
            <DashboardView onNavigate={setActiveTab} notify={notify} />
          )}
          {activeTab === 'books' && <BooksView notify={notify} />}
          {activeTab === 'members' && <MembersView notify={notify} />}
          {activeTab === 'transactions' && <IssueReturnView notify={notify} />}
          {activeTab === 'reports' && <ReportsView notify={notify} />}
        </main>
      </div>
    </div>
  );
}