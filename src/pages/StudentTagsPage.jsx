import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getStudentTags, createStudentTag, updateStudentTag, deleteStudentTag } from "../api";
import { useAuth } from "../contexts/AuthContext";

export default function StudentTagsPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [formData, setFormData] = useState({ code: "", name: "", isActive: 1 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const res = await getStudentTags();
      setTags(res.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load tags.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (tag = null) => {
    if (tag) {
      setEditingTag(tag);
      setFormData({
        code: tag.code || "",
        name: tag.name || "",
        isActive: tag.isActive !== undefined ? tag.isActive : 1,
      });
    } else {
      setEditingTag(null);
      setFormData({ code: "", name: "", isActive: 1 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingTag) {
        await updateStudentTag(editingTag.id, {
          id: editingTag.id,
          name: formData.name,
          isActive: parseInt(formData.isActive),
        });
        toast.success("Tag updated successfully!");
      } else {
        await createStudentTag({
          code: formData.code,
          name: formData.name,
        });
        toast.success("Tag created successfully!");
      }
      setIsModalOpen(false);
      fetchTags();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save tag.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tag) => {
    if (!window.confirm(`Are you sure you want to permanently delete tag "${tag.name}" (${tag.code})?`)) {
      return;
    }
    try {
      await deleteStudentTag(tag.id);
      toast.success("Tag deleted successfully!");
      fetchTags();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete tag.");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Student Category Tags</h1>
          <p className="page-subtitle">Manage special student labels and categorization codes.</p>
        </div>
        {isSuperAdmin && (
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            + Create New Tag
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-responsive">
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Code</th>
                <th>Tag Name</th>
                <th>Status</th>
                {isSuperAdmin && <th style={{ textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "40px 0" }}>
                    <div className="spinner" style={{ margin: "0 auto" }} />
                  </td>
                </tr>
              ) : tags.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                    No student tags found.
                  </td>
                </tr>
              ) : (
                tags.map((tag) => (
                  <tr key={tag.id}>
                    <td>
                      <span style={{ fontWeight: 600, fontFamily: "monospace", fontSize: 13, background: "rgba(0,0,0,0.05)", padding: "2px 6px", borderRadius: 4 }}>
                        {tag.code}
                      </span>
                    </td>
                    <td>{tag.name}</td>
                    <td>
                      <span className={`badge ${tag.isActive ? "badge-success" : "badge-secondary"}`}>
                        {tag.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenModal(tag)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(tag)}
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
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 450 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingTag ? "Edit Tag" : "Create New Tag"}</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tag Code * (Max 5 chars)</label>
                  <input
                    type="text"
                    maxLength={5}
                    className="form-control"
                    placeholder="e.g. VIP, DIS"
                    value={formData.code}
                    disabled={!!editingTag}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    required
                  />
                  {editingTag && <small style={{ color: "var(--text-muted)", fontSize: 11 }}>Code cannot be changed.</small>}
                </div>
                <div className="form-group">
                  <label className="form-label">Tag Name *</label>
                  <input
                    type="text"
                    maxLength={30}
                    className="form-control"
                    placeholder="e.g. Special Discount Student"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                {editingTag && (
                  <div className="form-group">
                    <label className="form-label">Active Status</label>
                    <select
                      className="form-control"
                      value={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: parseInt(e.target.value) })}
                    >
                      <option value={1}>ACTIVE</option>
                      <option value={0}>INACTIVE</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving..." : editingTag ? "Update Tag" : "Create Tag"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
