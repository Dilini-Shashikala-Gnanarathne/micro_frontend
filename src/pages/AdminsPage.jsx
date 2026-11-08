import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { getAdmins, createAdmin, updateAdmin, deleteAdmin, updateUserStatus, forceResetPassword } from "../api";
import { useAuth } from "../contexts/AuthContext";

export default function AdminsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: "",
    lastName: "",
    mobile: "",
    nic: "",
    password: "",
    role: "SUB_ADMIN",
  });
  const [saving, setSaving] = useState(false);

  // Reset Password Modal
  const [resetModalAdmin, setResetModalAdmin] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        size: pageSize,
      };
      if (keyword.trim()) params.keyword = keyword.trim();
      if (role) params.role = role;
      if (status) params.status = status;

      const res = await getAdmins(params);
      const data = res.data?.data;
      if (data) {
        setAdmins(data.data || []);
        setTotalCount(data.total || 0);
      } else {
        setAdmins([]);
        setTotalCount(0);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load staff accounts.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, role, status]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createAdmin(createForm);
      toast.success("Administrator account created successfully!");
      setIsCreateModalOpen(false);
      setCreateForm({
        firstName: "",
        lastName: "",
        mobile: "",
        nic: "",
        password: "",
        role: "SUB_ADMIN",
      });
      fetchAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create administrator account.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (admin) => {
    const newStatus = admin.status === "ACTIVE" ? "DEACTIVE" : "ACTIVE";
    if (!window.confirm(`Change status of ${admin.firstName} ${admin.lastName} to ${newStatus}?`)) {
      return;
    }
    try {
      await updateUserStatus(admin.userId || admin.id, newStatus);
      toast.success(`User status updated to ${newStatus}.`);
      fetchAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status.");
    }
  };

  const handleForceResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    setResetting(true);
    try {
      await forceResetPassword(resetModalAdmin.userId || resetModalAdmin.id, newPassword);
      toast.success("Password reset successfully!");
      setResetModalAdmin(null);
      setNewPassword("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password.");
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async (admin) => {
    if (!window.confirm(`Are you sure you want to delete administrator "${admin.firstName} ${admin.lastName}"?`)) {
      return;
    }
    try {
      await deleteAdmin(admin.userId || admin.id);
      toast.success("Admin deleted successfully!");
      fetchAdmins();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete admin.");
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Administrative Staff</h1>
          <p className="page-subtitle">Manage administrative accounts, role privileges, and security.</p>
        </div>
        {isSuperAdmin && (
          <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
            + Create Administrator
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: 20, padding: 15 }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: 12 }}>Search</label>
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search by name, mobile, nic..."
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: 12 }}>Role</label>
            <select
              className="form-control form-control-sm"
              value={role}
              onChange={(e) => { setRole(e.target.value); setPage(1); }}
            >
              <option value="">All Roles</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="SUB_ADMIN">SUB_ADMIN</option>
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: 12 }}>Status</label>
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

          <div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setKeyword("");
                setRole("");
                setStatus("");
                setPage(1);
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-responsive">
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Status</th>
                <th>Registered</th>
                {isSuperAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "40px 0" }}>
                    <div className="spinner" style={{ margin: "0 auto" }} />
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                    No administrators found matching criteria.
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id || admin.userId}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{admin.firstName} {admin.lastName}</div>
                      <small style={{ color: "var(--text-muted)", fontSize: 11 }}>NIC: {admin.nic || "—"}</small>
                    </td>
                    <td>
                      <div>{admin.mobile || "—"}</div>
                      <small style={{ color: "var(--text-muted)", fontSize: 11 }}>{admin.email || "—"}</small>
                    </td>
                    <td>
                      <span className={`badge ${admin.role === "SUPER_ADMIN" ? "badge-primary" : "badge-purple"}`}>
                        {admin.role}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${admin.status === "ACTIVE" ? "badge-success" : "badge-secondary"}`}>
                        {admin.status}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {admin.registeredAt ? new Date(admin.registeredAt).toLocaleDateString() : "—"}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleToggleStatus(admin)}
                            title="Toggle Account Active/Deactive"
                          >
                            {admin.status === "ACTIVE" ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => { setResetModalAdmin(admin); setNewPassword(""); }}
                            title="Reset User Password"
                          >
                            Reset Pass
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(admin)}
                            title="Delete Admin Account"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderTop: "1px solid var(--border)" }}>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Showing {admins.length} of {totalCount} staff members
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

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Administrator Account</h3>
              <button className="modal-close" onClick={() => setIsCreateModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">First Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={createForm.firstName}
                      onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={createForm.lastName}
                      onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="07xxxxxxxx"
                      value={createForm.mobile}
                      onChange={(e) => setCreateForm({ ...createForm, mobile: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">NIC *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="National ID"
                      value={createForm.nic}
                      onChange={(e) => setCreateForm({ ...createForm, nic: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    className="form-control"
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  >
                    <option value="SUB_ADMIN">SUB_ADMIN</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Temporary Password * (Min 8 chars)</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Must include lowercase and special character"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Creating..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Force Reset Password Modal */}
      {resetModalAdmin && (
        <div className="modal-backdrop" onClick={() => setResetModalAdmin(null)}>
          <div className="modal-content" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Force Reset Password</h3>
              <button className="modal-close" onClick={() => setResetModalAdmin(null)}>×</button>
            </div>
            <form onSubmit={handleForceResetPassword}>
              <div className="modal-body">
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 15 }}>
                  Set a new password for <strong>{resetModalAdmin.firstName} {resetModalAdmin.lastName}</strong>.
                </p>
                <div className="form-group">
                  <label className="form-label">New Password *</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Enter new password (min 8 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setResetModalAdmin(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={resetting}>
                  {resetting ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
