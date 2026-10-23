import { useEffect, useState } from "react";
import { getPackages } from "../api";
import toast from "react-hot-toast";

export default function PackagesPage() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ name: "", medium: "", status: "", page: 1, size: 10 });
  const [total, setTotal] = useState(0);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await getPackages(filters);
      const data = res.data?.data;
      setPackages(data?.items || data?.data || data || []);
      setTotal(data?.total || data?.count || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch packages");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchPackages(); }, [filters.page]);

  const totalPages = Math.ceil(total / filters.size) || 1;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 style={{fontWeight:800,fontSize:"18px"}}>Packages</h2>
          <p style={{color:"var(--text-secondary)",fontSize:"13px"}}>Course bundles and combination packages</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="filter-bar" style={{margin:0}}>
            <div className="search-input">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input className="form-control" placeholder="Search packages..." id="pkg-search"
                value={filters.name} onChange={e => setFilters(f=>({...f,name:e.target.value}))} style={{paddingLeft:"32px"}} />
            </div>
            <select className="form-control" id="pkg-medium" value={filters.medium} onChange={e => setFilters(f=>({...f,medium:e.target.value}))}>
              <option value="">All Mediums</option>
              <option>SINHALA</option><option>ENGLISH</option><option>TAMIL</option>
            </select>
            <select className="form-control" id="pkg-status" value={filters.status} onChange={e => setFilters(f=>({...f,status:e.target.value}))}>
              <option value="">All Status</option>
              <option>ACTIVE</option><option>INACTIVE</option>
            </select>
            <button className="btn btn-primary" onClick={fetchPackages} id="btn-pkg-filter">Filter</button>
          </div>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="page-loader"><div className="spinner spinner-dark" /></div>
          ) : packages.length === 0 ? (
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p>No packages found.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Package Name</th>
                  <th>Medium</th>
                  <th>Courses</th>
                  <th>Combinations</th>
                  <th>Status</th>
                  <th>Free</th>
                  <th>Featured</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((p) => (
                  <tr key={p.id}>
                    <td><div style={{fontWeight:600}}>{p.name}</div></td>
                    <td><span className="badge badge-primary">{p.medium}</span></td>
                    <td>{p.courseCount || p.courses?.length || "—"}</td>
                    <td>{p.combinationCount || p.combinations?.length || "—"}</td>
                    <td>
                      <span className={`badge ${p.status === "ACTIVE" ? "badge-success" : "badge-gray"}`}>{p.status}</span>
                    </td>
                    <td>{p.isFree ? <span className="badge badge-success">Yes</span> : "—"}</td>
                    <td>{p.isFeatured ? <span className="badge badge-primary">Yes</span> : "—"}</td>
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
