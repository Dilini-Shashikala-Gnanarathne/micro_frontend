import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCourses, getBatches, createPackage } from "../api";
import toast from "react-hot-toast";

const IDENTIFIERS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
  "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
  "U", "V", "W", "X", "Y", "Z"
];

export default function CreatePackagePage() {
  const navigate = useNavigate();

  // Loading states
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Reference data
  const [availableCourses, setAvailableCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courseSearch, setCourseSearch] = useState("");

  // Form state
  const [form, setForm] = useState({
    name: "",
    description: "",
    medium: "SINHALA",
    batchId: "",
    status: "ACTIVE",
    isFree: false,
    isFeatured: false,
    imageUrl: "",
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  // Selected course IDs (ordered array)
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);

  // Combinations array
  // Each combination: { id: string, name: string, items: [{ id: courseId, price: number }] }
  const [combinations, setCombinations] = useState([
    {
      id: "combo-1",
      name: "Full Package Combination",
      items: [],
    },
  ]);

  // Load batches and courses
  useEffect(() => {
    async function loadInitialData() {
      setLoadingData(true);
      try {
        const [batchesRes, coursesRes] = await Promise.all([
          getBatches().catch(() => ({ data: { data: [] } })),
          getCourses({ size: 100, status: "ACTIVE" }).catch(() => ({ data: { data: [] } })),
        ]);

        const batchList = batchesRes.data?.data || [];
        setBatches(batchList);
        if (batchList.length > 0) {
          setForm((f) => ({ ...f, batchId: batchList[0].id }));
        }

        const rawCourses = coursesRes.data?.data;
        const courseList = Array.isArray(rawCourses?.items)
          ? rawCourses.items
          : Array.isArray(rawCourses?.data)
          ? rawCourses.data
          : Array.isArray(rawCourses)
          ? rawCourses
          : [];
        setAvailableCourses(courseList);
      } catch (err) {
        toast.error("Failed to load initial form data.");
      } finally {
        setLoadingData(false);
      }
    }
    loadInitialData();
  }, []);

  // Handle image file selection
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image file size should not exceed 5MB.");
        return;
      }
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  };

  // Toggle course in package
  const handleToggleCourse = (courseId) => {
    let nextSelected;
    if (selectedCourseIds.includes(courseId)) {
      nextSelected = selectedCourseIds.filter((id) => id !== courseId);
    } else {
      if (selectedCourseIds.length >= 26) {
        toast.error("A package can contain a maximum of 26 courses (A-Z).");
        return;
      }
      nextSelected = [...selectedCourseIds, courseId];
    }
    setSelectedCourseIds(nextSelected);

    // Update combinations to prune removed courses
    setCombinations((prev) =>
      prev.map((c) => ({
        ...c,
        items: c.items.filter((item) => nextSelected.includes(item.id)),
      }))
    );
  };

  // Select all or quick-populate all selected into combo
  const handleQuickAddAllCombo = () => {
    if (selectedCourseIds.length === 0) {
      toast.error("Please select at least one course for the package first.");
      return;
    }
    const newCombo = {
      id: "combo-" + Date.now(),
      name: `Combo ${combinations.length + 1}`,
      items: selectedCourseIds.map((cId) => {
        const cObj = availableCourses.find((c) => c.id === cId);
        return {
          id: cId,
          price: cObj ? (cObj.croppedPrice || cObj.originalPrice || 0) : 0,
        };
      }),
    };
    setCombinations((prev) => [...prev, newCombo]);
    toast.success("Added new combination with all selected courses!");
  };

  // Add empty combination
  const handleAddCombination = () => {
    if (selectedCourseIds.length === 0) {
      toast.error("Please select at least one course first.");
      return;
    }
    setCombinations((prev) => [
      ...prev,
      {
        id: "combo-" + Date.now(),
        name: `Combination #${prev.length + 1}`,
        items: selectedCourseIds.slice(0, 1).map((cId) => {
          const cObj = availableCourses.find((c) => c.id === cId);
          return {
            id: cId,
            price: cObj ? (cObj.croppedPrice || cObj.originalPrice || 0) : 0,
          };
        }),
      },
    ]);
  };

  // Remove combination
  const handleRemoveCombination = (index) => {
    if (combinations.length <= 1) {
      toast.error("At least one combination is required.");
      return;
    }
    setCombinations((prev) => prev.filter((_, i) => i !== index));
  };

  // Toggle a course inside a specific combination
  const handleToggleCourseInCombo = (comboIndex, courseId) => {
    setCombinations((prev) => {
      const next = [...prev];
      const targetCombo = { ...next[comboIndex] };
      const exists = targetCombo.items.some((it) => it.id === courseId);

      if (exists) {
        if (targetCombo.items.length <= 1) {
          toast.error("Each combination must have at least one course.");
          return prev;
        }
        targetCombo.items = targetCombo.items.filter((it) => it.id !== courseId);
      } else {
        if (targetCombo.items.length >= 10) {
          toast.error("A single combination cannot contain more than 10 courses.");
          return prev;
        }
        const cObj = availableCourses.find((c) => c.id === courseId);
        const defaultPrice = cObj ? (cObj.croppedPrice || cObj.originalPrice || 0) : 0;
        targetCombo.items = [...targetCombo.items, { id: courseId, price: defaultPrice }];
      }
      next[comboIndex] = targetCombo;
      return next;
    });
  };

  // Change price of course in combination
  const handleItemPriceChange = (comboIndex, courseId, newPrice) => {
    const val = Math.max(0, parseFloat(newPrice) || 0);
    setCombinations((prev) => {
      const next = [...prev];
      const targetCombo = { ...next[comboIndex] };
      targetCombo.items = targetCombo.items.map((it) =>
        it.id === courseId ? { ...it, price: val } : it
      );
      next[comboIndex] = targetCombo;
      return next;
    });
  };

  // Compute code letters for a combination (e.g. "AB")
  const getCombinationCode = (items) => {
    const letters = items
      .map((it) => {
        const idx = selectedCourseIds.indexOf(it.id);
        return idx !== -1 ? IDENTIFIERS[idx] : "";
      })
      .filter(Boolean)
      .sort()
      .join("");
    return letters || "-";
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validations
    if (!form.name.trim()) {
      toast.error("Package name is required.");
      return;
    }
    if (form.name.trim().length > 50) {
      toast.error("Package name must be at most 50 characters.");
      return;
    }
    if (!form.batchId) {
      toast.error("Please select a batch.");
      return;
    }
    if (selectedCourseIds.length === 0) {
      toast.error("Please select at least one course to include in the package.");
      return;
    }
    if (combinations.length === 0) {
      toast.error("At least one combination is required.");
      return;
    }

    // Validate each combination
    for (let i = 0; i < combinations.length; i++) {
      const c = combinations[i];
      if (!c.items || c.items.length === 0) {
        toast.error(`Combination #${i + 1} has no courses selected.`);
        return;
      }
      for (const item of c.items) {
        if (item.price === undefined || item.price === null || isNaN(item.price) || item.price < 0) {
          toast.error(`Invalid price in combination #${i + 1}.`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description?.trim() || null,
        medium: form.medium,
        status: form.status,
        isFree: Boolean(form.isFree),
        isFeatured: Boolean(form.isFeatured),
        batchId: form.batchId,
        courseIds: selectedCourseIds,
        imageUrl: form.imageUrl?.trim() || "",
        combinations: combinations.map((c) =>
          c.items.map((it) => ({
            id: it.id,
            price: Number(it.price),
          }))
        ),
      };

      const formData = new FormData();
      formData.append("data", JSON.stringify(payload));
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const res = await createPackage(formData);
      toast.success(res.data?.message || "Package created successfully!");
      navigate("/packages");
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to create package";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter courses for course selection
  const filteredCourses = availableCourses.filter((c) => {
    const q = courseSearch.toLowerCase();
    return (
      c.name?.toLowerCase().includes(q) ||
      c.code?.toLowerCase().includes(q) ||
      c.batch?.name?.toLowerCase().includes(q)
    );
  });

  if (loadingData) {
    return (
      <div className="page-loader" style={{ minHeight: "300px" }}>
        <div className="spinner spinner-dark" />
        <span style={{ marginLeft: "12px", color: "var(--text-secondary)" }}>
          Loading course catalog and batches...
        </span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1080px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* Top Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <button
            type="button"
            className="btn btn-secondary btn-sm mb-2"
            onClick={() => navigate("/packages")}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            ← Back to Packages
          </button>
          <h2 style={{ fontWeight: 800, fontSize: "20px", color: "var(--text-primary)" }}>
            Create Course Package
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
            Bundle courses together and set up multi-tier pricing combinations
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/packages")}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
            id="btn-submit-package"
          >
            {submitting ? (
              <>
                <span className="spinner" style={{ marginRight: "8px" }} />
                Creating Package...
              </>
            ) : (
              "Save Package"
            )}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* SECTION 1: Package Basic Information */}
        <div className="card mb-4">
          <div className="card-header">
            <h3 style={{ fontSize: "15px", fontWeight: 700 }}>1. Package Information</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-2" style={{ gap: "16px" }}>
              <div className="form-group">
                <label className="form-label">Package Name * (Max 50 characters)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Combined Maths + Physics 2026 A/L"
                  maxLength={50}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  id="pkg-name-input"
                />
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {form.name.length} / 50 characters
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Academic Batch *</label>
                <select
                  className="form-control"
                  value={form.batchId}
                  onChange={(e) => setForm({ ...form, batchId: e.target.value })}
                  required
                  id="pkg-batch-select"
                >
                  <option value="">-- Select Target Batch --</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Language / Medium *</label>
                <select
                  className="form-control"
                  value={form.medium}
                  onChange={(e) => setForm({ ...form, medium: e.target.value })}
                  required
                  id="pkg-medium-select"
                >
                  <option value="SINHALA">Sinhala</option>
                  <option value="ENGLISH">English</option>
                  <option value="GENERAL">General</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Publication Status</label>
                <select
                  className="form-control"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  id="pkg-status-select"
                >
                  <option value="ACTIVE">ACTIVE (Published)</option>
                  <option value="DRAFT">DRAFT (Hidden)</option>
                  <option value="DEACTIVE">DEACTIVE (Disabled)</option>
                </select>
              </div>
            </div>

            <div className="form-group mt-3">
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                rows={3}
                placeholder="Describe what is covered in this package, benefits, tutoring materials, etc."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                id="pkg-desc-input"
              />
            </div>

            <div className="flex gap-4 mt-3" style={{ background: "var(--bg)", padding: "12px", borderRadius: "var(--radius-sm)" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13.5px" }}>
                <input
                  type="checkbox"
                  checked={form.isFeatured}
                  onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
                  id="chk-is-featured"
                />
                <span style={{ fontWeight: 600 }}>Featured Package</span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  (Highlight on student storefront)
                </span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13.5px" }}>
                <input
                  type="checkbox"
                  checked={form.isFree}
                  onChange={(e) => setForm({ ...form, isFree: e.target.checked })}
                  id="chk-is-free"
                />
                <span style={{ fontWeight: 600 }}>Free Package</span>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                  (Enables 100% free enrollment)
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 2: Thumbnail Image */}
        <div className="card mb-4">
          <div className="card-header">
            <h3 style={{ fontSize: "15px", fontWeight: 700 }}>2. Package Thumbnail & Cover</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-2" style={{ gap: "20px", alignItems: "start" }}>
              <div>
                <label className="form-label">Upload Cover Image</label>
                <input
                  type="file"
                  accept="image/*"
                  className="form-control"
                  onChange={handleImageChange}
                  id="pkg-image-file"
                />
                <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>
                  Supported formats: JPG, PNG, WEBP. Max 5MB.
                </span>

                <div className="mt-3">
                  <label className="form-label">Or Image URL (Fallback)</label>
                  <input
                    type="url"
                    className="form-control"
                    placeholder="https://example.com/package-thumb.jpg"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    id="pkg-image-url"
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Preview</label>
                <div
                  style={{
                    width: "100%",
                    height: "140px",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--bg)",
                    border: "1px dashed var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {imagePreview || form.imageUrl ? (
                    <img
                      src={imagePreview || form.imageUrl}
                      alt="Thumbnail Preview"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                      No image uploaded
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Select Package Courses */}
        <div className="card mb-4">
          <div className="card-header flex justify-between items-center">
            <div>
              <h3 style={{ fontSize: "15px", fontWeight: 700 }}>3. Select Bundle Courses</h3>
              <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", margin: 0 }}>
                Choose the individual courses that belong to this package ({selectedCourseIds.length} selected)
              </p>
            </div>
            <div style={{ maxWidth: "260px" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search course name or code..."
                value={courseSearch}
                onChange={(e) => setCourseSearch(e.target.value)}
                style={{ fontSize: "12px", padding: "6px 10px" }}
              />
            </div>
          </div>
          <div className="card-body" style={{ maxHeight: "340px", overflowY: "auto", padding: "12px" }}>
            {filteredCourses.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px" }}>
                No active courses found matching your search.
              </p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: "10px" }}>
                {filteredCourses.map((c) => {
                  const isSelected = selectedCourseIds.includes(c.id);
                  const identifierIndex = selectedCourseIds.indexOf(c.id);
                  const identifierLetter = identifierIndex !== -1 ? IDENTIFIERS[identifierIndex] : null;

                  return (
                    <div
                      key={c.id}
                      onClick={() => handleToggleCourse(c.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 12px",
                        border: `1.5px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                        borderRadius: "var(--radius-sm)",
                        background: isSelected ? "var(--primary-light)" : "var(--card-bg)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // handled by parent div
                        style={{ cursor: "pointer" }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {identifierLetter && (
                            <span
                              style={{
                                display: "inline-block",
                                background: "var(--primary)",
                                color: "#fff",
                                fontSize: "10px",
                                fontWeight: 800,
                                borderRadius: "3px",
                                padding: "1px 5px",
                              }}
                            >
                              {identifierLetter}
                            </span>
                          )}
                          <span
                            style={{
                              fontWeight: 600,
                              fontSize: "13px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              color: isSelected ? "var(--primary-dark)" : "var(--text-primary)",
                            }}
                          >
                            {c.name}
                          </span>
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                          {c.code} · Rs. {(c.croppedPrice || c.originalPrice || 0).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 4: Package Combinations & Pricing */}
        <div className="card mb-4">
          <div className="card-header flex justify-between items-center">
            <div>
              <h3 style={{ fontSize: "15px", fontWeight: 700 }}>4. Package Combinations & Pricing</h3>
              <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", margin: 0 }}>
                Configure pricing options. Students can choose any valid combination of these courses.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleQuickAddAllCombo}
                disabled={selectedCourseIds.length === 0}
              >
                + Quick Full Combo
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleAddCombination}
                disabled={selectedCourseIds.length === 0}
                id="btn-add-combo"
              >
                + Add Custom Combo
              </button>
            </div>
          </div>

          <div className="card-body">
            {selectedCourseIds.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                <p>Please select at least one course in step 3 to configure combinations.</p>
              </div>
            ) : combinations.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                <p>No combinations configured yet.</p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm mt-2"
                  onClick={handleQuickAddAllCombo}
                >
                  Create Default Combination
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {combinations.map((combo, cIdx) => {
                  const comboCode = getCombinationCode(combo.items);
                  const totalPrice = combo.items.reduce((sum, it) => sum + (it.price || 0), 0);

                  // Calculate regular total price without package
                  const regularTotal = combo.items.reduce((sum, it) => {
                    const c = availableCourses.find((course) => course.id === it.id);
                    return sum + (c ? (c.croppedPrice || c.originalPrice || 0) : 0);
                  }, 0);

                  const savings = regularTotal - totalPrice;

                  return (
                    <div
                      key={combo.id || cIdx}
                      style={{
                        border: "1.5px solid var(--border)",
                        borderRadius: "var(--radius)",
                        padding: "16px",
                        background: "var(--card-bg)",
                      }}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <span
                            style={{
                              background: "#1e3a8a",
                              color: "#fff",
                              fontWeight: 700,
                              fontSize: "12px",
                              padding: "2px 8px",
                              borderRadius: "4px",
                            }}
                          >
                            Code: {comboCode}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: "14px" }}>
                            Combination #{cIdx + 1}
                          </span>
                        </div>
                        {combinations.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ color: "#c81e1e", borderColor: "#fecaca", padding: "3px 8px", fontSize: "11px" }}
                            onClick={() => handleRemoveCombination(cIdx)}
                          >
                            Remove Combo
                          </button>
                        )}
                      </div>

                      {/* Course Selection Checklist for this Combo */}
                      <div className="mb-3">
                        <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                          Courses included in this combination:
                        </label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                          {selectedCourseIds.map((cId) => {
                            const cObj = availableCourses.find((c) => c.id === cId);
                            const inCombo = combo.items.some((it) => it.id === cId);
                            const letterIdx = selectedCourseIds.indexOf(cId);
                            const letter = letterIdx !== -1 ? IDENTIFIERS[letterIdx] : "";

                            return (
                              <button
                                key={cId}
                                type="button"
                                onClick={() => handleToggleCourseInCombo(cIdx, cId)}
                                style={{
                                  padding: "4px 10px",
                                  fontSize: "12px",
                                  borderRadius: "4px",
                                  border: `1px solid ${inCombo ? "var(--primary)" : "var(--border)"}`,
                                  background: inCombo ? "var(--primary-light)" : "var(--bg)",
                                  color: inCombo ? "var(--primary-dark)" : "var(--text-secondary)",
                                  fontWeight: inCombo ? 600 : 400,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                <strong>[{letter}]</strong> {cObj?.name || cId}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Itemized Pricing Table */}
                      <table className="table" style={{ margin: 0, fontSize: "12.5px" }}>
                        <thead>
                          <tr>
                            <th>Identifier</th>
                            <th>Course Name</th>
                            <th>Standard Price</th>
                            <th style={{ width: "160px" }}>Combo Price (LKR) *</th>
                          </tr>
                        </thead>
                        <tbody>
                          {combo.items.map((item) => {
                            const cObj = availableCourses.find((c) => c.id === item.id);
                            const letterIdx = selectedCourseIds.indexOf(item.id);
                            const letter = letterIdx !== -1 ? IDENTIFIERS[letterIdx] : "-";
                            const standardPrice = cObj ? (cObj.croppedPrice || cObj.originalPrice || 0) : 0;

                            return (
                              <tr key={item.id}>
                                <td>
                                  <span
                                    style={{
                                      display: "inline-block",
                                      background: "var(--primary)",
                                      color: "#fff",
                                      fontSize: "11px",
                                      fontWeight: 800,
                                      borderRadius: "3px",
                                      padding: "1px 6px",
                                    }}
                                  >
                                    {letter}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 600 }}>{cObj?.name || item.id}</td>
                                <td style={{ color: "var(--text-muted)" }}>
                                  Rs. {standardPrice.toLocaleString()}
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    min="0"
                                    step="50"
                                    className="form-control"
                                    style={{ padding: "4px 8px", fontSize: "13px" }}
                                    value={item.price}
                                    onChange={(e) => handleItemPriceChange(cIdx, item.id, e.target.value)}
                                    required
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Combo Pricing Summary */}
                      <div
                        className="flex justify-between items-center mt-3"
                        style={{
                          background: "var(--bg)",
                          padding: "10px 14px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "13px",
                        }}
                      >
                        <div style={{ color: "var(--text-secondary)" }}>
                          Standard Subtotal: <strong>Rs. {regularTotal.toLocaleString()}</strong>
                          {savings > 0 && (
                            <span style={{ marginLeft: "10px", color: "#0e9f6e", fontWeight: 600 }}>
                              (Student Saves Rs. {savings.toLocaleString()})
                            </span>
                          )}
                        </div>
                        <div>
                          <span style={{ color: "var(--text-muted)", marginRight: "8px" }}>Combo Total:</span>
                          <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--primary)" }}>
                            Rs. {totalPrice.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate("/packages")}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            id="btn-bottom-submit"
          >
            {submitting ? "Saving Package..." : "Create Package"}
          </button>
        </div>
      </form>
    </div>
  );
}
