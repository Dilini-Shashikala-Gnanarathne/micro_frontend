import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getLessonRequests, approvePayment, rejectPayment, getRejectReasons } from "../api";
import toast from "react-hot-toast";

const STATUS_BADGE = {
  WAITING_APPROVAL: "badge-warning",
  PENDING: "badge-warning",
  APPROVED: "badge-success",
  REJECTED: "badge-danger",
  CANCELLED: "badge-gray",
  PAID: "badge-success",
  NOT_PAID: "badge-gray",
  ACTIVE: "badge-success",
};

export default function LessonPaymentsPage() {
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
    sortBy: "requested_at",
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
      const res = await getLessonRequests(params);
      const data = res.data?.data;
      setRequests(data?.items || data?.data || data || []);
      setTotal(data?.totalCount || data?.total || data?.count || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load lesson payment requests");
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
      sortBy: "requested_at",
      sortDir: "DESC",
    });
  };

  const handleApprove = async () => {
    const paymentId = selectedReq?.paymentId || selectedReq?.payment?.id;
    if (!paymentId) {
      toast.error("No valid payment ID found for this request.");
      return;
    }

    setActionLoading(true);
    try {
      await approvePayment(paymentId);
      toast.success("Payment and lesson enrollment approved successfully!");
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
    const paymentId = selectedReq?.paymentId || selectedReq?.payment?.id;
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
    return "/uploads/" + url.replace(/^\/+/, "");
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 style={{ fontWeight: 800, fontSize: "18px" }}>Lesson Payment Requests</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
            Review, verify, and approve student individual lesson enrollments and slips
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
                placeholder="Search student, lesson, order, ref no..."
                value={filters.keyword}
                onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
                style={{ paddingLeft: "32px" }}
                id="search-lesson-req"
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
              id="filter-lesson-enrollment-status"
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
              <p>No lesson payment requests found.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Student Details</th>
                  <th>Lesson & Course</th>
                  <th>Order No / Amount</th>
                  <th>Method & Reference</th>
                  <th>Slip / Evidence</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req, idx) => {
                  const studentName = req.studentName || `${req.student?.firstName || ""} ${req.student?.lastName || ""}`.trim() || "Student";
                  const academicId = req.academicId || req.student?.academicId;
                  const mobile = req.mobile || req.student?.mobile;
                  const studentBatch = req.studentBatch || req.student?.batch;
                  const studentMedium = req.studentMedium || req.student?.medium;

                  const lessons = Array.isArray(req.lessons) && req.lessons.length > 0 
                    ? req.lessons 
                    : req.lesson ? [req.lesson] : [];
                  const lessonName = req.lessonName || req.lesson?.name || (lessons[0]?.name) || "Lesson";
                  const courseName = req.courseName || req.lesson?.course?.name || (lessons[0]?.course?.name) || "-";
                  const courseCode = req.courseCode || req.lesson?.course?.code || (lessons[0]?.course?.code) || "";
                  const lessonDate = req.lessonDate || req.lesson?.date || (lessons[0]?.date);

                  const paymentAmount = req.paymentAmount ?? req.payment?.amount ?? req.order?.totalAmount ?? 0;
                  const orderNo = req.orderNo || req.order?.ordernumber || req.order?.order_no || "-";
                  const paymentMethod = req.paymentMethod || req.payment?.paymentMethod || "-";
                  const referenceNo = req.referenceNo || req.payment?.evidence?.referenceNo || req.payment?.referenceNo || "-";
                  const slipUrl = req.slipUrl || req.payment?.evidence?.fileUrl;
                  const paymentStatus = req.paymentStatus || req.payment?.status || req.status || "PENDING";
                  const isPending = paymentStatus === "WAITING_APPROVAL" || paymentStatus === "PENDING" || req.status === "PENDING";
                  const requestCount = req.requestCount ?? req.student?.requestCount ?? 0;

                  return (
                    <tr key={req.lessonEnrollmentId || req.lesson?.enrollment?.enrollmentId || req.orderId || req.order?.id || idx}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{studentName}</div>
                        <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                          {academicId && <span style={{ marginRight: "8px" }}>ID: {academicId}</span>}
                          {mobile && <span>{mobile}</span>}
                        </div>
                        {(studentBatch || studentMedium) && (
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                            {[studentBatch, studentMedium].filter(Boolean).join(" • ")}
                          </div>
                        )}
                        <div style={{ marginTop: "4px" }}>
                          <span
                            className="badge badge-info"
                            style={{ fontSize: "10.5px", padding: "2px 6px" }}
                            title="Total lesson enrollment requests this month"
                          >
                            Requests: {requestCount}
                          </span>
                        </div>
                      </td>

                      <td>
                        {lessons.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {lessons.map((les, lIdx) => (
                              <div key={les.id || lIdx} style={{ borderBottom: lessons.length > 1 && lIdx < lessons.length - 1 ? "1px dashed var(--border)" : "none", paddingBottom: lessons.length > 1 ? "4px" : "0" }}>
                                <div style={{ fontWeight: 600, color: "var(--text)" }}>{les.name || "Lesson"}</div>
                                <div style={{ fontSize: "11.5px", color: "var(--text-secondary)" }}>
                                  {les.course?.name || "-"} {les.course?.code && <span style={{ color: "var(--text-muted)" }}>({les.course?.code})</span>}
                                </div>
                                {les.date && (
                                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                    Date: {les.date}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--text)" }}>{lessonName}</div>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                              {courseName} {courseCode && <span style={{ color: "var(--text-muted)" }}>({courseCode})</span>}
                            </div>
                            {lessonDate && (
                              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                                Date: {lessonDate}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td>
                        <div style={{ fontWeight: 600, color: "var(--text)" }}>
                          LKR {Number(paymentAmount).toLocaleString()}
                        </div>
                        <div style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px", fontFamily: "monospace" }}>
                          {orderNo}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: 500, fontSize: "12.5px" }}>{paymentMethod}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                          Ref: {referenceNo}
                        </div>
                      </td>

                      <td>
                        {slipUrl ? (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: "4px 8px", fontSize: "11.5px" }}
                            onClick={() => {
                              setSelectedReq(req);
                              setModalType("slip");
                            }}
                          >
                            View Slip
                          </button>
                        ) : (
                          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>No Slip</span>
                        )}
                      </td>

                      <td>
                        <span className={`badge ${STATUS_BADGE[paymentStatus] || "badge-gray"}`}>
                          {paymentStatus}
                        </span>
                      </td>

                      <td>
                        <div className="action-buttons">
                          {isPending ? (
                            <>
                              <button
                                className="btn btn-success btn-sm"
                                style={{ padding: "3px 8px", fontSize: "11.5px" }}
                                onClick={() => {
                                  setSelectedReq(req);
                                  setModalType("approve");
                                }}
                              >
                                Approve
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                style={{ padding: "3px 8px", fontSize: "11.5px" }}
                                onClick={() => {
                                  setSelectedReq(req);
                                  setModalType("reject");
                                  setRejectReason("");
                                }}
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {!loading && requests.length > 0 && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)" }}>
            <div className="flex justify-between items-center">
              <span style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                Showing {requests.length} of {total} results
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

      {/* Slip Modal */}
      {modalType === "slip" && selectedReq && (
        <div className="modal-backdrop" onClick={() => setModalType("")}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>Payment Slip Preview</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setModalType("")}>✕</button>
            </div>
            <div className="modal-body" style={{ textAlign: "center" }}>
              <img
                src={resolveMediaUrl(selectedReq.slipUrl || selectedReq.payment?.evidence?.fileUrl)}
                alt="Payment Slip"
                style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: "4px" }}
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "block";
                }}
              />
              <div style={{ display: "none", padding: "20px", color: "var(--text-muted)" }}>
                Unable to preview image directly. <a href={resolveMediaUrl(selectedReq.slipUrl || selectedReq.payment?.evidence?.fileUrl)} target="_blank" rel="noreferrer">Open file</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {modalType === "approve" && selectedReq && (
        <div className="modal-backdrop" onClick={() => !actionLoading && setModalType("")}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "440px" }}>
            <div className="modal-header">
              <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>Confirm Payment Approval</h3>
              <button className="btn btn-secondary btn-sm" disabled={actionLoading} onClick={() => setModalType("")}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "13.5px", marginBottom: "14px" }}>
                Are you sure you want to approve this lesson payment and grant access to the student?
              </p>
              <div style={{ background: "var(--bg)", padding: "12px", borderRadius: "6px", fontSize: "13px" }}>
                <div><strong>Lesson(s):</strong> {(selectedReq.lessons?.map(l => l.name) || [selectedReq.lessonName || selectedReq.lesson?.name]).filter(Boolean).join(", ")}</div>
                <div><strong>Student:</strong> {selectedReq.studentName || `${selectedReq.student?.firstName || ""} ${selectedReq.student?.lastName || ""}`} ({selectedReq.academicId || selectedReq.student?.academicId})</div>
                <div><strong>Amount:</strong> LKR {Number(selectedReq.paymentAmount ?? selectedReq.payment?.amount ?? 0).toLocaleString()}</div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button className="btn btn-secondary" disabled={actionLoading} onClick={() => setModalType("")}>Cancel</button>
              <button className="btn btn-primary" disabled={actionLoading} onClick={handleApprove}>
                {actionLoading ? <span className="spinner" /> : "Approve Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {modalType === "reject" && selectedReq && (
        <div className="modal-backdrop" onClick={() => !actionLoading && setModalType("")}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "440px" }}>
            <div className="modal-header">
              <h3 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>Reject Lesson Payment</h3>
              <button className="btn btn-secondary btn-sm" disabled={actionLoading} onClick={() => setModalType("")}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group mb-3">
                <label className="form-label">Predefined Reason:</label>
                <select
                  className="form-control"
                  onChange={(e) => setRejectReason(e.target.value)}
                  value={rejectReasonsList.some((r) => r.reason === rejectReason) ? rejectReason : ""}
                >
                  <option value="">-- Choose predefined reason --</option>
                  {rejectReasonsList.map((r) => (
                    <option key={r.id} value={r.reason}>{r.reason}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Reason / Remarks *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Enter rejection reason visible to student..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button className="btn btn-secondary" disabled={actionLoading} onClick={() => setModalType("")}>Cancel</button>
              <button className="btn btn-danger" disabled={actionLoading} onClick={handleReject}>
                {actionLoading ? <span className="spinner" /> : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}