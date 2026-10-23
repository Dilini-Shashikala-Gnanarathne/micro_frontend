import { useEffect, useState } from "react";
import { getLessons } from "../api";
import toast from "react-hot-toast";

export default function LessonsPage() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ name: "", courseId: "", status: "", page: 1, size: 10 });
  const [total, setTotal] = useState(0);

  const fetchLessons = async () => {
    setLoading(true);
    try {
      const res = await getLessons(filters);
      const data = res.data?.data;
      setLessons(data?.items || data?.data || data || []);
      setTotal(data?.total || data?.count || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch lessons");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchLessons(); }, [filters.page]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 style={{fontWeight:800,fontSize:"18px"}}>Lessons</h2>
          <p style={{color:"var(--text-secondary)",fontSize:"13px"}}>Video lessons, documents and class recordings</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="filter-bar" style={{margin:0}}>
            <div className="search-input">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input className="form-control" placeholder="Search lessons..." id="lesson-search"
                value={filters.name} onChange={e => setFilters(f=>({...f,name:e.target.value}))} style={{paddingLeft:"32px"}} />
            </div>
            <input className="form-control" placeholder="Course ID" id="lesson-courseId"
              value={filters.courseId} onChange={e => setFilters(f=>({...f,courseId:e.target.value}))} />
            <select className="form-control" id="lesson-status" value={filters.status} onChange={e => setFilters(f=>({...f,status:e.target.value}))}>
              <option value="">All Status</option>
              <option>ACTIVE</option><option>INACTIVE</option><option>DRAFT</option>
            </select>
            <button className="btn btn-primary" onClick={fetchLessons} id="btn-lesson-filter">Filter</button>
          </div>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="page-loader"><div className="spinner spinner-dark" /></div>
          ) : lessons.length === 0 ? (
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
              <p>No lessons found.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Lesson Name</th>
                  <th>Course</th>
                  <th>Date</th>
                  <th>Watch Limit</th>
                  <th>Status</th>
                  <th>Free</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((l, i) => (
                  <tr key={l.id}>
                    <td style={{color:"var(--text-muted)",fontSize:"12px"}}>{((filters.page-1)*filters.size)+i+1}</td>
                    <td><div style={{fontWeight:600}}>{l.name}</div>
                      {l.note && <div style={{fontSize:"11.5px",color:"var(--text-muted)"}}>{l.note?.slice(0,50)}</div>}
                    </td>
                    <td style={{fontSize:"12.5px",color:"var(--text-secondary)"}}>{l.courseName || l.courseId || "—"}</td>
                    <td>{l.date ? new Date(l.date).toLocaleDateString() : "—"}</td>
                    <td>{l.watchTimeLimitSeconds ? `${Math.round(l.watchTimeLimitSeconds/3600)}h` : "Unlimited"}</td>
                    <td><span className={`badge ${l.status==="ACTIVE"?"badge-success":l.status==="DRAFT"?"badge-warning":"badge-gray"}`}>{l.status}</span></td>
                    <td>{l.isFree ? <span className="badge badge-success">Free</span> : "—"}</td>
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
