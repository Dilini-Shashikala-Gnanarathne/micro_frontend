import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { getStudents, getBatches, impersonateStudent, deleteStudent, updateStudentProfile, getPhysicalInstitutes } from "../api";
import { useAuth } from "../contexts/AuthContext";

export default function StudentsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [batchId, setBatchId] = useState("");
  const [status, setStatus] = useState("");
  const [gender, setGender] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("registered_at");
  const [sortDir, setSortDir] = useState("DESC");

  // Selected student details modal
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Edit student modal (Admin-update)
  const [editingStudent, setEditingStudent] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    getBatches()
      .then((res) => setBatches(res.data?.data || []))
      .catch(() => {});
    getPhysicalInstitutes()
      .then((res) => {
        const list = res.data?.data || res.data || [];
        setInstitutes(Array.isArray(list) ? list : []);
      })
      .catch(() => {});
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        size: pageSize,
        sortBy,
        sortDir,
      };

      if (search.trim()) {
        params.name = search.trim();
      }
      if (batchId) params.batchId = batchId;
      if (status) params.status = status;
      if (gender) params.gender = gender;

      const res = await getStudents(params);
      const data = res.data?.data;
      if (data) {
        setStudents(data.data || []);
        setTotalCount(data.total || 0);
      } else {
        setStudents([]);
        setTotalCount(0);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load students.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, sortDir, search, batchId, status, gender]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleImpersonate = async (student) => {
    if (!window.confirm(`Are you sure you want to log in as ${student.name || student.firstName}?`)) {
      return;
    }
    try {
      const res = await impersonateStudent(student.id);
      const studentPayload = res.data?.data;
      if (studentPayload) {
        localStorage.setItem("ak_user", JSON.stringify(studentPayload));
        toast.success(`Logged in as ${student.name || student.firstName}!`);
        window.location.href = "/dashboard";
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to impersonate student.");
    }
  };

  const handleDelete = async (student) => {
    const confirmName = window.prompt(`To permanently delete student account (${student.name}), type 'DELETE':`);
    if (confirmName !== "DELETE") {
      return;
    }
    try {
      await deleteStudent(student.id);
      toast.success("Student account deleted successfully.");
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete student account.");
    }
  };

  const handleOpenEdit = (student) => {
    setEditingStudent({
      id: student.id,
      firstName: student.firstName || (student.name ? student.name.split(" ")[0] : "") || "",
      lastName: student.lastName || (student.name ? student.name.split(" ").slice(1).join(" ") : "") || "",
      gender: student.gender || "MALE",
      whatsappNumber: student.whatsappNumber || "",
      profileUrl: student.profileUrl || "",
      homeAddressLine1: student.homeAddress?.line1 || "",
      homeAddressLine2: student.homeAddress?.line2 || "",
      homeCityId: student.homeAddress?.cityId || 1,
      deliveryAddressLine1: student.deliveryAddress?.line1 || "",
      deliveryAddressLine2: student.deliveryAddress?.line2 || "",
      deliveryCityId: student.deliveryAddress?.cityId || 1,
      school: student.school || "",
      guardianName: student.guardianName || "",
      guardianMobile: student.guardianMobile || "",
      guardianType: student.guardianType || "FATHER",
      medium: student.medium || "SINHALA",
      dob: student.dob || "2000-01-01",
      enrollDate: student.enrolledDate || student.enrollDate || new Date().toISOString().split("T")[0],
      batchId: student.batchId || "",
      instituteId: student.instituteId || "",
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;
    setSavingEdit(true);
    try {
      const payload = {
        id: editingStudent.id,
        firstName: editingStudent.firstName || "",
        lastName: editingStudent.lastName || "",
        gender: editingStudent.gender || "MALE",
        whatsappNumber: editingStudent.whatsappNumber || "",
        profileUrl: editingStudent.profileUrl || "",
        homeAddressLine1: editingStudent.homeAddressLine1 || "",
        homeAddressLine2: editingStudent.homeAddressLine2 || "",
        homeCityId: parseInt(editingStudent.homeCityId, 10) || 1,
        deliveryAddressLine1: editingStudent.deliveryAddressLine1 || "",
        deliveryAddressLine2: editingStudent.deliveryAddressLine2 || "",
        deliveryCityId: parseInt(editingStudent.deliveryCityId, 10) || 1,
        school: editingStudent.school || "",
        guardianName: editingStudent.guardianName || "",
        guardianMobile: editingStudent.guardianMobile || "",
        guardianType: editingStudent.guardianType || "FATHER",
        medium: editingStudent.medium || "SINHALA",
        dob: editingStudent.dob || "2000-01-01",
        enrollDate: editingStudent.enrollDate || new Date().toISOString().split("T")[0],
        batchId: editingStudent.batchId || "",
        instituteId: editingStudent.instituteId ? editingStudent.instituteId : null,
      };

      await updateStudentProfile(payload);
      toast.success("Student details updated successfully!");
      setEditingStudent(null);
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update student profile.");
    } finally {
      setSavingEdit(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Student Accounts Directory</h1>
          <p className="page-subtitle">Search, manage and inspect all registered students.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: 20, padding: 15 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: 12 }}>Search by Name</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search student name..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: 12 }}>Batch</label>
            <select
              className="form-control form-control-sm"
              value={batchId}
              onChange={(e) => { setBatchId(e.target.value); setPage(1); }}
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: 12 }}>Account Status</label>
            <select
              className="form-control form-control-sm"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="DEACTIVE">DEACTIVE</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: 12 }}>Gender</label>
            <select
              className="form-control form-control-sm"
              value={gender}
              onChange={(e) => { setGender(e.target.value); setPage(1); }}
            >
              <option value="">All</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>

          <div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearch("");
                setBatchId("");
                setStatus("");
                setGender("");
                setPage(1);
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-responsive">
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Academic ID</th>
                <th>Student Name</th>
                <th>Contact</th>
                <th>Batch</th>
                <th>Status</th>
                <th>Registered</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px 0" }}>
                    <div className="spinner" style={{ margin: "0 auto" }} />
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                    No student records found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <span style={{ fontWeight: 600, fontFamily: "monospace", fontSize: 12 }}>
                        {student.academicId || "N/A"}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{student.name || `${student.firstName} ${student.lastName}`}</div>
                      <small style={{ color: "var(--text-muted)", fontSize: 11 }}>
                        NIC: {student.nic || "—"} | {student.gender || "—"}
                      </small>
                    </td>
                    <td>
                      <div>{student.mobile || "—"}</div>
                      <small style={{ color: "var(--text-muted)", fontSize: 11 }}>{student.email || "—"}</small>
                    </td>
                    <td>{student.batchName || "—"}</td>
                    <td>
                      <span className={`badge ${student.status === "ACTIVE" ? "badge-success" : "badge-secondary"}`}>
                        {student.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {student.registeredAt ? new Date(student.registeredAt).toLocaleDateString() : "—"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedStudent(student)}
                          title="View Full Profile Details"
                        >
                          View
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEdit(student)}
                          title="Edit Student Profile & Institute"
                        >
                          Edit
                        </button>
                        {isSuperAdmin && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleImpersonate(student)}
                            title="Log in to this student's account"
                          >
                            Impersonate
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(student)}
                            title="Delete Student Account"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Showing {students.length} of {totalCount} students
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <span style={{ padding: "5px 10px", fontSize: 13, fontWeight: 600 }}>
              {page} / {totalPages}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Student Details Inspection Modal */}
      {selectedStudent && (
        <div className="modal-backdrop" onClick={() => setSelectedStudent(null)}>
          <div className="modal-content" style={{ maxWidth: 650 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Student Information: {selectedStudent.name}</h3>
              <button className="modal-close" onClick={() => setSelectedStudent(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginBottom: 15 }}>
                <div><strong>Academic ID:</strong> {selectedStudent.academicId || "N/A"}</div>
                <div><strong>Batch:</strong> {selectedStudent.batchName || "N/A"}</div>
                <div><strong>Mobile:</strong> {selectedStudent.mobile || "N/A"}</div>
                <div><strong>WhatsApp:</strong> {selectedStudent.whatsappNumber || "N/A"}</div>
                <div><strong>Email:</strong> {selectedStudent.email || "N/A"}</div>
                <div><strong>NIC:</strong> {selectedStudent.nic || "N/A"}</div>
                <div><strong>Medium:</strong> {selectedStudent.medium || "N/A"}</div>
                <div><strong>School:</strong> {selectedStudent.school || "N/A"}</div>
                <div><strong>Guardian:</strong> {selectedStudent.guardianName || "N/A"} ({selectedStudent.guardianType || "—"})</div>
                <div><strong>Guardian Mobile:</strong> {selectedStudent.guardianMobile || "N/A"}</div>
                <div><strong>Physical Institute:</strong> {selectedStudent.instituteName || "Online Only"}</div>
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Home Address</h4>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                  {selectedStudent.homeAddress?.line1
                    ? `${selectedStudent.homeAddress.line1}, ${selectedStudent.homeAddress.line2 || ""}, ${selectedStudent.homeAddress.cityName || ""} (${selectedStudent.homeAddress.districtName || ""})`
                    : "No home address registered."}
                </p>
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>
                <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Delivery Address</h4>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                  {selectedStudent.deliveryAddress?.line1
                    ? `${selectedStudent.deliveryAddress.line1}, ${selectedStudent.deliveryAddress.line2 || ""}, ${selectedStudent.deliveryAddress.cityName || ""} (${selectedStudent.deliveryAddress.districtName || ""})`
                    : "No delivery address registered."}
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedStudent(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Student Edit Modal (Admin-update via PUT /api/user/student/profile) */}
      {editingStudent && (
        <div className="modal-backdrop" onClick={() => !savingEdit && setEditingStudent(null)}>
          <div className="modal-content" style={{ maxWidth: 700 }} onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-header">
                <h3 className="modal-title">Edit Student Profile: {editingStudent.firstName} {editingStudent.lastName}</h3>
                <button type="button" className="modal-close" onClick={() => !savingEdit && setEditingStudent(null)}>×</button>
              </div>
              <div className="modal-body" style={{ maxHeight: "70vh", overflowY: "auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 12 }}>First Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editingStudent.firstName}
                      onChange={(e) => setEditingStudent({ ...editingStudent, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 12 }}>Last Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editingStudent.lastName}
                      onChange={(e) => setEditingStudent({ ...editingStudent, lastName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 12 }}>Academic Batch *</label>
                    <select
                      className="form-control"
                      value={editingStudent.batchId}
                      onChange={(e) => setEditingStudent({ ...editingStudent, batchId: e.target.value })}
                      required
                    >
                      <option value="">Select Batch...</option>
                      {batches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 12 }}>Physical Institute</label>
                    <select
                      className="form-control"
                      value={editingStudent.instituteId || ""}
                      onChange={(e) => setEditingStudent({ ...editingStudent, instituteId: e.target.value || null })}
                    >
                      <option value="">No Physical Institute (Online Only)</option>
                      {institutes.map((inst) => (
                        <option key={inst.id} value={inst.id}>{inst.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 12 }}>WhatsApp Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editingStudent.whatsappNumber}
                      onChange={(e) => setEditingStudent({ ...editingStudent, whatsappNumber: e.target.value })}
                      placeholder="07xxxxxxxx"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 12 }}>Medium *</label>
                    <select
                      className="form-control"
                      value={editingStudent.medium}
                      onChange={(e) => setEditingStudent({ ...editingStudent, medium: e.target.value })}
                    >
                      <option value="SINHALA">Sinhala</option>
                      <option value="ENGLISH">English</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 12 }}>Gender *</label>
                    <select
                      className="form-control"
                      value={editingStudent.gender}
                      onChange={(e) => setEditingStudent({ ...editingStudent, gender: e.target.value })}
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 12 }}>School</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editingStudent.school}
                      onChange={(e) => setEditingStudent({ ...editingStudent, school: e.target.value })}
                      placeholder="Current School"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 12 }}>Guardian Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editingStudent.guardianName}
                      onChange={(e) => setEditingStudent({ ...editingStudent, guardianName: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 12 }}>Guardian Mobile</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editingStudent.guardianMobile}
                      onChange={(e) => setEditingStudent({ ...editingStudent, guardianMobile: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: 12 }}>Guardian Type</label>
                    <select
                      className="form-control"
                      value={editingStudent.guardianType}
                      onChange={(e) => setEditingStudent({ ...editingStudent, guardianType: e.target.value })}
                    >
                      <option value="FATHER">Father</option>
                      <option value="MOTHER">Mother</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={savingEdit}
                  onClick={() => setEditingStudent(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingEdit}
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
