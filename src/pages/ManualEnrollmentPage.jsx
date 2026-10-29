import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getAdminCourses, getStudents, createManualEnrollment } from "../api";
import toast from "react-hot-toast";

export default function ManualEnrollmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCourseId = searchParams.get("courseId") || "";

  // Course state
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState(preselectedCourseId);

  // Student selection mode: 'search' | 'bulk'
  const [inputMode, setInputMode] = useState("search");

  // Search mode state
  const [searchTerm, setSearchTerm] = useState("");
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [searchedStudents, setSearchedStudents] = useState([]);

  // Bulk ID entry state
  const [bulkIdsText, setBulkIdsText] = useState("");

  // Selected students: Map<studentId, studentObjectOrMinimal>
  const [selectedStudents, setSelectedStudents] = useState(new Map());

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [resultModal, setResultModal] = useState(null);

  // Fetch active courses on load
  useEffect(() => {
    const fetchCourses = async () => {
      setLoadingCourses(true);
      try {
        const res = await getAdminCourses({ status: "ACTIVE", size: 200 });
        const items = res.data?.data?.items || res.data?.data?.data || res.data?.data || [];
        setCourses(items);
        if (preselectedCourseId && !selectedCourseId) {
          setSelectedCourseId(preselectedCourseId);
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load active courses");
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, [preselectedCourseId]);

  // Search students handler
  const handleSearchStudents = async (e) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) {
      setSearchedStudents([]);
      return;
    }
    setSearchingStudents(true);
    try {
      const res = await getStudents({ name: searchTerm.trim(), size: 25 });
      const items = res.data?.data?.items || res.data?.data?.data || res.data?.data || [];
      setSearchedStudents(items);
      if (items.length === 0) {
        toast("No students matched your search criteria.", { icon: "ℹ️" });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to search students");
    } finally {
      setSearchingStudents(false);
    }
  };

  // Toggle single student selection
  const toggleStudent = (student) => {
    const sid = student.id;
    setSelectedStudents((prev) => {
      const next = new Map(prev);
      if (next.has(sid)) {
        next.delete(sid);
      } else {
        next.set(sid, {
          id: sid,
          academicId: student.academicId || student.academic_id || "",
          name: `${student.fname || student.firstName || ""} ${student.lname || student.lastName || ""}`.trim() || student.email || sid,
          email: student.email || "",
          mobile: student.mobile || "",
          status: student.status || "ACTIVE",
        });
      }
      return next;
    });
  };

  // Select all currently searched students
  const handleSelectAllSearched = () => {
    setSelectedStudents((prev) => {
      const next = new Map(prev);
      searchedStudents.forEach((s) => {
        next.set(s.id, {
          id: s.id,
          academicId: s.academicId || s.academic_id || "",
          name: `${s.fname || s.firstName || ""} ${s.lname || s.lastName || ""}`.trim() || s.email || s.id,
          email: s.email || "",
          mobile: s.mobile || "",
          status: s.status || "ACTIVE",
        });
      });
      return next;
    });
  };

  // Deselect all currently searched students
  const handleDeselectAllSearched = () => {
    setSelectedStudents((prev) => {
      const next = new Map(prev);
      searchedStudents.forEach((s) => {
        next.delete(s.id);
      });
      return next;
    });
  };

  // Bulk ID parsing and adding
  const handleAddBulkIds = () => {
    if (!bulkIdsText.trim()) return;
    const rawTokens = bulkIdsText
      .split(/[\r\n,;\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    const uniqueTokens = Array.from(new Set(rawTokens));
    if (uniqueTokens.length === 0) {
      toast.error("Please enter valid student IDs.");
      return;
    }

    setSelectedStudents((prev) => {
      const next = new Map(prev);
      uniqueTokens.forEach((id) => {
        if (!next.has(id)) {
          next.set(id, {
            id,
            academicId: "",
            name: `ID: ${id}`,
            email: "",
            mobile: "",
            status: "UNKNOWN",
          });
        }
      });
      return next;
    });

    setBulkIdsText("");
    toast.success(`Added ${uniqueTokens.length} student ID(s) to selection.`);
  };

  // Remove single student from selection
  const removeSelectedStudent = (id) => {
    setSelectedStudents((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  // Clear all selections
  const handleClearAllSelections = () => {
    setSelectedStudents(new Map());
  };

  // Submit manual enrollment
  const handleSubmitEnrollment = async () => {
    if (!selectedCourseId) {
      toast.error("Please select a target course.");
      return;
    }

    const studentIds = Array.from(selectedStudents.keys());
    if (studentIds.length === 0) {
      toast.error("Please select or add at least one student.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        courseId: selectedCourseId,
        studentIds,
      };

      const res = await createManualEnrollment(payload);
      const resultData = res.data?.data || res.data || {};

      toast.success(res.data?.message || "Enrollments processed successfully!");
      setResultModal(resultData);

      // If all succeeded with no failures, clear selected
      if (!resultData.failed || resultData.failed.length === 0) {
        setSelectedStudents(new Map());
      } else {
        // If some failed, keep only the failed students selected for easy retry/review
        const failedIds = new Set(
          resultData.failed.map((f) => f.student?.id).filter(Boolean)
        );
        setSelectedStudents((prev) => {
          const next = new Map();
          failedIds.forEach((fid) => {
            if (prev.has(fid)) next.set(fid, prev.get(fid));
          });
          return next;
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Failed to process manual enrollments.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const selectedCount = selectedStudents.size;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 style={{ fontWeight: 800, fontSize: "20px" }}>Manual Student Enrollment</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
            Directly enroll students into a course with complimentary access (Admin privilege).
          </p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => navigate("/courses")}
          id="btn-back-courses"
        >
          ← Back to Courses
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", alignItems: "start" }}>
        {/* Left Column: Form Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Step 1: Course Selection */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "var(--primary)",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
              >
                1
              </span>
              <span className="card-title">Select Target Course</span>
            </div>
            <div className="card-body">
              {loadingCourses ? (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-muted)" }}>
                  <div className="spinner spinner-dark" style={{ width: "16px", height: "16px" }} />
                  <span>Loading active courses...</span>
                </div>
              ) : (
                <div>
                  <label className="form-label" htmlFor="manual-course-select" style={{ fontWeight: 600 }}>
                    Target Course <span style={{ color: "var(--danger)" }}>*</span>
                  </label>
                  <select
                    id="manual-course-select"
                    className="form-control"
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    style={{ fontSize: "14px", height: "42px" }}
                  >
                    <option value="">-- Choose Course to Enroll Students Into --</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.code}] {c.name} ({c.medium || "GENERAL"} - {c.courseType || "MONTHLY"})
                      </option>
                    ))}
                  </select>

                  {selectedCourse && (
                    <div
                      style={{
                        marginTop: "14px",
                        padding: "12px 16px",
                        background: "var(--bg)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>
                          {selectedCourse.name}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                          Code: <strong>{selectedCourse.code}</strong> • Type: {selectedCourse.courseType || "Standard"}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <span className="badge badge-primary">{selectedCourse.medium || "SINHALA"}</span>
                        <span className="badge badge-success">ACTIVE</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Student Selection */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "var(--primary)",
                    color: "#fff",
                    fontSize: "12px",
                    fontWeight: 700,
                  }}
                >
                  2
                </span>
                <span className="card-title">Select Students</span>
              </div>

              {/* Mode switch pills */}
              <div style={{ display: "flex", background: "var(--bg)", padding: "2px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background: inputMode === "search" ? "var(--primary)" : "transparent",
                    color: inputMode === "search" ? "#fff" : "var(--text-secondary)",
                    borderRadius: "6px",
                    border: "none",
                    fontWeight: 600,
                    padding: "4px 10px",
                  }}
                  onClick={() => setInputMode("search")}
                >
                  Search Database
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{
                    background: inputMode === "bulk" ? "var(--primary)" : "transparent",
                    color: inputMode === "bulk" ? "#fff" : "var(--text-secondary)",
                    borderRadius: "6px",
                    border: "none",
                    fontWeight: 600,
                    padding: "4px 10px",
                  }}
                  onClick={() => setInputMode("bulk")}
                >
                  Paste Student IDs
                </button>
              </div>
            </div>

            <div className="card-body">
              {inputMode === "search" ? (
                <div>
                  {/* Search bar */}
                  <form onSubmit={handleSearchStudents} style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                    <div style={{ flex: 1, position: "relative" }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search student by Name, Academic ID, Email, NIC or Mobile..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        id="input-student-search"
                        style={{ height: "40px" }}
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={searchingStudents}
                      id="btn-search-student-submit"
                      style={{ height: "40px" }}
                    >
                      {searchingStudents ? "Searching..." : "Search"}
                    </button>
                  </form>

                  {/* Search Results Table */}
                  {searchedStudents.length > 0 && (
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "8px",
                          fontSize: "12.5px",
                        }}
                      >
                        <span style={{ color: "var(--text-secondary)" }}>
                          Found <strong>{searchedStudents.length}</strong> matching students
                        </span>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={handleSelectAllSearched}
                            style={{ padding: "3px 8px", fontSize: "11.5px" }}
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={handleDeselectAllSearched}
                            style={{ padding: "3px 8px", fontSize: "11.5px" }}
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>

                      <div className="table-wrap" style={{ maxHeight: "320px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                        <table>
                          <thead>
                            <tr>
                              <th style={{ width: "36px", textAlign: "center" }}>#</th>
                              <th>Academic ID</th>
                              <th>Student Name</th>
                              <th>Contact</th>
                              <th>Status</th>
                              <th style={{ width: "60px", textAlign: "center" }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {searchedStudents.map((s) => {
                              const isChecked = selectedStudents.has(s.id);
                              return (
                                <tr
                                  key={s.id}
                                  onClick={() => toggleStudent(s)}
                                  style={{
                                    cursor: "pointer",
                                    background: isChecked ? "var(--primary-light)" : "transparent",
                                  }}
                                >
                                  <td style={{ textAlign: "center" }}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {}}
                                      style={{ cursor: "pointer" }}
                                    />
                                  </td>
                                  <td>
                                    <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "12px" }}>
                                      {s.academicId || s.academic_id || "—"}
                                    </span>
                                  </td>
                                  <td>
                                    <div style={{ fontWeight: 600 }}>
                                      {`${s.fname || s.firstName || ""} ${s.lname || s.lastName || ""}`.trim() || "Student"}
                                    </div>
                                    {s.nic && <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>NIC: {s.nic}</div>}
                                  </td>
                                  <td>
                                    <div style={{ fontSize: "12px" }}>{s.email || "—"}</div>
                                    <div style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>{s.mobile || ""}</div>
                                  </td>
                                  <td>
                                    <span className={`badge ${s.status === "ACTIVE" ? "badge-success" : "badge-gray"}`}>
                                      {s.status || "ACTIVE"}
                                    </span>
                                  </td>
                                  <td style={{ textAlign: "center" }}>
                                    <button
                                      type="button"
                                      className={`btn btn-sm ${isChecked ? "btn-danger" : "btn-primary"}`}
                                      style={{ padding: "2px 8px", fontSize: "11px" }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleStudent(s);
                                      }}
                                    >
                                      {isChecked ? "Remove" : "Select"}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {!searchingStudents && searchedStudents.length === 0 && (
                    <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: "13px" }}>
                      Type a name, phone number, or academic ID above to search students from the system.
                    </div>
                  )}
                </div>
              ) : (
                /* Bulk ID Entry */
                <div>
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Enter or Paste Student IDs / User UUIDs
                  </label>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>
                    Paste student IDs separated by commas, spaces, or newlines.
                  </p>
                  <textarea
                    className="form-control"
                    rows={6}
                    placeholder="e.g.&#10;USR_261023164415_123456&#10;USR_261023164415_789012"
                    value={bulkIdsText}
                    onChange={(e) => setBulkIdsText(e.target.value)}
                    style={{ fontFamily: "monospace", fontSize: "12.5px" }}
                  />
                  <div style={{ marginTop: "10px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleAddBulkIds}
                      disabled={!bulkIdsText.trim()}
                    >
                      + Add IDs to Selection
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Enrollment Summary & Action Tray */}
        <div style={{ position: "sticky", top: "20px" }}>
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="card-title">Enrollment Summary</span>
              <span className="badge badge-primary" style={{ fontSize: "12px" }}>
                {selectedCount} Selected
              </span>
            </div>

            <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Selected Course Info */}
              <div>
                <div style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, color: "var(--text-muted)", marginBottom: "4px" }}>
                  Selected Course
                </div>
                {selectedCourse ? (
                  <div style={{ fontSize: "13px", fontWeight: 600 }}>
                    {selectedCourse.name}
                    <div style={{ fontSize: "11.5px", color: "var(--text-muted)", fontWeight: 400 }}>
                      Code: {selectedCourse.code}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: "13px", color: "var(--danger)" }}>
                    ⚠️ No course selected
                  </div>
                )}
              </div>

              <hr style={{ border: "none", borderTop: "1px solid var(--border)" }} />

              {/* Selected Students List */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, color: "var(--text-muted)" }}>
                    Selected Students ({selectedCount})
                  </span>
                  {selectedCount > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllSelections}
                      style={{ background: "none", border: "none", color: "var(--danger)", fontSize: "11.5px", cursor: "pointer", textDecoration: "underline" }}
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {selectedCount === 0 ? (
                  <div style={{ padding: "16px", textAlign: "center", background: "var(--bg)", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", fontSize: "12.5px" }}>
                    No students selected yet.
                  </div>
                ) : (
                  <div
                    style={{
                      maxHeight: "220px",
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                      paddingRight: "4px",
                    }}
                  >
                    {Array.from(selectedStudents.values()).map((s) => (
                      <div
                        key={s.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "6px 10px",
                          background: "var(--bg)",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--border)",
                          fontSize: "12px",
                        }}
                      >
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: "8px" }}>
                          <span style={{ fontWeight: 600 }}>{s.name}</span>
                          {s.academicId && (
                            <span style={{ color: "var(--text-muted)", marginLeft: "4px" }}>
                              ({s.academicId})
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSelectedStudent(s.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            fontSize: "14px",
                            lineHeight: 1,
                            padding: "2px",
                          }}
                          title="Remove student"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="button"
                className="btn btn-primary btn-block btn-lg"
                disabled={submitting || !selectedCourseId || selectedCount === 0}
                onClick={handleSubmitEnrollment}
                id="btn-confirm-manual-enroll"
                style={{ marginTop: "8px" }}
              >
                {submitting ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                    <span className="spinner spinner-white" style={{ width: "16px", height: "16px" }} />
                    Processing...
                  </span>
                ) : (
                  `Enroll ${selectedCount} Student${selectedCount === 1 ? "" : "s"}`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Result Modal */}
      {resultModal && (
        <div className="modal-overlay" onClick={() => setResultModal(null)}>
          <div
            className="modal"
            style={{ maxWidth: "680px", width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title">Manual Enrollment Results</h3>
              <button className="modal-close" onClick={() => setResultModal(null)}>
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Stat counters */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                <div style={{ padding: "14px", borderRadius: "8px", background: "var(--secondary-light)", textAlign: "center" }}>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--secondary)" }}>
                    {resultModal.enrolled?.length || 0}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#03543f" }}>
                    Enrolled (New)
                  </div>
                </div>

                <div style={{ padding: "14px", borderRadius: "8px", background: "var(--primary-light)", textAlign: "center" }}>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--primary)" }}>
                    {resultModal.replaced?.length || 0}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--primary-dark)" }}>
                    Replaced (Pending)
                  </div>
                </div>

                <div style={{ padding: "14px", borderRadius: "8px", background: "var(--danger-light)", textAlign: "center" }}>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--danger)" }}>
                    {resultModal.failed?.length || 0}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#c81e1e" }}>
                    Failed / Skipped
                  </div>
                </div>
              </div>

              {/* Newly Enrolled List */}
              {resultModal.enrolled?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--secondary)", marginBottom: "6px" }}>
                    ✓ Successfully Enrolled ({resultModal.enrolled.length})
                  </h4>
                  <div style={{ maxHeight: "120px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px", padding: "8px 12px", background: "var(--bg)" }}>
                    {resultModal.enrolled.map((item, idx) => (
                      <div key={idx} style={{ padding: "3px 0", display: "flex", justifyContent: "space-between" }}>
                        <span>Student ID: <code style={{ fontWeight: 600 }}>{item.studentId}</code></span>
                        <span style={{ color: "var(--text-muted)" }}>Enrollment: {item.enrollmentId?.slice(0, 8)}...</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Replaced List */}
              {resultModal.replaced?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--primary)", marginBottom: "6px" }}>
                    🔄 Replaced Pending/Unpaid Enrollments ({resultModal.replaced.length})
                  </h4>
                  <div style={{ maxHeight: "120px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "12px", padding: "8px 12px", background: "var(--bg)" }}>
                    {resultModal.replaced.map((item, idx) => (
                      <div key={idx} style={{ padding: "3px 0", display: "flex", justifyContent: "space-between" }}>
                        <span>Student ID: <code style={{ fontWeight: 600 }}>{item.studentId}</code></span>
                        <span style={{ color: "var(--secondary)", fontWeight: 600 }}>Swapped with Free Access</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed List */}
              {resultModal.failed?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: "13.5px", fontWeight: 700, color: "var(--danger)", marginBottom: "6px" }}>
                    ✕ Failed Entries ({resultModal.failed.length})
                  </h4>
                  <div style={{ maxHeight: "160px", overflowY: "auto", border: "1px solid var(--danger-light)", borderRadius: "6px", fontSize: "12px", padding: "8px 12px", background: "var(--bg)" }}>
                    {resultModal.failed.map((item, idx) => (
                      <div key={idx} style={{ padding: "5px 0", borderBottom: idx < resultModal.failed.length - 1 ? "1px solid var(--border)" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {item.student?.firstName || item.student?.lastName
                              ? `${item.student?.firstName || ""} ${item.student?.lastName || ""}`.trim()
                              : `ID: ${item.student?.id || "Unknown"}`}
                          </div>
                          {item.student?.email && <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{item.student.email}</div>}
                        </div>
                        <span className="badge badge-danger" style={{ fontSize: "11.5px" }}>
                          {item.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setResultModal(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setResultModal(null);
                  navigate("/courses");
                }}
              >
                Go to Courses
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

