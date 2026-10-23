import { useState } from "react";
import { getCourses, getPackages, getLessons, enrollCourse, enrollPackage, enrollLesson, uploadPaymentSlip } from "../api";
import toast from "react-hot-toast";

const STEPS = ["Select Type", "Choose Item", "Payment Method", "Upload Slip", "Confirm"];

function StepIndicator({ current }) {
  return (
    <div className="step-indicator">
      {STEPS.map((label, i) => (
        <div key={label} style={{display:"flex",alignItems:"center",flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
            <div className={`step-circle ${i < current ? "done" : i === current ? "active" : ""}`}>
              {i < current ? "✓" : i + 1}
            </div>
            <span className={`step-label ${i < current ? "done" : i === current ? "active" : ""}`}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="step-line" style={{flex:1,height:2,margin:"0 10px",background:i<current?"var(--primary)":"var(--border)"}} />
          )}
        </div>
      ))}
    </div>
  );
}

function CourseCard({ course, selected, onSelect }) {
  return (
    <div className={`course-card${selected?" selected":""}`} onClick={() => onSelect(course)} id={`card-course-${course.id}`}>
      <div className="course-img">
        {course.imageUrl
          ? <img src={course.imageUrl} alt={course.name} style={{width:"100%",height:"100%",objectFit:"cover"}} />
          : <div className="course-img-placeholder">📚</div>}
        {selected && <div className="course-select-check">✓</div>}
      </div>
      <div className="course-body">
        <div className="course-code">{course.code}</div>
        <div className="course-name">{course.name}</div>
        <div className="course-meta">
          <span>{course.medium}</span>
          <span>·</span>
          <span>{course.courseType}</span>
        </div>
        <div className="course-price">
          <span className="price-main">LKR {Number(course.croppedPrice||0).toLocaleString()}</span>
          {course.originalPrice && course.originalPrice !== course.croppedPrice &&
            <span className="price-old">LKR {Number(course.originalPrice).toLocaleString()}</span>}
        </div>
      </div>
    </div>
  );
}

export default function EnrollPage() {
  const [step, setStep] = useState(0);
  const [enrollType, setEnrollType] = useState(""); // course | package | lesson
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedLessons, setSelectedLessons] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [slipFile, setSlipFile] = useState(null);
  const [referenceNo, setReferenceNo] = useState("");
  const [enrollResult, setEnrollResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  const loadItems = async (type) => {
    setLoading(true);
    try {
      let res;
      if (type === "course") res = await getCourses({ size: 50, page: 1 });
      else if (type === "package") res = await getPackages({ size: 50, page: 1 });
      else res = await getLessons({ size: 50, page: 1 });
      const data = res.data?.data;
      setItems(data?.items || data?.data || data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load items");
    } finally { setLoading(false); }
  };

  const handleTypeSelect = (type) => {
    setEnrollType(type);
    setSelected(null);
    setSelectedLessons([]);
    loadItems(type);
    setStep(1);
  };

  const handleItemSelect = (item) => {
    if (enrollType === "lesson") {
      setSelectedLessons(prev =>
        prev.find(l => l.id === item.id) ? prev.filter(l => l.id !== item.id) : [...prev, item]
      );
    } else {
      setSelected(item);
    }
  };

  const handleEnroll = async () => {
    setLoading(true);
    try {
      let res;
      if (enrollType === "course") {
        res = await enrollCourse({ courseId: selected.id, paymentMethod });
      } else if (enrollType === "package") {
        res = await enrollPackage({ packageCombinationId: selected.id, paymentMethod });
      } else {
        res = await enrollLesson({ lessonIds: selectedLessons.map(l => l.id), paymentMethod });
      }
      setEnrollResult(res.data?.data);
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.message || "Enrollment failed");
    } finally { setLoading(false); }
  };

  const handleUploadSlip = async () => {
    if (!slipFile || !referenceNo) { toast.error("Please select a slip file and enter reference number"); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("slip", slipFile);
      fd.append("data", JSON.stringify({
        payment_id: enrollResult?.paymentId || enrollResult?.id,
        payment_method: paymentMethod,
        reference_no: referenceNo
      }));
      await uploadPaymentSlip(fd);
      toast.success("Payment slip uploaded successfully!");
      setStep(4);
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed");
    } finally { setLoading(false); }
  };

  const filteredItems = items.filter(item =>
    (item.name || item.code || "").toLowerCase().includes(searchQ.toLowerCase())
  );

  const reset = () => { setStep(0); setEnrollType(""); setSelected(null); setSelectedLessons([]); setPaymentMethod("BANK_TRANSFER"); setSlipFile(null); setReferenceNo(""); setEnrollResult(null); setSearchQ(""); };

  return (
    <div>
      <div className="mb-4">
        <h2 style={{fontWeight:800,fontSize:"18px"}}>Enroll Student</h2>
        <p style={{color:"var(--text-secondary)",fontSize:"13px"}}>Process course, package or lesson enrollment</p>
      </div>

      <div className="card">
        <div className="card-body">
          <StepIndicator current={step} />

          {/* Step 0: Type Selection */}
          {step === 0 && (
            <div>
              <h3 style={{fontWeight:700,marginBottom:"20px",textAlign:"center"}}>What would you like to enroll in?</h3>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"16px",maxWidth:"700px",margin:"0 auto"}}>
                {[
                  {type:"course",label:"Course",desc:"Enroll in a full course",icon:"📚"},
                  {type:"package",label:"Package",desc:"Enroll in a course package",icon:"📦"},
                  {type:"lesson",label:"Lessons",desc:"Enroll in specific lessons",icon:"🎬"},
                ].map(({type,label,desc,icon}) => (
                  <div key={type}
                    className="course-card"
                    style={{cursor:"pointer",padding:"28px 20px",textAlign:"center"}}
                    onClick={() => handleTypeSelect(type)}
                    id={`enroll-type-${type}`}
                  >
                    <div style={{fontSize:"42px",marginBottom:"12px"}}>{icon}</div>
                    <div style={{fontWeight:700,fontSize:"15px",marginBottom:"4px"}}>{label}</div>
                    <div style={{fontSize:"12.5px",color:"var(--text-secondary)"}}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Choose Item */}
          {step === 1 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 style={{fontWeight:700}}>Select a {enrollType}</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setStep(0)} id="btn-back-type">← Back</button>
              </div>
              <div style={{marginBottom:"16px"}}>
                <input className="form-control" placeholder="Search..." value={searchQ} onChange={e=>setSearchQ(e.target.value)} id="enroll-search" />
              </div>
              {loading ? <div className="page-loader"><div className="spinner spinner-dark" /></div>
              : enrollType === "lesson" ? (
                <div>
                  <table>
                    <thead><tr><th>Select</th><th>Lesson Name</th><th>Course</th><th>Date</th><th>Free</th></tr></thead>
                    <tbody>
                      {filteredItems.map(l => (
                        <tr key={l.id} onClick={() => handleItemSelect(l)} style={{cursor:"pointer"}}>
                          <td>
                            <input type="checkbox" readOnly checked={!!selectedLessons.find(s=>s.id===l.id)} id={`lesson-check-${l.id}`} />
                          </td>
                          <td style={{fontWeight:600}}>{l.name}</td>
                          <td>{l.courseName || "—"}</td>
                          <td>{l.date ? new Date(l.date).toLocaleDateString() : "—"}</td>
                          <td>{l.isFree ? <span className="badge badge-success">Free</span> : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {selectedLessons.length > 0 && (
                    <div style={{marginTop:"16px",textAlign:"right"}}>
                      <button className="btn btn-primary" onClick={() => setStep(2)} id="btn-lesson-next">
                        Continue with {selectedLessons.length} lesson(s) →
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="courses-grid">
                    {filteredItems.map(item => (
                      <CourseCard key={item.id} course={item} selected={selected?.id === item.id} onSelect={handleItemSelect} />
                    ))}
                  </div>
                  {selected && (
                    <div style={{marginTop:"20px",textAlign:"right"}}>
                      <button className="btn btn-primary" onClick={() => setStep(2)} id="btn-item-next">
                        Continue with "{selected.name}" →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Payment Method */}
          {step === 2 && (
            <div style={{maxWidth:"480px",margin:"0 auto"}}>
              <div className="flex justify-between items-center mb-4">
                <h3 style={{fontWeight:700}}>Select Payment Method</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setStep(1)} id="btn-back-item">← Back</button>
              </div>
              <div className="alert alert-info">
                <span>Enrolling in: <strong>{selected?.name || `${selectedLessons.length} lesson(s)`}</strong></span>
              </div>
              {[
                {value:"BANK_TRANSFER",label:"Bank Transfer",desc:"Upload bank transfer slip"},
                {value:"CASH",label:"Cash Payment",desc:"Pay at the institute"},
                {value:"FREE",label:"Free / No Payment",desc:"For free or complimentary access"},
              ].map(m => (
                <div key={m.value}
                  style={{
                    border:`1.5px solid ${paymentMethod===m.value?"var(--primary)":"var(--border)"}`,
                    borderRadius:"var(--radius-sm)",
                    padding:"14px 16px",
                    marginBottom:"10px",
                    cursor:"pointer",
                    background:paymentMethod===m.value?"var(--primary-light)":"white",
                    transition:"all .2s",
                    display:"flex",gap:"12px",alignItems:"center"
                  }}
                  onClick={() => setPaymentMethod(m.value)}
                  id={`pm-${m.value.toLowerCase()}`}
                >
                  <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${paymentMethod===m.value?"var(--primary)":"var(--border)"}`,
                    display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {paymentMethod===m.value && <div style={{width:8,height:8,borderRadius:"50%",background:"var(--primary)"}} />}
                  </div>
                  <div>
                    <div style={{fontWeight:600,fontSize:"13.5px"}}>{m.label}</div>
                    <div style={{fontSize:"12px",color:"var(--text-muted)"}}>{m.desc}</div>
                  </div>
                </div>
              ))}
              <div style={{marginTop:"20px",display:"flex",gap:"10px",justifyContent:"flex-end"}}>
                <button className="btn btn-secondary" onClick={() => setStep(1)} id="btn-pm-back">Back</button>
                <button className="btn btn-primary" onClick={handleEnroll} disabled={loading} id="btn-proceed-enroll">
                  {loading ? <span className="spinner" /> : "Process Enrollment →"}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Upload Slip */}
          {step === 3 && (
            <div style={{maxWidth:"480px",margin:"0 auto"}}>
              <h3 style={{fontWeight:700,marginBottom:"16px"}}>
                {paymentMethod === "BANK_TRANSFER" ? "Upload Payment Slip" : "Enrollment Processed"}
              </h3>
              <div className="alert alert-success">
                ✅ Enrollment created successfully! {enrollResult?.orderId && <>Order: <strong>{enrollResult.orderId}</strong></>}
              </div>
              {paymentMethod === "BANK_TRANSFER" && (
                <>
                  <div className="form-group">
                    <label className="form-label">Reference Number <span>*</span></label>
                    <input className="form-control" placeholder="Bank transfer reference no." id="slip-ref"
                      value={referenceNo} onChange={e=>setReferenceNo(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Upload Slip Image <span>*</span></label>
                    <input type="file" className="form-control" id="slip-file" accept="image/*,.pdf"
                      onChange={e=>setSlipFile(e.target.files[0])} />
                    <div className="form-hint">Accepted: JPG, PNG, PDF</div>
                  </div>
                  <div style={{display:"flex",gap:"10px",justifyContent:"flex-end",marginTop:"16px"}}>
                    <button className="btn btn-secondary" onClick={() => setStep(4)} id="btn-skip-slip">Skip for now</button>
                    <button className="btn btn-primary" onClick={handleUploadSlip} disabled={loading} id="btn-upload-slip">
                      {loading ? <span className="spinner" /> : "Upload Slip"}
                    </button>
                  </div>
                </>
              )}
              {paymentMethod !== "BANK_TRANSFER" && (
                <div style={{textAlign:"right",marginTop:"16px"}}>
                  <button className="btn btn-primary" onClick={() => setStep(4)} id="btn-finish">Finish</button>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 4 && (
            <div style={{textAlign:"center",padding:"40px 20px"}}>
              <div style={{fontSize:"64px",marginBottom:"16px"}}>🎉</div>
              <h3 style={{fontWeight:800,fontSize:"22px",marginBottom:"8px"}}>Enrollment Complete!</h3>
              <p style={{color:"var(--text-secondary)",marginBottom:"28px"}}>
                The enrollment has been processed successfully.
              </p>
              <button className="btn btn-primary btn-lg" onClick={reset} id="btn-new-enroll">
                + New Enrollment
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
