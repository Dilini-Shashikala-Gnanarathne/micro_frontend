import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { getBatches, createBatch, updateBatch, deleteBatch } from "../api";
import { useAuth } from "../contexts/AuthContext";

export default function BatchesPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [formData, setFormData] = useState({ name: "", status: "ACTIVE" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await getBatches();
      setBatches(res.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load batches.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (batch = null) => {
    if (batch) {
      setEditingBatch(batch);
      setFormData({ name: batch.name, status: batch.status || "ACTIVE" });
    } else {
      setEditingBatch(null);
      setFormData({ name: "", status: "ACTIVE" });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Batch name is required.");
      return;
    }

    setSaving(true);
    try {
      if (editingBatch) {
        await updateBatch(editingBatch.id, formData);
        toast.success("Batch updated successfully!");
      } else {
        await createBatch(formData);
        toast.success("Batch created successfully!");
      }
      setIsModalOpen(false);
      fetchBatches();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save batch.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (batch) => {
    if (!window.confirm(`Are you sure you want to delete batch "${batch.name}"?`)) {
      return;
    }
    try {
      await deleteBatch(batch.id);
      toast.success("Batch deleted successfully!");
      fetchBatches();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete batch.");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 className="page-title">Academic Batches</h1>
          <p className="page-subtitle">Configure student year batches (e.g. 2026 A/L, 2027 A/L).</p>
        </div>
        {isSuperAdmin && (
          <button className="btn btn-primary" onClick={() => handleOpenModal()}>
            + Create New Batch
          </button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-responsive">
          <table className="table" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Batch Name</th>
                <th>Status</th>
                <th>Created Date</th>
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
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                    No academic batches found.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.id}>
                    <td>
                      <span style={{ fontWeight: 600 }}>{batch.name}</span>
                    </td>
                    <td>
                      <span className={`badge ${batch.status === "ACTIVE" ? "badge-success" : "badge-secondary"}`}>
                        {batch.status || "ACTIVE"}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                        {batch.createdAt ? new Date(batch.createdAt).toLocaleDateString() : "—"}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenModal(batch)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(batch)}
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 450 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingBatch ? "Edit Batch" : "Create New Batch"}</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Batch Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 2026 A/L"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DEACTIVE">DEACTIVE</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving..." : editingBatch ? "Update Batch" : "Create Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
