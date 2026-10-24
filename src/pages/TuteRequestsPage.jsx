import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  getTuteRequests,
  getTuteRequestsForPrint,
  updateTuteRequest,
  updateTuteRequestStatus,
  deleteTuteRequest,
  getPhysicalInstitutes,
} from '../api';

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

const ALL_STATUSES = ['ACTIVE', 'CHECKED', 'SENT', 'DELIVERED', 'REJECTED', 'DIFFERED'];

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
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showFilters, setShowFilters] = useState(true);

  // Edit modal state
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({
    deliveryType: 'INSTITUTE',
    instituteId: '',
    deliveryAddress: '',
    status: 'ACTIVE',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Print modal state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printData, setPrintData] = useState([]);
  const [printLoading, setPrintLoading] = useState(false);
  const [printViewMode, setPrintViewMode] = useState('table'); // 'table' | 'labels'
  const [printDeliveryFilter, setPrintDeliveryFilter] = useState('ALL');
  const [printSearchQuery, setPrintSearchQuery] = useState('');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const filteredPrintRecords = useMemo(() => {
    return printData
      .filter((r) => printDeliveryFilter === 'ALL' || r.deliveryType === printDeliveryFilter)
      .filter((r) => {
        if (!printSearchQuery.trim()) return true;
        const q = printSearchQuery.toLowerCase();
        const combined = `${r.fname} ${r.lname} ${r.academicId} ${r.mobile} ${r.deliveryAddress || ''} ${r.instituteName || ''}`.toLowerCase();
        return combined.includes(q);
      });
  }, [printData, printDeliveryFilter, printSearchQuery]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === data.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.map((item) => item.tuteRequest?.id).filter(Boolean));
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    if (selectedIds.length === 0) return;
    if (newStatus === 'REJECTED' && !window.confirm(`Are you sure you want to mark ${selectedIds.length} requests as REJECTED? Order fulfillment will be set to FAILED.`)) {
      return;
    }

    setIsBulkUpdating(true);
    let count = 0;
    try {
      await Promise.all(
        selectedIds.map(async (id) => {
          try {
            await updateTuteRequestStatus(id, newStatus);
            count++;
          } catch (_) {}
        })
      );
      toast.success(`Updated ${count} of ${selectedIds.length} requests to ${newStatus}`);
      setSelectedIds([]);
      fetchRequests();
    } catch (err) {
      toast.error('Bulk update encountered errors');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleExportCsv = () => {
    if (!data || data.length === 0) {
      toast.error('No tute requests to export');
      return;
    }

    const headers = [
      'Tute Request ID',
      'Status',
      'Delivery Type',
      'Institute Name',
      'Delivery Address',
      'Academic ID',
      'First Name',
      'Last Name',
      'Mobile',
      'NIC',
      'Course Code',
      'Course Name',
      'Course Type',
      'Order No',
      'Order Status',
      'Final Amount (LKR)',
      'Payment Method',
      'Created Date',
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = data.map((item) => {
      const tr = item.tuteRequest || {};
      const st = item.student || {};
      const cs = item.course || {};
      const ord = item.order || {};
      const pay = item.payment || {};

      return [
        escapeCsv(tr.id),
        escapeCsv(tr.status),
        escapeCsv(tr.deliveryType),
        escapeCsv(tr.instituteName || ''),
        escapeCsv(tr.deliveryAddress || ''),
        escapeCsv(st.academicId || ''),
        escapeCsv(st.fname || ''),
        escapeCsv(st.lname || ''),
        escapeCsv(st.mobile || ''),
        escapeCsv(st.nic || ''),
        escapeCsv(cs.code || ''),
        escapeCsv(cs.name || ''),
        escapeCsv(cs.courseType || ''),
        escapeCsv(ord.orderNo || ''),
        escapeCsv(ord.status || ''),
        escapeCsv(ord.finalAmount || ''),
        escapeCsv(pay.paymentMethod || ''),
        escapeCsv(tr.createdAt || ''),
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,﻿' + [headers.join(','), ...rows].join('\r\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tute_requests_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Tute requests exported to CSV');
  };

  const handlePrintSingle = (item) => {
    const tr = item.tuteRequest || {};
    const st = item.student || {};
    const cs = item.course || {};
    setPrintData([
      {
        id: tr.id,
        academicId: st.academicId || '',
        fname: st.fname || '',
        lname: st.lname || '',
        mobile: st.mobile || '',
        deliveryAddress: tr.deliveryAddress || '',
        instituteName: tr.instituteName || '',
        deliveryType: tr.deliveryType || 'HOME',
        courseCode: cs.code || '',
        courseName: cs.name || '',
      },
    ]);
    setPrintDeliveryFilter('ALL');
    setPrintSearchQuery('');
    setPrintViewMode('labels');
    setShowPrintModal(true);
  };

  const handleOpenPrintModal = async () => {
    setShowPrintModal(true);
    setPrintLoading(true);
    try {
      const res = await getTuteRequestsForPrint();
      const items = res.data?.data || res.data || [];
      setPrintData(Array.isArray(items) ? items : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch print requests');
    } finally {
      setPrintLoading(false);
    }
  };

  // Delete modal state
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchInstitutes = async () => {
    try {
      const res = await getPhysicalInstitutes();
      const instData = res.data?.data || res.data || [];
      setInstitutes(Array.isArray(instData) ? instData : []);
    } catch (_) {}
  };

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
    fetchInstitutes();
  }, []);

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

  // Quick status update from row
  const handleQuickStatusChange = async (trId, newStatus) => {
    try {
      await updateTuteRequestStatus(trId, newStatus);
      toast.success(`Tute request status changed to ${newStatus}`);
      fetchRequests();
      if (selectedItem?.tuteRequest?.id === trId) {
        setSelectedItem((prev) => ({
          ...prev,
          tuteRequest: { ...prev.tuteRequest, status: newStatus },
        }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Open Edit Modal
  const openEditModal = (item) => {
    const tr = item.tuteRequest || {};
    setEditingItem(item);
    setEditFormData({
      deliveryType: tr.deliveryType || 'INSTITUTE',
      instituteId: item.rawInstituteId || institutes.find((i) => i.name === tr.instituteName)?.id || '',
      deliveryAddress: tr.deliveryAddress || '',
      status: tr.status || 'ACTIVE',
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    if (editFormData.deliveryType === 'INSTITUTE' && !editFormData.instituteId) {
      toast.error('Please select a delivery institute');
      return;
    }

    setIsUpdating(true);
    try {
      await updateTuteRequest(editingItem.tuteRequest.id, {
        deliveryType: editFormData.deliveryType,
        instituteId: editFormData.deliveryType === 'INSTITUTE' ? editFormData.instituteId : null,
        deliveryAddress: editFormData.deliveryType === 'HOME' ? editFormData.deliveryAddress : null,
        status: editFormData.status,
      });

      toast.success('Tute request updated successfully');
      setEditingItem(null);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update tute request');
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete Request
  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      await deleteTuteRequest(deletingItem.tuteRequest.id);
      toast.success('Tute request deleted successfully');
      setDeletingItem(null);
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete tute request');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / filters.size) || 1;

  // Stats calculation
  const checkedCount = useMemo(() => {
    return data.filter((item) => item.tuteRequest?.status === 'CHECKED').length;
  }, [data]);

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
    <div style={{ maxWidth: '1300px', margin: '0 auto', paddingBottom: '40px' }}>
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
            Track, update, filter, and process student tute orders, home deliveries, and institute pickups
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleOpenPrintModal}
            id="btn-open-print-modal"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Checked
          </button>
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
                    {ALL_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
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


      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div
          className="card"
          style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1.5px solid rgba(59, 130, 246, 0.4)',
            marginBottom: '20px',
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="badge badge-primary" style={{ fontSize: '13px', padding: '4px 10px', fontWeight: 700 }}>
              {selectedIds.length} Selected
            </span>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Bulk status actions for selected tute requests:
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => handleBulkStatusChange('CHECKED')}
              disabled={isBulkUpdating}
              title="Mark as CHECKED for printing"
            >
              Mark CHECKED
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleBulkStatusChange('SENT')}
              disabled={isBulkUpdating}
            >
              Mark SENT
            </button>
            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={() => handleBulkStatusChange('DELIVERED')}
              disabled={isBulkUpdating}
            >
              Mark DELIVERED
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => handleBulkStatusChange('REJECTED')}
              disabled={isBulkUpdating}
            >
              Mark REJECTED
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setSelectedIds([])}
              disabled={isBulkUpdating}
            >
              Deselect All
            </button>
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
                  <th style={{ width: '16%', padding: '12px 14px' }}>Tute Status</th>
                  <th style={{ width: '20%', padding: '12px 14px' }}>Student Details</th>
                  <th style={{ width: '20%', padding: '12px 14px' }}>Course</th>
                  <th style={{ width: '18%', padding: '12px 14px' }}>Delivery Details</th>
                  <th style={{ width: '14%', padding: '12px 14px' }}>Order & Payment</th>
                  <th style={{ width: '12%', padding: '12px 14px', textAlign: 'right' }}>Actions</th>
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
                  const canDelete = tr.status === 'DELIVERED' || tr.status === 'REJECTED';

                  return (
                    <tr key={tr.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      {/* Tute Status */}
                      <td style={{ padding: '14px', verticalAlign: 'top' }}>
                        <div style={{ marginBottom: '6px' }}>
                          <select
                            className={'badge ' + trBadgeClass}
                            style={{
                              border: 'none',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                            }}
                            value={tr.status || 'ACTIVE'}
                            onChange={(e) => handleQuickStatusChange(tr.id, e.target.value)}
                            title="Click to quickly update status"
                          >
                            {ALL_STATUSES.map((s) => (
                              <option key={s} value={s} style={{ background: '#1e293b', color: '#fff' }}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
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

                      {/* Actions */}
                      <td style={{ padding: '14px', verticalAlign: 'top', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '5px' }}>
                          {/* Details */}
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '11.5px' }}
                            onClick={() => setSelectedItem(item)}
                            title="View Full Details"
                          >
                            Details
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ padding: '3px 8px', fontSize: '11.5px' }}
                            onClick={() => openEditModal(item)}
                            title="Edit Delivery & Status"
                          >
                            Edit
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            style={{
                              padding: '3px 7px',
                              fontSize: '11.5px',
                              opacity: canDelete ? 1 : 0.35,
                              cursor: canDelete ? 'pointer' : 'not-allowed',
                            }}
                            disabled={!canDelete}
                            onClick={() => canDelete && setDeletingItem(item)}
                            title={
                              canDelete
                                ? 'Delete Tute Request'
                                : 'Can only delete requests in DELIVERED or REJECTED status'
                            }
                          >
                            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
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

      {/* Edit Tute Request Modal */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => !isUpdating && setEditingItem(null)}>
          <div
            className="modal"
            style={{ maxWidth: '560px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '16px', fontWeight: 700 }}>
                Update Tute Request
              </h3>
              <button className="modal-close" onClick={() => setEditingItem(null)} disabled={isUpdating}>
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Student / Course info banner */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '6px', fontSize: '12.5px' }}>
                  <div><strong>Student:</strong> {editingItem.student?.fname} {editingItem.student?.lname} ({editingItem.student?.academicId})</div>
                  <div style={{ marginTop: '2px' }}><strong>Course:</strong> {editingItem.course?.name}</div>
                </div>

                {/* Delivery Type Selection */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Delivery Type</label>
                  <div style={{ display: 'flex', gap: '18px', marginTop: '6px' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="radio"
                        name="editDeliveryType"
                        checked={editFormData.deliveryType === 'INSTITUTE'}
                        onChange={() => setEditFormData({ ...editFormData, deliveryType: 'INSTITUTE' })}
                      />
                      🏛️ Institute Pickup
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                      <input
                        type="radio"
                        name="editDeliveryType"
                        checked={editFormData.deliveryType === 'HOME'}
                        onChange={() => setEditFormData({ ...editFormData, deliveryType: 'HOME' })}
                      />
                      🏠 Home Delivery
                    </label>
                  </div>
                </div>

                {/* Institute Dropdown if INSTITUTE */}
                {editFormData.deliveryType === 'INSTITUTE' ? (
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Select Delivery Institute *</label>
                    <select
                      className="form-control"
                      value={editFormData.instituteId}
                      onChange={(e) => setEditFormData({ ...editFormData, instituteId: e.target.value })}
                      required
                    >
                      <option value="">-- Choose Physical Institute --</option>
                      {institutes.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name} ({inst.address})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  /* Delivery Address Textarea if HOME */
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Student Delivery Address</label>
                    <textarea
                      rows={3}
                      className="form-control"
                      placeholder="Enter student home delivery address..."
                      value={editFormData.deliveryAddress}
                      onChange={(e) => setEditFormData({ ...editFormData, deliveryAddress: e.target.value })}
                      style={{ resize: 'vertical' }}
                    />
                    <div className="form-hint">
                      This will update the delivery address for home shipment.
                    </div>
                  </div>
                )}

                {/* Status Selection */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Tute Request Status</label>
                  <select
                    className="form-control"
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  >
                    {ALL_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  <div className="form-hint">
                    Setting status to REJECTED automatically marks order fulfillment as FAILED. Updating from REJECTED marks it as COMPLETED.
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingItem(null)}
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="modal-overlay" onClick={() => !isDeleting && setDeletingItem(null)}>
          <div
            className="modal"
            style={{ maxWidth: '440px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444' }}>
                Confirm Soft Deletion
              </h3>
              <button className="modal-close" onClick={() => setDeletingItem(null)} disabled={isDeleting}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
                Are you sure you want to delete this tute request?
              </p>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '6px', fontSize: '12.5px' }}>
                <div><strong>Student:</strong> {deletingItem.student?.fname} {deletingItem.student?.lname}</div>
                <div><strong>Course:</strong> {deletingItem.course?.name}</div>
                <div><strong>Current Status:</strong> <span className="badge badge-success">{deletingItem.tuteRequest?.status}</span></div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '12px 0 0 0' }}>
                This record will be marked as deleted and excluded from active fulfillment.
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeletingItem(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Request'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Print Checked Tute Requests Modal */}
      {showPrintModal && (
        <div className="modal-overlay" onClick={() => setShowPrintModal(false)}>
          <div
            className="modal"
            style={{ maxWidth: '1000px', width: '95%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="modal-header no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#3b82f6'
                }}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                </div>
                <div>
                  <h3 className="modal-title" style={{ fontSize: '17px', fontWeight: 700, margin: 0 }}>
                    Print Tute Requests
                  </h3>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Filter: <strong>status = 'CHECKED'</strong> ? {printData.length} records ready to print
                  </div>
                </div>
              </div>

              {/* View mode toggle & Print button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ display: 'inline-flex', background: 'var(--bg-tertiary, rgba(255,255,255,0.06))', padding: '3px', borderRadius: '6px' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${printViewMode === 'table' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ fontSize: '12px', padding: '4px 10px', height: 'auto', border: 'none' }}
                    onClick={() => setPrintViewMode('table')}
                  >
                    Table Sheet
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${printViewMode === 'labels' ? 'btn-primary' : 'btn-outline'}`}
                    style={{ fontSize: '12px', padding: '4px 10px', height: 'auto', border: 'none' }}
                    onClick={() => setPrintViewMode('labels')}
                  >
                    Shipping Labels
                  </button>
                </div>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => window.print()}
                  disabled={printLoading || printData.length === 0}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  id="btn-trigger-print"
                >
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Document
                </button>

                <button className="modal-close" onClick={() => setShowPrintModal(false)}>
                  o 
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {printLoading ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                  <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
                  <p>Loading checked tute requests...</p>
                </div>
              ) : printData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px auto',
                    color: 'var(--text-muted)'
                  }}>
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h4 style={{ margin: '0 0 6px 0', fontWeight: 600 }}>No Checked Tute Requests</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                    There are currently no tute requests with status <code>CHECKED</code> ready for printing.
                  </p>
                </div>
              ) : (
                /* Printable Content Container */
                <div id="printable-tute-area" style={{ background: '#ffffff', color: '#111827', padding: '24px', borderRadius: '8px' }}>
                  {/* Print Document Header */}
                  <div style={{ borderBottom: '2px solid #111827', paddingBottom: '14px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <div>
                      <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: '#111827', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Tute Distribution & Dispatch Sheet
                      </h2>
                      <div style={{ fontSize: '12px', color: '#4b5563' }}>
                        Batch Status: <strong>CHECKED</strong> ? Generated: {new Date().toLocaleString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, background: '#f3f4f6', color: '#111827', padding: '4px 10px', borderRadius: '4px', border: '1px solid #d1d5db' }}>
                        Total Printable: {filteredPrintRecords.length}
                      </span>
                    </div>
                  </div>

                  {/* Mode 1: Table View */}
                  {printViewMode === 'table' ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: '#111827' }}>
                      <thead>
                        <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #9ca3af' }}>
                          <th style={{ padding: '8px 10px', textAlign: 'left', width: '36px', border: '1px solid #d1d5db' }}>#</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', width: '110px', border: '1px solid #d1d5db' }}>Academic ID</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', width: '180px', border: '1px solid #d1d5db' }}>Student Name</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', width: '110px', border: '1px solid #d1d5db' }}>Mobile</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', width: '110px', border: '1px solid #d1d5db' }}>Delivery Type</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', border: '1px solid #d1d5db' }}>Delivery Address</th>
                          <th style={{ padding: '8px 10px', textAlign: 'left', width: '180px', border: '1px solid #d1d5db' }}>Institute Name</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center', width: '90px', border: '1px solid #d1d5db' }}>Check / Sign</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPrintRecords.map((row, idx) => (
                          <tr key={row.id || idx} style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? '#ffffff' : '#f9fafb' }}>
                            <td style={{ padding: '8px 10px', border: '1px solid #d1d5db', textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
                            <td style={{ padding: '8px 10px', border: '1px solid #d1d5db', fontWeight: 700, fontFamily: 'monospace', color: '#1e40af' }}>
                              {row.academicId || '-'}
                            </td>
                            <td style={{ padding: '8px 10px', border: '1px solid #d1d5db', fontWeight: 600 }}>
                              {row.fname} {row.lname}
                            </td>
                            <td style={{ padding: '8px 10px', border: '1px solid #d1d5db' }}>
                              {row.mobile || '-'}
                            </td>
                            <td style={{ padding: '8px 10px', border: '1px solid #d1d5db', fontWeight: 600 }}>
                              {row.deliveryType || 'HOME'}
                            </td>
                            <td style={{ padding: '8px 10px', border: '1px solid #d1d5db', lineHeight: 1.35 }}>
                              {row.deliveryAddress || '-'}
                            </td>
                            <td style={{ padding: '8px 10px', border: '1px solid #d1d5db', fontWeight: 500 }}>
                              {row.instituteName || (row.deliveryType === 'HOME' ? 'Home Delivery' : '-')}
                            </td>
                            <td style={{ padding: '8px 10px', border: '1px solid #d1d5db', textAlign: 'center' }}>
                              <div style={{ width: '16px', height: '16px', border: '1.5px solid #6b7280', margin: '0 auto', borderRadius: '3px' }}></div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    /* Mode 2: Shipping Labels Grid */
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
                      {filteredPrintRecords.map((row, idx) => (
                        <div
                          key={row.id || idx}
                          style={{
                            border: '1.5px solid #374151',
                            borderRadius: '6px',
                            padding: '14px',
                            background: '#ffffff',
                            breakInside: 'avoid',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            {/* Label Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #9ca3af', paddingBottom: '6px', marginBottom: '8px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#1e40af' }}>
                                Tute Delivery Label #{idx + 1}
                              </span>
                              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '3px' }}>
                                {row.deliveryType || 'HOME'}
                              </span>
                            </div>

                            {/* Recipient Details */}
                            <div style={{ marginBottom: '8px' }}>
                              <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>
                                {row.fname} {row.lname}
                              </div>
                              <div style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', color: '#2563eb' }}>
                                Academic ID: {row.academicId}
                              </div>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginTop: '2px' }}>
                                Mobile: {row.mobile || 'N/A'}
                              </div>
                            </div>

                            {/* Address / Institute */}
                            <div style={{ fontSize: '12px', background: '#f9fafb', padding: '8px 10px', borderRadius: '4px', border: '1px solid #e5e7eb', marginBottom: '8px' }}>
                              {row.deliveryAddress && (
                                <div style={{ marginBottom: '4px' }}>
                                  <strong style={{ color: '#4b5563', fontSize: '11px', display: 'block' }}>Delivery Address:</strong>
                                  <span style={{ color: '#111827', fontWeight: 500 }}>{row.deliveryAddress}</span>
                                </div>
                              )}
                              {row.instituteName && (
                                <div>
                                  <strong style={{ color: '#4b5563', fontSize: '11px', display: 'block' }}>Pickup Institute:</strong>
                                  <span style={{ color: '#111827', fontWeight: 600 }}>{row.instituteName}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Course note if available */}
                          {(row.courseCode || row.courseName) && (
                            <div style={{ fontSize: '11px', color: '#6b7280', borderTop: '1px dashed #d1d5db', paddingTop: '6px', marginTop: '4px' }}>
                              Course: <strong>{row.courseCode}</strong> {row.courseName ? `(${row.courseName})` : ''}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Document Footer */}
                  <div style={{ marginTop: '24px', paddingTop: '12px', borderTop: '1px solid #9ca3af', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280' }}>
                    <div>System Generated ? Amila Karunarathne LMS</div>
                    <div>Page Printed from Tute Requests Portal</div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Tip: In the print dialog, select "Background graphics" to include borders and highlights.
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPrintModal(false)}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => window.print()}
                  disabled={printLoading || printData.length === 0}
                >
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
