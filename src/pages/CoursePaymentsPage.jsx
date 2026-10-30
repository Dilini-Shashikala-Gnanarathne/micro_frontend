import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getCourseRequests, approvePayment, rejectPayment, getRejectReasons } from "../api";
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

export default function CoursePaymentsPage() {
  const { isAdmin } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [filters, setFilters] = useState({
    keyword: "",
    status: "",
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
        status: filters.status || undefined,
        paymentStatus: filters.paymentStatus || undefined,
        paymentMethod: filters.paymentMethod || undefined,
        page: filters.page,
        size: filters.size,
        sortBy: filters.sortBy,
        sortDir: filters.sortDir,
      };
      const res = await getCourseRequests(params);
      const data = res.data?.data;
      setRequests(data?.items || data?.data || data || []);
      setTotal(data?.totalCount || data?.total || data?.count || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load course payment requests");
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
  }, [filters.page, filters.status, filters.paymentStatus, filters.paymentMethod]);

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters((prev) => ({ ...prev, page: 1 }));
    fetchRequests();
  };

  const handleReset = () => {
    setFilters({
      keyword: "",
      status: "",
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
      toast.success("Payment and course enrollment approved successfully!");
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
      toast.success("Payment rejected successfully.");
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
          <h2 style={{ fontWeight: 800, fontSize: "18px" }}>Course Payment Requests</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
            Review, approve, or reject student enrollment payment slips
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
                id="search-course-req"
              />
            </div>

            <select
              className="form-control"
              value={filters.paymentStatus}
              onChange={(e) => setFilters((f) => ({ ...f, paymentStatus: e.target.value, page: 1 }))}
              style={{ width: "auto" }}
              id="filter-payment-status"
            >
              <option value="">All Payment Status</option>
              <option value="WAITING_APPROVAL">Waiting Approval</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select
              className="form-control"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
              style={{ width: "auto" }}
              id="filter-enrollment-status"
            >
              <option value="">All Enrollment Status</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <select
              className="form-control"
              value={filters.paymentMethod}
              onChange={(e) => setFilters((f) => ({ ...f, paymentMethod: e.target.value, page: 1 }))}
              style={{ width: "auto" }}
              id="filter-payment-method"
            >
              <option value="">All Methods</option>
              <option value="DIGITAL">DIGITAL (Bank Transfer)</option>
              <option value="ONLINE">ONLINE (Gateway)</option>
              <option value="MANUAL">MANUAL (Cash)</option>
              <option value="PAY_LATER">PAY_LATER</option>
            </select>

            <button className="btn btn-primary" type="submit" id="btn-search-req">
              Search
            </button>
            <button className="btn btn-secondary" type="button" onClick={handleReset} id="btn-reset-req">
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>No enrollment payment requests found.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Order No / Amount</th>
                  <th>Method & Reference</th>
                  <th>Slip / Evidence</th>
                  <th>Payment Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => {
                  const studentName = `${req.student?.firstName || req.student?.fname || ""} ${req.student?.lastName || req.student?.lname || ""}`.trim() || req.student?.username || "Student";
                  const academicId = req.student?.academicId || req.student?.academic_id;
                  const mobile = req.student?.mobile || req.student?.student_mobile;
                  const courseName = req.course?.name || req.course?.code || "-";
                  const payment = req.payment;
                  const order = req.order;
                  const evidence = payment?.evidence;
                  const slipUrl = evidence?.fileUrl || evidence?.file_url;
                  const orderNo = order?.ordernumber || order?.order_no || "-";
                  const totalAmt = payment?.amount ?? order?.totalAmount ?? order?.total ?? order?.final_amount ?? 0;
                  const pMethod = payment?.paymentMethod || payment?.payment_method || req.paymentMethod || "DIGITAL";
                  const refNo = evidence?.referenceNo || evidence?.reference_no || payment?.referenceNo || payment?.reference_no || "-";
                  const isPending = payment?.status === "WAITING_APPROVAL" || payment?.status === "PENDING";

                  return (
                    <tr key={req.enrollmentId || req.course?.enrollment?.enrollmentId || req.orderId || order?.id || Math.random()}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{studentName}</div>
                        <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                          {academicId && <span style={{ marginRight: "6px" }}>ID: {academicId}</span>}
                          {mobile && <span>{mobile}</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{courseName}</div>
                        <div style={{ fontSize: "11px", color: "var(--primary)" }}>
                          {req.course?.code} {req.course?.medium && `• ${req.course.medium}`}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>
                          LKR {Number(totalAmt).toLocaleString()}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                          {orderNo}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-primary" style={{ fontSize: "11px" }}>
                          {pMethod}
                        </span>
                        <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "3px", fontFamily: "monospace" }}>
                          {refNo}
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
                              id={`btn-approve-${payment?.id}`}
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
                              id={`btn-reject-${payment?.id}`}
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
              <span className="modal-title">Approve Payment & Enrollment</span>
              <button className="modal-close" onClick={() => setModalType("")}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: "center", marginBottom: "16px" }}>
                <div style={{ width: "54px", height: "54px", borderRadius: "50%", background: "#def7ec", color: "#0e9f6e", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
                  ✓
                </div>
              </div>
              <p style={{ textAlign: "center", fontSize: "13.5px", marginBottom: "20px" }}>
                Are you sure you want to approve this payment and activate the student's enrollment?
              </p>
              <div style={{ background: "var(--bg)", padding: "14px", borderRadius: "var(--radius-sm)", fontSize: "13px" }}>
                <div className="flex justify-between mb-2">
                  <span className="text-muted">Student:</span>
                  <strong>{selectedReq.student?.firstName || selectedReq.student?.fname} {selectedReq.student?.lastName || selectedReq.student?.lname}</strong>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted">Course:</span>
                  <strong>{selectedReq.course?.name || selectedReq.course?.code}</strong>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted">Amount:</span>
                  <strong style={{ color: "var(--primary)" }}>
                    LKR {Number(selectedReq.payment?.amount || selectedReq.order?.totalAmount || selectedReq.order?.total || selectedReq.order?.final_amount || 0).toLocaleString()}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Reference:</span>
                  <span style={{ fontFamily: "monospace" }}>{selectedReq.payment?.referenceNo || selectedReq.payment?.reference_no || "-"}</span>
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
                id="btn-confirm-approve"
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
              <span className="modal-title" style={{ color: "#c81e1e" }}>Reject Payment</span>
              <button className="modal-close" onClick={() => setModalType("")}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
                Select a reason or enter remarks to notify the student why their payment was rejected.
              </p>

              {rejectReasonsList.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Pre-configured Reasons</label>
                  <select
                    className="form-control"
                    onChange={(e) => setRejectReason(e.target.value)}
                    value={rejectReason}
                    id="select-reject-reason"
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
                  placeholder="e.g. Invalid bank transfer reference or slip image unreadable"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  id="textarea-reject-reason"
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
                id="btn-confirm-reject"
              >
                {actionLoading ? <span className="spinner" /> : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SLIP PREVIEW MODAL */}
      {modalType === "slip" && (selectedReq?.payment?.evidence?.fileUrl || selectedReq?.payment?.evidence?.file_url) && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalType("")}>
          <div className="modal" style={{ maxWidth: "560px" }}>
            <div className="modal-header">
              <span className="modal-title">Payment Evidence Slip</span>
              <button className="modal-close" onClick={() => setModalType("")}>×</button>
            </div>
            <div className="modal-body" style={{ textAlign: "center", background: "#111827", padding: "16px", borderRadius: "var(--radius-sm)" }}>
              <img
                src={resolveMediaUrl(selectedReq.payment.evidence.fileUrl || selectedReq.payment.evidence.file_url)}
                alt="Bank Slip"
                style={{ maxWidth: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: "4px" }}
              />
            </div>
            <div className="modal-footer flex justify-between">
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Ref: <strong>{selectedReq.payment?.evidence?.referenceNo || selectedReq.payment?.evidence?.reference_no || "-"}</strong>
              </span>
              <a
                href={resolveMediaUrl(selectedReq.payment.evidence.fileUrl || selectedReq.payment.evidence.file_url)}
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