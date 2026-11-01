import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getStudentEnrolledLessons } from "../api";
import toast from "react-hot-toast";

const SORT_OPTIONS = [
  { value: "request_at", label: "Request Date" },
  { value: "expires_at", label: "Expiry Date" },
  { value: "name", label: "Lesson Name" },
  { value: "date", label: "Scheduled Date" },
];

export default function MyLessonsPage() {
  const navigate = useNavigate();

  // Filters State
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [sortBy, setSortBy] = useState("request_at");
  const [sortDir, setSortDir] = useState("DESC");
  const [page, setPage] = useState(1);
  const [size] = useState(10);

  // Data & Loading States
  const [lessons, setLessons] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch student enrolled lessons
  const fetchEnrolledLessons = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        size,
        sortBy,
        sortDir,
      };

      if (name.trim()) {
        params.name = name.trim();
        params.keyword = name.trim();
        params.search = name.trim();
      }

      if (date) {
        params.date = date;
      }

      const res = await getStudentEnrolledLessons(params);
      const resData = res.data?.data || res.data || {};
      const items = resData.data || (Array.isArray(resData) ? resData : []);
      const count = resData.totalCount ?? resData.total ?? items.length;

      setLessons(items);
      setTotalCount(count);
    } catch (err) {
      console.error("Failed to load enrolled lessons:", err);
      toast.error(err.response?.data?.message || "Failed to load enrolled lessons.");
      setLessons([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, size, sortBy, sortDir, name, date]);

  useEffect(() => {
    fetchEnrolledLessons();
  }, [fetchEnrolledLessons]);

  // Form Submit
  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchEnrolledLessons();
  };

  // Reset Filters
  const handleResetFilters = () => {
    setName("");
    setDate("");
    setSortBy("request_at");
    setSortDir("DESC");
    setPage(1);
  };

  // Total pages
  const totalPages = Math.max(1, Math.ceil(totalCount / size));

  // Render Status Badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case "ACTIVE":
        return <span className="badge badge-success">ACTIVE</span>;
      case "PENDING":
        return <span className="badge badge-warning">PENDING APPROVAL</span>;
      case "NOT_PAID":
        return <span className="badge badge-danger">PAYMENT REQUIRED</span>;
      default:
        return <span className="badge badge-gray">{status || "UNKNOWN"}</span>;
    }
  };

  // Render Access Box
  const renderAccessBox = (access) => {
    const hasAccess = access?.has_access || access?.hasAccess;
    const status = access?.status;

    if (hasAccess || status === "ACTIVE") {
      return (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 12px",
            borderRadius: "16px",
            background: "#ecfdf5",
            color: "#065f46",
            fontSize: "12px",
            fontWeight: 700,
            border: "1px solid #a7f3d0",
          }}
        >
          <span>🔓</span>
          <span>Access Granted</span>
        </div>
      );
    }

    if (status === "NOT_PAID") {
      return (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 12px",
            borderRadius: "16px",
            background: "#fef2f2",
            color: "#991b1b",
            fontSize: "12px",
            fontWeight: 700,
            border: "1px solid #fecaca",
          }}
        >
          <span>🔒</span>
          <span>Payment Required</span>
        </div>
      );
    }

    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "5px 12px",
          borderRadius: "16px",
          background: "#fffbeb",
          color: "#92400e",
          fontSize: "12px",
          fontWeight: 700,
          border: "1px solid #fde68a",
        }}
      >
        <span>⏳</span>
        <span>Pending Approval</span>
      </div>
    );
  };

  return (
    <div className="page-content" style={{ padding: "24px 28px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, margin: "0 0 6px 0", color: "var(--text-primary)" }}>
            My Enrolled Lessons
          </h1>
          <p style={{ margin: 0, fontSize: "13.5px", color: "var(--text-secondary)" }}>
            Track and access your requested single lessons, view schedule dates, and monitor approval & payment statuses.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-outline" onClick={() => navigate("/my-courses")}>
            View Enrolled Courses
          </button>
          <button className="btn btn-primary" onClick={() => navigate("/enroll?type=lesson")}>
            + Request Lesson
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="card-body" style={{ padding: "16px 20px" }}>
          <form
            onSubmit={handleFilterSubmit}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            {/* Search by Lesson Name */}
            <div className="search-input" style={{ flex: 1, minWidth: "220px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                className="form-control"
                placeholder="Search by lesson name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Date Filter */}
            <input
              type="date"
              className="form-control"
              style={{ width: "170px" }}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setPage(1);
              }}
            />

            {/* Sort Dropdown */}
            <select
              className="form-control"
              style={{ width: "170px" }}
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sort by {opt.label}
                </option>
              ))}
            </select>

            {/* Sort Direction Toggle */}
            <button
              type="button"
              className="btn btn-secondary"
              title={`Sorting: ${sortDir}`}
              onClick={() => {
                setSortDir((d) => (d === "ASC" ? "DESC" : "ASC"));
                setPage(1);
              }}
            >
              {sortDir === "DESC" ? "↓ Desc" : "↑ Asc"}
            </button>

            <button type="submit" className="btn btn-primary" id="btn-filter-lessons">
              Filter
            </button>

            {(name || date) && (
              <button type="button" className="btn btn-secondary" onClick={handleResetFilters}>
                Reset
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              border: "3px solid #e2e8f0",
              borderTopColor: "var(--primary)",
              borderRadius: "50%",
              margin: "0 auto 16px auto",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <div style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Loading enrolled lessons...</div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      ) : lessons.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📖</div>
          <h3 style={{ fontSize: "17px", fontWeight: 700, margin: "0 0 8px 0" }}>
            No enrolled lessons found
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "13.5px", maxWidth: "420px", margin: "0 auto 18px auto" }}>
            You haven't requested any standalone lessons yet, or no lessons match your filter criteria.
          </p>
          <button className="btn btn-primary" onClick={() => navigate("/lessons")}>
            Browse Lessons
          </button>
        </div>
      ) : (
        <>
          {/* Lessons Table / Card Grid */}
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Lesson Name</th>
                    <th>Course Medium</th>
                    <th>Batch</th>
                    <th>Scheduled Date</th>
                    <th>Enrolled / Requested</th>
                    <th>Expires At</th>
                    <th>Price</th>
                    <th>Enrollment Status</th>
                    <th>Access</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((item) => {
                    const access = item.lesson_access || item.lessonAccess;
                    const hasAccess = access?.has_access || access?.hasAccess;
                    const enr = item.enrollment || {};
                    const status = enr.status;

                    return (
                      <tr key={enr.id || item.id}>
                        {/* Lesson Name */}
                        <td>
                          <div style={{ fontWeight: 700, color: hasAccess ? "var(--primary)" : "var(--text-primary)", fontSize: "14px", cursor: hasAccess ? "pointer" : "default" }} onClick={() => { if (hasAccess) navigate(`/my-lessons/${item.id}`); }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                            ID: {item.id}
                          </div>
                        </td>

                        {/* Medium */}
                        <td>
                          <span style={{ fontWeight: 600, color: "#475569", fontSize: "12.5px" }}>
                            {item.medium || "—"}
                          </span>
                        </td>

                        {/* Batch */}
                        <td>
                          {item.batch?.name ? (
                            <span className="badge badge-gray">{item.batch.name}</span>
                          ) : (
                            <span style={{ color: "var(--text-muted)" }}>—</span>
                          )}
                        </td>

                        {/* Scheduled Date */}
                        <td>
                          <span style={{ fontSize: "13px", fontWeight: 500 }}>
                            {item.date ? item.date.split(" ")[0] : "—"}
                          </span>
                        </td>

                        {/* Requested At */}
                        <td>
                          <span style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
                            {enr.requested_at ? enr.requested_at.split(" ")[0] : (enr.requestedAt ? enr.requestedAt.split(" ")[0] : "—")}
                          </span>
                        </td>

                        {/* Expires At */}
                        <td>
                          <span style={{ fontSize: "12.5px", color: enr.expires_at || enr.expiresAt ? "#d97706" : "var(--text-muted)", fontWeight: 600 }}>
                            {enr.expires_at ? enr.expires_at.split(" ")[0] : (enr.expiresAt ? enr.expiresAt.split(" ")[0] : "Lifetime")}
                          </span>
                        </td>

                        {/* Unit Price */}
                        <td>
                          <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                            Rs. {(Number(item.order?.unit_price || item.order?.unitPrice || item.order?.final_amount || item.order?.finalAmount || 0)).toLocaleString()}
                          </span>
                        </td>

                        {/* Status */}
                        <td>{renderStatusBadge(status)}</td>

                        {/* Access */}
                        <td>{renderAccessBox(access)}</td>

                        {/* Action */}
                        <td style={{ textAlign: "right" }}>
                          {hasAccess ? (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => navigate(`/my-lessons/${item.id}`)}
                              id={`btn-open-lesson-${item.id}`}
                            >
                              ▶ Open Lesson
                            </button>
                          ) : status === "NOT_PAID" ? (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => navigate("/payments/lesson")}
                              id={`btn-pay-lesson-${item.id}`}
                            >
                              💳 Pay Now
                            </button>
                          ) : (
                            <button className="btn btn-secondary btn-sm" disabled>
                              ⏳ Pending
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                marginTop: "24px",
                gap: "12px",
              }}
            >
              <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Showing {(page - 1) * size + 1} - {Math.min(page * size, totalCount)} of {totalCount} lessons
              </div>

              <div className="pagination">
                <button
                  className="page-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ‹
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && p - arr[idx - 1] > 1 && <span style={{ padding: "0 4px" }}>...</span>}
                      <button
                        className={`page-btn${p === page ? " active" : ""}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}

                <button
                  className="page-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

