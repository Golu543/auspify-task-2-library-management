const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'auspify_library_db',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper: Validation functions
function validateBookPayload(data, isUpdate = false) {
  const errors = [];
  const { isbn, title, author, category, publisher, publication_year, total_copies } = data;

  if (!isUpdate || isbn !== undefined) {
    if (!isbn || String(isbn).trim().length < 5) {
      errors.push('A valid ISBN is required (min 5 characters).');
    }
  }
  if (!title || String(title).trim().length < 2) {
    errors.push('Title is required (min 2 characters).');
  }
  if (!author || String(author).trim().length < 2) {
    errors.push('Author name is required.');
  }
  if (!category || String(category).trim().length < 2) {
    errors.push('Category is required.');
  }
  if (!publisher || String(publisher).trim().length < 2) {
    errors.push('Publisher name is required.');
  }
  const year = Number(publication_year);
  if (!Number.isInteger(year) || year < 1800 || year > 2100) {
    errors.push('Publication year must be between 1800 and 2100.');
  }
  const copies = Number(total_copies);
  if (!Number.isInteger(copies) || copies < 1) {
    errors.push('Total copies must be a positive integer greater than 0.');
  }

  return errors;
}

function validateMemberPayload(data) {
  const errors = [];
  const { member_code, full_name, email, phone, department, status } = data;

  if (!member_code || String(member_code).trim().length < 3) {
    errors.push('Member Code is required (min 3 characters).');
  }
  if (!full_name || String(full_name).trim().length < 2) {
    errors.push('Full Name is required.');
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(String(email).trim())) {
    errors.push('A valid Email address is required.');
  }
  const phoneRegex = /^[0-9]{10,15}$/;
  if (!phone || !phoneRegex.test(String(phone).trim())) {
    errors.push('Phone number must contain 10 to 15 digits.');
  }
  if (!department || String(department).trim().length < 2) {
    errors.push('Department is required.');
  }
  if (status && !['Active', 'Suspended'].includes(status)) {
    errors.push('Status must be either Active or Suspended.');
  }

  return errors;
}

// ----------------------------------------------------------------------------
// 1. HEALTH CHECK
// ----------------------------------------------------------------------------
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, message: 'Library Backend & MySQL are connected.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Database connection failed.', error: error.message });
  }
});

// ----------------------------------------------------------------------------
// 2. DASHBOARD SUMMARY STATS
// ----------------------------------------------------------------------------
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const [bookTotals] = await pool.query(`
      SELECT 
        COUNT(*) AS total_titles,
        COALESCE(SUM(total_copies), 0) AS total_physical_copies,
        COALESCE(SUM(available_copies), 0) AS available_copies
      FROM books
    `);

    const [issueStats] = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'Issued' THEN 1 END) AS issued_books,
        COUNT(CASE WHEN status = 'Issued' AND due_date < CURDATE() THEN 1 END) AS overdue_books,
        COUNT(CASE WHEN status = 'Returned' THEN 1 END) AS returned_books
      FROM book_issues
    `);

    const [memberTotals] = await pool.query(`
      SELECT 
        COUNT(*) AS total_members,
        COUNT(CASE WHEN status = 'Active' THEN 1 END) AS active_members
      FROM members
    `);

    const [recentTransactions] = await pool.query(`
      SELECT 
        bi.id, bi.issue_date, bi.due_date, bi.return_date, bi.status,
        b.title AS book_title, b.isbn,
        m.full_name AS member_name, m.member_code,
        CASE 
          WHEN bi.status = 'Issued' AND bi.due_date < CURDATE() THEN 1 
          ELSE 0 
        END AS is_overdue
      FROM book_issues bi
      JOIN books b ON bi.book_id = b.id
      JOIN members m ON bi.member_id = m.id
      ORDER BY bi.id DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        total_titles: Number(bookTotals[0].total_titles),
        total_physical_copies: Number(bookTotals[0].total_physical_copies),
        available_copies: Number(bookTotals[0].available_copies),
        issued_books: Number(issueStats[0].issued_books),
        overdue_books: Number(issueStats[0].overdue_books),
        returned_books: Number(issueStats[0].returned_books),
        total_members: Number(memberTotals[0].total_members),
        active_members: Number(memberTotals[0].active_members),
        recent_transactions: recentTransactions
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard metrics.' });
  }
});

// ----------------------------------------------------------------------------
// 3. BOOK MANAGEMENT ROUTES
// ----------------------------------------------------------------------------
app.get('/api/books', async (req, res) => {
  try {
    const { search = '', category = '' } = req.query;
    let query = 'SELECT * FROM books WHERE 1=1';
    const params = [];

    if (search.trim()) {
      query += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }
    if (category.trim()) {
      query += ' AND category = ?';
      params.push(category.trim());
    }

    query += ' ORDER BY id DESC';
    const [rows] = await pool.query(query, params);

    // Also get distinct categories for filtering
    const [categories] = await pool.query('SELECT DISTINCT category FROM books ORDER BY category ASC');

    res.json({
      success: true,
      count: rows.length,
      data: rows,
      categories: categories.map((c) => c.category)
    });
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve books.' });
  }
});

app.get('/api/books/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM books WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving book.' });
  }
});

app.post('/api/books', async (req, res) => {
  try {
    const errors = validateBookPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    const { isbn, title, author, category, publisher, publication_year, total_copies } = req.body;
    const copies = Number(total_copies);

    const [result] = await pool.query(
      `INSERT INTO books (isbn, title, author, category, publisher, publication_year, total_copies, available_copies)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [isbn.trim(), title.trim(), author.trim(), category.trim(), publisher.trim(), Number(publication_year), copies, copies]
    );

    const [created] = await pool.query('SELECT * FROM books WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Book created successfully.', data: created[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'A book with this ISBN already exists.' });
    }
    console.error('Create book error:', error);
    res.status(500).json({ success: false, message: 'Failed to create book record.' });
  }
});

app.put('/api/books/:id', async (req, res) => {
  try {
    const bookId = req.params.id;
    const [existing] = await pool.query('SELECT * FROM books WHERE id = ?', [bookId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }

    const errors = validateBookPayload(req.body, true);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    const currentBook = existing[0];
    const currentlyIssued = currentBook.total_copies - currentBook.available_copies;
    const newTotal = Number(req.body.total_copies);

    if (newTotal < currentlyIssued) {
      return res.status(400).json({
        success: false,
        message: `Cannot reduce total copies to ${newTotal}. Currently, ${currentlyIssued} copies are issued to members.`
      });
    }

    const newAvailable = newTotal - currentlyIssued;

    const { isbn, title, author, category, publisher, publication_year } = req.body;
    await pool.query(
      `UPDATE books 
       SET isbn = ?, title = ?, author = ?, category = ?, publisher = ?, publication_year = ?, total_copies = ?, available_copies = ?
       WHERE id = ?`,
      [isbn.trim(), title.trim(), author.trim(), category.trim(), publisher.trim(), Number(publication_year), newTotal, newAvailable, bookId]
    );

    const [updated] = await pool.query('SELECT * FROM books WHERE id = ?', [bookId]);
    res.json({ success: true, message: 'Book updated successfully.', data: updated[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Another book is already using this ISBN.' });
    }
    console.error('Update book error:', error);
    res.status(500).json({ success: false, message: 'Failed to update book record.' });
  }
});

app.delete('/api/books/:id', async (req, res) => {
  try {
    const bookId = req.params.id;
    // Check if book has active or historical loans
    const [loans] = await pool.query('SELECT COUNT(*) AS count FROM book_issues WHERE book_id = ?', [bookId]);
    if (loans[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete book: Existing loan records are attached to this title. Archive or return all copies first.'
      });
    }

    const [result] = await pool.query('DELETE FROM books WHERE id = ?', [bookId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }
    res.json({ success: true, message: 'Book deleted successfully.' });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete book record.' });
  }
});

// ----------------------------------------------------------------------------
// 4. MEMBER MANAGEMENT ROUTES
// ----------------------------------------------------------------------------
app.get('/api/members', async (req, res) => {
  try {
    const { search = '', status = '' } = req.query;
    let query = 'SELECT * FROM members WHERE 1=1';
    const params = [];

    if (search.trim()) {
      query += ' AND (full_name LIKE ? OR member_code LIKE ? OR email LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }
    if (status.trim()) {
      query += ' AND status = ?';
      params.push(status.trim());
    }

    query += ' ORDER BY id DESC';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve members.' });
  }
});

app.get('/api/members/:id', async (req, res) => {
  try {
    const memberId = req.params.id;
    const [members] = await pool.query('SELECT * FROM members WHERE id = ?', [memberId]);
    if (members.length === 0) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    const [history] = await pool.query(`
      SELECT 
        bi.id, bi.issue_date, bi.due_date, bi.return_date, bi.status, bi.remarks,
        b.title AS book_title, b.isbn,
        CASE 
          WHEN bi.status = 'Issued' AND bi.due_date < CURDATE() THEN 1 
          ELSE 0 
        END AS is_overdue
      FROM book_issues bi
      JOIN books b ON bi.book_id = b.id
      WHERE bi.member_id = ?
      ORDER BY bi.id DESC
    `, [memberId]);

    res.json({ success: true, data: { ...members[0], history } });
  } catch (error) {
    console.error('Member profile error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving member profile.' });
  }
});

app.post('/api/members', async (req, res) => {
  try {
    const errors = validateMemberPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(' ') });
    }

    const { member_code, full_name, email, phone, department, status = 'Active' } = req.body;
    const [result] = await pool.query(
      `INSERT INTO members (member_code, full_name, email, phone, department, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [member_code.trim().toUpperCase(), full_name.trim(), email.trim().toLowerCase(), phone.trim(), department.trim(), status]
    );

    const [created] = await pool.query('SELECT * FROM members WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Member registered successfully.', data: created[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'Member Code or Email already exists.' });
    }
    console.error('Create member error:', error);
    res.status(500).json({ success: false, message: 'Failed to register member.' });
  }
});

// ----------------------------------------------------------------------------
// 5. ISSUE & RETURN (ACID TRANSACTIONS)
// ----------------------------------------------------------------------------
app.get('/api/transactions', async (req, res) => {
  try {
    const { status = '', search = '' } = req.query;
    let query = `
      SELECT 
        bi.id, bi.book_id, bi.member_id, bi.issue_date, bi.due_date, bi.return_date, bi.status, bi.remarks,
        b.title AS book_title, b.isbn,
        m.full_name AS member_name, m.member_code,
        CASE 
          WHEN bi.status = 'Issued' AND bi.due_date < CURDATE() THEN 1 
          ELSE 0 
        END AS is_overdue
      FROM book_issues bi
      JOIN books b ON bi.book_id = b.id
      JOIN members m ON bi.member_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (status === 'Issued') {
      query += " AND bi.status = 'Issued'";
    } else if (status === 'Returned') {
      query += " AND bi.status = 'Returned'";
    } else if (status === 'Overdue') {
      query += " AND bi.status = 'Issued' AND bi.due_date < CURDATE()";
    }

    if (search.trim()) {
      query += ' AND (b.title LIKE ? OR m.full_name LIKE ? OR m.member_code LIKE ? OR b.isbn LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY bi.id DESC';
    const [rows] = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Transactions fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve transactions.' });
  }
});

// Issue a Book
app.post('/api/transactions/issue', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { book_id, member_id, due_days = 14, remarks = '' } = req.body;

    if (!book_id || !member_id) {
      return res.status(400).json({ success: false, message: 'Book ID and Member ID are required.' });
    }

    await connection.beginTransaction();

    // 1. Lock and inspect book stock
    const [books] = await connection.query('SELECT * FROM books WHERE id = ? FOR UPDATE', [book_id]);
    if (books.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }
    const book = books[0];
    if (book.available_copies <= 0) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: `"${book.title}" is currently out of stock.` });
    }

    // 2. Verify member eligibility
    const [members] = await connection.query('SELECT * FROM members WHERE id = ?', [member_id]);
    if (members.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }
    const member = members[0];
    if (member.status !== 'Active') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: `Member ${member.full_name} is suspended from borrowing.` });
    }

    // 3. Decrement available copies
    await connection.query('UPDATE books SET available_copies = available_copies - 1 WHERE id = ?', [book_id]);

    // 4. Insert transaction record
    const dueDaysNum = Math.max(1, Math.min(60, Number(due_days) || 14));
    const [insertResult] = await connection.query(`
      INSERT INTO book_issues (book_id, member_id, issue_date, due_date, status, remarks)
      VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), 'Issued', ?)
    `, [book_id, member_id, dueDaysNum, remarks.trim()]);

    await connection.commit();

    res.status(201).json({
      success: true,
      message: `"${book.title}" issued to ${member.full_name} successfully.`,
      transaction_id: insertResult.insertId
    });
  } catch (error) {
    await connection.rollback();
    console.error('Book issue error:', error);
    res.status(500).json({ success: false, message: 'Failed to complete book issue.' });
  } finally {
    connection.release();
  }
});

// Return an Issued Book
app.post('/api/transactions/return/:id', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const transactionId = req.params.id;
    await connection.beginTransaction();

    const [issues] = await connection.query(
      'SELECT * FROM book_issues WHERE id = ? FOR UPDATE',
      [transactionId]
    );

    if (issues.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: 'Transaction record not found.' });
    }

    const loan = issues[0];
    if (loan.status === 'Returned') {
      await connection.rollback();
      return res.status(400).json({ success: false, message: 'This book has already been returned.' });
    }

    // 1. Mark transaction as Returned
    await connection.query(`
      UPDATE book_issues 
      SET status = 'Returned', return_date = CURDATE() 
      WHERE id = ?
    `, [transactionId]);

    // 2. Increment book available stock
    await connection.query(`
      UPDATE books 
      SET available_copies = LEAST(total_copies, available_copies + 1) 
      WHERE id = ?
    `, [loan.book_id]);

    await connection.commit();

    res.json({ success: true, message: 'Book returned successfully and inventory updated.' });
  } catch (error) {
    await connection.rollback();
    console.error('Book return error:', error);
    res.status(500).json({ success: false, message: 'Failed to process return.' });
  } finally {
    connection.release();
  }
});

// ----------------------------------------------------------------------------
// 6. REPORTS & EXPORTS
// ----------------------------------------------------------------------------
app.get('/api/reports/summary', async (req, res) => {
  try {
    const [categoryBreakdown] = await pool.query(`
      SELECT 
        category, 
        COUNT(*) AS titles_count, 
        SUM(total_copies) AS total_copies, 
        SUM(available_copies) AS available_copies
      FROM books
      GROUP BY category
      ORDER BY total_copies DESC
    `);

    const [activeLoans] = await pool.query(`
      SELECT 
        bi.id, bi.issue_date, bi.due_date,
        b.title AS book_title, b.isbn,
        m.full_name AS member_name, m.member_code,
        DATEDIFF(CURDATE(), bi.due_date) AS days_overdue,
        CASE 
          WHEN bi.due_date < CURDATE() THEN 'Overdue' 
          ELSE 'On-Time' 
        END AS loan_status
      FROM book_issues bi
      JOIN books b ON bi.book_id = b.id
      JOIN members m ON bi.member_id = m.id
      WHERE bi.status = 'Issued'
      ORDER BY bi.due_date ASC
    `);

    res.json({
      success: true,
      data: {
        category_breakdown: categoryBreakdown,
        active_loans: activeLoans
      }
    });
  } catch (error) {
    console.error('Reports summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate reports.' });
  }
});

app.listen(PORT, () => {
  console.log(`Library Backend running on http://localhost:${PORT}`);
});