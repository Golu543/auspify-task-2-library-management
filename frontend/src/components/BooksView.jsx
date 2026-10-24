import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { PlusIcon, SearchIcon } from './Icons.jsx';

const DEFAULT_CATEGORIES = [
  'Algorithms & DSA',
  'Software Engineering',
  'Database & Systems',
  'Operating Systems',
  'Computer Networks',
  'Artificial Intelligence'
];

const INITIAL_BOOK_FORM = {
  isbn: '',
  title: '',
  author: '',
  category: 'Software Engineering',
  publisher: '',
  publication_year: new Date().getFullYear(),
  total_copies: 1
};

const PAGE_SIZE = 5;

export default function BooksView({ notify }) {
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [formData, setFormData] = useState(INITIAL_BOOK_FORM);
  const [viewingBook, setViewingBook] = useState(null);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const res = await api.getBooks(search, categoryFilter);
      setBooks(res.data);
      if (res.categories && res.categories.length > 0) {
        const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...res.categories]));
        setCategories(merged);
      }
      setCurrentPage(1);
    } catch (err) {
      notify('error', err.message || 'Failed to load books.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBooks();
  }, [search, categoryFilter]);

  const openAddModal = () => {
    setEditingBook(null);
    setFormData(INITIAL_BOOK_FORM);
    setIsFormOpen(true);
  };

  const openEditModal = (book) => {
    setEditingBook(book);
    setFormData({
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      category: book.category,
      publisher: book.publisher,
      publication_year: book.publication_year,
      total_copies: book.total_copies
    });
    setIsFormOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        publication_year: Number(formData.publication_year),
        total_copies: Number(formData.total_copies)
      };

      if (editingBook) {
        const res = await api.updateBook(editingBook.id, payload);
        notify('success', res.message);
      } else {
        const res = await api.createBook(payload);
        notify('success', res.message);
      }
      setIsFormOpen(false);
      loadBooks();
    } catch (err) {
      notify('error', err.message);
    }
  };

  const handleDelete = async (book) => {
    if (!window.confirm(`Delete "${book.title}" (ISBN: ${book.isbn}) from catalog?`)) {
      return;
    }
    try {
      const res = await api.deleteBook(book.id);
      notify('success', res.message);
      loadBooks();
    } catch (err) {
      notify('error', err.message);
    }
  };

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(books.length / PAGE_SIZE));
  const paginatedBooks = books.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="view-section">
      <div className="card">
        <div className="toolbar-row">
          <div className="search-filter-group">
            <div className="input-with-icon">
              <SearchIcon />
              <input
                type="text"
                placeholder="Search by title, author, or ISBN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search books"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-primary" onClick={openAddModal}>
            <PlusIcon /> Add New Book
          </button>
        </div>

        {loading ? (
          <div className="empty-box">Loading catalog...</div>
        ) : books.length === 0 ? (
          <div className="empty-box">No book records match your current filter.</div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ISBN</th>
                    <th>Title & Author</th>
                    <th>Category</th>
                    <th>Publisher & Year</th>
                    <th>Inventory Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBooks.map((book) => {
                    const available = book.available_copies;
                    const total = book.total_copies;
                    const isOut = available === 0;

                    return (
                      <tr key={book.id}>
                        <td className="mono">{book.isbn}</td>
                        <td>
                          <strong>{book.title}</strong>
                          <div className="sub-meta">by {book.author}</div>
                        </td>
                        <td>{book.category}</td>
                        <td>
                          <div>{book.publisher}</div>
                          <div className="sub-meta">{book.publication_year}</div>
                        </td>
                        <td>
                          <strong>{available}</strong> / {total} copies
                        </td>
                        <td>
                          <span className={`status-pill ${isOut ? 'badge-crimson' : 'badge-emerald'}`}>
                            {isOut ? 'Out of Stock' : 'Available'}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="btn-action"
                              onClick={() => setViewingBook(book)}
                            >
                              View
                            </button>
                            <button
                              className="btn-action btn-action-indigo"
                              onClick={() => openEditModal(book)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn-action btn-action-danger"
                              onClick={() => handleDelete(book)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="pagination-bar">
              <span className="muted-text">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, books.length)} of {books.length} titles
              </span>
              <div className="pagination-controls">
                <button
                  className="btn btn-outline btn-sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span className="page-indicator">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Book Modal */}
      {isFormOpen && (
        <div className="modal-backdrop" onClick={() => setIsFormOpen(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingBook ? 'Edit Book Record' : 'Add New Book to Catalog'}</h3>
              <button className="close-btn" onClick={() => setIsFormOpen(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="modal-form">
              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="isbn">ISBN-13 / ISBN-10 *</label>
                  <input
                    id="isbn"
                    name="isbn"
                    type="text"
                    placeholder="978-0132350884"
                    value={formData.isbn}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="category">Category *</label>
                  <input
                    id="category"
                    name="category"
                    list="category-options"
                    value={formData.category}
                    onChange={handleFormChange}
                    required
                  />
                  <datalist id="category-options">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="title">Book Title *</label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  placeholder="Enter full book title"
                  value={formData.title}
                  onChange={handleFormChange}
                  required
                />
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="author">Author(s) *</label>
                  <input
                    id="author"
                    name="author"
                    type="text"
                    placeholder="e.g., Robert C. Martin"
                    value={formData.author}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="publisher">Publisher *</label>
                  <input
                    id="publisher"
                    name="publisher"
                    type="text"
                    placeholder="e.g., Pearson / MIT Press"
                    value={formData.publisher}
                    onChange={handleFormChange}
                    required
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-field">
                  <label htmlFor="publication_year">Publication Year *</label>
                  <input
                    id="publication_year"
                    name="publication_year"
                    type="number"
                    min="1800"
                    max="2100"
                    value={formData.publication_year}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="total_copies">Total Physical Copies *</label>
                  <input
                    id="total_copies"
                    name="total_copies"
                    type="number"
                    min="1"
                    max="500"
                    value={formData.total_copies}
                    onChange={handleFormChange}
                    required
                  />
                </div>
              </div>

              {editingBook && (
                <p className="helper-note">
                  Currently Issued Copies:{' '}
                  <strong>{editingBook.total_copies - editingBook.available_copies}</strong>. Total
                  copies cannot be set lower than currently issued copies.
                </p>
              )}

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  {editingBook ? 'Save Changes' : 'Create Book Record'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Book Details Modal */}
      {viewingBook && (
        <div className="modal-backdrop" onClick={() => setViewingBook(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Book Record Specification</h3>
              <button className="close-btn" onClick={() => setViewingBook(null)}>
                ×
              </button>
            </div>
            <div className="detail-list">
              <div className="detail-item">
                <span>ISBN</span>
                <strong className="mono">{viewingBook.isbn}</strong>
              </div>
              <div className="detail-item">
                <span>Title</span>
                <strong>{viewingBook.title}</strong>
              </div>
              <div className="detail-item">
                <span>Author</span>
                <strong>{viewingBook.author}</strong>
              </div>
              <div className="detail-item">
                <span>Category</span>
                <strong>{viewingBook.category}</strong>
              </div>
              <div className="detail-item">
                <span>Publisher</span>
                <strong>{viewingBook.publisher}</strong>
              </div>
              <div className="detail-item">
                <span>Publication Year</span>
                <strong>{viewingBook.publication_year}</strong>
              </div>
              <div className="detail-item">
                <span>Total Physical Copies</span>
                <strong>{viewingBook.total_copies}</strong>
              </div>
              <div className="detail-item">
                <span>Available on Shelf</span>
                <strong>{viewingBook.available_copies}</strong>
              </div>
              <div className="detail-item">
                <span>Currently Issued</span>
                <strong>{viewingBook.total_copies - viewingBook.available_copies}</strong>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={() => {
                  const target = viewingBook;
                  setViewingBook(null);
                  openEditModal(target);
                }}
              >
                Edit Book
              </button>
              <button className="btn btn-secondary" onClick={() => setViewingBook(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}