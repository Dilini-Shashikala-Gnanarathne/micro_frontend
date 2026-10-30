import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getPackageById,
  getPackageEnrollmentProduct,
  enrollPackage,
  uploadPaymentSlip,
  cancelEnrollment,
  getPhysicalInstitutes
} from "../api";
import toast from "react-hot-toast";

const PAYMENT_METHODS = [
  { id: "DIGITAL", label: "Bank Transfer / Slip (Digital)", desc: "Upload bank deposit slip after enrollment is initiated", badge: "Recommended" },
  { id: "ONLINE", label: "Online Payment Gateway", desc: "Pay instantly via Visa / Mastercard / Online", badge: "Instant" },
  { id: "MANUAL", label: "Manual / Cash", desc: "Pay cash at the institute counter", badge: "At Counter" },
  { id: "PAY_LATER", label: "Pay Later", desc: "Reserve your seat now and pay before the deadline", badge: "Deferred" },
];

export default function PackageBuyPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [pkg, setPkg] = useState(null);

  // Flow steps: 1 = "select_combo_and_method", 2 = "upload_evidence", 3 = "success"
  const [step, setStep] = useState(1);

  // Step 1 state
  const [selectedComboId, setSelectedComboId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("DIGITAL");
  const [enrolling, setEnrolling] = useState(false);

  // Enrolled response from /api/enroll/package
  const [enrollData, setEnrollData] = useState(null);

  // Step 2 state (for DIGITAL)
  const [referenceNo, setReferenceNo] = useState("");
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState(null);
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [lastApiCall, setLastApiCall] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState("");

  // Tute & Material State
  const [institutes, setInstitutes] = useState([]);
  const [courseTuteOptions, setCourseTuteOptions] = useState({});

  useEffect(() => {
    getPhysicalInstitutes()
      .then((res) => {
        const list = res.data?.data || res.data || [];
        setInstitutes(Array.isArray(list) ? list : []);
      })
      .catch((err) => console.error("Failed to load physical institutes:", err));
  }, []);

  const handleCourseTuteToggle = (courseId, checked) => {
    setCourseTuteOptions((prev) => ({
      ...prev,
      [courseId]: {
        needTute: checked,
        needHomeDelivery: prev[courseId]?.needHomeDelivery ?? true,
        deliveryInstituteId: prev[courseId]?.deliveryInstituteId ?? "",
      },
    }));
  };

  const handleCourseDeliveryMethod = (courseId, isHome) => {
    setCourseTuteOptions((prev) => ({
      ...prev,
      [courseId]: {
        ...prev[courseId],
        needHomeDelivery: isHome,
      },
    }));
  };

  const handleCourseInstituteChange = (courseId, instituteId) => {
    setCourseTuteOptions((prev) => ({
      ...prev,
      [courseId]: {
        ...prev[courseId],
        deliveryInstituteId: instituteId,
      },
    }));
  };

  // Live Enrollment Details from POST /api/student/enroll/package
  const [enrollmentProduct, setEnrollmentProduct] = useState(null);
  const [loadingProductDetails, setLoadingProductDetails] = useState(false);

  useEffect(() => {
    async function loadPackage() {
      setLoading(true);
      try {
        const res = await getPackageById(id);
        const data = res.data?.data || res.data;
        setPkg(data);

        if (data?.combinations && data.combinations.length > 0) {
          setSelectedComboId(data.combinations[0].id);
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load package details");
      } finally {
        setLoading(false);
      }
    }
    if (id) {
      loadPackage();
    }
  }, [id]);

  useEffect(() => {
    if (!id || !selectedComboId || !pkg) return;
    const combo = pkg.combinations?.find((c) => c.id === selectedComboId);
    const courseIds = combo?.items?.map((item) => item.courseId) || [];

    setLoadingProductDetails(true);
    getPackageEnrollmentProduct(id, courseIds)
      .then((res) => {
        const data = res.data?.data || res.data;
        setEnrollmentProduct(data);
      })
      .catch((err) => {
        console.warn("Failed to fetch real-time package enrollment details:", err);
      })
      .finally(() => {
        setLoadingProductDetails(false);
      });
  }, [id, selectedComboId, pkg]);

  const handleSlipChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Slip file size must not exceed 5MB.");
        return;
      }
      setSlipFile(file);
      setSlipPreview(URL.createObjectURL(file));
    }
  };

  const selectedCombination = pkg?.combinations?.find((c) => c.id === selectedComboId);

  // 1. STEP 1: ONLY CALL /api/enroll/package
  const handleInitiateEnroll = async () => {
    if (!selectedComboId) {
      toast.error("Please select a package combination.");
      return;
    }

    // Validate tute options if selected
    const formattedCourses = [];
    if (selectedCombination?.items) {
      for (const item of selectedCombination.items) {
        const cId = item.courseId;
        const opt = courseTuteOptions[cId];
        if (opt && opt.needTute) {
          if (!opt.needHomeDelivery && !opt.deliveryInstituteId) {
            toast.error("Please choose a pickup institute for all courses requesting institute collection.");
            return;
          }
          formattedCourses.push({
            courseId: cId,
            needTute: true,
            needHomeDelivery: Boolean(opt.needHomeDelivery),
            deliveryInstituteId: opt.needHomeDelivery ? null : opt.deliveryInstituteId,
          });
        }
      }
    }

    setEnrolling(true);
    try {
      const payload = {
        packageCombinationId: selectedComboId,
        paymentMethod: paymentMethod,
      };
      if (formattedCourses.length > 0) {
        payload.courses = formattedCourses;
      }
      const res = await enrollPackage(payload);

      const data = res.data?.data || res.data;
      setEnrollData(data);
      setLastApiCall({
        endpoint: "POST /api/enroll/package",
        status: res.status || 201,
        requestPayload: payload,
        responsePayload: res.data,
        timestamp: new Date().toLocaleTimeString(),
      });
      toast.success(res.data?.message || "Package enrollment created successfully!");

      // If DIGITAL and not free: Move to step 2 to upload evidence
      const isFree = Boolean(
        enrollmentProduct?.is_free ||
        (enrollmentProduct?.price !== undefined && Number(enrollmentProduct?.price) <= 0)
      );
      if (paymentMethod === "DIGITAL" && !isFree) {
        setStep(2);
      } else {
        // ONLINE, MANUAL, PAY_LATER, or FREE: Move straight to completion
        setStep(3);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to initiate package enrollment";
      toast.error(msg);
    } finally {
      setEnrolling(false);
    }
  };

  // 2. STEP 2: ONLY CALL /api/payment/evidence/upload
    const handleCancelPackageTest = async () => {
    const orderId = enrollData?.orderId;
    if (!orderId) {
      toast.error("No Order ID found to cancel.");
      return;
    }
    setCancelling(true);
    try {
      const res = await cancelEnrollment({ orderId });
      setCancelMessage(res.data?.message || "Package enrollment cancelled and records deleted.");
      toast.success("Package enrollment cancelled successfully (POST /api/enroll/cancel)");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to cancel package enrollment");
    } finally {
      setCancelling(false);
    }
  };

  const handleUploadEvidence = async (e) => {
    e.preventDefault();

    if (!referenceNo.trim()) {
      toast.error("Please enter the payment transaction reference number.");
      return;
    }

    if (!slipFile) {
      toast.error("Please select and upload your bank transfer slip or receipt.");
      return;
    }

    const paymentId = enrollData?.paymentId;
    if (!paymentId) {
      toast.error("Payment ID missing from previous enrollment step.");
      return;
    }

    setUploadingSlip(true);
    try {
      const formData = new FormData();
      formData.append(
        "data",
        JSON.stringify({
          paymentId: paymentId,
          paymentMethod: "DIGITAL",
          referenceNo: referenceNo.trim(),
        })
      );
      formData.append("slip", slipFile);

      const res = await uploadPaymentSlip(formData);
      toast.success(res.data?.message || "Payment evidence uploaded successfully!");
      setStep(3);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to upload payment slip";
      toast.error(msg);
    } finally {
      setUploadingSlip(false);
    }
  };

  if (loading) {
    return (
      <div className="page-loader" style={{ minHeight: "350px" }}>
        <div className="spinner spinner-dark" />
        <span style={{ marginLeft: "12px", color: "var(--text-secondary)" }}>
          Loading package combinations...
        </span>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="empty-state" style={{ minHeight: "300px" }}>
        <p>Package not found.</p>
        <button className="btn btn-secondary mt-3" onClick={() => navigate("/packages")}>
          Back to Packages
        </button>
      </div>
    );
  }

  const combinations = pkg.combinations || [];

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* Top Header */}
      <div className="flex justify-between items-center mb-4">
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate("/packages")}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          â† Back to Packages
        </button>

        {/* Step Indicator */}
        <div className="flex items-center gap-2" style={{ fontSize: "13px" }}>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "20px",
              background: step === 1 ? "var(--primary)" : "#def7ec",
              color: step === 1 ? "#fff" : "#03543f",
              fontWeight: 700,
            }}
          >
            1. Select Combination
          </span>
          <span>â†’</span>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "20px",
              background: step === 2 ? "var(--primary)" : step > 2 ? "#def7ec" : "var(--bg)",
              color: step === 2 ? "#fff" : step > 2 ? "#03543f" : "var(--text-muted)",
              fontWeight: 700,
            }}
          >
            2. Payment Evidence
          </span>
          <span>â†’</span>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: "20px",
              background: step === 3 ? "#def7ec" : "var(--bg)",
              color: step === 3 ? "#03543f" : "var(--text-muted)",
              fontWeight: 700,
            }}
          >
            3. Confirmation
          </span>
        </div>
      </div>

      {/* Package Hero Banner */}
      <div
        className="card mb-4"
        style={{
          border: "1.5px solid var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "160px 1fr",
            gap: "20px",
            padding: "20px",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: "160px",
              height: "110px",
              borderRadius: "var(--radius-sm)",
              background: "var(--bg)",
              overflow: "hidden",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {pkg.imageUrl ? (
              <img
                src={pkg.imageUrl.startsWith("http") ? pkg.imageUrl : `/${pkg.imageUrl}`}
                alt={pkg.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
              />
            ) : (
              <span style={{ fontSize: "32px" }}>ðŸ“¦</span>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-primary">{pkg.medium}</span>
              {pkg.isFeatured ? <span className="badge badge-success">Featured</span> : null}
              {pkg.isFree ? <span className="badge badge-warning">Free</span> : null}
            </div>
            <h1 style={{ fontWeight: 800, fontSize: "20px", color: "var(--text-primary)", marginBottom: "4px" }}>
              {pkg.name}
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: 0 }}>
              {pkg.description || "Course package offering curated multi-subject combinations."}
            </p>
            <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
              Includes {pkg.courses?.length || 0} courses Â· {combinations.length} combinations available
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: SELECT COMBINATION AND PAYMENT METHOD (Calls /api/enroll/package) */}
      {/* ========================================================================= */}
      {step === 1 && (
        <>
          {/* Combinations Selection Cards */}
          <div className="card mb-4">
            <div className="card-header">
              <h2 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>
                1. Select a Package Combination
              </h2>
              <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>
                Choose which combination of courses you want to enroll in
              </p>
            </div>

            <div className="card-body">
              {combinations.length === 0 ? (
                <div className="empty-state">
                  <p>No active combinations configured for this package.</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
                  {combinations.map((combo) => {
                    const isSelected = selectedComboId === combo.id;

                    const comboCourses = combo.items?.map((item) => {
                      const c = pkg.courses?.find((course) => course.id === item.courseId);
                      return {
                        ...item,
                        name: c?.name || "Course",
                        standardPrice: c ? (c.croppedPrice || c.originalPrice || 0) : item.price,
                      };
                    }) || [];

                    const standardTotal = comboCourses.reduce((sum, c) => sum + c.standardPrice, 0);
                    const savings = standardTotal - (combo.totalPrice || 0);

                    return (
                      <div
                        key={combo.id}
                        onClick={() => setSelectedComboId(combo.id)}
                        style={{
                          border: `2px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                          borderRadius: "var(--radius)",
                          padding: "16px",
                          background: isSelected ? "var(--primary-light)" : "var(--card-bg)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          boxShadow: isSelected ? "0 4px 12px rgba(26, 86, 219, 0.12)" : "none",
                        }}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <span
                            style={{
                              background: isSelected ? "var(--primary)" : "#374151",
                              color: "#fff",
                              fontWeight: 800,
                              fontSize: "12px",
                              borderRadius: "4px",
                              padding: "2px 8px",
                            }}
                          >
                            Code: {combo.code}
                          </span>
                          <div
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              border: `2px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                              background: isSelected ? "var(--primary)" : "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontSize: "11px",
                            }}
                          >
                            {isSelected && "✓"}
                          </div>
                        </div>

                        {/* Included Courses */}
                        <div style={{ marginBottom: "14px" }}>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                            Included Courses ({comboCourses.length}):
                          </div>
                          <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "12.5px" }}>
                            {comboCourses.map((c) => (
                              <li key={c.courseId} style={{ marginBottom: "3px" }}>
                                <strong>{c.name}</strong>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Pricing */}
                        <div
                          style={{
                            borderTop: "1px dashed var(--border)",
                            paddingTop: "10px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "baseline",
                          }}
                        >
                          <div>
                            {savings > 0 && (
                              <div style={{ fontSize: "11px", color: "var(--text-muted)", textDecoration: "line-through" }}>
                                Rs. {standardTotal.toLocaleString()}
                              </div>
                            )}
                            <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--primary)" }}>
                              Rs. {combo.totalPrice?.toLocaleString()}
                            </div>
                          </div>

                          {savings > 0 && (
                            <span
                              style={{
                                background: "#def7ec",
                                color: "#03543f",
                                fontWeight: 700,
                                fontSize: "11px",
                                padding: "2px 6px",
                                borderRadius: "4px",
                              }}
                            >
                              Save Rs. {savings.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Real-time Student Access & Pricing Breakdown (POST /api/student/enroll/package) */}
          {enrollmentProduct && (
            <div className="card mb-4" style={{ border: "1.5px solid #3b82f6", background: "#f8fafc" }}>
              <div
                className="card-header"
                style={{
                  background: "linear-gradient(135deg, #1e3a8a, #3b82f6)",
                  color: "white",
                  padding: "14px 18px",
                  borderRadius: "8px 8px 0 0",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h2 style={{ fontSize: "15px", fontWeight: 700, margin: 0, color: "white", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>⚡</span> Live Student Course Access & Price Breakdown
                  </h2>
                  <p style={{ fontSize: "11.5px", margin: "2px 0 0 0", opacity: 0.9 }}>
                    Calculated dynamically for your account via <code style={{ color: "#fef08a" }}>POST /api/student/enroll/package</code>
                  </p>
                </div>
                {loadingProductDetails && (
                  <span className="spinner" style={{ width: 16, height: 16, borderColor: "white transparent white transparent" }} />
                )}
              </div>

              <div className="card-body" style={{ padding: "16px" }}>
                {(enrollmentProduct.is_free || Number(enrollmentProduct.price) === 0) ? (
                  <div
                    style={{
                      background: "#ecfdf5",
                      border: "1px solid #a7f3d0",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      color: "#065f46",
                      fontSize: "13px",
                      fontWeight: 600,
                      marginBottom: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span>🎉</span>
                    <span>All selected courses are entitled to FREE access or already active! No payment required.</span>
                  </div>
                ) : null}

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {enrollmentProduct.courses?.map((c) => {
                    const comboItem = enrollmentProduct.seleted_combinations?.find((sc) => sc.id === c.id);
                    const isItemFree = Boolean(comboItem?.is_free || c.course_access);

                    return (
                      <div
                        key={c.id}
                        style={{
                          background: "white",
                          border: `1.5px solid ${c.course_access ? "#10b981" : "#e2e8f0"}`,
                          borderRadius: "8px",
                          padding: "12px 14px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: "10px",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 800, fontSize: "13px", color: "#1e293b" }}>
                              {c.code}
                            </span>
                            <span style={{ fontSize: "13px", fontWeight: 600, color: "#334155" }}>
                              {c.name}
                            </span>
                            {c.course_access ? (
                              <span className="badge badge-success" style={{ fontSize: "10.5px", fontWeight: 700 }}>
                                ✓ Access Granted
                              </span>
                            ) : c.enrollment?.status ? (
                              <span className="badge badge-info" style={{ fontSize: "10.5px" }}>
                                {c.enrollment.status}
                              </span>
                            ) : (
                              <span className="badge badge-gray" style={{ fontSize: "10.5px" }}>
                                Not Enrolled
                              </span>
                            )}
                          </div>

                          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", fontSize: "11.5px", color: "#64748b", marginTop: "4px" }}>
                            <span>Medium: {c.medium}</span>
                            <span>Type: {c.course_type}</span>
                            {c.expiry_date && <span>📅 Expiry: {c.expiry_date}</span>}
                            {c.has_tute && <span>📦 Tute Available</span>}
                            {c.parent_course && (
                              <span style={{ color: "#4f46e5", fontWeight: 600 }}>
                                🔗 Covered by Parent: {c.parent_course.name}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          {isItemFree ? (
                            <span style={{ color: "#10b981", fontWeight: 800, fontSize: "13px" }}>
                              FREE (Active / Included)
                            </span>
                          ) : (
                            <span style={{ fontWeight: 800, fontSize: "14px", color: "var(--primary)" }}>
                              Rs. {Number(comboItem?.price || 0).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ borderTop: "1px dashed #cbd5e1", marginTop: "14px", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", fontWeight: 700, color: "#475569" }}>
                    Total Calculated Amount for you:
                  </span>
                  <span style={{ fontSize: "18px", fontWeight: 800, color: (enrollmentProduct.is_free || Number(enrollmentProduct.price) === 0) ? "#10b981" : "var(--primary)" }}>
                    {enrollmentProduct.is_free || Number(enrollmentProduct.price) === 0 ? "FREE" : `Rs. ${Number(enrollmentProduct.price).toLocaleString()}`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tute & Study Material Selection per Course */}
          {(() => {
            const comboCoursesWithTutes = selectedCombination?.items?.map((item) => {
              const c = pkg.courses?.find((course) => course.id === item.courseId);
              return {
                ...item,
                name: c?.name || item.name || "Course",
                hasTute: Boolean(c?.hasTute ?? c?.has_tute),
              };
            })?.filter((c) => c.hasTute) || [];

            if (comboCoursesWithTutes.length === 0) return null;

            return (
              <div className="card mb-4" id="section-package-tutes">
                <div className="card-header">
                  <h2 style={{ fontSize: "15px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>📚</span> 2. Study Material & Tute Options (Per Course)
                  </h2>
                  <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0 }}>
                    Select tute and delivery preferences for eligible courses in this package combination
                  </p>
                </div>
                <div className="card-body">
                  {comboCoursesWithTutes.map((c) => {
                    const opt = courseTuteOptions[c.courseId] || { needTute: false, needHomeDelivery: true, deliveryInstituteId: "" };
                    return (
                      <div
                        key={c.courseId}
                        style={{
                          border: `1.5px solid ${opt.needTute ? "var(--primary)" : "var(--border)"}`,
                          borderRadius: "var(--radius-sm)",
                          padding: "16px",
                          marginBottom: "12px",
                          background: opt.needTute ? "var(--primary-light)" : "var(--bg)",
                          transition: "all .2s ease",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "13.5px" }}>{c.name}</div>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                              Printed study packs and tutorials available for this course.
                            </div>
                          </div>
                          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>
                            <input
                              type="checkbox"
                              checked={opt.needTute}
                              onChange={(e) => handleCourseTuteToggle(c.courseId, e.target.checked)}
                              style={{ width: 18, height: 18, accentColor: "var(--primary)", cursor: "pointer" }}
                              id={`chk-pkg-tute-${c.courseId}`}
                            />
                            Request Tute
                          </label>
                        </div>

                        {opt.needTute && (
                          <div style={{ borderTop: "1px dashed var(--border)", paddingTop: "12px", marginTop: "12px" }}>
                            <div style={{ fontWeight: 600, fontSize: "12px", marginBottom: "8px" }}>
                              Delivery Method:
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                              <div
                                onClick={() => handleCourseDeliveryMethod(c.courseId, true)}
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: "var(--radius-sm)",
                                  border: `1.5px solid ${opt.needHomeDelivery ? "var(--primary)" : "var(--border)"}`,
                                  background: opt.needHomeDelivery ? "white" : "transparent",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  transition: "all .15s",
                                }}
                              >
                                <input
                                  type="radio"
                                  name={`deliv_${c.courseId}`}
                                  checked={opt.needHomeDelivery}
                                  onChange={() => handleCourseDeliveryMethod(c.courseId, true)}
                                  style={{ accentColor: "var(--primary)", cursor: "pointer" }}
                                />
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: "12px" }}>🏠 Home Delivery</div>
                                  <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Direct to your home</div>
                                </div>
                              </div>

                              <div
                                onClick={() => handleCourseDeliveryMethod(c.courseId, false)}
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: "var(--radius-sm)",
                                  border: `1.5px solid ${!opt.needHomeDelivery ? "var(--primary)" : "var(--border)"}`,
                                  background: !opt.needHomeDelivery ? "white" : "transparent",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  transition: "all .15s",
                                }}
                              >
                                <input
                                  type="radio"
                                  name={`deliv_${c.courseId}`}
                                  checked={!opt.needHomeDelivery}
                                  onChange={() => handleCourseDeliveryMethod(c.courseId, false)}
                                  style={{ accentColor: "var(--primary)", cursor: "pointer" }}
                                />
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: "12px" }}>🏛️ Institute Pickup</div>
                                  <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Collect at branch</div>
                                </div>
                              </div>
                            </div>

                            {opt.needHomeDelivery ? (
                              <div style={{ fontSize: "11.5px", color: "#065f46", background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "6px 10px", borderRadius: "6px" }}>
                                ✓ Your study pack will be delivered directly to your registered student delivery address.
                              </div>
                            ) : (
                              <div className="form-group" style={{ margin: 0 }}>
                                <label className="form-label" style={{ fontSize: "11.5px", fontWeight: 700 }}>Select Pickup Institute *</label>
                                <select
                                  className="form-control"
                                  value={opt.deliveryInstituteId}
                                  onChange={(e) => handleCourseInstituteChange(c.courseId, e.target.value)}
                                  style={{ fontSize: "12.5px" }}
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
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Payment Method Selection */}
          <div className="card mb-4">
            <div className="card-header">
              <h2 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>
                3. Select Payment Method
              </h2>
            </div>
            <div className="card-body">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px" }}>
                {PAYMENT_METHODS.map((pm) => (
                  <div
                    key={pm.id}
                    onClick={() => setPaymentMethod(pm.id)}
                    style={{
                      border: `1.5px solid ${paymentMethod === pm.id ? "var(--primary)" : "var(--border)"}`,
                      borderRadius: "var(--radius-sm)",
                      padding: "14px",
                      background: paymentMethod === pm.id ? "var(--primary-light)" : "var(--card-bg)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        checked={paymentMethod === pm.id}
                        onChange={() => setPaymentMethod(pm.id)}
                        style={{ cursor: "pointer" }}
                      />
                      <strong style={{ fontSize: "13.5px" }}>{pm.label}</strong>
                    </div>
                    <p style={{ fontSize: "11.5px", color: "var(--text-muted)", margin: "4px 0 0 20px" }}>
                      {pm.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Step 1 Action Bar */}
          <div className="card">
            <div className="card-body flex justify-between items-center" style={{ padding: "18px 24px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  Selected Combo: <strong>Code {selectedCombination?.code || "-"}</strong>
                </div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: (enrollmentProduct?.is_free || Number(enrollmentProduct?.price) === 0) ? "#10b981" : "var(--primary)" }}>
                  Total: {(enrollmentProduct?.is_free || Number(enrollmentProduct?.price) === 0) ? "FREE" : `Rs. ${(enrollmentProduct ? enrollmentProduct.price : selectedCombination?.totalPrice)?.toLocaleString() || 0}`}
                </div>
              </div>

              <button
                type="button"
                className={`btn ${(enrollmentProduct?.is_free || Number(enrollmentProduct?.price) === 0) ? "btn-success" : "btn-primary"}`}
                style={{ padding: "10px 28px", fontSize: "14px", fontWeight: 700 }}
                onClick={handleInitiateEnroll}
                disabled={enrolling || !selectedComboId}
                id="btn-initiate-enroll"
              >
                {enrolling ? (
                  <>
                    <span className="spinner" style={{ marginRight: "8px" }} />
                    Initiating Enrollment...
                  </>
                ) : (
                  (enrollmentProduct?.is_free || Number(enrollmentProduct?.price) === 0)
                    ? `Claim Free Enrollment (Combo ${selectedCombination?.code || ""})`
                    : `Enroll in Combo ${selectedCombination?.code || ""}`
                )}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: DEDICATED SLIP UPLOAD STEP (Calls /api/payment/evidence/upload)    */}
      {/* ========================================================================= */}
      {step === 2 && (
        <form onSubmit={handleUploadEvidence} className="card" style={{ maxWidth: "680px", margin: "0 auto" }}>
          <div className="card-header">
            <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--primary)" }}>
              Step 2: Upload Payment Slip
            </h2>
            <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", margin: 0 }}>
              Your enrollment has been initialized (Order #{enrollData?.orderId?.slice(0, 8)}). Please submit your bank payment evidence to finalize.
            </p>
          </div>

          <div className="card-body">
            {/* Enrollment Summary */}
            <div
              style={{
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)",
                padding: "14px",
                marginBottom: "20px",
                fontSize: "13px",
              }}
            >
              <div className="flex justify-between mb-1">
                <span style={{ color: "var(--text-muted)" }}>Package</span>
                <strong>{pkg.name}</strong>
              </div>
              <div className="flex justify-between mb-1">
                <span style={{ color: "var(--text-muted)" }}>Combination Code</span>
                <strong style={{ color: "var(--primary)" }}>Combo {selectedCombination?.code}</strong>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "var(--text-muted)" }}>Payable Amount</span>
                <strong style={{ color: "var(--primary)", fontSize: "15px" }}>
                  Rs. {selectedCombination?.totalPrice?.toLocaleString()}
                </strong>
              </div>
            </div>

            {/* Institute Bank Details Box */}
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "var(--radius-sm)",
                padding: "14px 16px",
                marginBottom: "20px",
                fontSize: "13px",
              }}
            >
              <strong style={{ color: "#166534", display: "block", marginBottom: "6px" }}>
                ðŸ¦ Bank Deposit / Transfer Details:
              </strong>
              <div className="grid grid-2" style={{ gap: "6px", color: "#14532d" }}>
                <div><strong>Bank:</strong> Commercial Bank</div>
                <div><strong>Account No:</strong> 8009234182</div>
                <div><strong>Account Name:</strong> AK Combined Mathematics</div>
                <div><strong>Branch:</strong> Colombo Main</div>
              </div>
            </div>

            <div className="form-group mb-3">
              <label className="form-label">Payment Reference Number *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Bank transaction reference / slip no."
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                required
                id="input-reference-no"
              />
            </div>

            <div className="form-group mb-3">
              <label className="form-label">Upload Slip / Receipt Image *</label>
              <input
                type="file"
                accept="image/*,.pdf"
                className="form-control"
                onChange={handleSlipChange}
                required
                id="input-slip-file"
              />
              <span style={{ fontSize: "11.5px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                Supported: JPG, PNG, PDF. Max 5MB.
              </span>
            </div>

            {slipPreview && (
              <div style={{ marginTop: "12px", marginBottom: "16px" }}>
                <label className="form-label">Slip Preview:</label>
                <div style={{ maxWidth: "260px", maxHeight: "180px", overflow: "hidden", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                  <img src={slipPreview} alt="Slip Preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mt-4" style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(1)}
                disabled={uploadingSlip}
              >
                â† Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={uploadingSlip}
                id="btn-upload-slip"
              >
                {uploadingSlip ? (
                  <>
                    <span className="spinner" style={{ marginRight: "8px" }} />
                    Uploading Evidence...
                  </>
                ) : (
                  "Upload Payment Evidence"
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: SUCCESS CONFIRMATION & ENDPOINT TESTING INSPECTOR                 */}
      {/* ========================================================================= */}
      {step === 3 && (
        <div style={{ maxWidth: "760px", margin: "20px auto" }}>
          <div className="card text-center" style={{ padding: "36px 28px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                background: "#def7ec",
                color: "#0e9f6e",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                margin: "0 auto 16px",
              }}
            >
              ✓
            </div>
            <h2 style={{ fontWeight: 800, fontSize: "22px", marginBottom: "6px" }}>
              Package Enrollment Endpoint Executed!
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "13.5px", marginBottom: "20px" }}>
              Your enrollment for <strong>{pkg.name}</strong> (Combination {selectedCombination?.code}) has been processed.
            </p>

            {cancelMessage && (
              <div className="alert alert-warning mb-3 text-left">
                ⚠️ {cancelMessage}
              </div>
            )}

            {/* Summary Box */}
            <div
              style={{
                background: "var(--bg)",
                padding: "16px",
                borderRadius: "var(--radius-sm)",
                textAlign: "left",
                marginBottom: "20px",
                fontSize: "13px",
              }}
            >
              <div className="flex justify-between mb-2">
                <span style={{ color: "var(--text-muted)" }}>Order Reference</span>
                <strong style={{ fontFamily: "monospace" }}>{enrollData?.orderId || "-"}</strong>
              </div>
              <div className="flex justify-between mb-2">
                <span style={{ color: "var(--text-muted)" }}>Package</span>
                <strong>{pkg.name}</strong>
              </div>
              <div className="flex justify-between mb-2">
                <span style={{ color: "var(--text-muted)" }}>Combination</span>
                <strong style={{ color: "var(--primary)" }}>Code: {selectedCombination?.code}</strong>
              </div>
              <div className="flex justify-between mb-2">
                <span style={{ color: "var(--text-muted)" }}>Payment Method</span>
                <strong>{paymentMethod}</strong>
              </div>
              {referenceNo && (
                <div className="flex justify-between mb-2">
                  <span style={{ color: "var(--text-muted)" }}>Reference No</span>
                  <strong>{referenceNo}</strong>
                </div>
              )}
              <div className="flex justify-between" style={{ borderTop: "1px solid var(--border)", paddingTop: "10px", marginTop: "10px" }}>
                <span style={{ fontWeight: 700 }}>Total Amount</span>
                <span style={{ fontWeight: 800, fontSize: "16px", color: "var(--primary)" }}>
                  Rs. {selectedCombination?.totalPrice?.toLocaleString()}
                </span>
              </div>
            </div>

            {/* API Endpoint Inspector Box */}
            {lastApiCall && (
              <div
                style={{
                  background: "#0f172a",
                  color: "#e2e8f0",
                  borderRadius: "8px",
                  padding: "18px 20px",
                  marginBottom: "24px",
                  fontSize: "12.5px",
                  textAlign: "left",
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
            <div className="flex justify-center gap-3 flex-wrap">
              {enrollData?.orderId && !cancelMessage && (
                <button
                  className="btn btn-danger"
                  onClick={handleCancelPackageTest}
                  disabled={cancelling}
                  id="btn-test-cancel-package-enroll"
                >
                  {cancelling ? <span className="spinner" /> : "Test Cancel Endpoint (POST /api/enroll/cancel)"}
                </button>
              )}

              <button className="btn btn-secondary" onClick={() => navigate("/payments/package")}>
                View in Package Requests
              </button>
              <button className="btn btn-primary" onClick={() => navigate("/packages")}>
                Test Another Package
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
