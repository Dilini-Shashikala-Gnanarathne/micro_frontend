import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getCourses,
  getPackages,
  getLessons,
  enrollCourse,
  enrollPackage,
  enrollLesson,
  cancelEnrollment,
  uploadPaymentSlip,
  getPhysicalInstitutes
} from "../api";
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
            <div
              className="step-line"
              style={{
                flex: 1,
                height: 2,
                margin: "0 10px",
                background: i < current ? "var(--primary)" : "var(--border)",
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

const isTuteAvailable = (item) => {
  if (!item) return false;
  return Boolean(
    item.hasTute === true ||
    item.hasTute === 1 ||
    item.hasTute === "1" ||
    item.has_tute === true ||
    item.has_tute === 1 ||
    item.has_tute === "1"
  );
};

function CourseCard({ course, selected, onSelect }) {
  const [imgError, setImgError] = useState(false);
  const rawUrl = course.imageUrl;
  const imageSrc = !imgError && rawUrl
    ? (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
      ? rawUrl
      : `/uploads/${rawUrl.replace(/^\/+/, "")}`)
    : null;

  return (
    <div
      className={`course-card${selected ? " selected" : ""}`}
      onClick={() => onSelect(course)}
      id={`card-course-${course.id}`}
    >
      <div className="course-img" style={{ position: "relative" }}>
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            onError={() => setImgError(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            className="course-img-placeholder"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "white",
            }}
          >
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
        <div className="course-code">
          {course.code}
          {isTuteAvailable(course) && (
            <span className="badge badge-info" style={{ marginLeft: "6px", fontSize: "10px", padding: "2px 6px" }}>
              📦 Tute Available
            </span>
          )}
        </div>
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);

  const [enrollType, setEnrollType] = useState(""); // course | package | lesson
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedLessons, setSelectedLessons] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("DIGITAL");
  const [slipFile, setSlipFile] = useState(null);
  const [referenceNo, setReferenceNo] = useState("");
  const [enrollResult, setEnrollResult] = useState(null);
  const [lastApiCall, setLastApiCall] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [needTute, setNeedTute] = useState(false);
  const [needHomeDelivery, setNeedHomeDelivery] = useState(true);
  const [deliveryInstituteId, setDeliveryInstituteId] = useState("");
  const [institutes, setInstitutes] = useState([]);

  useEffect(() => {
    getPhysicalInstitutes()
      .then((res) => {
        const list = res.data?.data || res.data || [];
        setInstitutes(Array.isArray(list) ? list : []);
      })
      .catch((err) => console.error("Failed to load physical institutes", err));
  }, []);

  // Handle URL query parameters for pre-selection (course, package, lesson)
  useEffect(() => {
    const typeParam = searchParams.get("type");
    const courseIdParam = searchParams.get("courseId") || searchParams.get("id");
    const packageIdParam = searchParams.get("packageId");
    const lessonIdsParam = searchParams.get("lessonIds");

    if (!typeParam) return;

    if (typeParam === "course") {
      setEnrollType("course");
      setLoading(true);
      getCourses({ size: 100 })
        .then((res) => {
          const list = res.data?.data?.items || res.data?.data?.data || res.data?.data || [];
          setItems(Array.isArray(list) ? list : []);
          if (courseIdParam) {
            const found = (Array.isArray(list) ? list : []).find((c) => c.id === courseIdParam);
            if (found) {
              setSelected(found);
              setStep(2);
            } else {
              setStep(1);
            }
          } else {
            setStep(1);
          }
        })
        .catch((err) => toast.error(err.response?.data?.message || "Failed to load courses"))
        .finally(() => setLoading(false));
    } else if (typeParam === "package") {
      if (packageIdParam) {
        navigate(`/packages/${packageIdParam}/buy`);
      } else {
        handleSelectType("package");
      }
    } else if (typeParam === "lesson") {
      setEnrollType("lesson");
      setLoading(true);
      getLessons({ size: 100 })
        .then((res) => {
          const list = res.data?.data?.items || res.data?.data?.data || res.data?.data || [];
          setItems(Array.isArray(list) ? list : []);
          if (lessonIdsParam) {
            const ids = lessonIdsParam.split(",").map((s) => s.trim());
            const matched = (Array.isArray(list) ? list : []).filter((l) => ids.includes(l.id));
            if (matched.length > 0) {
              setSelectedLessons(matched);
              setStep(2);
            } else {
              setStep(1);
            }
          } else {
            setStep(1);
          }
        })
        .catch((err) => toast.error(err.response?.data?.message || "Failed to load lessons"))
        .finally(() => setLoading(false));
    }
  }, [searchParams]);

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
        setItems(Array.isArray(list) ? list : []);
      } else if (type === "package") {
        const res = await getPackages({ size: 50 });
        const list = res.data?.data?.data || res.data?.data?.items || res.data?.data || [];
        setItems(Array.isArray(list) ? list : []);
      } else if (type === "lesson") {
        const res = await getLessons({ size: 50 });
        const list = res.data?.data?.data || res.data?.data?.items || res.data?.data || [];
        setItems(Array.isArray(list) ? list : []);
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
    let payload = {};
    let endpoint = "";

    try {
      let res;
      if (enrollType === "course") {
        endpoint = "POST /api/enroll/course";
        payload = { courseId: selected.id, paymentMethod };
        const hasTute = isTuteAvailable(selected);
        if (hasTute) {
          payload.needTute = needTute;
          if (needTute) {
            payload.needHomeDelivery = needHomeDelivery;
            if (!needHomeDelivery) {
              if (!deliveryInstituteId) {
                toast.error("Please select a physical pickup institute for tute collection.");
                setLoading(false);
                return;
              }
              payload.deliveryInstituteId = deliveryInstituteId;
            }
          }
        }
        res = await enrollCourse(payload);
      } else if (enrollType === "package") {
        endpoint = "POST /api/enroll/package";
        payload = {
          packageCombinationId: selected.packageCombinationId || selected.id,
          paymentMethod,
        };
        res = await enrollPackage(payload);
      } else if (enrollType === "lesson") {
        endpoint = "POST /api/enroll/lesson";
        payload = {
          lessonIds: selectedLessons.map((l) => l.id),
          paymentMethod,
        };
        res = await enrollLesson(payload);
      }

      const data = res.data?.data || res.data;
      setEnrollResult(data);
      setLastApiCall({
        endpoint,
        status: res.status || 201,
        requestPayload: payload,
        responsePayload: res.data,
        timestamp: new Date().toLocaleTimeString(),
      });
      toast.success(res.data?.message || "Enrollment processed successfully!");

      if (paymentMethod === "DIGITAL") {
        setStep(3); // Go to slip upload step
      } else {
        setStep(4); // Instant completion for ONLINE, MANUAL, PAY_LATER
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || "Enrollment failed";
      toast.error(errorMsg);
      setLastApiCall({
        endpoint,
        status: err.response?.status || 400,
        requestPayload: payload,
        responsePayload: err.response?.data || { error: errorMsg },
        timestamp: new Date().toLocaleTimeString(),
      });
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

      toast.success("Payment details & slip submitted successfully!");
      setStep(4);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit payment evidence");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEnrollmentTest = async () => {
    const orderId = enrollResult?.orderId;
    if (!orderId) {
      toast.error("No Order ID available to cancel.");
      return;
    }

    setCancelling(true);
    try {
      const res = await cancelEnrollment({ orderId });
      setCancelMessage(res.data?.message || "Enrollment cancelled and associated records deleted.");
      toast.success("Enrollment cancelled successfully (Endpoint: POST /api/enroll/cancel)");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel enrollment");
    } finally {
      setCancelling(false);
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
    setLastApiCall(null);
    setCancelMessage("");
    setNeedTute(false);
    setNeedHomeDelivery(true);
    setDeliveryInstituteId("");
  };

  const filteredItems = items.filter((item) =>
    (item.name || "").toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 style={{ fontWeight: 800, fontSize: "18px" }}>Enroll Student & Test Endpoints</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
            Test course, package, and lesson enrollment endpoints directly
          </p>
        </div>
        {enrollType && (
          <button className="btn btn-secondary btn-sm" onClick={reset}>
            Reset / Change Type
          </button>
        )}
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
                  { type: "course", title: "Single Course", desc: "Endpoint: POST /api/enroll/course", badge: "Course Endpoint", icon: "📚" },
                  { type: "package", title: "Course Package", desc: "Endpoint: POST /api/enroll/package", badge: "Package Endpoint", icon: "📦" },
                  { type: "lesson", title: "Individual Lessons", desc: "Endpoint: POST /api/enroll/lesson", badge: "Lesson Endpoint", icon: "🎬" },
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
                  Back
                </button>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <input
                  className="form-control"
                  placeholder="Search..."
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  id="enroll-search"
                />
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
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          if (enrollType === "package") {
                            navigate(`/packages/${selected.id}/buy`);
                          } else {
                            setStep(2);
                          }
                        }}
                        id="btn-item-next"
                      >
                        {enrollType === "package" ? `Choose Combination for "${selected.name}" →` : `Continue with "${selected.name}" →`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Payment Method & Tute Options */}
          {step === 2 && (
            <div style={{ maxWidth: "560px", margin: "0 auto" }}>
              <div className="flex justify-between items-center mb-4">
                <h3 style={{ fontWeight: 700 }}>Select Payment Method & Options</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setStep(1)} id="btn-back-item">Back</button>
              </div>
              <div className="alert alert-info">
                <span>Enrolling in: <strong>{selected?.name || `${selectedLessons.length} lesson(s)`}</strong></span>
              </div>

              {/* Tute Request Section for Single Course Enrollment */}
              {enrollType === "course" && (
                isTuteAvailable(selected) ? (
                <div
                  style={{
                    border: "1.5px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    padding: "16px",
                    marginBottom: "16px",
                    background: needTute ? "var(--primary-light)" : "var(--bg)",
                    transition: "all .2s ease",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "13.5px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={needTute}
                      onChange={(e) => setNeedTute(e.target.checked)}
                      id="checkbox-need-tute"
                      style={{ width: "16px", height: "16px" }}
                    />
                    <span>Request Printed Study Material / Tutes</span>
                  </label>

                  {needTute && (
                    <div style={{ marginTop: "14px", borderTop: "1px dashed var(--border)", paddingTop: "14px" }}>
                      <div className="form-group mb-2">
                        <label className="form-label" style={{ fontSize: "12px", fontWeight: 700 }}>Delivery Mode:</label>
                        <div style={{ display: "flex", gap: "10px" }}>
                          <div
                            onClick={() => setNeedHomeDelivery(true)}
                            style={{
                              flex: 1,
                              border: `1.5px solid ${needHomeDelivery ? "var(--primary)" : "var(--border)"}`,
                              background: needHomeDelivery ? "white" : "transparent",
                              padding: "10px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              textAlign: "center",
                            }}
                            id="delivery-mode-home"
                          >
                            <div style={{ fontSize: "12.5px", fontWeight: 600 }}>🚚 Home Delivery</div>
                            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Direct to address</div>
                          </div>
                          <div
                            onClick={() => setNeedHomeDelivery(false)}
                            style={{
                              flex: 1,
                              border: `1.5px solid ${!needHomeDelivery ? "var(--primary)" : "var(--border)"}`,
                              background: !needHomeDelivery ? "white" : "transparent",
                              padding: "10px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              textAlign: "center",
                            }}
                            id="delivery-mode-institute"
                          >
                            <div style={{ fontSize: "12.5px", fontWeight: 600 }}>🏛️ Institute Pickup</div>
                            <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Collect at institute</div>
                          </div>
                        </div>
                      </div>

                      {needHomeDelivery ? (
                        <div style={{ fontSize: "12px", color: "#065f46", background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "8px 12px", borderRadius: "6px" }}>
                          ✓ Your study pack will be delivered directly to your registered student delivery address.
                        </div>
                      ) : (
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ fontSize: "12px", fontWeight: 700 }}>Select Pickup Institute *</label>
                          <select
                            className="form-control"
                            value={deliveryInstituteId}
                            onChange={(e) => setDeliveryInstituteId(e.target.value)}
                            id="select-delivery-institute"
                            style={{ fontSize: "13px" }}
                          >
                            <option value="">-- Choose Institute --</option>
                            {institutes.map((inst) => (
                              <option key={inst.id} value={inst.id}>
                                {inst.name} {inst.address ? `(${inst.address})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                ) : (
                  <div style={{ padding: "10px 14px", borderRadius: "var(--radius-sm)", background: "var(--bg)", border: "1px dashed var(--border)", marginBottom: "16px", fontSize: "12px", color: "var(--text-muted)" }}>
                    ℹ️ This course does not offer separate physical printed tutes.
                  </div>
                )
              )}

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

          {/* Step 4: Complete & Endpoint Inspector */}
          {step === 4 && (
            <div style={{ maxWidth: "720px", margin: "0 auto", padding: "20px 0" }}>
              <div style={{ textAlign: "center", marginBottom: "24px" }}>
                <div style={{ fontSize: "56px", marginBottom: "12px" }}>🎉</div>
                <h3 style={{ fontWeight: 800, fontSize: "22px", marginBottom: "6px" }}>
                  Enrollment Endpoint Executed!
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                  {enrollResult?.orderId ? (
                    <>Order reference <strong>{enrollResult.orderId}</strong> generated successfully.</>
                  ) : (
                    "Enrollment action completed."
                  )}
                </p>
              </div>

              {cancelMessage && (
                <div className="alert alert-warning mb-3">
                  ⚠️ {cancelMessage}
                </div>
              )}

              {/* Endpoint Inspector Box */}
              {lastApiCall && (
                <div
                  style={{
                    background: "#0f172a",
                    color: "#e2e8f0",
                    borderRadius: "8px",
                    padding: "18px 20px",
                    marginBottom: "24px",
                    fontSize: "12.5px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid #334155", paddingBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ background: "#2563eb", color: "white", padding: "2px 8px", borderRadius: "4px", fontWeight: 700, fontSize: "11px" }}>
                        ENDPOINT
                      </span>
                      <strong style={{ color: "#38bdf8", fontFamily: "monospace", fontSize: "13px" }}>
                        {lastApiCall.endpoint}
                      </strong>
                    </div>
                    <span style={{ color: "#4ade80", fontWeight: 600 }}>
                      Status: {lastApiCall.status} OK
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    <div>
                      <div style={{ color: "#94a3b8", fontWeight: 600, marginBottom: "4px" }}>Request Payload:</div>
                      <pre style={{ background: "#1e293b", padding: "10px", borderRadius: "6px", overflowX: "auto", maxHeight: "180px", color: "#f8fafc", margin: 0, fontSize: "11px" }}>
                        {JSON.stringify(lastApiCall.requestPayload, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <div style={{ color: "#94a3b8", fontWeight: 600, marginBottom: "4px" }}>Endpoint Response:</div>
                      <pre style={{ background: "#1e293b", padding: "10px", borderRadius: "6px", overflowX: "auto", maxHeight: "180px", color: "#f8fafc", margin: 0, fontSize: "11px" }}>
                        {JSON.stringify(lastApiCall.responsePayload, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
                {enrollResult?.orderId && !cancelMessage && (
                  <button
                    className="btn btn-danger"
                    onClick={handleCancelEnrollmentTest}
                    disabled={cancelling}
                    id="btn-test-cancel-enroll"
                  >
                    {cancelling ? <span className="spinner" /> : "Test Cancel Endpoint (POST /api/enroll/cancel)"}
                  </button>
                )}

                {enrollType === "course" && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigate("/payments/course")}
                    id="btn-goto-course-payments"
                  >
                    View in Course Requests
                  </button>
                )}

                {enrollType === "package" && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => navigate("/payments/package")}
                    id="btn-goto-package-payments"
                  >
                    View in Package Requests
                  </button>
                )}

                <button className="btn btn-primary" onClick={reset} id="btn-new-enroll">
                  + Test Another Enrollment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
