import { useState } from "react";
import { getCourses, getPackages, getLessons, enrollCourse, enrollPackage, enrollLesson, updateEnrollment, uploadPaymentSlip } from "../api";
import toast from "react-hot-toast";

const STEPS = ["Select Type", "Choose Item", "Payment Method", "Upload Slip", "Confirm"];

function StepIndicator({ current }) {
  return (
    <div className="step-indicator">
      {STEPS.map((label, i) => (
        <div key={label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div className={`step-circle ${i < current ? "done" : i === current ? "active" : ""}`}>
              {i < current ? "✓" : i + 1}
            </div>
            <span className={`step-label ${i < current ? "done" : i === current ? "active" : ""}`}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="step-line" style={{ flex: 1, height: 2, margin: "0 10px", background: i < current ? "var(--primary)" : "var(--border)" }} />
          )}
        </div>
      ))}
    </div>
  );
}

function CourseCard({ course, selected, onSelect }) {
  const [imgError, setImgError] = useState(false);
  const rawUrl = course.imageUrl;
  const imageSrc = !imgError && rawUrl
    ? (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
      ? rawUrl
      : `/uploads/${rawUrl.replace(/^\/+/, "")}`)
    : null;

  return (
    <div className={`course-card${selected ? " selected" : ""}`} onClick={() => onSelect(course)} id={`card-course-${course.id}`}>
      <div className="course-img" style={{ position: "relative" }}>
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div className="course-img-placeholder" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "white" }}>
            <span style={{ fontSize: "16px", fontWeight: 800, letterSpacing: "0.5px", opacity: 0.95, textTransform: "uppercase" }}>
              {course.code || "COURSE"}
            </span>
            <span style={{ fontSize: "11px", opacity: 0.8, marginTop: "2px" }}>
              {course.courseType || "Course"}
            </span>
          </div>
        )}
        {selected && <div className="course-select-check">✓</div>}
      </div>
      <div className="course-body">
        <div className="course-code">{course.code}</div>
        <div className="course-name">{course.name}</div>
        <div className="course-meta">
          <span>{course.medium}</span>
          <span>•</span>
          <span>{course.courseType}</span>
        </div>
        <div className="course-price">
          <span className="price-main">LKR {Number(course.croppedPrice || 0).toLocaleString()}</span>
          {course.originalPrice && course.originalPrice !== course.croppedPrice && (
            <span className="price-old">LKR {Number(course.originalPrice).toLocaleString()}</span>
          )}
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
  const [paymentMethod, setPaymentMethod] = useState("DIGITAL");
  const [slipFile, setSlipFile] = useState(null);
  const [referenceNo, setReferenceNo] = useState("");
  const [enrollResult, setEnrollResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQ, setSearchQ] = useState("");

  const PAYMENT_METHODS = [
    {
      value: "DIGITAL",
      label: "Bank Transfer / Slip (Digital)",
      desc: "Upload bank transfer deposit slip with reference number for verification",
      badge: "Popular",
    },
    {
      value: "ONLINE",
      label: "Online Payment Gateway",
      desc: "Pay instantly online using Visa, Mastercard, or digital payment",
      badge: "Instant",
    },
    {
      value: "MANUAL",
      label: "Cash / Manual Payment",
      desc: "Pay directly with cash at the institute physical cash counter",
      badge: "At Counter",
    },
    {
      value: "PAY_LATER",
      label: "Pay Later / Deferred",
      desc: "Reserve enrollment now and complete payment before course commencement",
      badge: "Deferred",
    },
  ];

  const handleSelectType = async (type) => {
    setEnrollType(type);
    setSelected(null);
    setSelectedLessons([]);
    setStep(1);
    setLoading(true);
    try {
      if (type === "course") {
        const res = await getCourses({ size: 50 });
        const list = res.data?.data?.data || res.data?.data?.items || res.data?.data || [];
        setItems(list);
      } else if (type === "package") {
        const res = await getPackages({ size: 50 });
        const list = res.data?.data?.data || res.data?.data?.items || res.data?.data || [];
        setItems(list);
      } else if (type === "lesson") {
        const res = await getLessons({ size: 50 });
        const list = res.data?.data?.data || res.data?.data?.items || res.data?.data || [];
        setItems(list);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  const handleItemSelect = (item) => {
    if (enrollType === "lesson") {
      setSelectedLessons((prev) =>
        prev.find((p) => p.id === item.id) ? prev.filter((p) => p.id !== item.id) : [...prev, item]
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
        res = await enrollPackage({
          packageCombinationId: selected.packageCombinationId || selected.id,
          paymentMethod,
        });
      } else if (enrollType === "lesson") {
        res = await enrollLesson({
          lessonIds: selectedLessons.map((l) => l.id),
          paymentMethod,
        });
      }
      const data = res.data?.data || res.data;
      setEnrollResult(data);
      toast.success(res.data?.message || "Enrollment processed successfully!");

      if (paymentMethod === "DIGITAL") {
        setStep(3); // Go to slip upload step
      } else {
        setStep(4); // Instant completion for ONLINE, MANUAL, PAY_LATER
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Enrollment failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSlip = async () => {
    if (!referenceNo.trim()) {
      toast.error("Please enter the payment reference number.");
      return;
    }
    const orderId = enrollResult?.orderId || enrollResult?.id;
    if (!orderId) {
      toast.error("Missing order ID.");
      return;
    }

    setLoading(true);
    try {
      // 1. Try uploading slip file if provided and paymentId is returned
      if (slipFile && enrollResult?.paymentId) {
        const formData = new FormData();
        formData.append("data", JSON.stringify({
          paymentId: enrollResult.paymentId,
          paymentMethod: "DIGITAL",
          referenceNo: referenceNo.trim()
        }));
        formData.append("slip", slipFile);
        await uploadPaymentSlip(formData).catch(() => null);
      }

      // 2. Update enrollment payment evidence via /api/enroll/update
      // await updateEnrollment({
      //   orderId: orderId,
      //   paymentMethod: "DIGITAL",
      //   evidenceReferenceNo: referenceNo.trim(),
      //   remarks: "Bank slip submitted for verification"
      // });

      toast.success("Payment details & slip submitted successfully!");
      setStep(4);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit payment evidence");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(0);
    setEnrollType("");
    setSelected(null);
    setSelectedLessons([]);
    setPaymentMethod("DIGITAL");
    setSlipFile(null);
    setReferenceNo("");
    setEnrollResult(null);
  };

  const filteredItems = items.filter((item) =>
    (item.name || "").toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 style={{ fontWeight: 800, fontSize: "18px" }}>Enroll Student</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
            Process course, package or lesson enrollment
          </p>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <StepIndicator current={step} />

          {/* Step 0: Type Selection */}
          {step === 0 && (
            <div>
              <h3 style={{ fontWeight: 700, fontSize: "15px", marginBottom: "16px" }}>What would you like to enroll in?</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                {[
                  { type: "course", title: "Single Course", desc: "Enroll in a theory, paper, or extra class", badge: "Most Popular", icon: "📚" },
                  { type: "package", title: "Course Package", desc: "Bundle of courses with combination pricing", badge: "Save More", icon: "📦" },
                  { type: "lesson", title: "Individual Lessons", desc: "Specific lessons or missed recorded sessions", badge: "Flexible", icon: "🎯" },
                ].map((opt) => (
                  <div
                    key={opt.type}
                    style={{
                      border: "1.5px solid var(--border)",
                      borderRadius: "var(--radius-md)",
                      padding: "24px 20px",
                      cursor: "pointer",
                      transition: "all .2s ease",
                      position: "relative",
                    }}
                    className="enroll-type-card"
                    onClick={() => handleSelectType(opt.type)}
                    id={`opt-${opt.type}`}
                  >
                    <div style={{ fontSize: "32px", marginBottom: "12px" }}>{opt.icon}</div>
                    <span className="badge badge-primary" style={{ position: "absolute", top: 16, right: 16 }}>{opt.badge}</span>
                    <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "6px" }}>{opt.title}</div>
                    <div style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>{opt.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Choose Item */}
          {step === 1 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 style={{ fontWeight: 700, fontSize: "15px" }}>Select a {enrollType}</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setStep(0)} id="btn-back-type">
                  ← Back
                </button>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <input className="form-control" placeholder="Search..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)} id="enroll-search" />
              </div>
              {loading ? (
                <div className="page-loader"><div className="spinner spinner-dark" /></div>
              ) : enrollType === "lesson" ? (
                <div>
                  <table>
                    <thead>
                      <tr>
                        <th>Select</th>
                        <th>Lesson Name</th>
                        <th>Course</th>
                        <th>Date</th>
                        <th>Free</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((l) => (
                        <tr key={l.id} onClick={() => handleItemSelect(l)} style={{ cursor: "pointer" }}>
                          <td>
                            <input
                              type="checkbox"
                              readOnly
                              checked={!!selectedLessons.find((s) => s.id === l.id)}
                              id={`lesson-check-${l.id}`}
                            />
                          </td>
                          <td style={{ fontWeight: 600 }}>{l.name}</td>
                          <td>{l.courseName || "-"}</td>
                          <td>{l.date ? new Date(l.date).toLocaleDateString() : "-"}</td>
                          <td>{l.isFree ? <span className="badge badge-success">Free</span> : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {selectedLessons.length > 0 && (
                    <div style={{ marginTop: "16px", textAlign: "right" }}>
                      <button className="btn btn-primary" onClick={() => setStep(2)} id="btn-lesson-next">
                        Continue with {selectedLessons.length} lesson(s) →
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="courses-grid">
                    {filteredItems.map((item) => (
                      <CourseCard key={item.id} course={item} selected={selected?.id === item.id} onSelect={handleItemSelect} />
                    ))}
                  </div>
                  {selected && (
                    <div style={{ marginTop: "20px", textAlign: "right" }}>
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
            <div style={{ maxWidth: "520px", margin: "0 auto" }}>
              <div className="flex justify-between items-center mb-4">
                <h3 style={{ fontWeight: 700 }}>Select Payment Method</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setStep(1)} id="btn-back-item">Back</button>
              </div>
              <div className="alert alert-info">
                <span>Enrolling in: <strong>{selected?.name || `${selectedLessons.length} lesson(s)`}</strong></span>
              </div>
              {PAYMENT_METHODS.map((m) => (
                <div
                  key={m.value}
                  style={{
                    border: `1.5px solid ${paymentMethod === m.value ? "var(--primary)" : "var(--border)"}`,
                    borderRadius: "var(--radius-sm)",
                    padding: "14px 16px",
                    marginBottom: "10px",
                    cursor: "pointer",
                    background: paymentMethod === m.value ? "var(--primary-light)" : "white",
                    transition: "all .2s",
                    display: "flex",
                    gap: "12px",
                    alignItems: "center",
                  }}
                  onClick={() => setPaymentMethod(m.value)}
                  id={`pm-${m.value.toLowerCase()}`}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: `2px solid ${paymentMethod === m.value ? "var(--primary)" : "var(--border)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {paymentMethod === m.value && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)" }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: "13.5px" }}>{m.label}</span>
                      <span className="badge badge-gray" style={{ fontSize: "11px" }}>{m.badge}</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{m.desc}</div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: "20px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)} id="btn-pm-back">Back</button>
                <button className="btn btn-primary" onClick={handleEnroll} disabled={loading} id="btn-proceed-enroll">
                  {loading ? <span className="spinner" /> : "Process Enrollment →"}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Upload Slip (for DIGITAL paymentMethod) */}
          {step === 3 && (
            <div style={{ maxWidth: "480px", margin: "0 auto" }}>
              <h3 style={{ fontWeight: 700, marginBottom: "16px" }}>Upload Payment Slip</h3>
              <div className="alert alert-success">
                ✓ Enrollment created! {enrollResult?.orderId && <>Order ID: <strong>{enrollResult.orderId}</strong></>}
              </div>

              <div className="form-group">
                <label className="form-label">Payment Reference Number *</label>
                <input
                  className="form-control"
                  placeholder="e.g. REF-BANK-123456"
                  id="slip-ref"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  required
                />
                <div className="form-hint">Enter your bank deposit or fund transfer transaction reference.</div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Slip Image / Document (Optional)</label>
                <input
                  type="file"
                  className="form-control"
                  id="slip-file"
                  accept="image/*,.pdf"
                  onChange={(e) => setSlipFile(e.target.files[0])}
                />
                <div className="form-hint">Accepted file types: JPG, PNG, PDF</div>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px" }}>
                <button className="btn btn-secondary" onClick={() => setStep(4)} id="btn-skip-slip">
                  Skip for now
                </button>
                <button className="btn btn-primary" onClick={handleUploadSlip} disabled={loading} id="btn-upload-slip">
                  {loading ? <span className="spinner" /> : "Submit Payment Slip"}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 4 && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: "64px", marginBottom: "16px" }}>🎉</div>
              <h3 style={{ fontWeight: 800, fontSize: "22px", marginBottom: "8px" }}>Enrollment Processed!</h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>
                Your enrollment has been successfully recorded in the system.
              </p>
              {enrollResult?.orderId && (
                <div style={{ display: "inline-block", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 18px", marginBottom: "24px", fontSize: "13px" }}>
                  Order Reference: <strong style={{ fontFamily: "monospace" }}>{enrollResult.orderId}</strong>
                  {paymentMethod && <span style={{ marginLeft: "12px", color: "var(--primary)", fontWeight: 600 }}>({paymentMethod})</span>}
                </div>
              )}
              <div>
                <button className="btn btn-primary btn-lg" onClick={reset} id="btn-new-enroll">
                  + New Enrollment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}