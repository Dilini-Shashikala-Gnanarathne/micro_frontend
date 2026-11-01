import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getStudentEnrolledCourses } from "../api";
import toast from "react-hot-toast";

const COURSE_TYPES = [
  { value: "", label: "All Course Types" },
  { value: "MONTHLY_CLASS", label: "Monthly Class" },
  { value: "LESSON_PACK", label: "Lesson Pack" },
  { value: "FREE_CLASS", label: "Free Class" },
  { value: "EXTRA_CLASS", label: "Extra Class" },
];

export default function MyCoursesPage() {
  const navigate = useNavigate();

  // Tab State: 'all' | 'course_only' | 'package_only'
  // Wireframe: [ All Courses | Course Only | Package Courses ]
  const [activeTab, setActiveTab] = useState("all");

  // Filters State
  const [search, setSearch] = useState("");
  const [courseType, setCourseType] = useState("");
  const [page, setPage] = useState(1);
  const [size] = useState(9);
  const [sortBy, setSortBy] = useState("enrolled_at");
  const [sortDir, setSortDir] = useState("DESC");

  // Data & Loading States
  const [courses, setCourses] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Derive packageOnly parameter based on activeTab
  // 'all' => null (fetch all without filtering)
  // 'course_only' => false (only individual courses)
  // 'package_only' => true (only package courses)
  const getPackageOnlyParam = useCallback(() => {
    if (activeTab === "course_only") return false;
    if (activeTab === "package_only") return true;
    return null;
  }, [activeTab]);

  // Fetch student enrolled courses from backend
  const fetchEnrolledCourses = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        size,
        sortBy,
        sortDir,
      };

      if (search.trim()) {
        params.search = search.trim();
        params.keyword = search.trim();
      }

      if (courseType) {
        params.courseType = courseType;
      }

      const pkgOnly = getPackageOnlyParam();
      if (pkgOnly !== null) {
        params.packageOnly = pkgOnly;
      }

      const res = await getStudentEnrolledCourses(params);
      const resData = res.data?.data || res.data || {};
      const items = resData.data || (Array.isArray(resData) ? resData : []);
      const count = resData.totalCount ?? resData.total ?? items.length;

      setCourses(items);
      setTotalCount(count);
    } catch (err) {
      console.error("Failed to load enrolled courses:", err);
      toast.error(err.response?.data?.message || "Failed to load enrolled courses.");
      setCourses([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [page, size, sortBy, sortDir, search, courseType, getPackageOnlyParam]);

  useEffect(() => {
    fetchEnrolledCourses();
  }, [fetchEnrolledCourses]);

  // Handle Tab Switch
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  // Search Submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchEnrolledCourses();
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearch("");
    setCourseType("");
    setPage(1);
  };

  // Total pages
  const totalPages = Math.max(1, Math.ceil(totalCount / size));

  // Helper for status badge
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

  // Helper for Access Status Box
  const renderAccessBox = (access) => {
    const hasAccess = access?.hasAccess || access?.has_access;
    const reason = access?.reason;

    if (hasAccess) {
      if (reason === "APPROVED") {
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 12px",
              borderRadius: "8px",
              background: "#ecfdf5",
              color: "#065f46",
              fontSize: "12px",
              fontWeight: 600,
              border: "1px solid #a7f3d0",
            }}
          >
            <span>✅</span>
            <span>Access Approved</span>
          </div>
        );
      }
      if (reason === "FIRST_WEEK") {
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 12px",
              borderRadius: "8px",
              background: "#eff6ff",
              color: "#1e40af",
              fontSize: "12px",
              fontWeight: 600,
              border: "1px solid #bfdbfe",
            }}
          >
            <span>📅</span>
            <span>1st Week Free Access Available</span>
          </div>
        );
      }
      if (reason === "FREE_LESSONS") {
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "7px 12px",
              borderRadius: "8px",
              background: "#f5f3ff",
              color: "#5b21b6",
              fontSize: "12px",
              fontWeight: 600,
              border: "1px solid #ddd6fe",
            }}
          >
            <span>⭐</span>
            <span>Free Sample Lessons Available</span>
          </div>
        );
      }
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "7px 12px",
            borderRadius: "8px",
            background: "#ecfdf5",
            color: "#065f46",
            fontSize: "12px",
            fontWeight: 600,
            border: "1px solid #a7f3d0",
          }}
        >
          <span>🔓</span>
          <span>Access Granted</span>
        </div>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "7px 12px",
          borderRadius: "8px",
          background: "#fef3c7",
          color: "#92400e",
          fontSize: "12px",
          fontWeight: 600,
          border: "1px solid #fde68a",
        }}
      >
        <span>🔒</span>
        <span>Access Locked - Pending Payment</span>
      </div>
    );
  };

  return (
    <div className="page-content" style={{ padding: "24px 28px" }}>
      {/* Page Header */}
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
            My Enrolled Courses
          </h1>
          <p style={{ margin: 0, fontSize: "13.5px", color: "var(--text-secondary)" }}>
            View and manage courses you are actively enrolled in, check live access privileges, and review payment statuses.
          </p>
        </div>
        <div>
          <button className="btn btn-outline" onClick={() => navigate("/catalog")} id="btn-browse-catalog">
            Explore Course Catalog
          </button>
        </div>
      </div>

      {/* Wireframe-inspired Tab Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "var(--bg-white)",
            border: "2px solid #e2e8f0",
            borderRadius: "32px",
            padding: "4px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <button
            onClick={() => handleTabChange("all")}
            id="tab-all-courses"
            style={{
              padding: "9px 24px",
              borderRadius: "24px",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "13.5px",
              transition: "all 0.2s ease",
              background: activeTab === "all" ? "#f59e0b" : "transparent",
              color: activeTab === "all" ? "#ffffff" : "#64748b",
              boxShadow: activeTab === "all" ? "0 2px 6px rgba(245, 158, 11, 0.35)" : "none",
            }}
          >
            All Courses
          </button>

          <div style={{ width: "1px", height: "20px", background: "#cbd5e1", margin: "0 4px" }} />

          <button
            onClick={() => handleTabChange("course_only")}
            id="tab-course-only"
            style={{
              padding: "9px 24px",
              borderRadius: "24px",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "13.5px",
              transition: "all 0.2s ease",
              background: activeTab === "course_only" ? "#f59e0b" : "transparent",
              color: activeTab === "course_only" ? "#ffffff" : "#64748b",
              boxShadow: activeTab === "course_only" ? "0 2px 6px rgba(245, 158, 11, 0.35)" : "none",
            }}
          >
            Course Only
          </button>

          <div style={{ width: "1px", height: "20px", background: "#cbd5e1", margin: "0 4px" }} />

          <button
            onClick={() => handleTabChange("package_only")}
            id="tab-package-courses"
            style={{
              padding: "9px 24px",
              borderRadius: "24px",
              border: "none",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "13.5px",
              transition: "all 0.2s ease",
              background: activeTab === "package_only" ? "#f59e0b" : "transparent",
              color: activeTab === "package_only" ? "#ffffff" : "#64748b",
              boxShadow: activeTab === "package_only" ? "0 2px 6px rgba(245, 158, 11, 0.35)" : "none",
            }}
          >
            Package Courses
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ marginBottom: "24px" }}>
        <div className="card-body" style={{ padding: "16px 20px" }}>
          <form
            onSubmit={handleSearchSubmit}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            {/* Search Input */}
            <div className="search-input" style={{ flex: 1, minWidth: "220px" }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                className="form-control"
                placeholder="Search by code, title, or topic..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Course Type Filter */}
            <select
              className="form-control"
              style={{ width: "180px" }}
              value={courseType}
              onChange={(e) => {
                setCourseType(e.target.value);
                setPage(1);
              }}
            >
              {COURSE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            {/* Sort Filter */}
            <select
              className="form-control"
              style={{ width: "160px" }}
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
            >
              <option value="enrolled_at">Newest Enrolled</option>
              <option value="name">Course Name</option>
              <option value="code">Course Code</option>
              <option value="status">Status</option>
            </select>

            <button type="submit" className="btn btn-primary" id="btn-filter-submit">
              Filter
            </button>

            {(search || courseType) && (
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
          <div style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Loading your enrolled courses...</div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      ) : courses.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "60px 20px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📚</div>
          <h3 style={{ fontSize: "17px", fontWeight: 700, margin: "0 0 8px 0" }}>
            No enrolled courses found
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "13.5px", maxWidth: "420px", margin: "0 auto 18px auto" }}>
            {activeTab === "package_only"
              ? "You do not have any enrolled courses through packages yet."
              : activeTab === "course_only"
              ? "You do not have any directly enrolled standalone courses yet."
              : "You have not enrolled in any courses yet or no courses match your current search criteria."}
          </p>
          <button className="btn btn-primary" onClick={() => navigate("/catalog")}>
            Browse Available Courses
          </button>
        </div>
      ) : (
        <>
          {/* Courses Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "22px",
            }}
          >
            {courses.map((item) => {
              const access = item.courseAccess || item.course_access;
              const hasAccess = access?.hasAccess || access?.has_access;
              const enrStatus = item.enrollment?.status;
              const isPackageCourse = !!(item.package?.id || item.package);

              return (
                <div
                  key={item.enrollment?.id || item.id}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "var(--shadow-md)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                  }}
                >
                  {/* Thumbnail / Header Image */}
                  <div
                    style={{
                      height: "160px",
                      background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#94a3b8",
                          fontSize: "32px",
                        }}
                      >
                        📐
                      </div>
                    )}

                    {/* Badges on Thumbnail */}
                    <div
                      style={{
                        position: "absolute",
                        top: "10px",
                        left: "10px",
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                      }}
                    >
                      {item.batch?.name && (
                        <span
                          style={{
                            background: "rgba(0,0,0,0.7)",
                            color: "#ffffff",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 600,
                          }}
                        >
                          {item.batch.name}
                        </span>
                      )}
                      {item.medium && (
                        <span
                          style={{
                            background: "rgba(255,255,255,0.9)",
                            color: "#1e293b",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "11px",
                            fontWeight: 700,
                          }}
                        >
                          {item.medium}
                        </span>
                      )}
                    </div>

                    <div style={{ position: "absolute", top: "10px", right: "10px" }}>
                      {renderStatusBadge(enrStatus)}
                    </div>
                  </div>

                  {/* Card Content */}
                  <div
                    style={{
                      padding: "18px 20px",
                      display: "flex",
                      flexDirection: "column",
                      flex: 1,
                      gap: "12px",
                    }}
                  >
                    {/* Course Code & Type */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)" }}>
                        {item.code}
                      </span>
                      <span style={{ fontSize: "11.5px", color: "var(--text-muted)", fontWeight: 500 }}>
                        {item.courseType?.replace("_", " ")}
                      </span>
                    </div>

                    {/* Course Title */}
                    <h3
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        margin: 0,
                        color: "var(--text-primary)",
                        lineHeight: 1.35,
                      }}
                    >
                      {item.name}
                    </h3>

                    {/* Package Notice (if part of a package) */}
                    {isPackageCourse && (
                      <div
                        style={{
                          background: "#f8fafc",
                          border: "1px dashed #cbd5e1",
                          borderRadius: "6px",
                          padding: "6px 10px",
                          fontSize: "12px",
                          color: "#475569",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <span>🎁</span>
                        <span>
                          Package: <strong>{item.package?.name || "Combined Package"}</strong>
                        </span>
                      </div>
                    )}

                    {/* Access Status Box */}
                    {renderAccessBox(access)}

                    {/* Details Rows */}
                    <div
                      style={{
                        borderTop: "1px solid var(--border)",
                        paddingTop: "10px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        fontSize: "12.5px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Course Fee:</span>
                        <strong style={{ color: "var(--text-primary)" }}>
                          Rs. {(Number(item.order?.unitPrice || item.order?.finalAmount || 0)).toLocaleString()}
                        </strong>
                      </div>

                      {item.enrollment?.expiresAt && (
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Access Valid Until:</span>
                          <span style={{ color: "#d97706", fontWeight: 600 }}>
                            {item.enrollment.expiresAt.split(" ")[0]}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div style={{ marginTop: "auto", paddingTop: "8px" }}>
                      {hasAccess ? (
                        <button
                          className="btn btn-primary btn-block"
                          onClick={() => navigate(`/lessons?courseId=${item.id}`)}
                          id={`btn-view-lessons-${item.id}`}
                        >
                          ▶ Watch Lessons & Materials
                        </button>
                      ) : enrStatus === "NOT_PAID" ? (
                        <button
                          className="btn btn-danger btn-block"
                          onClick={() => navigate("/payments/course")}
                          id={`btn-pay-now-${item.id}`}
                        >
                          💳 Complete Pending Payment
                        </button>
                      ) : (
                        <button
                          className="btn btn-secondary btn-block"
                          disabled
                          id={`btn-pending-${item.id}`}
                        >
                          ⏳ Payment Under Verification
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                marginTop: "28px",
                gap: "12px",
              }}
            >
              <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Showing {(page - 1) * size + 1} - {Math.min(page * size, totalCount)} of {totalCount} courses
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

