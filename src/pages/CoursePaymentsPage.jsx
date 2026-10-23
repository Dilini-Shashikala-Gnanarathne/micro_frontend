import { useEffect, useState } from "react";
import { getCourseRequests, getRejectReasons, updateEnrollment } from "../api";
import toast from "react-hot-toast";

const STATUS_BADGE = {
  PENDING: "badge-warning",
  APPROVED: "badge-success",
  REJECTED: "badge-danger",
  CANCELLED: "badge-gray",
};

function ApproveRejectModal({ request, onClose, onAction, rejectReasons }) {
  const [action, setAction] = useState(""); // APPROVE | REJECT
  const [rejectReasonId, setRejectReasonId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload = {
        orderId: request.orderId,
        paymentMethod: request.paymentMethod || "BANK_TRANSFER",
        paymentStatus: action === "APPROVE" ? "APPROVED" : "REJECTED",
        remarks,
      };
      await updateEnrollment(payload);
      toast.success(`Enrollment ${action === "APPROVE" ? "approved" : "rejected"} successfully!`);
      onAction();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Review Enrollment Request</span>
          <button className="modal-close" onClick={onClose} id="modal-close">✕</button>
        </div>
        <div className="modal-body">
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"16px",padding:"14px",background:"var(--bg)",borderRadius:"var(--radius-sm)"}}>
            {[
              ["Student", request.studentName || request.studentId],
              ["Order No", request.orderNo],
              ["Course", request.courseName],
              ["Amount", `LKR ${Number(request.amount||0).toLocaleString()}`],
              ["Payment", request.paymentMethod],
              ["Reference", request.referenceNo || "—"],
            ].map(([k,v]) => (
              <div key={k}>
                <div style={{fontSize:"11px",color:"var(--text-muted)",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>{k}</div>
                <div style={{fontWeight:600,fontSize:"13.5px",marginTop:"2px"}}>{v || "—"}</div>
              </div>
            ))}
          </div>
          {request.slipUrl && (
            <div style={{marginBottom:"16px"}}>
              <div style={{fontSize:"11px",color:"var(--text-muted)",fontWeight:600,marginBottom:"6px"}}>PAYMENT SLIP</div>
              <img src={request.slipUrl} alt="slip" style={{maxWidth:"100%",borderRadius:"var(--radius-sm)",border:"1px solid var(--border)"}} />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Action <span>*</span></label>
            <div style={{display:"flex",gap:"10px"}}>
              <button
                className={`btn ${action==="APPROVE"?"btn-success":"btn-secondary"}`}
                onClick={() => setAction("APPROVE")}
                id="action-approve"
              >✅ Approve</button>
              <button
                className={`btn ${action==="REJECT"?"btn-danger":"btn-secondary"}`}
                onClick={() => setAction("REJECT")}
                id="action-reject"
              >❌ Reject</button>
            </div>
          </div>
          {action === "REJECT" && (
            <div className="form-group">
              <label className="form-label">Reject Reason</label>
              <select className="form-control" id="reject-reason" value={rejectReasonId} onChange={e=>setRejectReasonId(e.target.value)}>
                <option value="">Select reason...</option>
                {rejectReasons.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Remarks</label>
            <textarea className="form-control" id="action-remarks" rows={3} placeholder="Optional remarks..."
              value={remarks} onChange={e=>setRemarks(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} id="modal-cancel">Cancel</button>
          <button className="btn btn-primary" disabled={!action||loading} onClick={handleSubmit} id="btn-modal-submit">
            {loading ? <span className="spinner" /> : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CoursePaymentsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ keyword:"", paymentStatus:"", paymentMethod:"", courseId:"", page:1, size:10 });
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [rejectReasons, setRejectReasons] = useState([]);

  const fetch = async () => {
    setLoading(true);
    try {
      const [reqRes, rrRes] = await Promise.allSettled([
        getCourseRequests(filters),
        getRejectReasons({ status:"ACTIVE", size:100 })
      ]);
      if (reqRes.status === "fulfilled") {
        const data = reqRes.value.data?.data;
        setRequests(data?.items || data?.data || data || []);
        setTotal(data?.total || data?.count || 0);
      }
      if (rrRes.status === "fulfilled") {
        const d = rrRes.value.data?.data;
        setRejectReasons(d?.items || d?.data || d || []);
      }
    } catch (err) {
      toast.error("Failed to fetch requests");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [filters.page, filters.paymentStatus]);

  const totalPages = Math.ceil(total / filters.size) || 1;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 style={{fontWeight:800,fontSize:"18px"}}>Course Payment Requests</h2>
          <p style={{color:"var(--text-secondary)",fontSize:"13px"}}>Review and approve/reject enrollment payments</p>
        </div>
        <div className="flex gap-2">
          <span className="badge badge-warning" style={{padding:"6px 12px"}}>⏳ Pending: {requests.filter(r=>r.paymentStatus==="PENDING").length}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="filter-bar" style={{margin:0}}>
            <div className="search-input">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input className="form-control" placeholder="Search name, NIC, mobile..." id="payment-search"
                value={filters.keyword} onChange={e=>setFilters(f=>({...f,keyword:e.target.value}))} style={{paddingLeft:"32px"}} />
            </div>
            <select className="form-control" id="payment-status-filter" value={filters.paymentStatus} onChange={e=>setFilters(f=>({...f,paymentStatus:e.target.value,page:1}))}>
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select className="form-control" id="payment-method-filter" value={filters.paymentMethod} onChange={e=>setFilters(f=>({...f,paymentMethod:e.target.value,page:1}))}>
              <option value="">All Methods</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CASH">Cash</option>
              <option value="FREE">Free</option>
            </select>
            <button className="btn btn-primary" onClick={fetch} id="btn-payment-filter">Filter</button>
          </div>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="page-loader"><div className="spinner spinner-dark" /></div>
          ) : requests.length === 0 ? (
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p>No payment requests found.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Order No</th>
                  <th>Student</th>
                  <th>Course</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Enrollment</th>
                  <th>Payment</th>
                  <th>Slip</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id || r.orderId}>
                    <td><span style={{fontFamily:"monospace",fontSize:"12px",fontWeight:700}}>{r.orderNo}</span></td>
                    <td>
                      <div style={{fontWeight:600}}>{r.studentName || r.firstName + " " + r.lastName}</div>
                      <div style={{fontSize:"11px",color:"var(--text-muted)"}}>{r.mobile}</div>
                    </td>
                    <td style={{maxWidth:"160px"}}>
                      <div style={{fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.courseName}</div>
                    </td>
                    <td style={{fontWeight:700}}>LKR {Number(r.amount||0).toLocaleString()}</td>
                    <td><span className="badge badge-primary">{r.paymentMethod}</span></td>
                    <td style={{fontSize:"12.5px"}}>{r.referenceNo || r.manualReferenceNumber || "—"}</td>
                    <td><span className={`badge ${STATUS_BADGE[r.enrollmentStatus] || "badge-gray"}`}>{r.enrollmentStatus}</span></td>
                    <td><span className={`badge ${STATUS_BADGE[r.paymentStatus] || "badge-gray"}`}>{r.paymentStatus}</span></td>
                    <td>
                      {r.slipUrl ? (
                        <img src={r.slipUrl} className="evidence-img" alt="slip" onClick={() => window.open(r.slipUrl,'_blank')} />
                      ) : "—"}
                    </td>
                    <td style={{fontSize:"12px",color:"var(--text-muted)"}}>
                      {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      {r.paymentStatus === "PENDING" && (
                        <button className="btn btn-outline btn-sm" onClick={() => setSelected(r)} id={`btn-review-${r.orderId}`}>
                          Review
                        </button>
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
                <button className="page-btn" disabled={filters.page===1} id="cp-prev" onClick={()=>setFilters(f=>({...f,page:f.page-1}))}>‹</button>
                {Array.from({length:Math.min(totalPages,5)},(_,i)=>i+1).map(p=>(
                  <button key={p} className={`page-btn${filters.page===p?" active":""}`} id={`cp-${p}`} onClick={()=>setFilters(f=>({...f,page:p}))}>{p}</button>
                ))}
                <button className="page-btn" disabled={filters.page===totalPages} id="cp-next" onClick={()=>setFilters(f=>({...f,page:f.page+1}))}>›</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <ApproveRejectModal
          request={selected}
          onClose={() => setSelected(null)}
          onAction={fetch}
          rejectReasons={rejectReasons}
        />
      )}
    </div>
  );
}
