import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { getTuteRequests } from '../api';

const STATUS_BADGE = {
  ACTIVE: 'badge-warning',
  CHECKED: 'badge-primary',
  SENT: 'badge-primary',
  DELIVERED: 'badge-success',
  REJECTED: 'badge-danger',
  DIFFERED: 'badge-gray',
};

const ORDER_STATUS_BADGE = {
  PAID: 'badge-success',
  PENDING_PAYMENT: 'badge-warning',
  PENDING_APPROVAL: 'badge-primary',
  REJECTED: 'badge-danger',
  CANCELLED: 'badge-gray',
  EXPIRED: 'badge-gray',
};

const INITIAL_FILTERS = {
  studentAcademicId: '',
  studentMobile: '',
  studentNic: '',
  courseCode: '',
  courseName: '',
  courseType: '',
  orderNo: '',
  orderStatus: '',
  status: '',
  deliveryType: '',
  page: 1,
  size: 10,
  sortBy: 'created_at',
  sortDir: 'DESC',
};

export default function TuteRequestsPage() {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showFilters, setShowFilters] = useState(true);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const activeFilters = {};
      Object.entries(filters).forEach(([key, val]) => {
        if (val !== '' && val !== null && val !== undefined) {
          activeFilters[key] = val;
        }
      });

      const res = await getTuteRequests(activeFilters);
      const resData = res.data?.data || res.data || {};
      setData(resData.data || []);
      setTotalCount(resData.totalCount || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch tute requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filters.page, filters.size, filters.sortBy, filters.sortDir]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
    fetchRequests();
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  const totalPages = Math.ceil(totalCount / filters.size) || 1;

  // Stats calculation
  const activeCount = useMemo(() => {
    return data.filter((item) => item.tuteRequest?.status === 'ACTIVE').length;
  }, [data]);

  const homeDeliveryCount = useMemo(() => {
    return data.filter((item) => item.tuteRequest?.deliveryType === 'HOME').length;
  }, [data]);

  const instituteCount = useMemo(() => {
    return data.filter((item) => item.tuteRequest?.deliveryType === 'INSTITUTE').length;
  }, [data]);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header section */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h2 style={{ fontWeight: 800, fontSize: '22px', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Tute Requests
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', margin: 0 }}>
            Track, filter, and process student tute orders, home deliveries, and institute pickups
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setShowFilters(!showFilters)}
            id="btn-toggle-filters"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {showFilters ? 'Hide Filter Panel' : 'Show Filter Panel'}
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={fetchRequests}
            title="Refresh list"
            id="btn-refresh-tutes"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="label">Total Tute Requests</span>
            <span className="value">{totalCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="label">Active on Page</span>
            <span className="value">{activeCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="label">Home Deliveries</span>
            <span className="value">{homeDeliveryCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="label">Institute Pickups</span>
            <span className="value">{instituteCount}</span>
          </div>
        </div>
      </div>

      {/* Advanced Filter Card */}
      {showFilters && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="card-header" style={{ padding: '14px 18px', background: 'rgba(255, 255, 255, 0.02)' }}>
            <div className="card-title" style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter Tute Requests
            </div>
          </div>
          <div className="card-body" style={{ padding: '18px' }}>
            <form onSubmit={handleSearchSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                {/* Student Academic ID */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Student Academic ID</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. S09108"
                    value={filters.studentAcademicId}
                    onChange={(e) => setFilters({ ...filters, studentAcademicId: e.target.value })}
                    id="filter-student-academic-id"
                    style={{ height: '36px', fontSize: '13px' }}
                  />
                </div>

                {/* Student Mobile */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Student Mobile</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 077..."
                    value={filters.studentMobile}
                    onChange={(e) => setFilters({ ...filters, studentMobile: e.target.value })}
                    id="filter-student-mobile"
                    style={{ height: '36px', fontSize: '13px' }}
                  />
                </div>

                {/* Student NIC */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Student NIC</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 2000..."
                    value={filters.studentNic}
                    onChange={(e) => setFilters({ ...filters, studentNic: e.target.value })}
                    id="filter-student-nic"
                    style={{ height: '36px', fontSize: '13px' }}
                  />
                </div>

                {/* Course Code */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Course Code</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. MATH2026"
                    value={filters.courseCode}
                    onChange={(e) => setFilters({ ...filters, courseCode: e.target.value })}
                    id="filter-course-code"
                    style={{ height: '36px', fontSize: '13px' }}
                  />
                </div>

                {/* Course Name */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Course Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search by course..."
                    value={filters.courseName}
                    onChange={(e) => setFilters({ ...filters, courseName: e.target.value })}
                    id="filter-course-name"
                    style={{ height: '36px', fontSize: '13px' }}
                  />
                </div>

                {/* Course Type */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Course Type</label>
                  <select
                    className="form-control"
                    value={filters.courseType}
                    onChange={(e) => setFilters({ ...filters, courseType: e.target.value })}
                    id="filter-course-type"
                    style={{ height: '36px', fontSize: '13px' }}
                  >
                    <option value="">All Course Types</option>
                    <option value="MONTHLY_CLASS">Monthly Class</option>
                    <option value="LESSON_PACK">Lesson Pack</option>
                    <option value="FREE_CLASS">Free Class</option>
                    <option value="EXTRA_CLASS">Extra Class</option>
                  </select>
                </div>

                {/* Order No */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Order No</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. ODR_..."
                    value={filters.orderNo}
                    onChange={(e) => setFilters({ ...filters, orderNo: e.target.value })}
                    id="filter-order-no"
                    style={{ height: '36px', fontSize: '13px' }}
                  />
                </div>

                {/* Order Status */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Order Status</label>
                  <select
                    className="form-control"
                    value={filters.orderStatus}
                    onChange={(e) => setFilters({ ...filters, orderStatus: e.target.value })}
                    id="filter-order-status"
                    style={{ height: '36px', fontSize: '13px' }}
                  >
                    <option value="">All Order Statuses</option>
                    <option value="PENDING_PAYMENT">Pending Payment</option>
                    <option value="PENDING_APPROVAL">Pending Approval</option>
                    <option value="PAID">Paid</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="EXPIRED">Expired</option>
                  </select>
                </div>

                {/* Tute Request Status */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Tute Request Status</label>
                  <select
                    className="form-control"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    id="filter-status"
                    style={{ height: '36px', fontSize: '13px' }}
                  >
                    <option value="">All Statuses</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="CHECKED">CHECKED</option>
                    <option value="SENT">SENT</option>
                    <option value="DELIVERED">DELIVERED</option>
                    <option value="REJECTED">REJECTED</option>
                    <option value="DIFFERED">DIFFERED</option>
                  </select>
                </div>

                {/* Delivery Type */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Delivery Type</label>
                  <select
                    className="form-control"
                    value={filters.deliveryType}
                    onChange={(e) => setFilters({ ...filters, deliveryType: e.target.value })}
                    id="filter-delivery-type"
                    style={{ height: '36px', fontSize: '13px' }}
                  >
                    <option value="">All Delivery Types</option>
                    <option value="HOME">Home Delivery</option>
                    <option value="INSTITUTE">Institute Pickup</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleResetFilters}
                  id="btn-reset-filters"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  id="btn-apply-filters"
                  style={{ minWidth: '110px' }}
                >
                  Apply Filters
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title" style={{ fontSize: '15px' }}>
            Matching Tute Requests ({totalCount})
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Page Size:</span>
            <select
              className="form-control"
              style={{ width: '80px', height: '32px', fontSize: '12px' }}
              value={filters.size}
              onChange={(e) => setFilters({ ...filters, size: Number(e.target.value), page: 1 })}
              id="select-page-size"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
              <p style={{ margin: 0 }}>Loading tute requests...</p>
            </div>
          ) : data.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  color: 'var(--text-muted)',
                }}
              >
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontWeight: 600 }}>No Tute Requests Found</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                Try adjusting your filter parameters to find the requests you are looking for.
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: '14%', padding: '12px 14px' }}>Tute Status</th>
                  <th style={{ width: '22%', padding: '12px 14px' }}>Student Details</th>
                  <th style={{ width: '22%', padding: '12px 14px' }}>Course</th>
                  <th style={{ width: '18%', padding: '12px 14px' }}>Delivery Details</th>
                  <th style={{ width: '16%', padding: '12px 14px' }}>Order & Payment</th>
                  <th style={{ width: '8%', padding: '12px 14px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => {
                  const tr = item.tuteRequest || {};
                  const st = item.student || {};
                  const cs = item.course || {};
                  const ord = item.order || {};
                  const pay = item.payment || {};

                  const trBadgeClass = STATUS_BADGE[tr.status] || 'badge-gray';
                  const ordBadgeClass = ORDER_STATUS_BADGE[ord.status] || 'badge-gray';
                  const isHome = tr.deliveryType === 'HOME';

                  return (
                    <tr key={tr.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      {/* Tute Status */}
                      <td style={{ padding: '14px', verticalAlign: 'top' }}>
                        <span className={'badge ' + trBadgeClass} style={{ marginBottom: '6px', display: 'inline-block' }}>
                          {tr.status || 'UNKNOWN'}
                        </span>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {tr.createdAt ? tr.createdAt.slice(0, 16) : ''}
                        </div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          ID: {tr.id ? tr.id.slice(0, 8) : ''}...
                        </div>
                      </td>

                      {/* Student Details */}
                      <td style={{ padding: '14px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>
                          {st.fname} {st.lname}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{st.academicId || 'No ID'}</span>
                          {st.mobile && <span> • {st.mobile}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                          {st.activeCheckedRequestCount > 0 && (
                            <span
                              className="badge badge-warning"
                              style={{ fontSize: '10.5px', padding: '2px 6px' }}
                              title="Active or Checked tute requests for this student"
                            >
                              {st.activeCheckedRequestCount} active/checked
                            </span>
                          )}
                          {st.hasFreeCard && (
                            <span className="badge badge-success" style={{ fontSize: '10.5px', padding: '2px 6px' }}>
                              Free Card
                            </span>
                          )}
                          {st.batch && (
                            <span className="badge badge-gray" style={{ fontSize: '10.5px', padding: '2px 6px' }}>
                              {st.batch}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Course Details */}
                      <td style={{ padding: '14px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                          {cs.name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Code: <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{cs.code}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                          {cs.courseType && (
                            <span className="badge badge-gray" style={{ fontSize: '10.5px', padding: '2px 6px' }}>
                              {cs.courseType.replace('_', ' ')}
                            </span>
                          )}
                          {cs.medium && (
                            <span className="badge badge-gray" style={{ fontSize: '10.5px', padding: '2px 6px' }}>
                              {cs.medium}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Delivery Details */}
                      <td style={{ padding: '14px', verticalAlign: 'top' }}>
                        <div style={{ marginBottom: '4px' }}>
                          <span className={'badge ' + (isHome ? 'badge-primary' : 'badge-success')} style={{ fontSize: '11px' }}>
                            {isHome ? '🏠 HOME DELIVERY' : '🏛️ INSTITUTE PICKUP'}
                          </span>
                        </div>
                        {!isHome && tr.instituteName && (
                          <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                            {tr.instituteName}
                          </div>
                        )}
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          {tr.deliveryAddress || 'Address not available'}
                        </div>
                      </td>

                      {/* Order & Payment */}
                      <td style={{ padding: '14px', verticalAlign: 'top' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {ord.orderNo || 'No Order #'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          <span className={'badge ' + ordBadgeClass} style={{ fontSize: '10.5px', padding: '2px 6px' }}>
                            {ord.status || 'UNKNOWN'}
                          </span>
                          {ord.finalAmount !== null && (
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              Rs. {Number(ord.finalAmount).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Method: {pay.paymentMethod || 'N/A'}
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '14px', verticalAlign: 'top', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          onClick={() => setSelectedItem(item)}
                          id={'btn-view-details-' + tr.id}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {totalCount > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 18px',
              borderTop: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Showing {Math.min((filters.page - 1) * filters.size + 1, totalCount)} to{' '}
              {Math.min(filters.page * filters.size, totalCount)} of {totalCount} requests
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={filters.page <= 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                id="btn-prev-page"
              >
                Previous
              </button>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                }}
              >
                Page {filters.page} of {totalPages}
              </div>
              <button
                className="btn btn-secondary btn-sm"
                disabled={filters.page >= totalPages}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                id="btn-next-page"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive Details Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div
            className="modal"
            style={{ maxWidth: '780px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ fontSize: '17px', fontWeight: 700 }}>
                  Tute Request Detailed Overview
                </h3>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Request ID: {selectedItem.tuteRequest?.id}
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelectedItem(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* 1. Tute Request Section */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--primary-color)' }}>📦</span> Tute Request Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Status</span>
                    <span className={'badge ' + (STATUS_BADGE[selectedItem.tuteRequest?.status] || 'badge-gray')}>
                      {selectedItem.tuteRequest?.status}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Delivery Type</span>
                    <span style={{ fontWeight: 600 }}>{selectedItem.tuteRequest?.deliveryType}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Created Date</span>
                    <span>{selectedItem.tuteRequest?.createdAt}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Institute Name</span>
                    <span>{selectedItem.tuteRequest?.instituteName || 'N/A (Home Delivery)'}</span>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Full Delivery Address</span>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {selectedItem.tuteRequest?.deliveryAddress || 'No delivery address recorded'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Student Details Section */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#10b981' }}>🎓</span> Student Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Student Name</span>
                    <span style={{ fontWeight: 600 }}>
                      {selectedItem.student?.fname} {selectedItem.student?.lname}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Academic ID</span>
                    <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                      {selectedItem.student?.academicId || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Mobile Number</span>
                    <span>{selectedItem.student?.mobile || 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Medium</span>
                    <span>{selectedItem.student?.medium || 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>School</span>
                    <span>{selectedItem.student?.school || 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Batch</span>
                    <span>{selectedItem.student?.batch || 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Free Card Status</span>
                    <span>{selectedItem.student?.hasFreeCard ? 'Yes (Has Free Card)' : 'No'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>ACTIVE / CHECKED Requests</span>
                    <span className="badge badge-warning">
                      {selectedItem.student?.activeCheckedRequestCount} active/checked
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Course Details Section */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#3b82f6' }}>📚</span> Course Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Course Code</span>
                    <span style={{ fontWeight: 600 }}>{selectedItem.course?.code}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Course Name</span>
                    <span style={{ fontWeight: 600 }}>{selectedItem.course?.name}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Course Type</span>
                    <span>{selectedItem.course?.courseType}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Medium</span>
                    <span>{selectedItem.course?.medium}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Course Batch</span>
                    <span>{selectedItem.course?.batch || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* 4. Order & Payment Section */}
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#f59e0b' }}>💳</span> Order & Payment Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Order Number</span>
                    <span style={{ fontWeight: 600 }}>{selectedItem.order?.orderNo || 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Order Status</span>
                    <span className={'badge ' + (ORDER_STATUS_BADGE[selectedItem.order?.status] || 'badge-gray')}>
                      {selectedItem.order?.status || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Final Amount</span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {selectedItem.order?.finalAmount !== null ? 'Rs. ' + Number(selectedItem.order?.finalAmount).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Payment Method</span>
                    <span>{selectedItem.payment?.paymentMethod || 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Paid Amount</span>
                    <span>
                      {selectedItem.payment?.paidAmount !== null ? 'Rs. ' + Number(selectedItem.payment?.paidAmount).toLocaleString() : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Payment Status</span>
                    <span>{selectedItem.payment?.status || 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Paid At</span>
                    <span>{selectedItem.payment?.paidAt || 'Not Paid Yet'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Approved At</span>
                    <span>{selectedItem.payment?.approvedAt || 'Not Approved Yet'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Approved By</span>
                    <span>{selectedItem.payment?.approvedBy || 'N/A'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11.5px' }}>Payment Remarks</span>
                    <span>{selectedItem.payment?.remarks || 'None'}</span>
                  </div>

                  {/* Rejection if present */}
                  {selectedItem.payment?.rejectReason && (
                    <div style={{ gridColumn: '1 / -1', background: 'rgba(239, 68, 68, 0.08)', padding: '10px 12px', borderRadius: '6px' }}>
                      <span style={{ color: '#ef4444', fontWeight: 600, display: 'block', fontSize: '12px' }}>
                        Rejection Information:
                      </span>
                      <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
                        <strong>Reason:</strong> {selectedItem.payment?.rejectReason}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Rejected at {selectedItem.payment?.rejectedAt || 'N/A'} by {selectedItem.payment?.rejectedBy || 'Admin'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedItem(null)}>
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
