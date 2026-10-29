import { useEffect, useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  getExamTypes,
  createExamType,
  updateExamType,
  deleteExamType,
} from '../api';
import { useAuth } from '../contexts/AuthContext';

const INITIAL_FORM = {
  name: '',
  isActive: 1,
};

export default function ExamTypesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN';

  // Data states
  const [examTypes, setExamTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  // Filters & Pagination state
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', '1', '0'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortDir, setSortDir] = useState('DESC');

  // Modal states (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Delete modal state
  const [deletingType, setDeletingType] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Exam Types
  const fetchExamTypes = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        size: pageSize,
        sortDir,
      };

      if (keyword.trim()) {
        params.keyword = keyword.trim();
      }

      if (statusFilter !== 'ALL') {
        params.status = Number(statusFilter);
      }

      const res = await getExamTypes(params);
      const payload = res.data?.data || res.data || {};

      const items = Array.isArray(payload) ? payload : (payload.data || []);
      const total = payload.totalItems ?? items.length;

      setExamTypes(items);
      setTotalItems(total);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch exam types');
      setExamTypes([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortDir, keyword, statusFilter]);

  useEffect(() => {
    fetchExamTypes();
  }, [fetchExamTypes]);

  // Derived counts for overview stats
  const activeCount = useMemo(() => {
    return examTypes.filter((t) => Number(t.isActive ?? t.is_active) === 1).length;
  }, [examTypes]);

  const inactiveCount = useMemo(() => {
    return examTypes.filter((t) => Number(t.isActive ?? t.is_active) === 0).length;
  }, [examTypes]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Modal controls
  const openCreateModal = () => {
    setEditingType(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingType(item);
    setFormData({
      name: item.name || '',
      isActive: Number(item.isActive ?? item.is_active ?? 1),
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingType(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    const trimmedName = formData.name.trim();

    if (!trimmedName) {
      errors.name = 'Exam type name is required.';
    } else if (trimmedName.length > 150) {
      errors.name = 'Exam type name must not exceed 150 characters.';
    }

    if (![0, 1].includes(Number(formData.isActive))) {
      errors.isActive = 'Status must be Active (1) or Inactive (0).';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        isActive: Number(formData.isActive),
      };

      if (editingType) {
        // Edit existing exam type (PUT /api/academic/exam-type/{id})
        await updateExamType(editingType.id, {
          id: editingType.id,
          ...payload,
        });
        toast.success(`Exam type "${payload.name}" updated successfully!`);
      } else {
        // Create new exam type (POST /api/academic/exam-type)
        await createExamType(payload);
        toast.success(`Exam type "${payload.name}" created successfully!`);
        if (page !== 1) {
          setPage(1);
        }
      }

      closeModal();
      fetchExamTypes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete controls
  const openDeleteModal = (item) => {
    setDeletingType(item);
  };

  const closeDeleteModal = () => {
    if (isDeleting) return;
    setDeletingType(null);
  };

  const handleConfirmDelete = async () => {
    if (!deletingType) return;

    setIsDeleting(true);
    try {
      await deleteExamType(deletingType.id);
      toast.success(`Exam type "${deletingType.name}" deleted successfully.`);
      closeDeleteModal();

      if (examTypes.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        fetchExamTypes();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete exam type.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Date formatter
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="page-content">
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
            Exam Types
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13.5 }}>
            Manage exam classifications, terms, paper styles, and assessment categories.
          </p>
        </div>

        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreateModal} id="btn-create-exam-type">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create Exam Type
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="stat-info">
            <div className="label">Total Exam Types</div>
            <div className="value">{totalItems}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--secondary-light)', color: 'var(--secondary)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-info">
            <div className="label">Active (This Page)</div>
            <div className="value" style={{ color: 'var(--secondary)' }}>{activeCount}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <div className="stat-info">
            <div className="label">Inactive (This Page)</div>
            <div className="value" style={{ color: 'var(--danger)' }}>{inactiveCount}</div>
          </div>
        </div>
      </div>

      {/* Main Card with Filter Bar & Table */}
      <div className="card">
        {/* Filter Toolbar */}
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 14, background: '#fafbfc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1 }}>
            {/* Keyword Search */}
            <div className="search-input" style={{ minWidth: 260, maxWidth: 360, flex: 1 }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                className="form-control"
                placeholder="Search exam type by name..."
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(1);
                }}
                id="input-search-exam-type"
              />
            </div>

            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Status:</label>
              <select
                className="form-control"
                style={{ width: 140 }}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                id="select-exam-type-status"
              >
                <option value="ALL">All Statuses</option>
                <option value="1">Active Only</option>
                <option value="0">Inactive Only</option>
              </select>
            </div>

            {/* Sort Dir */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Sort:</label>
              <select
                className="form-control"
                style={{ width: 150 }}
                value={sortDir}
                onChange={(e) => {
                  setSortDir(e.target.value);
                  setPage(1);
                }}
              >
                <option value="DESC">Newest First</option>
                <option value="ASC">Oldest First</option>
              </select>
            </div>

            {/* Reset Filters */}
            {(keyword || statusFilter !== 'ALL') && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setKeyword('');
                  setStatusFilter('ALL');
                  setPage(1);
                }}
                title="Reset filters"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Page size & Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select
              className="form-control"
              style={{ width: 110, fontSize: 12.5 }}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>

            <button
              className="btn btn-secondary btn-sm"
              onClick={fetchExamTypes}
              disabled={loading}
              title="Refresh list"
              style={{ height: 36, padding: '0 12px' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>
        </div>

        {/* Table Wrap */}
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{
                width: 38,
                height: 38,
                border: '3px solid var(--border)',
                borderTopColor: 'var(--primary)',
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 0.8s linear infinite'
              }} />
              <p style={{ fontWeight: 500 }}>Loading exam types...</p>
            </div>
          ) : examTypes.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: 'var(--text-muted)'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 32, height: 32 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                {keyword || statusFilter !== 'ALL' ? 'No matching exam types found' : 'No exam types created yet'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 380, margin: '0 auto 18px' }}>
                {keyword || statusFilter !== 'ALL'
                  ? 'Try adjusting your search criteria or resetting filters.'
                  : 'Get started by creating your first exam type for grading and assessments.'}
              </p>
              {isAdmin && (
                <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
                  + Create First Exam Type
                </button>
              )}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 60 }}>#</th>
                  <th>Exam Type Name</th>
                  <th style={{ width: 140 }}>Status</th>
                  <th style={{ width: 180 }}>Created At</th>
                  <th style={{ width: 180 }}>Updated At</th>
                  {isAdmin && <th style={{ width: 150, textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {examTypes.map((item, index) => {
                  const isActive = Number(item.isActive ?? item.is_active) === 1;
                  const rowNumber = (page - 1) * pageSize + index + 1;

                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                        {rowNumber}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-sm)',
                            background: isActive ? 'var(--primary-light)' : '#f3f4f6',
                            color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ width: 17, height: 17 }}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              ID: {item.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {isActive ? (
                          <span className="badge badge-success">
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0e9f6e', display: 'inline-block' }} />
                            Active
                          </span>
                        ) : (
                          <span className="badge badge-gray">
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#9ca3af', display: 'inline-block' }} />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>
                        {formatDate(item.createdAt || item.created_at)}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12.5 }}>
                        {formatDate(item.updatedAt || item.updated_at)}
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => openEditModal(item)}
                              title="Edit exam type"
                              style={{ padding: '5px 10px' }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ width: 14, height: 14 }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                              Edit
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => openDeleteModal(item)}
                              title="Delete exam type"
                              style={{ padding: '5px 10px', color: 'var(--danger)' }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ width: 14, height: 14 }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        {!loading && examTypes.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Showing <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{(page - 1) * pageSize + 1}</span> to{' '}
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{Math.min(page * pageSize, totalItems)}</span> of{' '}
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalItems}</span> exam types
            </div>

            <div className="pagination" style={{ margin: 0 }}>
              <button
                className="page-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                title="Previous Page"
              >
                ‹
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const hasGap = prev && p - prev > 1;

                  return (
                    <span key={p} style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {hasGap && <span style={{ padding: '0 4px', color: 'var(--text-muted)' }}>…</span>}
                      <button
                        className={`page-btn${p === page ? ' active' : ''}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    </span>
                  );
                })}

              <button
                className="page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                title="Next Page"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE & EDIT MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 18, height: 18 }}>
                    {editingType ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    )}
                  </svg>
                </div>
                <div>
                  <h3 className="modal-title">
                    {editingType ? 'Edit Exam Type' : 'Create Exam Type'}
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {editingType ? 'Modify exam type name and availability' : 'Define a new exam classification'}
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={closeModal} disabled={submitting}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Exam Type Name Input */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Exam Type Name <span>*</span>
                    </label>
                    <span style={{ fontSize: 11, color: formData.name.length > 140 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {formData.name.length} / 150
                    </span>
                  </div>
                  <input
                    type="text"
                    className={`form-control${formErrors.name ? ' error' : ''}`}
                    placeholder="e.g. Unit Test, Mid Term, Model Paper"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, name: e.target.value }));
                      if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: null }));
                    }}
                    autoFocus
                    maxLength={150}
                    disabled={submitting}
                  />
                  {formErrors.name && <div className="form-error">{formErrors.name}</div>}
                  <div className="form-hint">
                    Enter a descriptive name for this examination type.
                  </div>
                </div>

                {/* Status Selection */}
                <div className="form-group" style={{ marginBottom: 8 }}>
                  <label className="form-label">
                    Status <span>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: `1.5px solid ${formData.isActive === 1 ? 'var(--secondary)' : 'var(--border)'}`,
                        background: formData.isActive === 1 ? 'var(--secondary-light)' : 'white',
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                    >
                      <input
                        type="radio"
                        name="examTypeIsActive"
                        checked={formData.isActive === 1}
                        onChange={() => setFormData((prev) => ({ ...prev, isActive: 1 }))}
                        disabled={submitting}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: formData.isActive === 1 ? '#03543f' : 'var(--text-primary)' }}>
                          Active
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          Available for exams
                        </div>
                      </div>
                    </label>

                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: `1.5px solid ${formData.isActive === 0 ? 'var(--danger)' : 'var(--border)'}`,
                        background: formData.isActive === 0 ? 'var(--danger-light)' : 'white',
                        cursor: 'pointer',
                        transition: 'var(--transition)'
                      }}
                    >
                      <input
                        type="radio"
                        name="examTypeIsActive"
                        checked={formData.isActive === 0}
                        onChange={() => setFormData((prev) => ({ ...prev, isActive: 0 }))}
                        disabled={submitting}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: formData.isActive === 0 ? '#9b1c1c' : 'var(--text-primary)' }}>
                          Inactive
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          Disabled / Hidden
                        </div>
                      </div>
                    </label>
                  </div>
                  {formErrors.isActive && <div className="form-error">{formErrors.isActive}</div>}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <div style={{
                        width: 14,
                        height: 14,
                        border: '2px solid rgba(255,255,255,0.4)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite'
                      }} />
                      {editingType ? 'Saving...' : 'Creating...'}
                    </>
                  ) : editingType ? (
                    'Save Changes'
                  ) : (
                    'Create Exam Type'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingType && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header" style={{ borderBottomColor: 'var(--danger-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'var(--danger-light)',
                  color: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 20, height: 20 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <h3 className="modal-title" style={{ color: '#9b1c1c' }}>
                  Delete Exam Type
                </h3>
              </div>
              <button className="modal-close" onClick={closeDeleteModal} disabled={isDeleting}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p style={{ color: 'var(--text-primary)', marginBottom: 12 }}>
                Are you sure you want to delete this exam type?
              </p>
              <div style={{
                background: 'var(--bg)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                marginBottom: 14
              }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
                  {deletingType.name}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  ID: {deletingType.id}
                </div>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                This item will be marked as deleted and will no longer be available for scheduling new exams.
              </p>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={closeDeleteModal} disabled={isDeleting}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={handleConfirmDelete} disabled={isDeleting}>
                {isDeleting ? (
                  <>
                    <div style={{
                      width: 14,
                      height: 14,
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                    Deleting...
                  </>
                ) : (
                  'Yes, Delete Exam Type'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

