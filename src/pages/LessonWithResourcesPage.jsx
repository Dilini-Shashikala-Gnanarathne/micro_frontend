import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStudentLessonWithResources } from "../api";
import toast from "react-hot-toast";

export default function LessonWithResourcesPage() {
  const { id: lessonId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [lessonData, setLessonData] = useState(null);
  const [error, setError] = useState(null);

  // Active selected resource to view
  const [activeResourceId, setActiveResourceId] = useState(null);

  // Fetch lesson with resources
  const fetchLessonData = useCallback(async () => {
    if (!lessonId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getStudentLessonWithResources(lessonId);
      const data = res.data?.data || res.data || {};
      setLessonData(data);

      // Auto-select first resource if available
      if (Array.isArray(data.resources) && data.resources.length > 0) {
        setActiveResourceId(data.resources[0].id);
      }
    } catch (err) {
      console.error("Failed to load lesson:", err);
      const msg = err.response?.data?.message || "Failed to load lesson details.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    fetchLessonData();
  }, [fetchLessonData]);

  // Derived values
  const hasLessonAccess = Boolean(lessonData?.lesson_access?.has_access ?? lessonData?.lessonAccess?.hasAccess ?? false);
  const isFree = Boolean(lessonData?.is_free ?? lessonData?.isFree ?? false);
  const canAccessContent = hasLessonAccess || isFree;

  const courseAccess = lessonData?.course_access || lessonData?.courseAccess || {};
  const enrollment = lessonData?.enrollment || null;
  const order = lessonData?.order || null;
  const course = lessonData?.course || {};
  const resources = Array.isArray(lessonData?.resources) ? lessonData.resources : [];

  // Active Resource
  const activeResource = resources.find((r) => r.id === activeResourceId) || resources[0] || null;

  // Resource Icon & Color Helper
  const getResourceMeta = (type) => {
    switch ((type || "").toUpperCase()) {
      case "VIDEO":
        return { label: "Video Lesson", icon: "🎥", bg: "#fef2f2", color: "#991b1b", border: "#fecaca" };
      case "MEETING":
        return { label: "Live Meeting", icon: "👥", bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe" };
      case "DOCUMENT":
        return { label: "Study Document", icon: "📄", bg: "#fffbeb", color: "#92400e", border: "#fde68a" };
      case "URL":
        return { label: "Web Resource", icon: "🔗", bg: "#f0fdf4", color: "#166534", border: "#bbf7d0" };
      default:
        return { label: "Material", icon: "📁", bg: "#f3f4f6", color: "#4b5563", border: "#e5e7eb" };
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "40px 24px", maxWidth: "1200px", margin: "0 auto", textAlign: "center" }}>
        <div style={{ display: "inline-block", padding: "24px", borderRadius: "12px", background: "#fff", boxShadow: "var(--shadow-sm)" }}>
          <div className="spinner" style={{ margin: "0 auto 12px" }}></div>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Loading lesson & learning materials...</p>
        </div>
      </div>
    );
  }

  if (error || !lessonData) {
    return (
      <div style={{ padding: "40px 24px", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ background: "#fff", borderRadius: "16px", padding: "36px", textAlign: "center", boxShadow: "var(--shadow-md)" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔒</div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
            Lesson Access Notice
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "24px", fontSize: "14.5px" }}>
            {error || "Could not access this lesson. Please ensure you are enrolled in the course or have purchased this lesson."}
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button className="btn btn-outline" onClick={() => navigate("/my-lessons")}>
              ← Back to My Lessons
            </button>
            <button className="btn btn-primary" onClick={() => navigate("/my-courses")}>
              View My Courses
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Navigation Breadcrumb */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            className="btn btn-outline"
            onClick={() => navigate(course.id ? `/my-courses/${course.id}` : "/my-lessons")}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <span>←</span> {course.name ? `Back to ${course.name}` : "Back to Lessons"}
          </button>
          <button
            className="btn btn-outline"
            onClick={() => navigate("/my-lessons")}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            📋 My Lessons
          </button>
        </div>
        <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "monospace" }}>
          ID: {lessonData.id}
        </span>
      </div>

      {/* Lesson Header Banner */}
      <div
        style={{
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "var(--shadow-sm)",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ flex: "1 1 500px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
              <span
                style={{
                  background: "var(--primary-light)",
                  color: "var(--primary)",
                  fontWeight: 700,
                  fontSize: "12px",
                  padding: "4px 10px",
                  borderRadius: "6px",
                }}
              >
                LESSON #{lessonData.order ?? "—"}
              </span>

              {isFree && (
                <span
                  style={{
                    background: "#ecfdf5",
                    color: "#059669",
                    fontWeight: 700,
                    fontSize: "12px",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "1px solid #a7f3d0",
                  }}
                >
                  FREE PREVIEW 🎁
                </span>
              )}

              {lessonData.date && (
                <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  📅 Scheduled: {lessonData.date.split(" ")[0]}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>
              {lessonData.name}
            </h1>

            {lessonData.description && (
              <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.5, marginBottom: "12px" }}>
                {lessonData.description}
              </p>
            )}

            {lessonData.note && (
              <div
                style={{
                  background: "#fef3c7",
                  borderLeft: "4px solid #f59e0b",
                  padding: "8px 12px",
                  borderRadius: "0 8px 8px 0",
                  fontSize: "13px",
                  color: "#92400e",
                  marginBottom: "8px",
                }}
              >
                <strong>Notice:</strong> {lessonData.note}
              </div>
            )}
          </div>

          {/* Parent Course Badge & Info */}
          {course.id && (
            <div
              style={{
                flex: "0 0 280px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                Part of Course
              </span>
              <strong style={{ fontSize: "14.5px", color: "var(--text-primary)" }}>{course.name}</strong>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {course.code && <span className="badge badge-primary">{course.code}</span>}
                {course.medium && <span className="badge badge-secondary">{course.medium}</span>}
                {course.batch_name && <span className="badge badge-warning">{course.batch_name}</span>}
              </div>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => navigate(`/my-courses/${course.id}`)}
                style={{ marginTop: "4px", fontSize: "12px" }}
              >
                View Full Course ({course.total_lessons || 0} Lessons) →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Access Control Banner */}
      <div
        style={{
          background: canAccessContent ? "#ecfdf5" : "#fef2f2",
          border: `1px solid ${canAccessContent ? "#a7f3d0" : "#fecaca"}`,
          borderRadius: "12px",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: canAccessContent ? "#10b981" : "#ef4444",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
            }}
          >
            {canAccessContent ? "✓" : "🔒"}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "14.5px", color: canAccessContent ? "#065f46" : "#991b1b" }}>
              {canAccessContent
                ? isFree
                  ? "Free Preview Unlocked"
                  : courseAccess.has_access
                  ? "Full Course Enrolled Access"
                  : "Lesson Enrolled Access"
                : "Content Locked - Enrollment Required"}
            </div>
            <div style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
              {canAccessContent
                ? "You have full access to view, stream, and download resources for this lesson."
                : "You need an active course enrollment or individual lesson purchase to unlock materials."}
            </div>
          </div>
        </div>

        {!canAccessContent && (
          <button className="btn btn-danger" onClick={() => navigate("/payments/lesson")} style={{ padding: "8px 18px" }}>
            💳 Complete Payment
          </button>
        )}
      </div>

      {/* Enrollment & Order Details (if student enrolled) */}
      {(enrollment || order) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px", marginBottom: "20px" }}>
          {enrollment && (
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 18px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                Enrollment Info
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12.5px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Status:</span>
                  <span className={`badge ${enrollment.status === "ACTIVE" ? "badge-success" : enrollment.status === "PENDING" ? "badge-warning" : "badge-danger"}`}>
                    {enrollment.status}
                  </span>
                </div>
                {enrollment.requested_at && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Requested:</span>
                    <span>{enrollment.requested_at.split(" ")[0]}</span>
                  </div>
                )}
                {enrollment.expires_at && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Expires:</span>
                    <span style={{ color: "#d97706", fontWeight: 600 }}>{enrollment.expires_at.split(" ")[0]}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {order && (
            <div style={{ background: "#fff", border: "1px solid var(--border)", borderRadius: "10px", padding: "14px 18px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>
                Order & Pricing
              </span>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "12.5px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Respective Price:</span>
                  <strong>Rs. {(Number(order.unit_price || order.unitPrice || 0)).toLocaleString()}</strong>
                </div>
                {order.final_amount !== undefined && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Order Total Paid:</span>
                    <strong style={{ color: "var(--primary)" }}>Rs. {(Number(order.final_amount || order.finalAmount || 0)).toLocaleString()}</strong>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lesson Resources Main Section */}
      <div
        style={{
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: "16px",
          padding: "20px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
              Lesson Materials & Streams ({resources.length})
            </h2>
            <p style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
              Study videos, documents, and live interactive sessions for this lesson
            </p>
          </div>
          {lessonData.total_document_size > 0 && (
            <span style={{ fontSize: "12px", color: "var(--text-muted)", background: "#f3f4f6", padding: "4px 8px", borderRadius: "6px" }}>
              Total Docs: {Number(lessonData.total_document_size).toFixed(2)} MB
            </span>
          )}
        </div>

        {resources.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
            <div style={{ fontSize: "40px", marginBottom: "8px" }}>📁</div>
            <p style={{ fontSize: "14px", fontWeight: 500 }}>No materials have been uploaded for this lesson yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Active Resource Interactive Viewer / Player */}
            {activeResource && canAccessContent && (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "20px",
                  marginBottom: "8px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "20px" }}>{getResourceMeta(activeResource.resource_type || activeResource.resourceType).icon}</span>
                    <div>
                      <strong style={{ fontSize: "15px", color: "var(--text-primary)" }}>{activeResource.name}</strong>
                      <span style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "8px" }}>
                        ({getResourceMeta(activeResource.resource_type || activeResource.resourceType).label})
                      </span>
                    </div>
                  </div>

                  {activeResource.url && (
                    <a
                      href={activeResource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm"
                      style={{ display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <span>↗</span> Open in New Window
                    </a>
                  )}
                </div>

                {/* Resource Renderer by Type */}
                {((activeResource.resource_type || activeResource.resourceType) === "VIDEO") && (
                  <div style={{ position: "relative", width: "100%", borderRadius: "8px", overflow: "hidden", background: "#000", textAlign: "center", minHeight: "360px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {activeResource.url ? (
                      activeResource.url.includes(".mp4") ? (
                        <video controls style={{ width: "100%", maxHeight: "500px" }} src={activeResource.url}>
                          Your browser does not support HTML5 video streaming.
                        </video>
                      ) : (
                        <div style={{ padding: "40px 20px", color: "#fff" }}>
                          <div style={{ fontSize: "44px", marginBottom: "12px" }}>▶</div>
                          <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px" }}>Video Stream Available</h3>
                          <p style={{ fontSize: "13px", opacity: 0.8, marginBottom: "16px" }}>Click below to launch the video stream player</p>
                          <a href={activeResource.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: "10px 24px" }}>
                            Watch Video Stream Now
                          </a>
                        </div>
                      )
                    ) : (
                      <p style={{ color: "#fff" }}>Video link is being prepared.</p>
                    )}
                  </div>
                )}

                {((activeResource.resource_type || activeResource.resourceType) === "MEETING") && (
                  <div style={{ padding: "30px", background: "#fff", borderRadius: "10px", border: "1px solid #bfdbfe", textAlign: "center" }}>
                    <div style={{ fontSize: "44px", marginBottom: "8px" }}>👥</div>
                    <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1e3a8a", marginBottom: "6px" }}>
                      Live Classroom Meeting
                    </h3>
                    {activeResource.meeting_datetime && (
                      <p style={{ fontSize: "14px", color: "#1e40af", fontWeight: 600, marginBottom: "16px" }}>
                        📅 Scheduled At: {activeResource.meeting_datetime}
                      </p>
                    )}
                    {activeResource.url ? (
                      <a href={activeResource.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ padding: "10px 24px", fontSize: "14px" }}>
                        🚀 Click Here to Join Live Session
                      </a>
                    ) : (
                      <p style={{ color: "var(--text-muted)" }}>Meeting link will be activated shortly before start time.</p>
                    )}
                  </div>
                )}

                {((activeResource.resource_type || activeResource.resourceType) === "DOCUMENT") && (
                  <div style={{ padding: "24px", background: "#fff", borderRadius: "10px", border: "1px solid #fde68a", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div style={{ fontSize: "36px" }}>📄</div>
                      <div>
                        <strong style={{ fontSize: "15px", color: "var(--text-primary)" }}>{activeResource.name}</strong>
                        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                          PDF / Document • Size: {activeResource.size ? `${Number(activeResource.size).toFixed(2)} MB` : "Study Material"}
                        </div>
                      </div>
                    </div>
                    {activeResource.url ? (
                      <a href={activeResource.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary" download style={{ padding: "8px 18px" }}>
                        📥 Download / View Document
                      </a>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>File unavailable</span>
                    )}
                  </div>
                )}

                {((activeResource.resource_type || activeResource.resourceType) === "URL") && (
                  <div style={{ padding: "20px", background: "#fff", borderRadius: "10px", border: "1px solid #bbf7d0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                      <strong style={{ fontSize: "15px", color: "#166534" }}>{activeResource.name}</strong>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px", wordBreak: "break-all" }}>
                        {activeResource.url}
                      </div>
                    </div>
                    <a href={activeResource.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: "8px 18px" }}>
                      Open Link ↗
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Resources Navigation List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
                All Attached Materials
              </span>
              {resources.map((res, index) => {
                const resMeta = getResourceMeta(res.resource_type || res.resourceType);
                const isSelected = res.id === activeResourceId;

                return (
                  <div
                    key={res.id || index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      borderRadius: "8px",
                      border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border)",
                      background: isSelected ? "#eff6ff" : "#fff",
                      cursor: canAccessContent ? "pointer" : "default",
                      transition: "var(--transition)",
                      opacity: canAccessContent ? 1 : 0.7,
                    }}
                    onClick={() => {
                      if (canAccessContent) setActiveResourceId(res.id);
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "18px" }}>{resMeta.icon}</span>
                      <div>
                        <strong style={{ fontSize: "14px", color: "var(--text-primary)" }}>{res.name}</strong>
                        <div style={{ display: "flex", gap: "8px", fontSize: "11.5px", color: "var(--text-muted)", marginTop: "2px" }}>
                          <span>{resMeta.label}</span>
                          {res.size && <span>• {Number(res.size).toFixed(2)} MB</span>}
                          {res.meeting_datetime && <span>• {res.meeting_datetime.split(" ")[0]}</span>}
                        </div>
                      </div>
                    </div>

                    <div>
                      {canAccessContent ? (
                        <button
                          className={`btn ${isSelected ? "btn-primary" : "btn-outline"} btn-sm`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveResourceId(res.id);
                          }}
                        >
                          {isSelected ? "Now Viewing" : "Select Resource"}
                        </button>
                      ) : (
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>🔒 Locked</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

