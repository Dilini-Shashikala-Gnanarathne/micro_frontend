import { useState, useEffect, useCallback } from 'react';
import { getStudentEnrollmentHistory } from '../../api';
import toast from 'react-hot-toast';

const COURSE_TYPES = [
  { value: '', label: 'All Course Types' },
  { value: 'MONTHLY_CLASS', label: 'Monthly Class' },
  { value: 'LESSON_PACK', label: 'Lesson Pack' },
  { value: 'FREE_CLASS', label: 'Free Class' },
  { value: 'EXTRA_CLASS', label: 'Extra Class' },
];

const ENROLLMENT_STATUSES = [
  { value: '', label: 'All Enrollment Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING', label: 'Pending Approval' },
  { value: 'NOT_PAID', label: 'Not Paid' },
  { value: 'DEACTIVE', label: 'Deactive' },
  { value: 'REMOVED', label: 'Removed' },
  { value: 'EXPIRED', label: 'Expired' },
];

const SORT_OPTIONS = [
  { value: 'enrolled_at', label: 'Enrolled Date' },
  { value: 'expires_at', label: 'Expiry Date' },
  { value: 'name', label: 'Course Name' },
  { value: 'start_date', label: 'Start Date' },
];

export default function EnrollmentHistoryTab({ onViewDetails }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [courseType, setCourseType] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('enrolled_at');
  const [sortDir, setSortDir] = useState('DESC');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        size,
        sortBy,
        sortDir,
      };

      if (search.trim()) params.search = search.trim();
      if (courseType) params.courseType = courseType;
      if (status) params.status = status;

      const res = await getStudentEnrollmentHistory(params);
      const resData = res.data?.data || res.data || {};
      const items = resData.data || resData.items || (Array.isArray(resData) ? resData : []);
      const count = resData.totalCount ?? resData.total ?? items.length;

      setData(items);
      setTotalCount(count);
    } catch (err) {
      console.error('Failed to load enrollment history:', err);
      toast.error(err.response?.data?.message || 'Failed to load enrollment history.');
      setData([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, size, sortBy, sortDir, search, courseType, status]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  const handleResetFilters = () => {
    setSearch('');
    setCourseType('');
    setStatus('');
    setSortBy('enrolled_at');
    setSortDir('DESC');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / size));

  const formatCurrency = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return `LKR ${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (val) => {
    if (!val) return '—';
    try {
      return new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return val;
    }
  };

  const renderStatusBadge = (st) => {
    switch (st) {
      case 'ACTIVE':
        return <span className="badge badge-success">ACTIVE</span>;
      case 'PENDING':
        return <span className="badge badge-warning">PENDING</span>;
      case 'NOT_PAID':
        return <span className="badge badge-danger">NOT PAID</span>;
      case 'EXPIRED':
        return <span className="badge badge-danger">EXPIRED</span>;
      case 'DEACTIVE':
      case 'REMOVED':
        return <span className="badge badge-gray">{st}</span>;
      default:
        return <span className="badge badge-gray">{st || '—'}</span>;
    }
  };

  const renderAccessBadge = (access) => {
    const hasAccess = access?.hasAccess || access?.has_access;
    const reason = access?.reason;

    if (hasAccess) {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 9px',
            borderRadius: '12px',
            background: '#ecfdf5',
            color: '#065f46',
            fontSize: '11.5px',
            fontWeight: 600,
            border: '1px solid #a7f3d0',
          }}
        >
          ✓ {reason === 'APPROVED' ? 'Approved' : (reason || 'Active')}
        </span>
      );
    }

    if (reason === 'FIRST_WEEK') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 9px',
            borderRadius: '12px',
            background: '#eff6ff',
            color: '#1e40af',
            fontSize: '11.5px',
            fontWeight: 600,
            border: '1px solid #bfdbfe',
          }}
        >
          ★ First Week Free
        </span>
      );
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 9px',
          borderRadius: '12px',
          background: '#fef2f2',
          color: '#991b1b',
          fontSize: '11.5px',
          fontWeight: 600,
          border: '1px solid #fecaca',
        }}
      >
        ✕ No Access
      </span>
    );
  };

  return (
    <div>
      {/* Top Filter Bar */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-body" style={{ padding: '16px 20px' }}>
          <form onSubmit={handleSearchSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'end' }}>
              <div>
                <label className="form-label">Search</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Code, name, or tags..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label">Course Type</label>
                <select
                  className="form-control"
                  value={courseType}
                  onChange={(e) => {
                    setCourseType(e.target.value);
                    setPage(1);
                  }}
                >
                  {COURSE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Enrollment Status</label>
                <select
                  className="form-control"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  {ENROLLMENT_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Sort By</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select
                    className="form-control"
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setPage(1);
                    }}
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    title={sortDir === 'ASC' ? 'Ascending' : 'Descending'}
                    onClick={() => {
                      setSortDir((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
                      setPage(1);
                    }}
                    style={{ minWidth: '42px', padding: '0 10px' }}
                  >
                    {sortDir === 'ASC' ? '↑' : '↓'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleResetFilters}>
                Reset
              </button>
              <button type="submit" className="btn btn-primary btn-sm">
                Apply Filters
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="card-title">Course Enrollment Records</span>
            <span style={{ marginLeft: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
              ({totalCount} {totalCount === 1 ? 'record' : 'records'})
            </span>
          </div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            Showing page {page} of {totalPages}
          </div>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ marginTop: '12px', fontSize: '13px' }}>Loading enrollment history...</div>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : data.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎓</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>No Enrollment History Found</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '380px', margin: '4px auto 16px' }}>
                You have no course enrollments matching the selected criteria.
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleResetFilters}>
                Clear All Filters
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Type & Medium</th>
                  <th>Enrollment Status</th>
                  <th>Enrolled / Expire Dates</th>
                  <th>Access</th>
                  <th>Final Amount</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.enrollment?.id || item.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                          <span>Code: {item.code || '—'}</span>
                          {item.batch?.name && <span>• {item.batch.name}</span>}
                        </div>
                        {item.package && (
                          <div style={{ fontSize: '11px', color: '#15803d', marginTop: '3px', fontWeight: 500 }}>
                            📦 Via Package: {item.package.name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12.5px', fontWeight: 500 }}>
                        {item.courseType?.replace('_', ' ') || '—'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        Medium: {item.medium || '—'}
                      </div>
                    </td>
                    <td>
                      {renderStatusBadge(item.enrollment?.status)}
                    </td>
                    <td>
                      <div style={{ fontSize: '12px' }}>
                        <div><span style={{ color: 'var(--text-muted)' }}>Enrolled: </span>{formatDate(item.enrollment?.enrolledAt)}</div>
                        <div style={{ marginTop: '2px' }}><span style={{ color: 'var(--text-muted)' }}>Expires: </span>{formatDate(item.enrollment?.expiresAt)}</div>
                      </div>
                    </td>
                    <td>
                      {renderAccessBadge(item.courseAccess)}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(item.order?.finalAmount)}</div>
                      {item.order?.unitPrice && item.order?.unitPrice !== item.order?.finalAmount && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                          {formatCurrency(item.order?.unitPrice)}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onViewDetails('enrollment', item)}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        {!loading && totalCount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span>Show</span>
              <select
                className="form-control"
                style={{ width: '70px', padding: '4px 8px', fontSize: '12.5px' }}
                value={size}
                onChange={(e) => {
                  setSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>entries per page</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span style={{ margin: '0 8px', fontSize: '13px', fontWeight: 600 }}>
                {page} / {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
