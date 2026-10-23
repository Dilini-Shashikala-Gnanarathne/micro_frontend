import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getPackageRequests, approvePayment, rejectPayment, getRejectReasons } from "../api";
import toast from "react-hot-toast";

const STATUS_BADGE = {
  WAITING_APPROVAL: "badge-warning",
  PENDING: "badge-warning",
  APPROVED: "badge-success",
  REJECTED: "badge-danger",
  CANCELLED: "badge-gray",
  PAID: "badge-success",
  NOT_PAID: "badge-gray",
};

export default function PackagePaymentsPage() {
  const { isAdmin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [filters, setFilters] = useState({
    keyword: "",
    paymentStatus: "",
    paymentMethod: "",
    page: 1,
    size: 10,
    sortBy: "created_at",
    sortDir: "DESC",
  });

  // Modals state
  const [selectedReq, setSelectedReq] = useState(null);
  const [modalType, setModalType] = useState(""); // "approve" | "reject" | "slip"
  const [rejectReason, setRejectReason] = useState("");
  const [rejectReasonsList, setRejectReasonsList] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = {
        keyword: filters.keyword || undefined,
        paymentStatus: filters.paymentStatus || undefined,
        paymentMethod: filters.paymentMethod || undefined,
        page: filters.page,
        size: filters.size,
        sortBy: filters.sortBy,
        sortDir: filters.sortDir,
      };
      const res = await getPackageRequests(params);
      const data = res.data?.data;
      setRequests(data?.items || data?.data || data || []);
      setTotal(data?.totalCount || data?.total || data?.count || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load package payment requests");
    } finally {
      setLoading(false);
    }
  };

  const loadRejectReasons = async () => {
    try {
      const res = await getRejectReasons({ size: 50 });
      const list = res.data?.data?.items || res.data?.data?.data || res.data?.data || [];
      setRejectReasonsList(list);
    } catch {}
  };

  useEffect(() => {
    fetchRequests();
    loadRejectReasons();
  }, [filters.page, filters.paymentStatus, filters.paymentMethod]);

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
    fetchRequests();
  };

  const handleReset = () => {
    setFilters({
      keyword: "",
      paymentStatus: "",
      paymentMethod: "",
      page: 1,
      size: 10,
      sortBy: "created_at",
      sortDir: "DESC",
    });
  };

  const handleApprove = async () => {
    const paymentId = selectedReq?.payment?.id;
    if (!paymentId) {
      toast.error("No valid payment ID found for this request.");
      return;
    }

    setActionLoading(true);
    try {
      await approvePayment(paymentId);
      toast.success("Package payment and enrollment approved successfully!");
      setSelectedReq(null);
      setModalType("");
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve payment");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const paymentId = selectedReq?.payment?.id;
    if (!paymentId) {
      toast.error("No valid payment ID found for this request.");
      return;
    }
    if (!rejectReason.trim()) {
      toast.error("Please select or enter a rejection reason.");
      return;
    }

    setActionLoading(true);
    try {
      await rejectPayment(paymentId, rejectReason.trim());
      toast.success("Package payment rejected successfully.");
      setSelectedReq(null);
      setModalType("");
      setRejectReason("");
      fetchRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject payment");
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / filters.size) || 1;

  const resolveMediaUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/uploads/")) return url;
    if (url.startsWith("uploads/")) return "/" + url;
    return `/uploads/${url.replace(/^\/+/, "")}`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 style={{ fontWeight: 800, fontSize: "18px" }}>Package Payment Requests</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
            Review, approve, or reject student package enrollment payment slips
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <form className="filter-bar" onSubmit={handleSearch} style={{ margin: 0, flexWrap: "wrap", gap: "10px" }}>
            <div className="search-input" style={{ minWidth: "220px", flex: 1 }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                className="form-control"
                placeholder="Search student, order, ref no..."
                value={filters.keyword}
                onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
                style={{ paddingLeft: "32px" }}
                id="search-pkg-req"
              />
            </div>

            <select
              className="form-control"
              value={filters.paymentStatus}
              onChange={(e) => setFilters((f) => ({ ...f, paymentStatus: e.target.value, page: 1 }))}
              style={{ width: "auto" }}
              id="filter-pkg-payment-status"
            >
              <option value="">All Payment Status</option>
              <option value="WAITING_APPROVAL">Waiting Approval</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select
              className="form-control"
              value={filters.paymentMethod}
              onChange={(e) => setFilters((f) => ({ ...f, paymentMethod: e.target.value, page: 1 }))}
              style={{ width: "auto" }}
              id="filter-pkg-payment-method"
            >
              <option value="">All Methods</option>
              <option value="DIGITAL">DIGITAL (Bank Transfer)</option>
              <option value="ONLINE">ONLINE (Gateway)</option>
              <option value="MANUAL">MANUAL (Cash)</option>
              <option value="PAY_LATER">PAY_LATER</option>
            </select>

            <button className="btn btn-primary" type="submit" id="btn-search-pkg-req">
              Search
            </button>
            <button className="btn btn-secondary" type="button" onClick={handleReset} id="btn-reset-pkg-req">
              Reset
            </button>
          </form>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="page-loader"><div className="spinner spinner-dark" /></div>
          ) : requests.length === 0 ? (
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p>No package payment requests found.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Package</th>
                  <th>Order No / Amount</th>
                  <th>Method & Reference</th>
                  <th>Slip / Evidence</th>
                  <th>Payment Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => {
                  const studentName = `${req.student?.fname || ""} ${req.student?.lname || ""}`.trim() || req.student?.username || "Student";
                  const packageName = req.package?.name || req.course?.name || "Package";
                  const payment = req.payment;
                  const order = req.order;
                  const evidence = payment?.evidence;
                  const slipUrl = evidence?.file_url;
                  const isPending = payment?.status === "WAITING_APPROVAL" || payment?.status === "PENDING";

                  return (
                    <tr key={req.enrollmentId || req.orderId || Math.random()}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{studentName}</div>
                        <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                          {req.student?.academic_id && <span style={{ marginRight: "6px" }}>{req.student.academic_id}</span>}
                          {req.student?.mobile && <span>{req.student.mobile}</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{packageName}</div>
                        {req.course?.name && (
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                            Includes: {req.course.name}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>
                          LKR {Number(payment?.amount || order?.final_amount || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                          {order?.order_no || "-"}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-primary" style={{ fontSize: "11px" }}>
                          {payment?.payment_method || req.paymentMethod || "DIGITAL"}
                        </span>
                        <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "3px", fontFamily: "monospace" }}>
                          {evidence?.reference_no || payment?.reference_no || "-"}
                        </div>
                      </td>
                      <td>
                        {slipUrl ? (
                          <div
                            style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}
                            onClick={() => {
                              setSelectedReq(req);
                              setModalType("slip");
                            }}
                          >
                            <img
                              src={resolveMediaUrl(slipUrl)}
                              alt="Slip"
                              className="evidence-img"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                            <span className="link-blue" style={{ fontSize: "12px" }}>View</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>No slip</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[payment?.status] || "badge-gray"}`}>
                          {payment?.status || req.status || "PENDING"}
                        </span>
                      </td>
                      <td>
                        {isPending ? (
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ background: "#0e9f6e", borderColor: "#0e9f6e", padding: "5px 12px", fontSize: "12px" }}
                              onClick={() => {
                                setSelectedReq(req);
                                setModalType("approve");
                              }}
                              id={`btn-approve-pkg-${payment?.id}`}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ color: "#c81e1e", borderColor: "#fecaca", padding: "5px 12px", fontSize: "12px" }}
                              onClick={() => {
                                setSelectedReq(req);
                                setModalType("reject");
                                setRejectReason("");
                              }}
                              id={`btn-reject-pkg-${payment?.id}`}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            {payment?.status === "APPROVED" ? "✓ Done" : payment?.status || "Reviewed"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!loading && requests.length > 0 && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)" }}>
            <div className="flex justify-between items-center">
              <span style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                Showing {requests.length} of {total} requests
              </span>
              <div className="pagination">
                <button
                  className="page-btn"
                  disabled={filters.page === 1}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                >
                  &lt;
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`page-btn${filters.page === p ? " active" : ""}`}
                    onClick={() => setFilters((f) => ({ ...f, page: p }))}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="page-btn"
                  disabled={filters.page === totalPages}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* APPROVE MODAL */}
      {modalType === "approve" && selectedReq && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalType("")}>
          <div className="modal" style={{ maxWidth: "460px" }}>
            <div className="modal-header">
              <span className="modal-title">Approve Package Payment</span>
              <button className="modal-close" onClick={() => setModalType("")}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: "center", marginBottom: "16px" }}>
                <div style={{ width: "54px", height: "54px", borderRadius: "50%", background: "#def7ec", color: "#0e9f6e", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
                  ✓
                </div>
              </div>
              <p style={{ textAlign: "center", fontSize: "13.5px", marginBottom: "20px" }}>
                Approve this payment and activate the student's package enrollment?
              </p>
              <div style={{ background: "var(--bg)", padding: "14px", borderRadius: "var(--radius-sm)", fontSize: "13px" }}>
                <div className="flex justify-between mb-2">
                  <span className="text-muted">Student:</span>
                  <strong>{selectedReq.student?.fname} {selectedReq.student?.lname}</strong>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted">Package:</span>
                  <strong>{selectedReq.package?.name || "Package"}</strong>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted">Amount:</span>
                  <strong style={{ color: "var(--primary)" }}>
                    LKR {Number(selectedReq.payment?.amount || selectedReq.order?.final_amount || 0).toLocaleString()}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Reference:</span>
                  <span style={{ fontFamily: "monospace" }}>{selectedReq.payment?.reference_no || "-"}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalType("")} disabled={actionLoading}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ background: "#0e9f6e", borderColor: "#0e9f6e" }}
                onClick={handleApprove}
                disabled={actionLoading}
                id="btn-confirm-pkg-approve"
              >
                {actionLoading ? <span className="spinner" /> : "Confirm Approval"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {modalType === "reject" && selectedReq && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalType("")}>
          <div className="modal" style={{ maxWidth: "480px" }}>
            <div className="modal-header">
              <span className="modal-title" style={{ color: "#c81e1e" }}>Reject Package Payment</span>
              <button className="modal-close" onClick={() => setModalType("")}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
                Select a reason or enter remarks to notify the student why their package payment was rejected.
              </p>

              {rejectReasonsList.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Pre-configured Reasons</label>
                  <select
                    className="form-control"
                    onChange={(e) => setRejectReason(e.target.value)}
                    value={rejectReason}
                    id="select-pkg-reject-reason"
                  >
                    <option value="">-- Choose predefined reason --</option>
                    {rejectReasonsList.map((r) => (
                      <option key={r.id} value={r.reason || r.name}>
                        {r.reason || r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Rejection Reason / Remarks *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="e.g. Deposit slip amount did not match package combination price"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  id="textarea-pkg-reject-reason"
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalType("")} disabled={actionLoading}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{ background: "#c81e1e", borderColor: "#c81e1e" }}
                onClick={handleReject}
                disabled={actionLoading}
                id="btn-confirm-pkg-reject"
              >
                {actionLoading ? <span className="spinner" /> : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SLIP PREVIEW MODAL */}
      {modalType === "slip" && selectedReq?.payment?.evidence?.file_url && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalType("")}>
          <div className="modal" style={{ maxWidth: "560px" }}>
            <div className="modal-header">
              <span className="modal-title">Payment Evidence Slip</span>
              <button className="modal-close" onClick={() => setModalType("")}>×</button>
            </div>
            <div className="modal-body" style={{ textAlign: "center", background: "#111827", padding: "16px", borderRadius: "var(--radius-sm)" }}>
              <img
                src={resolveMediaUrl(selectedReq.payment.evidence.file_url)}
                alt="Bank Slip"
                style={{ maxWidth: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: "4px" }}
              />
            </div>
            <div className="modal-footer flex justify-between">
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Ref: <strong>{selectedReq.payment?.evidence?.reference_no || "-"}</strong>
              </span>
              <a
                href={resolveMediaUrl(selectedReq.payment.evidence.file_url)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
              >
                Open in new tab ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}