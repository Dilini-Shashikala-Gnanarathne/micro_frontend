import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  filterEnrollmentCourses,
  filterEnrollmentPackages,
  getBatches,
  removeEnrollment,
  getPackageEnrollmentProduct
} from "../api";
import toast from "react-hot-toast";

export default function EnrollmentCatalogPage() {
  const navigate = useNavigate();

  // Active Tab: 'courses' | 'packages'
  const [activeTab, setActiveTab] = useState("courses");
  const [loading, setLoading] = useState(false);

  // Batches
  const [batches, setBatches] = useState([]);

  // Course Filters
  const [courseFilters, setCourseFilters] = useState({
    search: "",
    course_type: "MONTHLY",
    medium: "all",
    batch_id: "",
  });

  // Package Filters
  const [packageFilters, setPackageFilters] = useState({
    search: "",
    medium: "all",
    batch_id: "",
  });

  // Data
  const [courses, setCourses] = useState([]);
  const [packages, setPackages] = useState([]);

  // Selected item for detail modal
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [detailModalType, setDetailModalType] = useState(null); // 'course' | 'package'
  const [packageEnrollmentDetails, setPackageEnrollmentDetails] = useState(null);
  const [loadingPackageDetails, setLoadingPackageDetails] = useState(false);

  // Fetch live package enrollment status via POST /api/student/enroll/package
  useEffect(() => {
    if (detailModalType === "package" && detailModalItem?.id) {
      setLoadingPackageDetails(true);
      setPackageEnrollmentDetails(null);
      getPackageEnrollmentProduct(detailModalItem.id, [])
        .then((res) => {
          const data = res.data?.data || res.data;
          setPackageEnrollmentDetails(data);
        })
        .catch((err) => {
          console.warn("Failed to load real-time package enrollment details:", err);
        })
        .finally(() => {
          setLoadingPackageDetails(false);
        });
    } else {
      setPackageEnrollmentDetails(null);
    }
  }, [detailModalItem, detailModalType]);

  // Remove enrollment state
  const [confirmRemoveModal, setConfirmRemoveModal] = useState(null); // { enrollmentId, courseName }
  const [removingEnrollmentId, setRemovingEnrollmentId] = useState(null);

  const handleConfirmRemove = async () => {
    if (!confirmRemoveModal?.enrollmentId) return;
    setRemovingEnrollmentId(confirmRemoveModal.enrollmentId);
    try {
      const res = await removeEnrollment(confirmRemoveModal.enrollmentId);
      toast.success(res.data?.message || "Student removed from course successfully.");
      setConfirmRemoveModal(null);
      if (detailModalItem?.enrollment?.id === confirmRemoveModal.enrollmentId) {
        setDetailModalItem(null);
      }
      fetchCourses();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to remove enrollment.");
    } finally {
      setRemovingEnrollmentId(null);
    }
  };

  // Fetch batches on mount
  useEffect(() => {
    getBatches()
      .then((res) => {
        const list = res.data?.data || res.data || [];
        setBatches(Array.isArray(list) ? list : []);
      })
      .catch((err) => console.error("Failed to load batches", err));
  }, []);

  // Fetch Courses
  const fetchCourses = async () => {
    setLoading(true);
    try {
      const params = {};
      if (courseFilters.search.trim()) params.search = courseFilters.search.trim();
      if (courseFilters.course_type) params.course_type = courseFilters.course_type;
      if (courseFilters.medium && courseFilters.medium !== "all") params.medium = courseFilters.medium;
      if (courseFilters.batch_id) params.batch_id = courseFilters.batch_id;

      const res = await filterEnrollmentCourses(params);
      const data = res.data?.data || res.data || [];
      const items = Array.isArray(data) ? data : (data.data || []);
      setCourses(items);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to load courses for enrollment");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Packages
  const fetchPackages = async () => {
    setLoading(true);
    try {
      const params = {};
      if (packageFilters.search.trim()) params.search = packageFilters.search.trim();
      if (packageFilters.medium && packageFilters.medium !== "all") params.medium = packageFilters.medium;
      if (packageFilters.batch_id) params.batch_id = packageFilters.batch_id;

      const res = await filterEnrollmentPackages(params);
      const data = res.data?.data || res.data || [];
      setPackages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to load packages for enrollment");
    } finally {
      setLoading(false);
    }
  };

  // Trigger search on tab change or filter update
  useEffect(() => {
    if (activeTab === "courses") {
      fetchCourses();
    } else {
      fetchPackages();
    }
  }, [activeTab, courseFilters.course_type, courseFilters.medium, courseFilters.batch_id, packageFilters.medium, packageFilters.batch_id]);

  const handleCourseSearchSubmit = (e) => {
    e.preventDefault();
    fetchCourses();
  };

  const handlePackageSearchSubmit = (e) => {
    e.preventDefault();
    fetchPackages();
  };

  // Helper for Cloudflare / local thumbnail image
  const resolveImgSrc = (url) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `/uploads/${url.replace(/^\/+/, "")}`;
  };

  return (
    <div className="enrollment-catalog-page" style={{ paddingBottom: "40px" }}>
      {/* Header Banner */}
      <div style={{
        background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%)",
        color: "white",
        borderRadius: "14px",
        padding: "24px 28px",
        marginBottom: "24px",
        boxShadow: "0 10px 25px -5px rgba(30, 58, 138, 0.3)"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.15)", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, marginBottom: "8px" }}>
              <span>🎓</span> Course & Package Enrollment
            </div>
            <h1 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 6px 0" }}>Explore Academic Offerings</h1>
            <p style={{ opacity: 0.9, fontSize: "13.5px", margin: 0, maxWidth: "600px" }}>
              Filter by batch, syllabus medium, and course type. Check enrollment statuses, access privileges, and exclusive package savings.
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              className="btn"
              style={{ background: "#ffffff", color: "#1e3a8a", fontWeight: 700, padding: "10px 18px", borderRadius: "8px", border: "none", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}
              onClick={() => navigate("/enroll")}
            >
              🚀 Direct Enrollment Flow
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: "12px", marginTop: "22px" }}>
          <button
            onClick={() => setActiveTab("courses")}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              fontWeight: 700,
              fontSize: "13.5px",
              cursor: "pointer",
              transition: "all 0.2s",
              background: activeTab === "courses" ? "#ffffff" : "rgba(255, 255, 255, 0.2)",
              color: activeTab === "courses" ? "#1e3a8a" : "#ffffff",
              boxShadow: activeTab === "courses" ? "0 4px 12px rgba(0,0,0,0.15)" : "none"
            }}
          >
            📚 Courses ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab("packages")}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              fontWeight: 700,
              fontSize: "13.5px",
              cursor: "pointer",
              transition: "all 0.2s",
              background: activeTab === "packages" ? "#ffffff" : "rgba(255, 255, 255, 0.2)",
              color: activeTab === "packages" ? "#1e3a8a" : "#ffffff",
              boxShadow: activeTab === "packages" ? "0 4px 12px rgba(0,0,0,0.15)" : "none"
            }}
          >
            📦 Packages ({packages.length})
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="card" style={{ padding: "18px 20px", marginBottom: "24px", borderRadius: "12px" }}>
        {activeTab === "courses" ? (
          <form onSubmit={handleCourseSearchSubmit} style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "flex-end" }}>
            {/* Search Input */}
            <div style={{ flex: "1 1 240px", minWidth: "220px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                Search (Code, Name, Meta Tags)
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. MATH2026, Theory, Mechanics..."
                  value={courseFilters.search}
                  onChange={(e) => setCourseFilters(f => ({ ...f, search: e.target.value }))}
                  style={{ width: "100%", paddingLeft: "34px" }}
                />
                <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>🔍</span>
              </div>
            </div>

            {/* Course Type Filter */}
            <div style={{ flex: "0 1 180px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                Course Type (Default: Monthly)
              </label>
              <select
                className="form-control"
                value={courseFilters.course_type}
                onChange={(e) => setCourseFilters(f => ({ ...f, course_type: e.target.value }))}
                style={{ width: "100%" }}
              >
                <option value="MONTHLY">Monthly Class</option>
                <option value="LESSON_PACK">Lesson Pack</option>
                <option value="EXTRA">Extra Class</option>
                <option value="FREE">Free Class</option>
              </select>
            </div>

            {/* Medium Filter */}
            <div style={{ flex: "0 1 140px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                Medium
              </label>
              <select
                className="form-control"
                value={courseFilters.medium}
                onChange={(e) => setCourseFilters(f => ({ ...f, medium: e.target.value }))}
                style={{ width: "100%" }}
              >
                <option value="all">All Mediums</option>
                <option value="sinhala">Sinhala</option>
                <option value="english">English</option>
              </select>
            </div>

            {/* Batch Filter */}
            <div style={{ flex: "0 1 200px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                Batch
              </label>
              <select
                className="form-control"
                value={courseFilters.batch_id}
                onChange={(e) => setCourseFilters(f => ({ ...f, batch_id: e.target.value }))}
                style={{ width: "100%" }}
              >
                <option value="">Student's Default Batch</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="submit" className="btn btn-primary" style={{ padding: "9px 18px" }}>
                Search
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "9px 14px" }}
                onClick={() => {
                  setCourseFilters({ search: "", course_type: "MONTHLY", medium: "all", batch_id: "" });
                  fetchCourses();
                }}
              >
                Reset
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePackageSearchSubmit} style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "flex-end" }}>
            {/* Search Input for Package */}
            <div style={{ flex: "1 1 260px", minWidth: "240px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                Search (Package / Course Code, Name, Meta)
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Science Combo, PHY2026, Maths..."
                  value={packageFilters.search}
                  onChange={(e) => setPackageFilters(f => ({ ...f, search: e.target.value }))}
                  style={{ width: "100%", paddingLeft: "34px" }}
                />
                <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }}>🔍</span>
              </div>
            </div>

            {/* Medium Filter */}
            <div style={{ flex: "0 1 160px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                Medium
              </label>
              <select
                className="form-control"
                value={packageFilters.medium}
                onChange={(e) => setPackageFilters(f => ({ ...f, medium: e.target.value }))}
                style={{ width: "100%" }}
              >
                <option value="all">All Mediums</option>
                <option value="sinhala">Sinhala</option>
                <option value="english">English</option>
              </select>
            </div>

            {/* Batch Filter */}
            <div style={{ flex: "0 1 220px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                Batch
              </label>
              <select
                className="form-control"
                value={packageFilters.batch_id}
                onChange={(e) => setPackageFilters(f => ({ ...f, batch_id: e.target.value }))}
                style={{ width: "100%" }}
              >
                <option value="">Student's Default Batch</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="submit" className="btn btn-primary" style={{ padding: "9px 18px" }}>
                Search
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: "9px 14px" }}
                onClick={() => {
                  setPackageFilters({ search: "", medium: "all", batch_id: "" });
                  fetchPackages();
                }}
              >
                Reset
              </button>
            </div>
          </form>
        )}
      </div>

      {/* CONTENT LISTING */}
      {loading ? (
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-secondary)" }}>
          <div style={{ fontSize: "24px", marginBottom: "8px" }}>⏳</div>
          <div style={{ fontWeight: 600 }}>Loading enrollment offerings...</div>
        </div>
      ) : activeTab === "courses" ? (
        /* COURSE GRID */
        courses.length === 0 ? (
          <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>📭</div>
            <h3 style={{ fontWeight: 700, marginBottom: "6px" }}>No courses matched your filter</h3>
            <p style={{ fontSize: "13px" }}>Try selecting another batch, changing course type, or clearing your search term.</p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "20px"
          }}>
            {courses.map((course) => {
              const imgSrc = resolveImgSrc(course.image_url);
              const isEnrolled = course.enrollment && course.enrollment.status;
              const hasAccess = course.course_access;

              return (
                <div
                  key={course.id}
                  className="card"
                  style={{
                    overflow: "hidden",
                    borderRadius: "12px",
                    display: "flex",
                    flexDirection: "column",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    position: "relative",
                    border: hasAccess ? "1.5px solid #10b981" : "1px solid var(--border)"
                  }}
                >
                  {/* Thumbnail Banner */}
                  <div style={{ height: "140px", background: "#f3f4f6", position: "relative", overflow: "hidden" }}>
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={course.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(45deg, #1e40af, #3b82f6)", color: "white", fontWeight: 800 }}>
                        {course.code}
                      </div>
                    )}

                    {/* Top Badges */}
                    <div style={{ position: "absolute", top: "10px", left: "10px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      <span className="badge badge-info" style={{ fontWeight: 700, fontSize: "11px" }}>
                        {course.course_type?.replace(/_/g, " ")}
                      </span>
                      <span className="badge badge-gray" style={{ fontWeight: 600, fontSize: "11px" }}>
                        {course.medium}
                      </span>
                    </div>

                    <div style={{ position: "absolute", top: "10px", right: "10px", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                      {course.in_package && (
                        <span className="badge" style={{ background: "#8b5cf6", color: "white", fontWeight: 700, fontSize: "10px" }}>
                          📦 In Package
                        </span>
                      )}
                      {hasAccess && (
                        <span className="badge badge-success" style={{ fontWeight: 700, fontSize: "10px" }}>
                          ✓ Access Granted
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                      <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--primary)" }}>{course.code}</span>
                      {course.batch?.name && (
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 500 }}>
                          🎓 {course.batch.name}
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: "15px", fontWeight: 700, margin: "0 0 6px 0", lineHeight: "1.3" }}>
                      {course.name}
                    </h3>

                    {course.description && (
                      <p style={{
                        fontSize: "12.5px",
                        color: "var(--text-secondary)",
                        margin: "0 0 10px 0",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden"
                      }}>
                        {course.description}
                      </p>
                    )}

                    {/* Parent Course indicator */}
                    {course.parent_course && (
                      <div style={{ background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "6px", padding: "6px 10px", fontSize: "11.5px", color: "#475569", marginBottom: "10px" }}>
                        🔗 <strong>Parent:</strong> {course.parent_course.name} ({course.parent_course.code})
                      </div>
                    )}

                    {/* Metadata Pill Strip */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "11.5px", color: "var(--text-secondary)", marginBottom: "12px" }}>
                      <span>📅 Start: {course.start_date || "Immediate"}</span>
                      {course.total_lessons > 0 && <span>📖 {course.total_lessons} Lessons</span>}
                      {course.has_tute && <span style={{ color: "#d97706", fontWeight: 600 }}>📚 Tute Included</span>}
                      {course.expiry && course.expiry.type !== "NONE" && (
                        <span>⏳ {course.expiry.type === "FIXED" ? course.expiry.date : `${course.expiry.days} days`}</span>
                      )}
                    </div>

                    {/* Enrollment Status indicator if available */}
                    {isEnrolled && (
                      <div style={{
                        marginBottom: "12px",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        background: course.enrollment.status === "ACTIVE" ? "#ecfdf5" : "#eff6ff",
                        color: course.enrollment.status === "ACTIVE" ? "#065f46" : "#1e40af",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}>
                        <span>{course.enrollment.status === "ACTIVE" ? "🟢" : "🔵"}</span>
                        Enrollment: {course.enrollment.status}
                      </div>
                    )}

                    {/* Price and CTA */}
                    <div style={{ marginTop: "auto", paddingTop: "12px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        {course.is_free ? (
                          <span style={{ fontSize: "16px", fontWeight: 800, color: "#10b981" }}>FREE</span>
                        ) : (
                          <div>
                            <span style={{ fontSize: "16px", fontWeight: 800, color: "var(--text-primary)" }}>
                              LKR {Number(course.cropped_price || 0).toLocaleString()}
                            </span>
                            {course.original_price && course.original_price > course.cropped_price && (
                              <span style={{ fontSize: "12px", textDecoration: "line-through", color: "#9ca3af", marginLeft: "6px" }}>
                                LKR {Number(course.original_price).toLocaleString()}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setDetailModalItem(course);
                            setDetailModalType("course");
                          }}
                        >
                          Details
                        </button>

                        {hasAccess ? (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => navigate(`/lessons?courseId=${course.id}`)}
                            >
                              Open
                            </button>
                            {course.enrollment?.status === "ACTIVE" && course.enrollment?.id && (
                              <button
                                className="btn btn-danger btn-sm"
                                title="Remove enrollment / Drop course"
                                style={{ padding: "4px 8px", fontSize: "11px" }}
                                onClick={() => setConfirmRemoveModal({
                                  enrollmentId: course.enrollment.id,
                                  courseName: course.name
                                })}
                              >
                                Drop
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => navigate(`/enroll?type=course&courseId=${course.id}`)}
                          >
                            Enroll
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* PACKAGE GRID */
        packages.length === 0 ? (
          <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>📭</div>
            <h3 style={{ fontWeight: 700, marginBottom: "6px" }}>No packages matched your filter</h3>
            <p style={{ fontSize: "13px" }}>Try selecting another batch or clearing your search term.</p>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: "24px"
          }}>
            {packages.map((pkg) => {
              const imgSrc = resolveImgSrc(pkg.image_url);

              return (
                <div
                  key={pkg.id}
                  className="card"
                  style={{
                    overflow: "hidden",
                    borderRadius: "14px",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.05)"
                  }}
                >
                  {/* Package Banner */}
                  <div style={{ height: "150px", background: "#f8fafc", position: "relative" }}>
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={pkg.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(45deg, #4f46e5, #7c3aed)", color: "white", fontWeight: 800 }}>
                        {pkg.name}
                      </div>
                    )}

                    <div style={{ position: "absolute", top: "10px", left: "10px", display: "flex", gap: "6px" }}>
                      <span className="badge" style={{ background: "rgba(0,0,0,0.6)", color: "white", fontWeight: 700, fontSize: "11px" }}>
                        📦 PACKAGE
                      </span>
                      <span className="badge badge-gray" style={{ fontWeight: 600, fontSize: "11px" }}>
                        {pkg.medium}
                      </span>
                    </div>

                    {pkg.is_free && (
                      <div style={{ position: "absolute", top: "10px", right: "10px" }}>
                        <span className="badge badge-success" style={{ fontWeight: 800 }}>
                          FREE PACKAGE
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div style={{ padding: "18px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "4px" }}>
                      <span style={{ fontSize: "11.5px", color: "var(--text-secondary)", fontWeight: 600 }}>
                        🎓 {pkg.batch?.name || "General Batch"}
                      </span>
                      <span style={{ fontSize: "11.5px", fontWeight: 700, color: "#7c3aed" }}>
                        {pkg.courses?.length || 0} Courses Included
                      </span>
                    </div>

                    <h3 style={{ fontSize: "16px", fontWeight: 800, margin: "0 0 8px 0" }}>
                      {pkg.name}
                    </h3>

                    {pkg.description && (
                      <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", margin: "0 0 14px 0" }}>
                        {pkg.description}
                      </p>
                    )}

                    {/* Courses Included Box */}
                    <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "12px", marginBottom: "14px", border: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#334155", marginBottom: "8px" }}>
                        📚 Included Courses:
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {pkg.courses?.map((c) => (
                          <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                            <span style={{ fontWeight: 600, color: "#1e293b" }}>
                              {c.code} - {c.name}
                            </span>
                            {c.course_access ? (
                              <span style={{ color: "#10b981", fontWeight: 700, fontSize: "11px" }}>✓ Access</span>
                            ) : c.enrollment ? (
                              <span style={{ color: "#3b82f6", fontWeight: 600, fontSize: "11px" }}>{c.enrollment.status}</span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Combinations Breakdown */}
                    {pkg.combinations && pkg.combinations.length > 0 && (
                      <div style={{ marginBottom: "14px" }}>
                        <div style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>
                          ⚡ Flexible Course Combinations:
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {pkg.combinations.map((combo, idx) => {
                            const comboSum = combo.courses.reduce((acc, cr) => acc + (cr.is_free ? 0 : cr.price), 0);
                            return (
                              <div
                                key={idx}
                                style={{
                                  background: "#f1f5f9",
                                  padding: "5px 10px",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  fontWeight: 600,
                                  color: "#334155"
                                }}
                              >
                                Option {idx + 1}: {combo.courses.length} courses (LKR {comboSum.toLocaleString()})
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Price and CTA */}
                    <div style={{ marginTop: "auto", paddingTop: "14px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 600 }}>Starting from</div>
                        <div style={{ fontSize: "18px", fontWeight: 800, color: "var(--primary)" }}>
                          {pkg.is_free || pkg.price_start_from === 0 ? (
                            <span style={{ color: "#10b981" }}>FREE</span>
                          ) : (
                            `LKR ${Number(pkg.price_start_from || 0).toLocaleString()}`
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setDetailModalItem(pkg);
                            setDetailModalType("package");
                          }}
                        >
                          View Breakdown
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/enroll?type=package&packageId=${pkg.id}`)}
                        >
                          Enroll Package
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* DETAIL MODAL */}
      {detailModalItem && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div className="card" style={{ maxWidth: "600px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "24px", borderRadius: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <span className="badge badge-info" style={{ marginBottom: "6px" }}>
                  {detailModalType === "course" ? detailModalItem.course_type : "PACKAGE DETAILS"}
                </span>
                <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0 }}>{detailModalItem.name}</h2>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setDetailModalItem(null)}
                style={{ fontSize: "16px", padding: "4px 10px" }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
              {detailModalItem.description || "No full description provided."}
            </div>

            {detailModalType === "course" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px" }}>
                <div><strong>Code:</strong> {detailModalItem.code}</div>
                <div><strong>Medium:</strong> {detailModalItem.medium}</div>
                <div><strong>Batch:</strong> {detailModalItem.batch?.name || "N/A"}</div>
                {detailModalItem.parent_course && (
                  <div><strong>Parent Course:</strong> {detailModalItem.parent_course.name} ({detailModalItem.parent_course.code})</div>
                )}
                <div><strong>Total Lessons:</strong> {detailModalItem.total_lessons}</div>
                <div><strong>Tute Availability:</strong> {detailModalItem.has_tute ? "Yes, Tute Included" : "No"}</div>
                <div><strong>Start Date:</strong> {detailModalItem.start_date || "Open"}</div>
                <div><strong>Course Access:</strong> {detailModalItem.course_access ? "✅ Granted" : "❌ Requires Enrollment"}</div>
                {detailModalItem.enrollment && (
                  <div>
                    <strong>Your Enrollment:</strong>{" "}
                    <span className={`badge ${detailModalItem.enrollment.status === "ACTIVE" ? "badge-success" : "badge-gray"}`}>
                      {detailModalItem.enrollment.status}
                    </span>
                    {detailModalItem.enrollment.status === "ACTIVE" && detailModalItem.enrollment.id && (
                      <div style={{ marginTop: "10px", padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 600, color: "#991b1b" }}>Active Course Access</div>
                          <div style={{ fontSize: "11.5px", color: "#b91c1c" }}>Enrollment ID: {detailModalItem.enrollment.id}</div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setConfirmRemoveModal({
                            enrollmentId: detailModalItem.enrollment.id,
                            courseName: detailModalItem.name
                          })}
                        >
                          Remove Enrollment
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <div style={{ marginTop: "10px", fontSize: "16px", fontWeight: 700 }}>
                  Price: LKR {Number(detailModalItem.cropped_price || 0).toLocaleString()}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "13px" }}>
                {loadingPackageDetails ? (
                  <div style={{ padding: "30px", textAlign: "center", color: "var(--text-secondary)" }}>
                    <div className="spinner" style={{ margin: "0 auto 10px auto" }} />
                    <div>Loading live student access & pricing details...</div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <div>
                        <div><strong>Medium:</strong> {packageEnrollmentDetails?.medium || detailModalItem.medium}</div>
                        <div><strong>Batch:</strong> {packageEnrollmentDetails?.batch?.name || detailModalItem.batch?.name || "General Batch"}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 600 }}>
                          Calculated Total Price
                        </div>
                        <div style={{ fontSize: "18px", fontWeight: 800, color: (packageEnrollmentDetails?.is_free || Number(packageEnrollmentDetails?.price) === 0) ? "#10b981" : "var(--primary)" }}>
                          {(packageEnrollmentDetails?.is_free || Number(packageEnrollmentDetails?.price) === 0)
                            ? "FREE"
                            : `LKR ${Number(packageEnrollmentDetails ? packageEnrollmentDetails.price : detailModalItem.price_start_from || 0).toLocaleString()}`}
                        </div>
                      </div>
                    </div>

                    {(packageEnrollmentDetails?.is_free || Number(packageEnrollmentDetails?.price) === 0) && (
                      <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", padding: "10px 14px", borderRadius: "8px", color: "#065f46", fontSize: "12.5px", fontWeight: 600 }}>
                        🎉 You have full free access or are active in all courses in this package!
                      </div>
                    )}

                    <div>
                      <strong>Courses in this package ({(packageEnrollmentDetails?.courses || detailModalItem.courses)?.length || 0}):</strong>
                      <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                        {(packageEnrollmentDetails?.courses || detailModalItem.courses)?.map((c) => (
                          <div key={c.id} style={{ background: "#ffffff", padding: "12px", borderRadius: "8px", border: `1.5px solid ${c.course_access ? "#10b981" : "#e2e8f0"}` }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "6px" }}>
                              <div>
                                <span style={{ fontWeight: 800, color: "#1e293b", marginRight: "6px" }}>{c.code}</span>
                                <span style={{ fontWeight: 600, color: "#334155" }}>{c.name}</span>
                              </div>
                              <div>
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
                            </div>

                            <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "6px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
                              <span>Type: {c.course_type}</span>
                              <span>Medium: {c.medium}</span>
                              {c.expiry_date && <span>📅 Expiry: {c.expiry_date}</span>}
                              {c.has_tute && <span>📦 Tute Available</span>}
                              {c.parent_course && (
                                <span style={{ color: "#4f46e5", fontWeight: 600 }}>
                                  🔗 Covered by Parent: {c.parent_course.name}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {packageEnrollmentDetails?.seleted_combinations && packageEnrollmentDetails.seleted_combinations.length > 0 ? (
                      <div>
                        <strong>Selected Combination Price Breakdown:</strong>
                        <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                          {packageEnrollmentDetails.seleted_combinations.map((comb, i) => (
                            <div key={i} style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                              <span>Item #{i + 1}</span>
                              <span>
                                {comb.is_free ? (
                                  <span style={{ color: "#10b981", fontWeight: 700 }}>FREE (Active / Included)</span>
                                ) : (
                                  `LKR ${Number(comb.price).toLocaleString()}`
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : detailModalItem.combinations && detailModalItem.combinations.length > 0 ? (
                      <div>
                        <strong>Available Combinations:</strong>
                        <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                          {detailModalItem.combinations.map((comb, i) => (
                            <div key={i} style={{ background: "#f1f5f9", padding: "10px", borderRadius: "8px" }}>
                              <div style={{ fontWeight: 700, fontSize: "12px", marginBottom: "4px" }}>Combination #{i + 1}</div>
                              {comb.courses.map((cr, j) => (
                                <div key={j} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                                  <span>Course ID: {cr.id}</span>
                                  <span>
                                    {cr.is_free ? (
                                      <span style={{ color: "#10b981", fontWeight: 700 }}>FREE (Enrolled/Included)</span>
                                    ) : (
                                      `LKR ${Number(cr.price).toLocaleString()}`
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            )}

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="btn btn-secondary" onClick={() => setDetailModalItem(null)}>
                Close
              </button>
              {detailModalType === "course" ? (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    navigate(`/enroll?type=course&courseId=${detailModalItem.id}`);
                  }}
                >
                  Proceed to Enroll
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    navigate(`/enroll?type=package&packageId=${detailModalItem.id}`);
                  }}
                >
                  Proceed to Enroll Package
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Removing Enrollment */}
      {confirmRemoveModal && (
        <div className="modal-overlay" onClick={() => !removingEnrollmentId && setConfirmRemoveModal(null)}>
          <div className="modal" style={{ maxWidth: "440px", width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: "var(--danger)" }}>Remove from Course</h3>
              <button
                className="modal-close"
                onClick={() => setConfirmRemoveModal(null)}
                disabled={Boolean(removingEnrollmentId)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ fontSize: "13.5px" }}>
              <p style={{ marginBottom: "12px" }}>
                Are you sure you want to remove the enrollment for <strong>{confirmRemoveModal.courseName || "this course"}</strong>?
              </p>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                Enrollment ID: <code>{confirmRemoveModal.enrollmentId}</code>
              </p>
              <div style={{ marginTop: "12px", padding: "10px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "6px", fontSize: "12px", color: "#c2410c" }}>
                ⚠️ This will mark the enrollment as <strong>REMOVED</strong> and remove active student access.
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmRemoveModal(null)}
                disabled={Boolean(removingEnrollmentId)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmRemove}
                disabled={Boolean(removingEnrollmentId)}
              >
                {removingEnrollmentId ? "Removing..." : "Confirm Removal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
