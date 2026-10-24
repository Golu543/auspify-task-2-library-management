CREATE DATABASE IF NOT EXISTS auspify_library_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE auspify_library_db;

DROP TABLE IF EXISTS book_issues;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS books;

CREATE TABLE books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    isbn VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(180) NOT NULL,
    author VARCHAR(140) NOT NULL,
    category VARCHAR(80) NOT NULL,
    publisher VARCHAR(120) NOT NULL,
    publication_year INT NOT NULL,
    total_copies INT NOT NULL,
    available_copies INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_books_copies CHECK (
        total_copies >= 1 AND
        available_copies >= 0 AND
        available_copies <= total_copies
    ),
    CONSTRAINT chk_books_pub_year CHECK (
        publication_year >= 1800 AND publication_year <= 2100
    )
);

CREATE INDEX idx_books_title ON books(title);
CREATE INDEX idx_books_author ON books(author);
CREATE INDEX idx_books_category ON books(category);

CREATE TABLE members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_code VARCHAR(30) NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(140) NOT NULL UNIQUE,
    phone VARCHAR(15) NOT NULL,
    department VARCHAR(80) NOT NULL,
    status ENUM('Active', 'Suspended') NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_members_name ON members(full_name);
CREATE INDEX idx_members_department ON members(department);

CREATE TABLE book_issues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_id INT NOT NULL,
    member_id INT NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE DEFAULT NULL,
    status ENUM('Issued', 'Returned') NOT NULL DEFAULT 'Issued',
    remarks VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_issues_book
        FOREIGN KEY (book_id) REFERENCES books(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_issues_member
        FOREIGN KEY (member_id) REFERENCES members(id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_issues_dates CHECK (due_date >= issue_date)
);

CREATE INDEX idx_issues_book ON book_issues(book_id);
CREATE INDEX idx_issues_member ON book_issues(member_id);
CREATE INDEX idx_issues_status_due ON book_issues(status, due_date);

INSERT INTO books (isbn, title, author, category, publisher, publication_year, total_copies, available_copies) VALUES
('978-0262046305', 'Introduction to Algorithms (4th Ed.)', 'Thomas H. Cormen', 'Algorithms & DSA', 'MIT Press', 2022, 5, 4),
('978-0132350884', 'Clean Code: A Handbook of Agile Software Craftsmanship', 'Robert C. Martin', 'Software Engineering', 'Prentice Hall', 2008, 4, 3),
('978-1449373320', 'Designing Data-Intensive Applications', 'Martin Kleppmann', 'Database & Systems', 'O''Reilly Media', 2017, 3, 2),
('978-0078022159', 'Database System Concepts (7th Ed.)', 'Abraham Silberschatz', 'Database & Systems', 'McGraw-Hill', 2019, 6, 5),
('978-1119800361', 'Operating System Concepts (10th Ed.)', 'Abraham Silberschatz', 'Operating Systems', 'Wiley', 2018, 4, 4),
('978-0136681557', 'Computer Networking: A Top-Down Approach', 'James F. Kurose', 'Computer Networks', 'Pearson', 2021, 3, 3),
('978-0134610993', 'Artificial Intelligence: A Modern Approach', 'Stuart Russell & Peter Norvig', 'Artificial Intelligence', 'Pearson', 2020, 2, 2),
('978-0135957059', 'The Pragmatic Programmer (20th Anniversary)', 'David Thomas & Andrew Hunt', 'Software Engineering', 'Addison-Wesley', 2019, 1, 0);

INSERT INTO members (member_code, full_name, email, phone, department, status) VALUES
('MEM2026001', 'Aarav Sharma', 'aarav.sharma@college.edu', '9876543210', 'Computer Science & Engineering', 'Active'),
('MEM2026002', 'Priya Verma', 'priya.verma@college.edu', '9876543211', 'Information Technology', 'Active'),
('MEM2026003', 'Rohan Mehta', 'rohan.mehta@college.edu', '9876543212', 'Electronics & Communication', 'Active'),
('MEM2026004', 'Ananya Nair', 'ananya.nair@college.edu', '9876543213', 'Artificial Intelligence & DS', 'Active'),
('MEM2026005', 'Kabir Joshi', 'kabir.joshi@college.edu', '9876543214', 'Mechanical Engineering', 'Suspended');

INSERT INTO book_issues (book_id, member_id, issue_date, due_date, return_date, status, remarks) VALUES
(1, 1, DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_SUB(CURDATE(), INTERVAL 6 DAY), NULL, 'Issued', 'Semester project reference'),
(3, 2, DATE_SUB(CURDATE(), INTERVAL 18 DAY), DATE_SUB(CURDATE(), INTERVAL 4 DAY), NULL, 'Issued', 'System design study'),
(2, 3, DATE_SUB(CURDATE(), INTERVAL 5 DAY), DATE_ADD(CURDATE(), INTERVAL 9 DAY), NULL, 'Issued', 'Code review standards'),
(4, 4, DATE_SUB(CURDATE(), INTERVAL 3 DAY), DATE_ADD(CURDATE(), INTERVAL 11 DAY), NULL, 'Issued', 'DBMS lab preparation'),
(8, 1, DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_ADD(CURDATE(), INTERVAL 13 DAY), NULL, 'Issued', 'Single copy edition'),
(5, 2, DATE_SUB(CURDATE(), INTERVAL 25 DAY), DATE_SUB(CURDATE(), INTERVAL 11 DAY), DATE_SUB(CURDATE(), INTERVAL 12 DAY), 'Returned', 'Returned in good condition'),
(6, 4, DATE_SUB(CURDATE(), INTERVAL 30 DAY), DATE_SUB(CURDATE(), INTERVAL 16 DAY), DATE_SUB(CURDATE(), INTERVAL 15 DAY), 'Returned', 'Returned on time');