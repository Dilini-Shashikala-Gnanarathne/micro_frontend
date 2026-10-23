import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPackageById, enrollPackage, uploadPaymentSlip } from "../api";
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

    setEnrolling(true);
    try {
      const res = await enrollPackage({
        packageCombinationId: selectedComboId,
        paymentMethod: paymentMethod,
      });

      const data = res.data?.data || res.data;
      setEnrollData(data);
      toast.success(res.data?.message || "Package enrollment created successfully!");

      // If DIGITAL: Move to step 2 to upload evidence
      if (paymentMethod === "DIGITAL") {
        setStep(2);
      } else {
        // ONLINE, MANUAL, PAY_LATER: Move straight to completion
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
          ← Back to Packages
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
          <span>→</span>
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
          <span>→</span>
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
              <span style={{ fontSize: "32px" }}>📦</span>
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
              Includes {pkg.courses?.length || 0} courses · {combinations.length} combinations available
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

          {/* Payment Method Selection */}
          <div className="card mb-4">
            <div className="card-header">
              <h2 style={{ fontSize: "15px", fontWeight: 700, margin: 0 }}>
                2. Select Payment Method
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
                <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--primary)" }}>
                  Total: Rs. {selectedCombination?.totalPrice?.toLocaleString() || 0}
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
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
                  `Enroll in Combo ${selectedCombination?.code || ""}`
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
                🏦 Bank Deposit / Transfer Details:
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
                ← Back
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
      {/* STEP 3: SUCCESS CONFIRMATION                                              */}
      {/* ========================================================================= */}
      {step === 3 && (
        <div style={{ maxWidth: "640px", margin: "20px auto" }}>
          <div className="card text-center" style={{ padding: "40px 28px" }}>
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
              Enrollment Successful!
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "13.5px", marginBottom: "20px" }}>
              Your enrollment for <strong>{pkg.name}</strong> (Combination {selectedCombination?.code}) has been received.
            </p>

            <div
              style={{
                background: "var(--bg)",
                padding: "16px",
                borderRadius: "var(--radius-sm)",
                textAlign: "left",
                marginBottom: "24px",
                fontSize: "13px",
              }}
            >
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

            <div className="flex justify-center gap-3">
              <button className="btn btn-secondary" onClick={() => navigate("/dashboard")}>
                Go to Dashboard
              </button>
              <button className="btn btn-primary" onClick={() => navigate("/payments/package")}>
                View My Package Requests
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
