import { useEffect, useState } from "react";
import { getLessons, getCourses } from "../api";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function LessonsPage() {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ name: "", courseId: "", status: "", page: 1, size: 20 });
  const [total, setTotal] = useState(0);

  // Fetch courses for dropdown
  useEffect(() => {
    getCourses({ size: 100 })
      .then((res) => {
        const raw = res.data?.data;
        const list = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw) ? raw : [];
        setCourses(list);
      })
      .catch(() => {});
  }, []);

  const fetchLessons = async () => {
    setLoading(true);
    try {
      const res = await getLessons({
        courseId: filters.courseId || undefined,
        name: filters.name || undefined,
        status: filters.status || undefined,
      });
      const data = res.data?.data;
      const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      setLessons(list);
      setTotal(list.length);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch lessons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLessons();
  }, [filters.courseId, filters.status]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 style={{ fontWeight: 800, fontSize: "18px" }}>Lessons</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
            Video lessons, documents, and individual session classes
          </p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate("/enroll")}
          id="btn-enroll-lessons"
        >
          + Enroll in Lessons
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="filter-bar" style={{ margin: 0, display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <div className="search-input" style={{ flex: 1, minWidth: "220px" }}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                className="form-control"
                placeholder="Search lessons..."
                id="lesson-search"
                value={filters.name}
                onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && fetchLessons()}
                style={{ paddingLeft: "32px" }}
              />
            </div>

            {/* Course Filter Dropdown */}
            <select
              className="form-control"
              style={{ maxWidth: "240px" }}
              value={filters.courseId}
              onChange={(e) => setFilters((f) => ({ ...f, courseId: e.target.value }))}
              id="lesson-course-select"
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              className="form-control"
              style={{ maxWidth: "160px" }}
              id="lesson-status"
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="">All Status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DRAFT">DRAFT</option>
              <option value="DEACTIVE">DEACTIVE</option>
            </select>

            <button className="btn btn-primary" onClick={fetchLessons} id="btn-lesson-filter">
              Search
            </button>
          </div>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="page-loader">
              <div className="spinner spinner-dark" />
            </div>
          ) : lessons.length === 0 ? (
            <div className="empty-state">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                />
              </svg>
              <p>No lessons found.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Lesson Name</th>
                  <th>Parent Course</th>
                  <th>Session Date</th>
                  <th>Watch Limit</th>
                  <th>Status</th>
                  <th>Access</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((l, i) => (
                  <tr key={l.id}>
                    <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{l.name}</div>
                      {l.description && (
                        <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                          {l.description?.slice(0, 70)}...
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
                      <strong>{l.courseName || "—"}</strong>
                      {l.courseCode && <span style={{ marginLeft: "6px", color: "var(--text-muted)" }}>({l.courseCode})</span>}
                    </td>
                    <td>{l.date ? new Date(l.date).toLocaleDateString() : "—"}</td>
                    <td>{l.watchTimeLimitSeconds && l.watchTimeLimitSeconds > 0 ? `${Math.round(l.watchTimeLimitSeconds / 3600)}h` : "Unlimited"}</td>
                    <td>
                      <span className={`badge ${l.status === "ACTIVE" ? "badge-success" : l.status === "DRAFT" ? "badge-warning" : "badge-gray"}`}>
                        {l.status}
                      </span>
                    </td>
                    <td>
                      {l.isFree ? (
                        <span className="badge badge-success">Free</span>
                      ) : (
                        <span className="badge badge-primary">Paid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
