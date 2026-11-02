import React, { useState, useEffect, useCallback } from 'react';
import { getStudentTuteRequestHistory } from '../../api';
import toast from 'react-hot-toast';

const COURSE_TYPES = [
  { value: '', label: 'All Course Types' },
  { value: 'MONTHLY_CLASS', label: 'Monthly Class' },
  { value: 'LESSON_PACK', label: 'Lesson Pack' },
  { value: 'FREE_CLASS', label: 'Free Class' },
  { value: 'EXTRA_CLASS', label: 'Extra Class' },
];

const DELIVERY_TYPES = [
  { value: '', label: 'All Delivery Types' },
  { value: 'HOME', label: 'Home Delivery' },
  { value: 'INSTITUTE', label: 'Institute Pick-up' },
];

const TUTE_STATUSES = [
  { value: '', label: 'All Request Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'CHECKED', label: 'Checked' },
  { value: 'SENT', label: 'Sent / Dispatched' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'DIFFERED', label: 'Differed' },
];

export default function TuteRequestHistoryTab({ onViewDetails }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [courseType, setCourseType] = useState('');
  const [deliveryType, setDeliveryType] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
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

      if (courseType) params.courseType = courseType;
      if (deliveryType) params.deliveryType = deliveryType;
      if (status) params.status = status;

      const res = await getStudentTuteRequestHistory(params);
      const resData = res.data?.data || res.data || {};
      const items = resData.data || resData.items || (Array.isArray(resData) ? resData : []);
      const count = resData.totalCount ?? resData.total ?? items.length;

      setData(items);
      setTotalCount(count);
    } catch (err) {
      console.error('Failed to load tute request history:', err);
      toast.error(err.response?.data?.message || 'Failed to load tute request history.');
      setData([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, size, sortBy, sortDir, courseType, deliveryType, status]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  const handleResetFilters = () => {
    setCourseType('');
    setDeliveryType('');
    setStatus('');
    setSortBy('created_at');
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
      return new Date(val).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return val;
    }
  };

  const renderStatusBadge = (st) => {
    switch (st) {
      case 'DELIVERED':
        return <span className="badge badge-success">DELIVERED</span>;
      case 'ACTIVE':
        return <span className="badge badge-warning">ACTIVE</span>;
      case 'CHECKED':
        return <span className="badge badge-primary">CHECKED</span>;
      case 'SENT':
        return <span className="badge badge-primary">SENT</span>;
      case 'REJECTED':
        return <span className="badge badge-danger">REJECTED</span>;
      case 'DIFFERED':
        return <span className="badge badge-gray">DIFFERED</span>;
      default:
        return <span className="badge badge-gray">{st || '—'}</span>;
    }
  };

  return (
    <div>
      {/* Top Filter Bar */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-body" style={{ padding: '16px 20px' }}>
          <form onSubmit={handleSearchSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'end' }}>
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
                  {COURSE_TYPES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Delivery Type</label>
                <select
                  className="form-control"
                  value={deliveryType}
                  onChange={(e) => {
                    setDeliveryType(e.target.value);
                    setPage(1);
                  }}
                >
                  {DELIVERY_TYPES.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Request Status</label>
                <select
                  className="form-control"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  {TUTE_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Sort By Created</label>
                <button
                  type="button"
                  className="btn btn-secondary form-control"
                  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                  onClick={() => {
                    setSortDir((prev) => (prev === 'ASC' ? 'DESC' : 'ASC'));
                    setPage(1);
                  }}
                >
                  <span>Date Created ({sortDir === 'ASC' ? 'Oldest First' : 'Newest First'})</span>
                  <span>{sortDir === 'ASC' ? '↑' : '↓'}</span>
                </button>
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
            <span className="card-title">Tute Request Records</span>
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
              <div style={{ marginTop: '12px', fontSize: '13px' }}>Loading tute request history...</div>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : data.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>📦</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>No Tute Requests Found</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '380px', margin: '4px auto 16px' }}>
                You have not placed any tute delivery requests matching these filters.
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleResetFilters}>
                Clear All Filters
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Course Info</th>
                  <th>Delivery Method</th>
                  <th>Destination / Institute</th>
                  <th>Status</th>
                  <th>Requested Date</th>
                  <th>Order Info</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.course?.name || '—'}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                          <span>{item.course?.code || '—'}</span>
                          {item.course?.batch?.name && <span>• {item.course.batch.name}</span>}
                          {item.course?.medium && <span>• {item.course.medium}</span>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${item.deliveryType === 'HOME' ? 'badge-primary' : 'badge-gray'}`}>
                        {item.deliveryType === 'HOME' ? '🏠 Home Delivery' : '🏫 Institute Pick-up'}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '12.5px', maxWidth: '240px' }}>
                        {item.deliveryType === 'HOME' ? (
                          <span style={{ color: 'var(--text-primary)' }}>{item.deliveryAddress || 'Address on file'}</span>
                        ) : (
                          <span style={{ fontWeight: 500 }}>{item.instituteName || 'Institute Center'}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {renderStatusBadge(item.status)}
                    </td>
                    <td>
                      <div style={{ fontSize: '12px' }}>
                        {formatDate(item.createdAt)}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px' }}>
                        {item.order?.orderNo && <div><strong>{item.order.orderNo}</strong></div>}
                        <div style={{ color: 'var(--text-muted)' }}>
                          {formatCurrency(item.order?.finalAmount)}
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onViewDetails('tute', item)}
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
