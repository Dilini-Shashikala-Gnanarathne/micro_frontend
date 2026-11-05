import { useState, useEffect, useCallback } from 'react';
import { getStudentPaymentHistory } from '../../api';
import toast from 'react-hot-toast';

const PRODUCT_TYPES = [
  { value: '', label: 'All Products' },
  { value: 'COURSE', label: 'Course' },
  { value: 'LESSON', label: 'Lesson' },
  { value: 'PACKAGE', label: 'Package' },
  { value: 'TUTE', label: 'Tute Delivery' },
];

const ORDER_STATUSES = [
  { value: '', label: 'All Order Statuses' },
  { value: 'PAID', label: 'Paid' },
  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'EXPIRED', label: 'Expired' },
];

const SORT_OPTIONS = [
  { value: 'paid_at', label: 'Paid Date' },
  { value: 'created_at', label: 'Order Date' },
  { value: 'amount', label: 'Order Amount' },
];

export default function PaymentHistoryTab({ onViewDetails }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [productType, setProductType] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('paid_at');
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

      if (productType) params.productType = productType;
      if (status) params.status = status;

      const res = await getStudentPaymentHistory(params);
      const resData = res.data?.data || res.data || {};
      const items = resData.data || resData.items || (Array.isArray(resData) ? resData : []);
      const count = resData.totalCount ?? resData.total ?? items.length;

      setData(items);
      setTotalCount(count);
    } catch (err) {
      console.error('Failed to load payment history:', err);
      toast.error(err.response?.data?.message || 'Failed to load payment history.');
      setData([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, size, sortBy, sortDir, productType, status]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchHistory();
  };

  const handleResetFilters = () => {
    setProductType('');
    setStatus('');
    setSortBy('paid_at');
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

  const renderBadge = (st) => {
    switch (st) {
      case 'PAID':
      case 'APPROVED':
        return <span className="badge badge-success">{st}</span>;
      case 'PARTIALLY_PAID':
      case 'PENDING':
      case 'PENDING_APPROVAL':
      case 'PENDING_PAYMENT':
        return <span className="badge badge-warning">{st.replace('_', ' ')}</span>;
      case 'REJECTED':
      case 'FAILED':
      case 'EXPIRED':
        return <span className="badge badge-danger">{st}</span>;
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
                <label className="form-label">Product Type</label>
                <select
                  className="form-control"
                  value={productType}
                  onChange={(e) => {
                    setProductType(e.target.value);
                    setPage(1);
                  }}
                >
                  {PRODUCT_TYPES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Order Status</label>
                <select
                  className="form-control"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  {ORDER_STATUSES.map((s) => (
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
            <span className="card-title">Order & Payment Records</span>
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
              <div style={{ marginTop: '12px', fontSize: '13px' }}>Loading payment history...</div>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : data.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>💳</div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>No Payment History Found</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '380px', margin: '4px auto 16px' }}>
                No orders or payments match the specified filters.
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleResetFilters}>
                Clear All Filters
              </button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Order Info</th>
                  <th>Product / Item</th>
                  <th>Status</th>
                  <th>Amount Details</th>
                  <th>Payment Method & Slip</th>
                  <th>Paid Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.orderNo || '—'}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Created: {formatDate(item.createdAt)}
                        </div>
                      </div>
                    </td>
                    <td>
                      {Array.isArray(item.orderItems) && item.orderItems.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {item.orderItems.map((oi, idx) => (
                            <div key={oi.id || idx}>
                              <div style={{ fontWeight: 600, fontSize: '13px' }}>
                                {oi.product?.name || 'Item'}
                              </div>
                              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', gap: '6px', marginTop: '2px' }}>
                                <span className="badge badge-gray" style={{ fontSize: '10.5px', padding: '1px 6px' }}>
                                  {oi.product?.type}
                                </span>
                                {oi.product?.code && <span>{oi.product.code}</span>}
                                {oi.quantity > 1 && <span>Qty: {oi.quantity}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : item.orderItem?.product ? (
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>
                            {item.orderItem.product.name}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', gap: '6px', marginTop: '2px' }}>
                            <span className="badge badge-gray" style={{ fontSize: '10.5px', padding: '1px 6px' }}>
                              {item.orderItem.product.type}
                            </span>
                            {item.orderItem.product.code && <span>{item.orderItem.product.code}</span>}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      {renderBadge(item.status)}
                    </td>
                    <td>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {formatCurrency(item.finalAmount)}
                        </div>
                        {item.totalAmount && item.totalAmount !== item.finalAmount && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                            {formatCurrency(item.totalAmount)}
                          </div>
                        )}
                        {item.discountAmount > 0 && (
                          <div style={{ fontSize: '10.5px', color: '#16a34a' }}>
                            Discount: {formatCurrency(item.discountAmount)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px' }}>
                        <div><strong>{item.payment?.paymentMethod || 'Manual / Slip'}</strong></div>
                        {item.payment?.slipReferenceNo && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Slip Ref: {item.payment.slipReferenceNo}
                          </div>
                        )}
                        {item.payment?.slipStatus && (
                          <div style={{ marginTop: '3px' }}>
                            {renderBadge(item.payment.slipStatus)}
                          </div>
                        )}
                        {item.payment?.rejectReason && (
                          <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '3px', fontWeight: 500 }}>
                            Reason: {item.payment.rejectReason}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px' }}>
                        {formatDate(item.payment?.paidAt || item.payment?.approvedAt || item.updatedAt)}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onViewDetails('payment', item)}
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
