import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getCourseEnrolledStudents, getCourseById } from "../api";
import toast from "react-hot-toast";

const GENDER_BADGE = {
  MALE: "badge-primary",
  FEMALE: "badge-purple",
  OTHER: "badge-gray",
};

export default function CourseStudentsPage() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();

  // Course metadata
  const [course, setCourse] = useState(null);
  const [loadingCourse, setLoadingCourse] = useState(false);

  // Student list & pagination state
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filter state
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("");
  const [medium, setMedium] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [sortBy, setSortBy] = useState("enrolled_at");
  const [sortDir, setSortDir] = useState("DESC");

  // Fetch course metadata
  const fetchCourseInfo = useCallback(async () => {
    if (!courseId) return;
    setLoadingCourse(true);
    try {
      const res = await getCourseById(courseId);
      const data = res.data?.data || res.data || null;
      setCourse(data);
    } catch (err) {
      console.warn("Could not load course metadata:", err);
    } finally {
      setLoadingCourse(false);
    }
  }, [courseId]);

  // Fetch active enrolled students
  const fetchStudents = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const params = {
        page,
        size,
        sortBy,
        sortDir,
      };
      if (search.trim()) params.search = search.trim();
      if (gender) params.gender = gender;
      if (medium) params.medium = medium;
      if (status) params.status = status;

      const res = await getCourseEnrolledStudents(courseId, params);
      const resData = res.data?.data || res.data || {};
      const list = resData.data || (Array.isArray(resData) ? resData : []);
      setStudents(list);
      setTotalCount(resData.totalCount ?? list.length ?? 0);
    } catch (err) {
      console.error("Failed to load enrolled students:", err);
      const msg = err.response?.data?.message || "Failed to load course enrolled students.";
      toast.error(msg);
      setStudents([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [courseId, page, size, sortBy, sortDir, search, gender, medium, status]);

  useEffect(() => {
    fetchCourseInfo();
  }, [fetchCourseInfo]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  const handleResetFilters = () => {
    setSearch("");
    setGender("");
    setMedium("");
    setStatus("");
    setSortBy("enrolled_at");
    setSortDir("DESC");
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / size) || 1;

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="page-content" style={{ padding: "24px", maxWidth: "1350px", margin: "0 auto" }}>
      {/* Top Breadcrumb & Navigation */}
      <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <button
          onClick={() => navigate("/courses")}
          className="btn btn-secondary btn-sm"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          ← Back to Courses
        </button>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span className="badge badge-success" style={{ fontSize: "13px", padding: "6px 12px" }}>
            Status: ACTIVE Enrollments
          </span>
          <span className="badge badge-info" style={{ fontSize: "13px", padding: "6px 12px" }}>
            Total: {totalCount} Students
          </span>
        </div>
      </div>

      {/* Header Banner */}
      <div
        className="card"
        style={{
          padding: "20px 24px",
          marginBottom: "24px",
          borderRadius: "12px",
          background: "linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(147, 51, 234, 0.05) 100%)",
          border: "1px solid rgba(79, 70, 229, 0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: "700", margin: "0 0 6px 0", color: "var(--text-primary)" }}>
              {course ? course.name : "Course Enrolled Students"}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", color: "var(--text-muted)", fontSize: "13.5px" }}>
              {course?.code && (
                <span>
                  <strong>Code:</strong> {course.code}
                </span>
              )}
              {course?.medium && (
                <span>
                  <strong>Medium:</strong> {course.medium}
                </span>
              )}
              {course?.batch?.name && (
                <span>
                  <strong>Batch:</strong> {course.batch.name}
                </span>
              )}
              {course?.courseType && (
                <span>
                  <strong>Type:</strong> {course.courseType}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => fetchStudents()}
            className="btn btn-secondary btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            title="Refresh List"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: "16px 20px", marginBottom: "20px", borderRadius: "10px" }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}>
          {/* Keyword Search */}
          <div style={{ flex: "1 1 240px", minWidth: "220px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "5px", color: "var(--text-muted)" }}>
              Search Student
            </label>
            <input
              type="text"
              className="input"
              placeholder="Search by Academic ID, Name, Mobile, NIC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          {/* Medium Filter */}
          <div style={{ minWidth: "130px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "5px", color: "var(--text-muted)" }}>
              Medium
            </label>
            <select
              className="input"
              value={medium}
              onChange={(e) => {
                setMedium(e.target.value);
                setPage(1);
              }}
              style={{ width: "100%" }}
            >
              <option value="">All Mediums</option>
              <option value="SINHALA">Sinhala</option>
              <option value="ENGLISH">English</option>
            </select>
          </div>

          {/* Gender Filter */}
          <div style={{ minWidth: "120px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "5px", color: "var(--text-muted)" }}>
              Gender
            </label>
            <select
              className="input"
              value={gender}
              onChange={(e) => {
                setGender(e.target.value);
                setPage(1);
              }}
              style={{ width: "100%" }}
            >
              <option value="">All Genders</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Account Status Filter */}
          <div style={{ minWidth: "130px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "5px", color: "var(--text-muted)" }}>
              Account Status
            </label>
            <select
              className="input"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              style={{ width: "100%" }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="DEACTIVE">Deactive</option>
            </select>
          </div>

          {/* Sort Field */}
          <div style={{ minWidth: "140px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "5px", color: "var(--text-muted)" }}>
              Sort By
            </label>
            <select
              className="input"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              style={{ width: "100%" }}
            >
              <option value="enrolled_at">Enrolled Date</option>
              <option value="approved_at">Approved Date</option>
              <option value="expires_at">Expiry Date</option>
              <option value="academic_id">Academic ID</option>
              <option value="fname">First Name</option>
              <option value="lname">Last Name</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>

          {/* Sort Direction Toggle */}
          <div style={{ minWidth: "90px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "5px", color: "var(--text-muted)" }}>
              Order
            </label>
            <select
              className="input"
              value={sortDir}
              onChange={(e) => {
                setSortDir(e.target.value);
                setPage(1);
              }}
              style={{ width: "100%" }}
            >
              <option value="DESC">DESC</option>
              <option value="ASC">ASC</option>
            </select>
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="submit" className="btn btn-primary" style={{ padding: "8px 16px" }}>
              Filter
            </button>
            <button type="button" onClick={handleResetFilters} className="btn btn-secondary" style={{ padding: "8px 14px" }}>
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Main Table Card */}
      <div className="card" style={{ padding: 0, overflow: "hidden", borderRadius: "10px" }}>
        {loading ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            <div className="spinner" style={{ margin: "0 auto 12px" }}></div>
            <p style={{ margin: 0 }}>Loading enrolled students...</p>
          </div>
        ) : students.length === 0 ? (
          <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>👥</div>
            <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "6px" }}>No Active Enrolled Students Found</h3>
            <p style={{ fontSize: "13.5px", margin: 0 }}>
              {search || gender || medium || status
                ? "No enrolled students matched your search criteria. Try adjusting the filters."
                : "No students are currently actively enrolled in this course."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", margin: 0, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", textTransform: "uppercase" }}>Academic ID</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", textTransform: "uppercase" }}>Student Name</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", textTransform: "uppercase" }}>Mobile & NIC</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", textTransform: "uppercase" }}>Gender / Medium</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", textTransform: "uppercase" }}>Batch</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", textTransform: "uppercase" }}>User Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", textTransform: "uppercase" }}>Enrollment Details</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const fullName = [student.fname, student.lname].filter(Boolean).join(" ") || "-";
                  const genderClass = GENDER_BADGE[student.gender] || "badge-gray";
                  const isUserActive = student.status === "ACTIVE";

                  return (
                    <tr key={student.enrollment?.id || student.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      {/* Academic ID */}
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: "600",
                            fontSize: "13px",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            backgroundColor: "rgba(99, 102, 241, 0.1)",
                            color: "var(--primary)",
                            display: "inline-block",
                          }}
                        >
                          {student.academic_id || "N/A"}
                        </span>
                      </td>

                      {/* Student Name */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: "600", fontSize: "14px", color: "var(--text-primary)" }}>
                          {fullName}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                          ID: {student.id?.slice(0, 8)}...
                        </div>
                      </td>

                      {/* Mobile & NIC */}
                      <td style={{ padding: "12px 16px", fontSize: "13px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>📞</span>
                          <span style={{ fontWeight: "500" }}>{student.mobile || "-"}</span>
                        </div>
                        {student.nic && (
                          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "3px" }}>
                            NIC: {student.nic}
                          </div>
                        )}
                      </td>

                      {/* Gender / Medium */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" }}>
                          {student.gender && (
                            <span className={`badge ${genderClass}`} style={{ fontSize: "11px", padding: "3px 7px" }}>
                              {student.gender}
                            </span>
                          )}
                          {student.medium && (
                            <span className="badge badge-info" style={{ fontSize: "11px", padding: "3px 7px" }}>
                              {student.medium}
                            </span>
                          )}
                          {!student.gender && !student.medium && <span style={{ color: "var(--text-muted)" }}>-</span>}
                        </div>
                      </td>

                      {/* Batch */}
                      <td style={{ padding: "12px 16px", fontSize: "13px" }}>
                        {student.batch?.name ? (
                          <span style={{ fontWeight: "500" }}>{student.batch.name}</span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>-</span>
                        )}
                      </td>

                      {/* Account Status */}
                      <td style={{ padding: "12px 16px" }}>
                        <span className={`badge ${isUserActive ? "badge-success" : "badge-danger"}`} style={{ fontSize: "12px" }}>
                          {student.status || "ACTIVE"}
                        </span>
                      </td>

                      {/* Enrollment Details */}
                      <td style={{ padding: "12px 16px", fontSize: "12px" }}>
                        <div style={{ color: "var(--text-secondary)", marginBottom: "2px" }}>
                          <strong>Enrolled:</strong> {formatDate(student.enrollment?.enrolled_at)}
                        </div>
                        {student.enrollment?.approved_at && (
                          <div style={{ color: "var(--text-muted)", marginBottom: "2px" }}>
                            <strong>Approved:</strong> {formatDate(student.enrollment.approved_at)}
                          </div>
                        )}
                        <div style={{ color: student.enrollment?.expires_at ? "var(--warning)" : "var(--text-muted)" }}>
                          <strong>Expires:</strong> {student.enrollment?.expires_at ? formatDate(student.enrollment.expires_at) : "Never"}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && students.length > 0 && (
          <div
            style={{
              padding: "16px 20px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "var(--text-muted)" }}>
              <span>
                Showing <strong>{(page - 1) * size + 1}</strong> to <strong>{Math.min(page * size, totalCount)}</strong> of <strong>{totalCount}</strong> students
              </span>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginLeft: "12px" }}>
                <span>Per page:</span>
                <select
                  className="input"
                  style={{ padding: "3px 8px", fontSize: "12px" }}
                  value={size}
                  onChange={(e) => {
                    setSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="pagination" style={{ margin: 0, display: "flex", gap: "4px" }}>
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>
                ‹ Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && page > 3) {
                  pageNum = page - 3 + i;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }
                return (
                  <button
                    key={pageNum}
                    className={`page-btn${page === pageNum ? " active" : ""}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

