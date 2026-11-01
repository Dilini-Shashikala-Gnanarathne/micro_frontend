import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getStudentMeetings } from "../api";
import toast from "react-hot-toast";

export default function MyMeetingsPage() {
  const navigate = useNavigate();

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState("all"); // 'all' | 'live' | 'upcoming' | 'recent'

  // Fetch student meetings
  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStudentMeetings();
      const data = res.data?.data || res.data || [];
      setMeetings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load meetings:", err);
      toast.error(err.response?.data?.message || "Failed to load live meetings.");
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  // Determine Meeting Timing Status relative to NOW
  const getMeetingStatus = (meetingDatetime) => {
    if (!meetingDatetime) return { status: "UPCOMING", label: "Scheduled", color: "badge-gray" };

    const now = new Date().getTime();
    const meetingTime = new Date(meetingDatetime.replace(/-/g, "/")).getTime();
    const diffMs = meetingTime - now;
    const diffHours = diffMs / (1000 * 60 * 60);

    // Active join window: between 30 mins before and up to 3 hours after start
    if (diffHours >= -3 && diffHours <= 0.5) {
      return { status: "LIVE", label: "🔴 LIVE NOW / IN PROGRESS", color: "badge-danger", isLive: true };
    }
    // Starts today soon
    if (diffHours > 0.5 && diffHours <= 6) {
      const mins = Math.round(diffMs / (1000 * 60));
      return {
        status: "SOON",
        label: `⏳ Starts in ${mins > 60 ? `${Math.round(diffHours)}h` : `${mins}m`}`,
        color: "badge-warning",
        isLive: false,
      };
    }
    // Future upcoming
    if (diffHours > 6) {
      return { status: "UPCOMING", label: "📅 Upcoming", color: "badge-primary", isLive: false };
    }
    // Past recent (between -6 hours and -3 hours)
    return { status: "ENDED", label: "✓ Ended", color: "badge-gray", isLive: false };
  };

  // Filter meetings
  const filteredMeetings = meetings.filter((item) => {
    const lessonName = item.lesson?.name || "";
    const courseName = item.course?.name || "";
    const resourceName = item.resource?.name || "";

    const matchesSearch =
      !search.trim() ||
      lessonName.toLowerCase().includes(search.toLowerCase()) ||
      courseName.toLowerCase().includes(search.toLowerCase()) ||
      resourceName.toLowerCase().includes(search.toLowerCase());

    const statusObj = getMeetingStatus(item.resource?.meeting_datetime || item.resource?.meetingDatetime);

    let matchesTab = true;
    if (filterTab === "live") matchesTab = statusObj.status === "LIVE" || statusObj.status === "SOON";
    if (filterTab === "upcoming") matchesTab = statusObj.status === "UPCOMING" || statusObj.status === "SOON";
    if (filterTab === "recent") matchesTab = statusObj.status === "ENDED";

    return matchesSearch && matchesTab;
  });

  return (
    <div style={{ padding: "24px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "4px" }}>
            Live Online Classes & Meetings
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "13.5px" }}>
            Showing interactive sessions starting between <strong>-6 Hours</strong> and <strong>+3 Days</strong> from now
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-outline" onClick={fetchMeetings} disabled={loading} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            🔄 Refresh Sessions
          </button>
          <button className="btn btn-outline" onClick={() => navigate("/my-lessons")}>
            📋 Enrolled Lessons
          </button>
          <button className="btn btn-outline" onClick={() => navigate("/my-courses")}>
            🎓 Enrolled Courses
          </button>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div
        style={{
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "24px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* Tabs */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            className={`btn ${filterTab === "all" ? "btn-primary" : "btn-outline"} btn-sm`}
            onClick={() => setFilterTab("all")}
          >
            All Sessions ({meetings.length})
          </button>
          <button
            className={`btn ${filterTab === "live" ? "btn-primary" : "btn-outline"} btn-sm`}
            onClick={() => setFilterTab("live")}
          >
            🔴 Live / Starting Soon
          </button>
          <button
            className={`btn ${filterTab === "upcoming" ? "btn-primary" : "btn-outline"} btn-sm`}
            onClick={() => setFilterTab("upcoming")}
          >
            📅 Upcoming (Next 3 Days)
          </button>
          <button
            className={`btn ${filterTab === "recent" ? "btn-primary" : "btn-outline"} btn-sm`}
            onClick={() => setFilterTab("recent")}
          >
            ✓ Past 6 Hours
          </button>
        </div>

        {/* Search */}
        <div style={{ flex: "0 1 280px" }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search meeting, lesson, course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ fontSize: "13px", padding: "6px 12px" }}
          />
        </div>
      </div>

      {/* Meetings List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div className="spinner" style={{ margin: "0 auto 12px" }}></div>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Checking live classrooms & schedules...</p>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: "16px",
            padding: "48px 24px",
            textAlign: "center",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ fontSize: "44px", marginBottom: "12px" }}>🗓️</div>
          <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
            No Meetings Found
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "13.5px", maxWidth: "480px", margin: "0 auto 20px" }}>
            There are no live meetings scheduled within the current window (-6 hours to +3 days) for your enrolled classes.
          </p>
          <button className="btn btn-outline" onClick={() => navigate("/my-courses")}>
            Browse My Courses
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
          {filteredMeetings.map((item, idx) => {
            const meetingDt = item.resource?.meeting_datetime || item.resource?.meetingDatetime;
            const statusObj = getMeetingStatus(meetingDt);

            return (
              <div
                key={item.resource?.id || idx}
                style={{
                  background: "#fff",
                  border: statusObj.isLive ? "2px solid #ef4444" : "1px solid var(--border)",
                  borderRadius: "14px",
                  overflow: "hidden",
                  boxShadow: statusObj.isLive ? "0 4px 20px rgba(239, 68, 68, 0.15)" : "var(--shadow-sm)",
                  display: "flex",
                  flexDirection: "column",
                  transition: "var(--transition)",
                }}
              >
                {/* Card Top: Timing & Live Badge */}
                <div
                  style={{
                    background: statusObj.isLive ? "#fef2f2" : "#f8fafc",
                    borderBottom: "1px solid var(--border)",
                    padding: "12px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span className={`badge ${statusObj.color}`} style={{ fontSize: "11px", fontWeight: 700 }}>
                    {statusObj.label}
                  </span>

                  <span style={{ fontSize: "12.5px", fontWeight: 700, color: statusObj.isLive ? "#991b1b" : "var(--text-primary)" }}>
                    {meetingDt ? meetingDt.replace("T", " ").slice(0, 16) : "Date Pending"}
                  </span>
                </div>

                {/* Card Body */}
                <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", flex: 1, gap: "10px" }}>
                  {/* Course Tags */}
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)", background: "var(--primary-light)", padding: "2px 6px", borderRadius: "4px" }}>
                      {item.course?.code || "COURSE"}
                    </span>
                    {item.course?.medium && (
                      <span style={{ fontSize: "11px", color: "#475569", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                        {item.course.medium}
                      </span>
                    )}
                    {item.course?.batch_name && (
                      <span style={{ fontSize: "11px", color: "#d97706", background: "#fef3c7", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                        {item.course.batch_name}
                      </span>
                    )}
                  </div>

                  {/* Course Name */}
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>
                    {item.course?.name}
                  </div>

                  {/* Lesson Title */}
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", margin: "0", lineHeight: 1.35 }}>
                    {item.lesson?.name || "Live Session"}
                  </h3>

                  {/* Resource Name / Description */}
                  <div style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
                    <strong>Session:</strong> {item.resource?.name || "Meeting Room"}
                  </div>

                  {item.lesson?.note && (
                    <div style={{ background: "#fffbeb", borderLeft: "3px solid #f59e0b", padding: "6px 10px", borderRadius: "0 6px 6px 0", fontSize: "12px", color: "#92400e" }}>
                      {item.lesson.note}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ marginTop: "auto", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    {item.resource?.url ? (
                      <a
                        href={item.resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`btn ${statusObj.isLive ? "btn-danger" : "btn-primary"} btn-block`}
                        style={{ textAlign: "center", fontWeight: 700, display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}
                      >
                        <span>🚀</span>
                        <span>{statusObj.isLive ? "Join Live Classroom Now" : "Launch Meeting Link"}</span>
                      </a>
                    ) : (
                      <button className="btn btn-secondary btn-block" disabled>
                        Meeting Link Not Yet Available
                      </button>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      {item.lesson?.id && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => navigate(`/my-lessons/${item.lesson.id}`)}
                          style={{ fontSize: "11.5px" }}
                        >
                          📖 Lesson Materials
                        </button>
                      )}
                      {item.course?.id && (
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => navigate(`/my-courses/${item.course.id}`)}
                          style={{ fontSize: "11.5px" }}
                        >
                          🎓 Full Course
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

