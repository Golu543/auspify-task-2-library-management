# Task 2: Library Management System
**Auspify Technologies — Software Development Internship (4-Week Program)**

## Overview
A full-stack, enterprise-grade Library Management System built with React, Vite, Node.js, Express, and MySQL. It features robust book inventory management, member registration, ACID-compliant book issue/return ledger transactions, dynamic overdue calculations, category analytics, and CSV report exports.

## Tech Stack
- **Frontend:** React 18, Vite, CSS3 (Custom responsive design system)
- **Backend:** Node.js, Express.js REST API
- **Database:** MySQL 8.0 (`mysql2` with connection pooling & ACID transactions)
- **Version Control:** Git & GitHub

## Key Features & Architecture
1. **Dashboard Metrics:** Real-time summary cards tracking unique titles, physical copies, available shelf stock, active/overdue loans, and member counts.
2. **Book Catalog:** Full CRUD operations with ISBN uniqueness checks, category filtering, search, pagination, and stock protection (preventing deletion or copy reduction of issued items).
3. **Member Management:** Registration directory with active/suspended status and complete modal inspection of individual borrowing histories.
4. **Issue & Return Ledger:** ACID transaction handling (`BEGIN` -> `FOR UPDATE` lock -> `UPDATE` -> `COMMIT`) ensuring inventory never drifts or goes negative, with automatic overdue detection based on due dates.
5. **Reports & Analytics:** Stock utilization percentage breakdown per category and one-click CSV spreadsheet exports for inventory and loans.

## Setup & Run Instructions (Windows 11)
1. **Database Setup:**
   - Run MySQL 8.0 and execute `database/schema.sql` to create tables and seed demo data.
2. **Backend Setup:**
   - Navigate to `backend/`, copy `.env.example` to `.env`, set your MySQL root password, and run:
     ```bash
     npm install
     npm start
     ```
3. **Frontend Setup:**
   - Navigate to `frontend/` in a second terminal and run:
     ```bash
     npm install
     npm run dev
     ```
   - Open `http://localhost:5173` in your browser.