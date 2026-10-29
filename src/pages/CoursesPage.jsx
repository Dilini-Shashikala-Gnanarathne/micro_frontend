import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  updateCourseStatus,
  deleteCourse,
  getBatches,
} from "../api";
import toast from "react-hot-toast";

const STATUS_BADGE = {
  ACTIVE: "badge-success",
  DEACTIVE: "badge-danger",
  INACTIVE: "badge-gray",
  DRAFT: "badge-warning",
};

const MEDIUM_OPTIONS = ["SINHALA", "ENGLISH", "GENERAL"];
const COURSE_TYPE_OPTIONS = ["MONTHLY_CLASS", "LESSON_PACK", "FREE_CLASS", "EXTRA_CLASS"];
const EXPIRY_TYPE_OPTIONS = ["NONE", "RELATIVE", "FIXED"];
const STATUS_OPTIONS = ["ACTIVE", "DEACTIVE", "DRAFT"];

const INITIAL_FORM = {
  code: "",
  name: "",
  description: "",
  note: "",
  metaTags: "",
  medium: "SINHALA",
  courseType: "MONTHLY_CLASS",
  batchId: "",
  startDate: new Date().toISOString().split("T")[0],
  isFree: false,
  hasTute: false,
  hasPhysicalStudentFreeAccess: false,
  isFeatured: false,
  originalPrice: 3500,
  croppedPrice: 3500,
  defaultWatchTimeLimit: 120,
  expiryType: "NONE",
  expiryDays: 30,
  expiryDate: "",
  imageUrl: "placeholder",
};

export default function CoursesPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  // Data states
  const [courses, setCourses] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters state
  const [filters, setFilters] = useState({
    name: "",
    code: "",
    medium: "",
    courseType: "",
    status: "",
    isFree: "",
    isFeatured: "",
    startDate: "",
    page: 1,
    size: 10,
    sortBy: "created_at",
    sortDir: "DESC",
  });

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Details Modal state
  const [viewingCourse, setViewingCourse] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Delete Modal state
  const [deletingCourse, setDeletingCourse] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch batches for dropdown
  useEffect(() => {
    if (isAdmin) {
      getBatches()
        .then((res) => {
          const list = res.data?.data || res.data || [];
          setBatches(Array.isArray(list) ? list : []);
        })
        .catch(() => {});
    }
  }, [isAdmin]);

  // Fetch courses with filter
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const cleanParams = { ...filters };
      Object.keys(cleanParams).forEach((k) => {
        if (cleanParams[k] === "" || cleanParams[k] === null || cleanParams[k] === undefined) {
          delete cleanParams[k];
        }
      });

      const res = await getCourses(cleanParams);
      const data = res.data?.data || res.data || {};
      const items = data.items || data.data || (Array.isArray(data) ? data : []);
      const totalCount = data.total ?? data.totalItems ?? items.length;

      setCourses(items);
      setTotal(totalCount);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch courses");
      setCourses([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleFilterChange = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val, page: 1 }));
  };

  const handleResetFilters = () => {
    setFilters({
      name: "",
      code: "",
      medium: "",
      courseType: "",
      status: "",
      isFree: "",
      isFeatured: "",
      startDate: "",
      page: 1,
      size: 10,
      sortBy: "created_at",
      sortDir: "DESC",
    });
  };

  // Open Create Modal
  const openCreateModal = () => {
    setIsEditMode(false);
    setEditingId(null);
    setFormData({
      ...INITIAL_FORM,
      batchId: batches[0]?.id || "",
    });
    setImageFile(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = async (courseId) => {
    try {
      setLoading(true);
      const res = await getCourseById(courseId);
      const c = res.data?.data || res.data || {};

      setIsEditMode(true);
      setEditingId(courseId);
      setFormData({
        id: c.id,
        code: c.code || "",
        name: c.name || "",
        description: c.description || "",
        note: c.note || "",
        metaTags: c.meta_tags || c.metaTags || "",
        medium: c.medium || "SINHALA",
        courseType: c.course_type || c.courseType || "MONTHLY_CLASS",
        batchId: c.batch_id || c.batchId || "",
        startDate: (c.start_date || c.startDate || "").split("T")[0] || "",
        isFree: Boolean(Number(c.is_free ?? c.isFree)),
        hasTute: Boolean(Number(c.has_tute ?? c.hasTute)),
        hasPhysicalStudentFreeAccess: Boolean(Number(c.has_physical_student_free_access ?? c.hasPhysicalStudentFreeAccess)),
        isFeatured: Boolean(Number(c.is_featured ?? c.isFeatured)),
        originalPrice: Number(c.original_price ?? c.originalPrice ?? 0),
        croppedPrice: Number(c.cropped_price ?? c.croppedPrice ?? 0),
        defaultWatchTimeLimit: c.default_watch_time_limit ? Number(c.default_watch_time_limit) : 120,
        expiryType: c.expiry_type || c.expiryType || "NONE",
        expiryDays: c.expiry_days ? Number(c.expiry_days) : 30,
        expiryDate: (c.expiry_date || c.expiryDate || "").split("T")[0] || "",
        imageUrl: c.image_url || c.imageUrl || "",
      });
      setImagePreview(c.image_url || c.imageUrl || null);
      setImageFile(null);
      setIsModalOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load course details for edit");
    } finally {
      setLoading(false);
    }
  };

  // Open Details Modal
  const openViewModal = async (courseId) => {
    setLoadingDetails(true);
    setViewingCourse(null);
    try {
      const res = await getCourseById(courseId);
      setViewingCourse(res.data?.data || res.data || {});
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load course details");
    } finally {
      setLoadingDetails(false);
    }
  };

  // Image Selection
  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Submit Create or Update
  const handleSubmitForm = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) return toast.error("Course name is required.");
    if (!formData.code.trim()) return toast.error("Course code is required.");
    if (!formData.startDate) return toast.error("Start date is required.");
    if (!isEditMode && !imageFile) return toast.error("Course thumbnail image is required.");

    setSubmitting(true);
    try {
      const payloadData = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        note: formData.note?.trim() || null,
        metaTags: formData.metaTags?.trim() || null,
        medium: formData.medium,
        courseType: formData.courseType,
        batchId: formData.batchId || (batches[0]?.id ?? ""),
        startDate: formData.startDate,
        isFree: formData.isFree ? 1 : 0,
        hasTute: formData.hasTute ? 1 : 0,
        hasPhysicalStudentFreeAccess: formData.hasPhysicalStudentFreeAccess ? 1 : 0,
        isFeatured: formData.isFeatured ? 1 : 0,
        originalPrice: formData.isFree ? 0 : Number(formData.originalPrice),
        croppedPrice: formData.isFree ? 0 : Number(formData.croppedPrice),
        defaultWatchTimeLimit: formData.defaultWatchTimeLimit ? Number(formData.defaultWatchTimeLimit) : null,
        expiryType: formData.expiryType,
        expiryDays: formData.expiryType === "RELATIVE" ? Number(formData.expiryDays) : null,
        expiryDate: formData.expiryType === "FIXED" ? formData.expiryDate : null,
        imageUrl: formData.imageUrl || "placeholder",
        parentIds: [],
        physicalClassIds: [],
      };

      if (isEditMode) {
        // Update Course (PUT /api/aca/course)
        await updateCourse({
          id: editingId,
          ...payloadData,
        });
        toast.success("Course updated successfully!");
      } else {
        // Create Course (POST /api/aca/course with multipart)
        const multiData = new FormData();
        multiData.append("data", JSON.stringify(payloadData));
        multiData.append("image", imageFile);

        await createCourse(multiData);
        toast.success("Course created successfully!");
      }

      setIsModalOpen(false);
      fetchCourses();
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Status Change (PUT /api/course/status)
  const handleStatusChange = async (courseId, newStatus) => {
    try {
      await updateCourseStatus(courseId, newStatus);
      toast.success(`Course status updated to ${newStatus}`);
      fetchCourses();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  // Delete Course (DELETE /api/course/{courseId})
  const handleConfirmDelete = async () => {
    if (!deletingCourse) return;
    setDeleting(true);
    try {
      await deleteCourse(deletingCourse.id);
      toast.success(`Course "${deletingCourse.name}" deleted.`);
      setDeletingCourse(null);
      fetchCourses();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete course");
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / filters.size) || 1;

  return (
    <div className="page-content">
      {/* Top Page Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
            Course Management
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13.5 }}>
            Create, view, filter, edit, and control curriculum courses.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {isAdmin && (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => navigate("/manual-enrollment")}
                id="btn-manual-enroll"
              >
                ⚡ Manual Enroll
              </button>
              <button
                className="btn btn-primary"
                onClick={openCreateModal}
                id="btn-create-course"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Create Course
              </button>
            </>
          )}

          {!isAdmin && (
            <button
              className="btn btn-primary"
              onClick={() => navigate("/enroll?type=course")}
              id="btn-new-course-enroll"
            >
              + Enroll in Course
            </button>
          )}
        </div>
      </div>

      {/* Main Filter & Courses Card */}
      <div className="card">
        {/* Comprehensive Filter Toolbar */}
        <div className="card-header" style={{ flexDirection: "column", gap: 14, background: "#fafbfc" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", width: "100%", alignItems: "center" }}>
            {/* Search by Name */}
            <div className="search-input" style={{ flex: 1, minWidth: 200 }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                className="form-control"
                placeholder="Search course name..."
                value={filters.name}
                onChange={(e) => handleFilterChange("name", e.target.value)}
              />
            </div>

            {/* Code */}
            <input
              className="form-control"
              style={{ width: 140 }}
              placeholder="Code (e.g. CM2026)"
              value={filters.code}
              onChange={(e) => handleFilterChange("code", e.target.value)}
            />

            {/* Medium */}
            <select
              className="form-control"
              style={{ width: 130 }}
              value={filters.medium}
              onChange={(e) => handleFilterChange("medium", e.target.value)}
            >
              <option value="">All Mediums</option>
              {MEDIUM_OPTIONS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Course Type */}
            <select
              className="form-control"
              style={{ width: 155 }}
              value={filters.courseType}
              onChange={(e) => handleFilterChange("courseType", e.target.value)}
            >
              <option value="">All Types</option>
              {COURSE_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t.replace("_", " ")}</option>
              ))}
            </select>

            {/* Status */}
            <select
              className="form-control"
              style={{ width: 130 }}
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <option value="">All Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Free filter */}
            <select
              className="form-control"
              style={{ width: 120 }}
              value={filters.isFree}
              onChange={(e) => handleFilterChange("isFree", e.target.value)}
            >
              <option value="">Pricing</option>
              <option value="1">Free Only</option>
              <option value="0">Paid Only</option>
            </select>

            {/* Reset Filter Button */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleResetFilters}
              title="Reset all filters"
              style={{ height: 38 }}
            >
              Reset
            </button>
          </div>
        </div>

        {/* Courses Table */}
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
              <div style={{
                width: 38,
                height: 38,
                border: "3px solid var(--border)",
                borderTopColor: "var(--primary)",
                borderRadius: "50%",
                margin: "0 auto 16px",
                animation: "spin 0.8s linear infinite"
              }} />
              <p style={{ fontWeight: 500 }}>Loading courses...</p>
            </div>
          ) : courses.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center" }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" style={{ width: 44, height: 44, margin: "0 auto 14px", color: "var(--text-muted)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13" />
              </svg>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No courses found</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
                Try adjusting your search criteria or create a new course.
              </p>
              {isAdmin && (
                <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
                  + Create New Course
                </button>
              )}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Code</th>
                  <th>Course Details</th>
                  <th style={{ width: 110 }}>Medium</th>
                  <th style={{ width: 140 }}>Type</th>
                  <th style={{ width: 130 }}>Price (LKR)</th>
                  <th style={{ width: 130 }}>Status</th>
                  <th style={{ width: 90 }}>Tute</th>
                  <th style={{ width: 220, textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((c) => {
                  const isFree = Boolean(Number(c.is_free ?? c.isFree));
                  const hasTute = Boolean(Number(c.has_tute ?? c.hasTute));
                  const status = c.status || "ACTIVE";

                  return (
                    <tr key={c.id}>
                      <td>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "12px", background: "var(--bg)", padding: "3px 6px", borderRadius: 4 }}>
                          {c.code}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {(c.image_url || c.imageUrl) ? (
                            <img
                              src={c.image_url || c.imageUrl}
                              alt=""
                              style={{ width: 38, height: 38, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                              onError={(e) => { e.target.style.display = "none"; }}
                            />
                          ) : (
                            <div style={{ width: 38, height: 38, borderRadius: 6, background: "var(--primary-light)", color: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                              {c.name?.[0]?.toUpperCase() || "C"}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text-primary)" }}>
                              {c.name}
                            </div>
                            <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                              Starts: {(c.start_date || c.startDate || "").split("T")[0] || "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-primary">{c.medium}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>
                          {(c.course_type || c.courseType || "").replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        {isFree ? (
                          <span className="badge badge-success">FREE</span>
                        ) : (
                          <div>
                            <div style={{ fontWeight: 700 }}>
                              {Number(c.cropped_price ?? c.croppedPrice ?? 0).toLocaleString()}
                            </div>
                            {(c.original_price ?? c.originalPrice) && (c.original_price ?? c.originalPrice) !== (c.cropped_price ?? c.croppedPrice) && (
                              <div style={{ fontSize: 11, color: "var(--text-muted)", textDecoration: "line-through" }}>
                                {Number(c.original_price ?? c.originalPrice).toLocaleString()}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        {isAdmin ? (
                          <select
                            value={status}
                            onChange={(e) => handleStatusChange(c.id, e.target.value)}
                            style={{
                              fontSize: 11.5,
                              fontWeight: 600,
                              borderRadius: 14,
                              padding: "2px 8px",
                              border: "1px solid var(--border)",
                              cursor: "pointer",
                              background: status === "ACTIVE" ? "var(--secondary-light)" : status === "DEACTIVE" ? "var(--danger-light)" : "var(--warning-light)",
                              color: status === "ACTIVE" ? "#03543f" : status === "DEACTIVE" ? "#9b1c1c" : "var(--warning)",
                            }}
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="DEACTIVE">DEACTIVE</option>
                            <option value="DRAFT">DRAFT</option>
                          </select>
                        ) : (
                          <span className={`badge ${STATUS_BADGE[status] || "badge-gray"}`}>{status}</span>
                        )}
                      </td>
                      <td>
                        {hasTute ? (
                          <span className="badge badge-success" title="Includes physical material">Yes</span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>No</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openViewModal(c.id)}
                            title="View full details"
                            style={{ padding: "4px 8px" }}
                          >
                            👁
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => openEditModal(c.id)}
                                title="Edit course"
                                style={{ padding: "4px 8px" }}
                              >
                                ✏ Edit
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setDeletingCourse(c)}
                                title="Delete course"
                                style={{ padding: "4px 8px", color: "var(--danger)" }}
                              >
                                🗑
                              </button>
                            </>
                          )}

                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => navigate(`/enroll?type=course&courseId=${c.id}`)}
                            style={{ padding: "4px 10px", fontSize: 12 }}
                          >
                            Enroll
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        {!loading && courses.length > 0 && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Showing {courses.length} of {total} courses
            </span>
            <div className="pagination" style={{ margin: 0 }}>
              <button
                className="page-btn"
                disabled={filters.page === 1}
                onClick={() => handleFilterChange("page", filters.page - 1)}
              >
                ‹
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`page-btn${filters.page === p ? " active" : ""}`}
                  onClick={() => handleFilterChange("page", p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="page-btn"
                disabled={filters.page === totalPages}
                onClick={() => handleFilterChange("page", filters.page + 1)}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE & EDIT COURSE MODAL */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => !submitting && setIsModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {isEditMode ? `Edit Course (${formData.code})` : "Create New Course"}
              </h3>
              <button className="modal-close" onClick={() => !submitting && setIsModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm}>
              <div className="modal-body" style={{ maxHeight: "72vh", overflowY: "auto" }}>
                {/* Basic Info */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Course Code <span>*</span></label>
                    <input
                      className="form-control"
                      placeholder="e.g. CM2026M1"
                      value={formData.code}
                      onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Course Name <span>*</span></label>
                    <input
                      className="form-control"
                      placeholder="e.g. Pure Mathematics 2026 Batch"
                      value={formData.name}
                      onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                      required
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Medium <span>*</span></label>
                    <select
                      className="form-control"
                      value={formData.medium}
                      onChange={(e) => setFormData((p) => ({ ...p, medium: e.target.value }))}
                      disabled={submitting}
                    >
                      {MEDIUM_OPTIONS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Course Type <span>*</span></label>
                    <select
                      className="form-control"
                      value={formData.courseType}
                      onChange={(e) => setFormData((p) => ({ ...p, courseType: e.target.value }))}
                      disabled={submitting}
                    >
                      {COURSE_TYPE_OPTIONS.map((t) => (
                        <option key={t} value={t}>{t.replace("_", " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Batch <span>*</span></label>
                    <select
                      className="form-control"
                      value={formData.batchId}
                      onChange={(e) => setFormData((p) => ({ ...p, batchId: e.target.value }))}
                      disabled={submitting}
                    >
                      {batches.length === 0 ? (
                        <option value="">No Batches Found</option>
                      ) : (
                        batches.map((b) => (
                          <option key={b.id} value={b.id}>{b.name || b.year}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Start Date <span>*</span></label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.startDate}
                      onChange={(e) => setFormData((p) => ({ ...p, startDate: e.target.value }))}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Watch Time Limit (Mins)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="e.g. 180"
                      value={formData.defaultWatchTimeLimit || ""}
                      onChange={(e) => setFormData((p) => ({ ...p, defaultWatchTimeLimit: e.target.value }))}
                      disabled={submitting}
                    />
                  </div>
                </div>

                {/* Pricing & Free Toggle */}
                <div style={{ background: "var(--bg)", padding: 14, borderRadius: 8, marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 20, marginBottom: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={formData.isFree}
                        onChange={(e) => setFormData((p) => ({ ...p, isFree: e.target.checked }))}
                        disabled={submitting}
                      />
                      Is Free Course
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={formData.hasTute}
                        onChange={(e) => setFormData((p) => ({ ...p, hasTute: e.target.checked }))}
                        disabled={submitting}
                      />
                      Includes Physical Tute
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={formData.isFeatured}
                        onChange={(e) => setFormData((p) => ({ ...p, isFeatured: e.target.checked }))}
                        disabled={submitting}
                      />
                      Featured Course
                    </label>
                  </div>

                  {!formData.isFree && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Original Price (LKR)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.originalPrice}
                          onChange={(e) => setFormData((p) => ({ ...p, originalPrice: e.target.value }))}
                          disabled={submitting}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Discounted / Cropped Price (LKR)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.croppedPrice}
                          onChange={(e) => setFormData((p) => ({ ...p, croppedPrice: e.target.value }))}
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Expiry Settings */}
                <div style={{ background: "#f8fafc", padding: 14, borderRadius: 8, marginBottom: 16, border: "1px solid var(--border)" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Access Expiry Settings</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Expiry Type</label>
                      <select
                        className="form-control"
                        value={formData.expiryType}
                        onChange={(e) => setFormData((p) => ({ ...p, expiryType: e.target.value }))}
                        disabled={submitting}
                      >
                        {EXPIRY_TYPE_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>

                    {formData.expiryType === "RELATIVE" && (
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Days After Enrollment</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.expiryDays}
                          onChange={(e) => setFormData((p) => ({ ...p, expiryDays: e.target.value }))}
                          disabled={submitting}
                        />
                      </div>
                    )}

                    {formData.expiryType === "FIXED" && (
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Fixed Expiry Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={formData.expiryDate}
                          onChange={(e) => setFormData((p) => ({ ...p, expiryDate: e.target.value }))}
                          disabled={submitting}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Thumbnail Image */}
                <div className="form-group">
                  <label className="form-label">
                    Course Thumbnail {!isEditMode && <span>*</span>}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    className="form-control"
                    onChange={handleImageChange}
                    disabled={submitting}
                  />
                  {imagePreview && (
                    <div style={{ marginTop: 10 }}>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        style={{ width: 120, height: 75, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border)" }}
                      />
                    </div>
                  )}
                </div>

                {/* Description & Notes */}
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="Brief description of course syllabus..."
                    value={formData.description}
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    disabled={submitting}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Note / Special Instructions</label>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="Instructions for students (e.g. materials needed)..."
                    value={formData.note}
                    onChange={(e) => setFormData((p) => ({ ...p, note: e.target.value }))}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : isEditMode ? "Save Changes" : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW COURSE DETAILS MODAL */}
      {viewingCourse && (
        <div className="modal-overlay" onClick={() => setViewingCourse(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h3 className="modal-title">Course Details</h3>
              <button className="modal-close" onClick={() => setViewingCourse(null)}>✕</button>
            </div>
            <div className="modal-body">
              {(viewingCourse.image_url || viewingCourse.imageUrl) && (
                <img
                  src={viewingCourse.image_url || viewingCourse.imageUrl}
                  alt=""
                  style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 8, marginBottom: 16 }}
                />
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800 }}>{viewingCourse.name}</h2>
                <span className="badge badge-primary">{viewingCourse.code}</span>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 16 }}>
                {viewingCourse.description || "No description provided."}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "var(--bg)", padding: 14, borderRadius: 8, fontSize: 13 }}>
                <div><strong>Medium:</strong> {viewingCourse.medium}</div>
                <div><strong>Type:</strong> {(viewingCourse.course_type || viewingCourse.courseType || "").replace("_", " ")}</div>
                <div><strong>Status:</strong> {viewingCourse.status}</div>
                <div><strong>Start Date:</strong> {(viewingCourse.start_date || viewingCourse.startDate || "").split("T")[0]}</div>
                <div><strong>Price:</strong> LKR {Number(viewingCourse.cropped_price ?? viewingCourse.croppedPrice ?? 0).toLocaleString()}</div>
                <div><strong>Watch Limit:</strong> {viewingCourse.default_watch_time_limit || "None"} mins</div>
                <div><strong>Includes Tute:</strong> {Number(viewingCourse.has_tute ?? viewingCourse.hasTute) ? "Yes" : "No"}</div>
                <div><strong>Expiry:</strong> {viewingCourse.expiry_type || "None"}</div>
              </div>

              {viewingCourse.note && (
                <div style={{ marginTop: 14, padding: 10, background: "var(--warning-light)", borderRadius: 6, fontSize: 12.5, color: "#723b13" }}>
                  <strong>Note:</strong> {viewingCourse.note}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setViewingCourse(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingCourse && (
        <div className="modal-overlay" onClick={() => !deleting && setDeletingCourse(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: "var(--danger)" }}>Delete Course</h3>
              <button className="modal-close" onClick={() => !deleting && setDeletingCourse(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this course?</p>
              <div style={{ background: "var(--bg)", padding: 12, borderRadius: 6, margin: "12px 0", fontWeight: 700 }}>
                {deletingCourse.name} ({deletingCourse.code})
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeletingCourse(null)} disabled={deleting}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleConfirmDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Yes, Delete Course"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
