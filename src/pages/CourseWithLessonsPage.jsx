import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStudentCourseWithLessons } from "../api";
import toast from "react-hot-toast";

export default function CourseWithLessonsPage() {
  const { id: courseId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [error, setError] = useState(null);

  // Lesson search & filter state
  const [search, setSearch] = useState("");
  const [resourceFilter, setResourceFilter] = useState("ALL");
  const [selectedLesson, setSelectedLesson] = useState(null);

  // Fetch course with lessons
  const fetchCourseData = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getStudentCourseWithLessons(courseId);
      const data = res.data?.data || res.data || {};
      setCourse(data);
    } catch (err) {
      console.error("Failed to fetch course details:", err);
      const msg = err.response?.data?.message || "Failed to load course and lessons.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourseData();
  }, [fetchCourseData]);

  // Derived values
  const hasAccess = Boolean(course?.course_access?.has_access ?? course?.courseAccess?.hasAccess ?? false);
  const accessStatus = course?.course_access?.status || course?.courseAccess?.status || course?.enrollment?.status;
  const accessReason = course?.course_access?.reason || course?.courseAccess?.reason;
  const lessons = Array.isArray(course?.lessons) ? course.lessons : [];

  // Filter lessons
  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch = !search.trim() || 
      (lesson.name && lesson.name.toLowerCase().includes(search.toLowerCase()));

    const resType = (lesson.resource_type || lesson.resourceType || "NONE").toUpperCase();
    const matchesType = resourceFilter === "ALL" || resType === resourceFilter;

    return matchesSearch && matchesType;
  });

  // Resource Type Helper
  const getResourceBadge = (type) => {
    const normalized = (type || "").toUpperCase();
    switch (normalized) {
      case "VIDEO":
        return { label: "Video Lesson", icon: "🎥", bg: "#fef2f2", color: "#991b1b", border: "#fecaca" };
      case "MEETING":
        return { label: "Live Meeting", icon: "👥", bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe" };
      case "DOCUMENT":
        return { label: "Study Document", icon: "📄", bg: "#fffbeb", color: "#92400e", border: "#fde68a" };
      case "URL":
        return { label: "Web Resource", icon: "🔗", bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" };
      default:
        return { label: "Materials", icon: "📁", bg: "#f3f4f6", color: "#4b5563", border: "#e5e7eb" };
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px 24px", maxWidth: "1200px", margin: "0 auto", textAlign: "center" }}>
        <div style={{ display: "inline-block", padding: "24px", borderRadius: "12px", background: "#fff", boxShadow: "var(--shadow-sm)" }}>
          <div className="spinner" style={{ margin: "0 auto 12px" }}></div>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Loading course & lessons...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div style={{ padding: "40px 24px", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ background: "#fff", borderRadius: "16px", padding: "36px", textAlign: "center", boxShadow: "var(--shadow-md)" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
            Course Access Notice
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px", fontSize: "14.5px" }}>
            {error || "Could not retrieve course details. Please verify your enrollment status."}
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button className="btn btn-outline" onClick={() => navigate("/my-courses")}>
              ← Back to My Courses
            </button>
            <button className="btn btn-primary" onClick={() => navigate("/catalog")}>
              Browse Course Catalog
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Top Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <button
          className="btn btn-outline"
          onClick={() => navigate("/my-courses")}
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <span>←</span> Back to My Courses
        </button>
        <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "monospace" }}>
          ID: {course.id}
        </span>
      </div>

      {/* Main Course Hero Banner */}
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
          overflow: "hidden",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          {/* Course Image */}
          <div
            style={{
              flex: "1 1 320px",
              minHeight: "220px",
              background: course.image_url || course.imageUrl
                ? `url(${course.image_url || course.imageUrl}) center/cover no-repeat`
                : "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
              position: "relative",
              display: "flex",
              alignItems: "flex-end",
              padding: "16px",
            }}
          >
            {(!course.image_url && !course.imageUrl) && (
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "24px", opacity: 0.8 }}>
                {course.code || "COURSE"}
              </div>
            )}
            <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <span className="badge badge-primary">{course.course_type || course.courseType || "COURSE"}</span>
              <span className="badge badge-secondary">{course.medium || "SINHALA"}</span>
              {course.batch?.name && <span className="badge badge-warning">{course.batch.name}</span>}
            </div>
          </div>

          {/* Course Details Info */}
          <div style={{ flex: "2 1 450px", padding: "24px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span
                style={{
                  background: "#e0e7ff",
                  color: "#3730a3",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  letterSpacing: "0.5px",
                }}
              >
                {course.code || "CODE"}
              </span>
              {course.start_date && (
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Starts: {course.start_date.split(" ")[0]}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>
              {course.name}
            </h1>

            {course.description && (
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.5, marginBottom: "12px" }}>
                {course.description}
              </p>
            )}

            {course.note && (
              <div
                style={{
                  background: "#fef3c7",
                  borderLeft: "4px solid #f59e0b",
                  padding: "8px 12px",
                  borderRadius: "0 8px 8px 0",
                  fontSize: "12.5px",
                  color: "#92400e",
                  marginBottom: "12px",
                }}
              >
                <strong>Note:</strong> {course.note}
              </div>
            )}

            {/* Price & Lessons Count summary */}
            <div style={{ display: "flex", gap: "20px", marginTop: "auto", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>TOTAL LESSONS</span>
                <strong style={{ fontSize: "16px", color: "var(--text-primary)" }}>
                  {course.total_lessons || course.totalLessons || lessons.length} Lessons
                </strong>
              </div>
              <div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>COURSE FEE</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                  <strong style={{ fontSize: "16px", color: "var(--text-primary)" }}>
                    Rs. {(Number(course.cropped_price || course.croppedPrice || course.original_price || 0)).toLocaleString()}
                  </strong>
                  {course.original_price > course.cropped_price && (
                    <span style={{ fontSize: "12px", color: "var(--text-muted)", textDecoration: "line-through" }}>
                      Rs. {Number(course.original_price).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Course Access Status Banner */}
      <div
        style={{
          background: hasAccess ? "#ecfdf5" : accessStatus === "NOT_PAID" ? "#fef2f2" : "#fffbeb",
          border: `1px solid ${hasAccess ? "#a7f3d0" : accessStatus === "NOT_PAID" ? "#fecaca" : "#fde68a"}`,
          borderRadius: "12px",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: hasAccess ? "#10b981" : accessStatus === "NOT_PAID" ? "#ef4444" : "#f59e0b",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
            }}
          >
            {hasAccess ? "✓" : accessStatus === "NOT_PAID" ? "!" : "⏳"}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "14.5px", color: hasAccess ? "#065f46" : accessStatus === "NOT_PAID" ? "#991b1b" : "#92400e" }}>
              {hasAccess ? (
                accessReason === "APPROVED" ? "Full Course Access Active" :
                accessReason === "FIRST_WEEK" ? "First Week Promotional Access Active (Monthly Class)" :
                accessReason === "FREE_LESSONS" ? "Free Lessons Access Active" : "Course Access Active"
              ) : (
                accessStatus === "NOT_PAID" ? "Payment Required to Unlock Lessons" :
                accessStatus === "PENDING" ? "Payment Verification In Progress" : "Access Pending"
              )}
            </div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
              {hasAccess ? (
                "You have full permission to stream lessons and view study materials."
              ) : accessStatus === "NOT_PAID" ? (
                "Please submit your bank payment slip to gain access to all course materials."
              ) : (
                "Our administrative team is reviewing your slip. Access will be unlocked shortly."
              )}
            </div>
          </div>
        </div>

        {!hasAccess && accessStatus === "NOT_PAID" && (
          <button className="btn btn-danger" onClick={() => navigate("/payments/course")} style={{ padding: "8px 18px" }}>
            💳 Complete Pending Payment
          </button>
        )}
      </div>

      {/* Enrollment & Order Information Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        {/* Enrollment Card */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px 20px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "12px" }}>
            Enrollment Status
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Status:</span>
              <span className={`badge ${course.enrollment?.status === "ACTIVE" ? "badge-success" : course.enrollment?.status === "PENDING" ? "badge-warning" : "badge-danger"}`}>
                {course.enrollment?.status || "NOT_ENROLLED"}
              </span>
            </div>
            {course.enrollment?.enrolled_at && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Enrolled At:</span>
                <span style={{ fontWeight: 600 }}>{course.enrollment.enrolled_at.split(" ")[0]}</span>
              </div>
            )}
            {course.enrollment?.approved_at && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Approved At:</span>
                <span style={{ fontWeight: 600 }}>{course.enrollment.approved_at.split(" ")[0]}</span>
              </div>
            )}
            {course.enrollment?.expires_at && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Expires At:</span>
                <span style={{ fontWeight: 700, color: "#d97706" }}>{course.enrollment.expires_at.split(" ")[0]}</span>
              </div>
            )}
          </div>
        </div>

        {/* Order Details Card */}
        <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px 20px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "12px" }}>
            Payment & Order Info
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "13px" }}>
            {course.order?.id && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Order Reference:</span>
                <span style={{ fontFamily: "monospace", fontWeight: 600 }}>#{course.order.id.slice(0, 8)}...</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-secondary)" }}>Respective Unit Price:</span>
              <strong style={{ color: "var(--text-primary)" }}>
                Rs. {(Number(course.order?.unit_price || course.order?.unitPrice || course.cropped_price || 0)).toLocaleString()}
              </strong>
            </div>
            {course.order?.final_amount !== undefined && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Total Order Paid:</span>
                <strong style={{ color: "var(--primary)" }}>
                  Rs. {(Number(course.order?.final_amount || course.order?.finalAmount || 0)).toLocaleString()}
                </strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Course Lessons Header & Filters */}
      <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "16px", padding: "20px", boxShadow: "var(--shadow-sm)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
              Course Lessons & Study Content
            </h2>
            <p style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
              Showing {filteredLessons.length} of {lessons.length} lessons
            </p>
          </div>

          {/* Search & Resource Filter */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <input
              type="text"
              className="form-control"
              placeholder="Search lesson name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "220px", fontSize: "13px", padding: "6px 12px" }}
            />
            <select
              className="form-control"
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              style={{ width: "150px", fontSize: "13px", padding: "6px 12px" }}
            >
              <option value="ALL">All Media</option>
              <option value="VIDEO">Videos 🎥</option>
              <option value="MEETING">Meetings 👥</option>
              <option value="DOCUMENT">Documents 📄</option>
              <option value="URL">Web Links 🔗</option>
            </select>
          </div>
        </div>

        {/* Lessons List */}
        {filteredLessons.length === 0 ? (
          <div style={{ textAlign: "center", padding: "36px 0", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>📚</div>
            <p style={{ fontSize: "14px", fontWeight: 500 }}>No lessons match your search criteria.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filteredLessons.map((lesson, idx) => {
              const resType = lesson.resource_type || lesson.resourceType;
              const resBadge = getResourceBadge(resType);
              const isFree = Boolean(lesson.is_free || lesson.isFree);
              const canAccessLesson = hasAccess || isFree;

              return (
                <div
                  key={lesson.id || idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    background: canAccessLesson ? "#ffffff" : "#f9fafb",
                    border: "1px solid var(--border)",
                    borderRadius: "10px",
                    transition: "var(--transition)",
                    opacity: canAccessLesson ? 1 : 0.75,
                  }}
                >
                  {/* Left Info: Order, Name, Date */}
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "8px",
                        background: canAccessLesson ? "var(--primary-light)" : "#e5e7eb",
                        color: canAccessLesson ? "var(--primary)" : "var(--text-muted)",
                        fontWeight: 700,
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      #{lesson.order ?? idx + 1}
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <strong style={{ fontSize: "14.5px", color: "var(--text-primary)" }}>
                          {lesson.name}
                        </strong>
                        {isFree && (
                          <span
                            style={{
                              background: "#ecfdf5",
                              color: "#059669",
                              fontSize: "11px",
                              fontWeight: 700,
                              padding: "2px 7px",
                              borderRadius: "6px",
                              border: "1px solid #a7f3d0",
                            }}
                          >
                            FREE PREVIEW 🎁
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px", color: "var(--text-muted)" }}>
                        {lesson.date && <span>📅 Date: {lesson.date.split(" ")[0]}</span>}
                        {resType && (
                          <span
                            style={{
                              background: resBadge.bg,
                              color: resBadge.color,
                              border: `1px solid ${resBadge.border}`,
                              padding: "2px 6px",
                              borderRadius: "4px",
                              fontWeight: 600,
                              fontSize: "11px",
                            }}
                          >
                            {resBadge.icon} {resBadge.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Action Button */}
                  <div>
                    {canAccessLesson ? (
                      <button
                        className="btn btn-primary"
                        onClick={() => navigate(`/my-lessons/${lesson.id}`)}
                        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", fontSize: "13px" }}
                      >
                        <span>▶</span>
                        <span>{resType === "MEETING" ? "Join Meeting" : "View Lesson"}</span>
                      </button>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          color: "var(--text-muted)",
                          fontSize: "12.5px",
                          fontWeight: 500,
                          padding: "6px 12px",
                          background: "#f3f4f6",
                          borderRadius: "6px",
                        }}
                      >
                        <span>🔒</span>
                        <span>Locked</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lesson View Modal */}
      {selectedLesson && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "20px",
          }}
          onClick={() => setSelectedLesson(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "28px",
              maxWidth: "540px",
              width: "100%",
              boxShadow: "var(--shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 700 }}>
                  LESSON #{selectedLesson.order}
                </span>
                <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginTop: "2px" }}>
                  {selectedLesson.name}
                </h3>
              </div>
              <button
                className="btn btn-outline"
                onClick={() => setSelectedLesson(null)}
                style={{ padding: "4px 8px", fontSize: "12px" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Scheduled Date:</span>
                <span style={{ fontWeight: 600 }}>{selectedLesson.date ? selectedLesson.date.split(" ")[0] : "N/A"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Resource Type:</span>
                <span style={{ fontWeight: 600 }}>{selectedLesson.resource_type || selectedLesson.resourceType || "Standard"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Access Permission:</span>
                <span style={{ color: "#059669", fontWeight: 700 }}>
                  {selectedLesson.is_free ? "Free Preview Lesson" : "Enrolled Student Access"}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="btn btn-outline" onClick={() => setSelectedLesson(null)}>
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  toast.success(`Opening content for ${selectedLesson.name}`);
                  setSelectedLesson(null);
                }}
              >
                Launch Learning Player
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

