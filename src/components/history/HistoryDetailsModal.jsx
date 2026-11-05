export default function HistoryDetailsModal({ type, item, onClose }) {
  if (!item) return null;

  const renderBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
      case 'PAID':
      case 'APPROVED':
      case 'DELIVERED':
      case 'COMPLETED':
        return <span className="badge badge-success">{status}</span>;
      case 'PENDING':
      case 'PENDING_APPROVAL':
      case 'WAITING_APPROVAL':
      case 'CHECKED':
      case 'SENT':
        return <span className="badge badge-warning">{status}</span>;
      case 'NOT_PAID':
      case 'REJECTED':
      case 'FAILED':
      case 'EXPIRED':
        return <span className="badge badge-danger">{status}</span>;
      default:
        return <span className="badge badge-gray">{status || 'N/A'}</span>;
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '—';
    return `LKR ${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
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
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <div>
            <div style={{ fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              History Record Details
            </div>
            <div className="modal-title" style={{ marginTop: '2px' }}>
              {type === 'enrollment' && (item.name || item.code || 'Course Enrollment Details')}
              {type === 'payment' && (item.orderNo ? `Order #${item.orderNo}` : 'Payment Details')}
              {type === 'lesson' && (item.name || 'Lesson Request Details')}
              {type === 'tute' && (item.course?.name ? `Tute: ${item.course.name}` : 'Tute Request Details')}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* ENROLLMENT HISTORY DETAILS */}
          {type === 'enrollment' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', background: 'var(--bg)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Status</div>
                  <div style={{ marginTop: '4px' }}>{renderBadge(item.enrollment?.status)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Course Code</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{item.code || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Medium</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{item.medium || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Batch</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{item.batch?.name || '—'}</div>
                </div>
              </div>

              {item.package && (
                <div style={{ padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '4px' }}>Enrolled Via Package</div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{item.package.name}</div>
                  <div style={{ fontSize: '12px', color: '#15803d', marginTop: '2px' }}>
                    Medium: {item.package.medium || '—'} | Batch: {item.package.batchName || '—'}
                  </div>
                </div>
              )}

              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>Enrollment Lifecycle</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12.5px' }}>
                  <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Enrolled At: </span>
                    <strong>{formatDate(item.enrollment?.enrolledAt)}</strong>
                  </div>
                  <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Approved At: </span>
                    <strong>{formatDate(item.enrollment?.approvedAt)}</strong>
                  </div>
                  <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Expires At: </span>
                    <strong>{formatDate(item.enrollment?.expiresAt)}</strong>
                  </div>
                  <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Access Reason: </span>
                    <strong>{item.courseAccess?.reason || 'None'}</strong>
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>Order & Billing</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12.5px' }}>
                  <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Unit Price: </span>
                    <strong>{formatCurrency(item.order?.unitPrice)}</strong>
                  </div>
                  <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Final Amount: </span>
                    <strong>{formatCurrency(item.order?.finalAmount)}</strong>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* PAYMENT HISTORY DETAILS */}
          {type === 'payment' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', background: 'var(--bg)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Order Status</div>
                  <div style={{ marginTop: '4px' }}>{renderBadge(item.status)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Order Number</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{item.orderNo || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Amount</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{formatCurrency(item.totalAmount)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Final Amount</div>
                  <div style={{ fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>{formatCurrency(item.finalAmount)}</div>
                </div>
              </div>

              {Array.isArray(item.orderItems) && item.orderItems.length > 0 ? (
                <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Order Items ({item.orderItems.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {item.orderItems.map((oi, idx) => (
                      <div key={oi.id || idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: idx < item.orderItems.length - 1 ? '1px dashed var(--border)' : 'none', paddingBottom: idx < item.orderItems.length - 1 ? '8px' : 0 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{oi.product?.name || 'Item'}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Type: {oi.product?.type} {oi.product?.code ? `| Code: ${oi.product.code}` : ''}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 600 }}>{formatCurrency(oi.total)}</div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            Qty: {oi.quantity ?? 1} &times; {formatCurrency(oi.unitPrice)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : item.orderItem?.product ? (
                <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>Product Details</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.orderItem.product.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Type: {item.orderItem.product.type} {item.orderItem.product.code ? `| Code: ${item.orderItem.product.code}` : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(item.orderItem.total)}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        Qty: {item.orderItem.quantity ?? 1} &times; {formatCurrency(item.orderItem.unitPrice)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>Payment & Slip Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12.5px' }}>
                  <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Payment Method: </span>
                    <strong>{item.payment?.paymentMethod || '—'}</strong>
                  </div>
                  <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Paid Amount: </span>
                    <strong>{formatCurrency(item.payment?.amount)}</strong>
                  </div>
                  <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Paid At: </span>
                    <strong>{formatDate(item.payment?.paidAt)}</strong>
                  </div>
                  <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Approved At: </span>
                    <strong>{formatDate(item.payment?.approvedAt)}</strong>
                  </div>
                  <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Slip Reference: </span>
                    <strong>{item.payment?.slipReferenceNo || '—'}</strong>
                  </div>
                  <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Slip Status: </span>
                    <strong style={{ marginLeft: '4px' }}>{renderBadge(item.payment?.slipStatus)}</strong>
                  </div>
                </div>
              </div>

              {item.payment?.remarks && (
                <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: '6px', fontSize: '12.5px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Remarks: </span>
                  <span>{item.payment.remarks}</span>
                </div>
              )}

              {item.payment?.rejectReason && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12.5px', color: '#991b1b' }}>
                  <strong>Rejection Reason: </strong>
                  <span>{item.payment.rejectReason}</span>
                  {item.payment.rejectedAt && (
                    <div style={{ fontSize: '11.5px', marginTop: '4px', opacity: 0.85 }}>
                      Rejected at: {formatDate(item.payment.rejectedAt)}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* LESSON REQUEST HISTORY DETAILS */}
          {type === 'lesson' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', background: 'var(--bg)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Enrollment Status</div>
                  <div style={{ marginTop: '4px' }}>{renderBadge(item.enrollment?.status)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Scheduled Date</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{item.date || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Medium</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{item.medium || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Batch</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{item.batch?.name || '—'}</div>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>Request Lifecycle</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12.5px' }}>
                  <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Requested At: </span>
                    <strong>{formatDate(item.enrollment?.requestedAt)}</strong>
                  </div>
                  <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Approved At: </span>
                    <strong>{formatDate(item.enrollment?.approvedAt)}</strong>
                  </div>
                  <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Expires At: </span>
                    <strong>{formatDate(item.enrollment?.expiresAt)}</strong>
                  </div>
                  <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Access State: </span>
                    <strong>{item.lessonAccess?.hasAccess ? 'Active Access' : 'No Access'}</strong>
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>Order & Payment</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12.5px' }}>
                  <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Unit Price: </span>
                    <strong>{formatCurrency(item.order?.unitPrice)}</strong>
                  </div>
                  <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Final Amount: </span>
                    <strong>{formatCurrency(item.order?.finalAmount)}</strong>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TUTE REQUEST HISTORY DETAILS */}
          {type === 'tute' && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', background: 'var(--bg)', padding: '14px', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tute Status</div>
                  <div style={{ marginTop: '4px' }}>{renderBadge(item.status)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Delivery Type</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{item.deliveryType || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Course Code</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{item.course?.code || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Medium / Batch</div>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>{item.course?.medium || '—'} ({item.course?.batch?.name || '—'})</div>
                </div>
              </div>

              <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  {item.deliveryType === 'HOME' ? 'Home Delivery Address' : 'Institute Pick-up Location'}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>
                  {item.deliveryType === 'HOME' ? (item.deliveryAddress || 'No address provided') : (item.instituteName || 'Designated Institute')}
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>Request Lifecycle & Order</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12.5px' }}>
                  <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Requested At: </span>
                    <strong>{formatDate(item.createdAt)}</strong>
                  </div>
                  <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Updated At: </span>
                    <strong>{formatDate(item.updatedAt)}</strong>
                  </div>
                  <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Order No: </span>
                    <strong>{item.order?.orderNo || '—'}</strong>
                  </div>
                  <div style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Order Amount: </span>
                    <strong>{formatCurrency(item.order?.finalAmount)}</strong>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
