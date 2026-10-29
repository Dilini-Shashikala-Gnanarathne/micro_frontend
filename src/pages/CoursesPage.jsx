import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getCourses } from "../api";
import toast from "react-hot-toast";

const STATUS_BADGE = {
  ACTIVE: "badge-success",
  INACTIVE: "badge-gray",
  DRAFT: "badge-warning",
};

export default function CoursesPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ name: "", medium: "", courseType: "", status: "", page: 1, size: 10 });
  const [total, setTotal] = useState(0);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await getCourses(filters);
      const data = res.data?.data;
      setCourses(data?.items || data?.data || data || []);
      setTotal(data?.total || data?.count || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch courses");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchCourses(); }, [filters.page]);

  const handleSearch = (e) => { e.preventDefault(); setFilters(f => ({ ...f, page: 1 })); fetchCourses(); };

  const totalPages = Math.ceil(total / filters.size) || 1;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 style={{fontWeight:800,fontSize:"18px"}}>Courses</h2>
          <p style={{color:"var(--text-secondary)",fontSize:"13px"}}>Manage and enroll in available courses</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {isAdmin && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate("/manual-enrollment")}
              id="btn-manual-enroll"
              style={{ fontWeight: 600 }}
            >
              ⚡ Manual Enroll (Admin)
            </button>
          )}
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate("/enroll?type=course")}
            id="btn-new-course-enroll"
          >
            + Enroll in Course
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <form className="filter-bar" onSubmit={handleSearch} style={{margin:0}}>
            <div className="search-input">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input className="form-control" placeholder="Search by name..." id="course-search"
                value={filters.name} onChange={e => setFilters(f=>({...f,name:e.target.value}))} style={{paddingLeft:"32px"}} />
            </div>
            <select className="form-control" id="course-medium" value={filters.medium} onChange={e => setFilters(f=>({...f,medium:e.target.value}))}>
              <option value="">All Mediums</option>
              <option>SINHALA</option>
              <option>ENGLISH</option>
              <option>TAMIL</option>
            </select>
            <select className="form-control" id="course-type" value={filters.courseType} onChange={e => setFilters(f=>({...f,courseType:e.target.value}))}>
              <option value="">All Types</option>
              <option value="ONLINE">Online</option>
              <option value="PHYSICAL">Physical</option>
              <option value="HYBRID">Hybrid</option>
            </select>
            <select className="form-control" id="course-status" value={filters.status} onChange={e => setFilters(f=>({...f,status:e.target.value}))}>
              <option value="">All Status</option>
              <option>ACTIVE</option>
              <option>INACTIVE</option>
              <option>DRAFT</option>
            </select>
            <button className="btn btn-primary" type="submit" id="btn-course-filter">Filter</button>
          </form>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="page-loader"><div className="spinner spinner-dark" /></div>
          ) : courses.length === 0 ? (
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13" />
              </svg>
              <p>No courses found. Try adjusting your filters.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Course Name</th>
                  <th>Medium</th>
                  <th>Type</th>
                  <th>Price (LKR)</th>
                  <th>Status</th>
                  <th>Free</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id}>
                    <td><span style={{fontFamily:"monospace",fontWeight:700,fontSize:"12px"}}>{c.code}</span></td>
                    <td>
                      <div style={{fontWeight:600}}>{c.name}</div>
                      {c.description && <div style={{fontSize:"11.5px",color:"var(--text-muted)",marginTop:"2px"}}>{c.description?.slice(0,60)}...</div>}
                    </td>
                    <td><span className="badge badge-primary">{c.medium}</span></td>
                    <td>{c.courseType}</td>
                    <td>
                      <div style={{fontWeight:700}}>{Number(c.croppedPrice || 0).toLocaleString()}</div>
                      {c.originalPrice && c.originalPrice !== c.croppedPrice && (
                        <div style={{fontSize:"11px",color:"var(--text-muted)",textDecoration:"line-through"}}>{Number(c.originalPrice).toLocaleString()}</div>
                      )}
                    </td>
                    <td><span className={`badge ${STATUS_BADGE[c.status] || "badge-gray"}`}>{c.status}</span></td>
                    <td>{c.isFree ? <span className="badge badge-success">Free</span> : <span className="badge badge-gray">Paid</span>}</td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        {isAdmin && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => navigate(`/manual-enrollment?courseId=${c.id}`)}
                            title="Manually enroll students into this course"
                            style={{ fontSize: "11px", padding: "3px 8px" }}
                          >
                            Manual Enroll
                          </button>
                        )}
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/enroll?type=course&courseId=${c.id}`)}
                          id={`btn-enroll-course-${c.id}`}
                        >
                          Enroll Now
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && courses.length > 0 && (
          <div style={{padding:"16px 24px",borderTop:"1px solid var(--border)"}}>
            <div className="flex justify-between items-center">
              <span style={{fontSize:"12.5px",color:"var(--text-muted)"}}>Showing {courses.length} of {total} results</span>
              <div className="pagination">
                <button className="page-btn" disabled={filters.page === 1} id="page-prev"
                  onClick={() => setFilters(f=>({...f,page:f.page-1}))}>‹</button>
                {Array.from({length:Math.min(totalPages,5)},(_,i) => i+1).map(p => (
                  <button key={p} className={`page-btn${filters.page===p?" active":""}`} id={`page-${p}`}
                    onClick={() => setFilters(f=>({...f,page:p}))}>{p}</button>
                ))}
                <button className="page-btn" disabled={filters.page===totalPages} id="page-next"
                  onClick={() => setFilters(f=>({...f,page:f.page+1}))}>›</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
