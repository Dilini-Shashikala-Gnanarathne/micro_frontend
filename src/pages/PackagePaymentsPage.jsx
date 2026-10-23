import { useEffect, useState } from "react";
import { getPackageRequests, getRejectReasons, updateEnrollment } from "../api";
import toast from "react-hot-toast";

const STATUS_BADGE = {
  PENDING: "badge-warning",
  APPROVED: "badge-success",
  REJECTED: "badge-danger",
  CANCELLED: "badge-gray",
};

function ReviewModal({ request, onClose, onAction, rejectReasons }) {
  const [action, setAction] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await updateEnrollment({
        orderId: request.orderId,
        paymentMethod: request.paymentMethod || "BANK_TRANSFER",
        paymentStatus: action === "APPROVE" ? "APPROVED" : "REJECTED",
        remarks,
      });
      toast.success(`Package enrollment ${action === "APPROVE" ? "approved" : "rejected"}!`);
      onAction();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Review Package Request</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"16px",padding:"14px",background:"var(--bg)",borderRadius:"var(--radius-sm)"}}>
            {[
              ["Student", request.studentName || request.studentId],
              ["Order No", request.orderNo],
              ["Package", request.packageName],
              ["Amount", `LKR ${Number(request.amount||0).toLocaleString()}`],
              ["Method", request.paymentMethod],
              ["Reference", request.referenceNo || "—"],
            ].map(([k,v]) => (
              <div key={k}>
                <div style={{fontSize:"11px",color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>{k}</div>
                <div style={{fontWeight:600,fontSize:"13.5px",marginTop:"2px"}}>{v || "—"}</div>
              </div>
            ))}
          </div>
          <div className="form-group">
            <label className="form-label">Action <span>*</span></label>
            <div style={{display:"flex",gap:"10px"}}>
              <button className={`btn ${action==="APPROVE"?"btn-success":"btn-secondary"}`} onClick={()=>setAction("APPROVE")} id="pkg-approve">✅ Approve</button>
              <button className={`btn ${action==="REJECT"?"btn-danger":"btn-secondary"}`} onClick={()=>setAction("REJECT")} id="pkg-reject">❌ Reject</button>
            </div>
          </div>
          {action === "REJECT" && (
            <div className="form-group">
              <label className="form-label">Reject Reason</label>
              <select className="form-control" id="pkg-reject-reason">
                <option value="">Select reason...</option>
                {rejectReasons.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Remarks</label>
            <textarea className="form-control" rows={3} value={remarks} onChange={e=>setRemarks(e.target.value)} id="pkg-remarks" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} id="pkg-modal-cancel">Cancel</button>
          <button className="btn btn-primary" disabled={!action||loading} onClick={handleSubmit} id="pkg-modal-submit">
            {loading?<span className="spinner"/>:"Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PackagePaymentsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ keyword:"", paymentStatus:"", paymentMethod:"", page:1, size:10 });
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [rejectReasons, setRejectReasons] = useState([]);

  const fetch = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.allSettled([
        getPackageRequests(filters),
        getRejectReasons({ status:"ACTIVE", size:100 })
      ]);
      if (r1.status==="fulfilled") {
        const d = r1.value.data?.data;
        setRequests(d?.items || d?.data || d || []);
        setTotal(d?.total || d?.count || 0);
      }
      if (r2.status==="fulfilled") {
        const d = r2.value.data?.data;
        setRejectReasons(d?.items || d?.data || d || []);
      }
    } catch { toast.error("Failed to fetch requests"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [filters.page, filters.paymentStatus]);

  const totalPages = Math.ceil(total / filters.size) || 1;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 style={{fontWeight:800,fontSize:"18px"}}>Package Payment Requests</h2>
          <p style={{color:"var(--text-secondary)",fontSize:"13px"}}>Review package enrollment payment evidence</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="filter-bar" style={{margin:0}}>
            <div className="search-input">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input className="form-control" placeholder="Search..." id="pkg-pay-search"
                value={filters.keyword} onChange={e=>setFilters(f=>({...f,keyword:e.target.value}))} style={{paddingLeft:"32px"}} />
            </div>
            <select className="form-control" id="pkg-pay-status" value={filters.paymentStatus} onChange={e=>setFilters(f=>({...f,paymentStatus:e.target.value,page:1}))}>
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <button className="btn btn-primary" onClick={fetch} id="btn-pkg-pay-filter">Filter</button>
          </div>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="page-loader"><div className="spinner spinner-dark" /></div>
          ) : requests.length === 0 ? (
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <p>No package payment requests found.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Order No</th>
                  <th>Student</th>
                  <th>Package</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Payment Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id||r.orderId}>
                    <td><span style={{fontFamily:"monospace",fontSize:"12px",fontWeight:700}}>{r.orderNo}</span></td>
                    <td>
                      <div style={{fontWeight:600}}>{r.studentName}</div>
                      <div style={{fontSize:"11px",color:"var(--text-muted)"}}>{r.mobile}</div>
                    </td>
                    <td style={{fontWeight:600,maxWidth:"160px"}}>{r.packageName}</td>
                    <td style={{fontWeight:700}}>LKR {Number(r.amount||0).toLocaleString()}</td>
                    <td><span className="badge badge-primary">{r.paymentMethod}</span></td>
                    <td style={{fontSize:"12.5px"}}>{r.referenceNo||"—"}</td>
                    <td><span className={`badge ${STATUS_BADGE[r.paymentStatus]||"badge-gray"}`}>{r.paymentStatus}</span></td>
                    <td style={{fontSize:"12px",color:"var(--text-muted)"}}>{r.createdAt?new Date(r.createdAt).toLocaleDateString():"—"}</td>
                    <td>
                      {r.paymentStatus==="PENDING" && (
                        <button className="btn btn-outline btn-sm" onClick={()=>setSelected(r)} id={`pkg-review-${r.orderId}`}>Review</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading && requests.length > 0 && (
          <div style={{padding:"16px 24px",borderTop:"1px solid var(--border)"}}>
            <div className="flex justify-between items-center">
              <span style={{fontSize:"12.5px",color:"var(--text-muted)"}}>Showing {requests.length} of {total}</span>
              <div className="pagination">
                <button className="page-btn" disabled={filters.page===1} onClick={()=>setFilters(f=>({...f,page:f.page-1}))} id="pp-prev">‹</button>
                {Array.from({length:Math.min(totalPages,5)},(_,i)=>i+1).map(p=>(
                  <button key={p} className={`page-btn${filters.page===p?" active":""}`} onClick={()=>setFilters(f=>({...f,page:p}))} id={`pp-${p}`}>{p}</button>
                ))}
                <button className="page-btn" disabled={filters.page===totalPages} onClick={()=>setFilters(f=>({...f,page:f.page+1}))} id="pp-next">›</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {selected && <ReviewModal request={selected} onClose={()=>setSelected(null)} onAction={fetch} rejectReasons={rejectReasons} />}
    </div>
  );
}
