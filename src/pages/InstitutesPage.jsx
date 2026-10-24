import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  getPhysicalInstitutes,
  createPhysicalInstitute,
  updatePhysicalInstitute,
  deletePhysicalInstitute,
} from '../api';
import { useAuth } from '../contexts/AuthContext';

const INITIAL_FORM = {
  name: '',
  address: '',
  locationUrl: '',
  isActive: 1,
};

export default function InstitutesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN';

  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Delete modal state
  const [deletingInstitute, setDeletingInstitute] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchInstitutes = async () => {
    setLoading(true);
    try {
      const res = await getPhysicalInstitutes();
      const data = res.data?.data || res.data || [];
      setInstitutes(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch physical institutes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstitutes();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (inst) => {
    setEditingId(inst.id);
    setFormData({
      name: inst.name || '',
      address: inst.address || '',
      locationUrl: inst.locationUrl || inst.location_url || '',
      isActive: Number(inst.isActive ?? inst.is_active ?? 1),
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) {
      errors.name = 'Institute name is required.';
    } else if (formData.name.length > 150) {
      errors.name = 'Institute name must not exceed 150 characters.';
    }

    if (!formData.address.trim()) {
      errors.address = 'Physical address is required.';
    }

    if (formData.locationUrl.trim()) {
      if (formData.locationUrl.length > 255) {
        errors.locationUrl = 'Location URL must not exceed 255 characters.';
      } else {
        try {
          const url = new URL(formData.locationUrl);
          if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            errors.locationUrl = 'URL must start with http:// or https://';
          }
        } catch (_) {
          errors.locationUrl = 'Please enter a valid URL (e.g. https://maps.google.com/...)';
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        locationUrl: formData.locationUrl.trim() || null,
        isActive: Number(formData.isActive),
      };

      if (editingId) {
        await updatePhysicalInstitute(editingId, payload);
        toast.success('Physical institute updated successfully!');
      } else {
        await createPhysicalInstitute(payload);
        toast.success('Physical institute created successfully!');
      }
      closeModal();
      fetchInstitutes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingInstitute) return;
    setIsDeleting(true);
    try {
      await deletePhysicalInstitute(deletingInstitute.id);
      toast.success(deletingInstitute.name + ' deleted successfully.');
      setDeletingInstitute(null);
      fetchInstitutes();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete institute');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredInstitutes = useMemo(() => {
    return institutes.filter((inst) => {
      const matchesSearch =
        (inst.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (inst.address || '').toLowerCase().includes(searchTerm.toLowerCase());

      const activeVal = Number(inst.isActive ?? inst.is_active ?? 1);
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && activeVal === 1) ||
        (statusFilter === 'INACTIVE' && activeVal === 0);

      return matchesSearch && matchesStatus;
    });
  }, [institutes, searchTerm, statusFilter]);

  const activeCount = institutes.filter(
    (i) => Number(i.isActive ?? i.is_active ?? 1) === 1
  ).length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header section */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h2 style={{ fontWeight: 800, fontSize: '22px', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Physical Institutes & Centers
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', margin: 0 }}>
            Manage physical lecture institutes and tute collection centers
          </p>
        </div>

        {isAdmin && (
          <button
            className="btn btn-primary"
            onClick={openCreateModal}
            id="btn-create-institute"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add New Institute
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="label">Total Institutes</span>
            <span className="value">{institutes.length}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="label">Active Centers</span>
            <span className="value">{activeCount}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div className="stat-info">
            <span className="label">Tute Delivery Points</span>
            <span className="value">{activeCount}</span>
          </div>
        </div>
      </div>

      {/* Main Card with filters & table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div className="card-title" style={{ fontSize: '15px' }}>
            Registered Physical Centers
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '240px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }}
                id="input-search-institute"
              />
              <svg
                width="16"
                height="16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
                style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Filter status */}
            <select
              className="form-control"
              style={{ width: '130px', height: '36px', fontSize: '13px' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              id="select-status-filter"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ margin: '0 auto 12px auto' }}></div>
              <p style={{ margin: 0 }}>Loading physical institutes...</p>
            </div>
          ) : filteredInstitutes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  color: 'var(--text-muted)',
                }}
              >
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h4 style={{ margin: '0 0 6px 0', fontWeight: 600 }}>No Physical Institutes Found</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 16px 0' }}>
                {searchTerm || statusFilter !== 'ALL'
                  ? 'No centers match your search criteria.'
                  : 'Start by adding your first physical classroom / tute pickup institute.'}
              </p>
              {isAdmin && !searchTerm && statusFilter === 'ALL' && (
                <button className="btn btn-primary btn-sm" onClick={openCreateModal}>
                  + Add First Institute
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ width: '25%', padding: '12px 16px' }}>Institute Name</th>
                  <th style={{ width: '35%', padding: '12px 16px' }}>Address</th>
                  <th style={{ width: '15%', padding: '12px 16px' }}>Location Map</th>
                  <th style={{ width: '12%', padding: '12px 16px' }}>Status</th>
                  {isAdmin && <th style={{ width: '13%', padding: '12px 16px', textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredInstitutes.map((inst) => {
                  const isActive = Number(inst.isActive ?? inst.is_active ?? 1) === 1;
                  const locUrl = inst.locationUrl || inst.location_url;

                  return (
                    <tr key={inst.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '2px' }}>
                          {inst.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {inst.id.slice(0, 8)}...</div>
                      </td>

                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                          {inst.address}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        {locUrl ? (
                          <a
                            href={locUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline btn-sm"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 10px',
                              fontSize: '12px',
                              textDecoration: 'none',
                            }}
                          >
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            View Map
                          </a>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Not specified</span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                        <span className={'badge ' + (isActive ? 'badge-success' : 'badge-gray')}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {isAdmin && (
                        <td style={{ padding: '14px 16px', verticalAlign: 'top', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 10px', fontSize: '12px' }}
                              onClick={() => openEditModal(inst)}
                              id={'btn-edit-' + inst.id}
                              title="Edit Institute"
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                              onClick={() => setDeletingInstitute(inst)}
                              id={'btn-delete-' + inst.id}
                              title="Delete Institute"
                            >
                              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal"
            style={{ maxWidth: '540px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '16px', fontWeight: 700 }}>
                {editingId ? 'Edit Physical Institute' : 'Add Physical Institute'}
              </h3>
              <button className="modal-close" onClick={closeModal} disabled={submitting}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Institute Name */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Institute Name <strong style={{ color: '#ef4444' }}>*</strong></span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {formData.name.length}/150
                    </span>
                  </label>
                  <input
                    type="text"
                    className={'form-control ' + (formErrors.name ? 'error' : '')}
                    placeholder="e.g. Rotary Hall Nugegoda"
                    value={formData.name}
                    maxLength={150}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      if (formErrors.name) setFormErrors({ ...formErrors, name: null });
                    }}
                    id="input-institute-name"
                    autoFocus
                  />
                  {formErrors.name && <div className="form-error">{formErrors.name}</div>}
                </div>

                {/* Address */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    Physical Address <strong style={{ color: '#ef4444' }}>*</strong>
                  </label>
                  <textarea
                    rows={3}
                    className={'form-control ' + (formErrors.address ? 'error' : '')}
                    placeholder="e.g. No. 12, High Level Road, Nugegoda"
                    value={formData.address}
                    onChange={(e) => {
                      setFormData({ ...formData, address: e.target.value });
                      if (formErrors.address) setFormErrors({ ...formErrors, address: null });
                    }}
                    id="input-institute-address"
                    style={{ resize: 'vertical' }}
                  />
                  {formErrors.address && <div className="form-error">{formErrors.address}</div>}
                </div>

                {/* Location URL */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Google Maps / Location URL (Optional)</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {formData.locationUrl.length}/255
                    </span>
                  </label>
                  <input
                    type="url"
                    className={'form-control ' + (formErrors.locationUrl ? 'error' : '')}
                    placeholder="https://maps.google.com/?q=..."
                    value={formData.locationUrl}
                    maxLength={255}
                    onChange={(e) => {
                      setFormData({ ...formData, locationUrl: e.target.value });
                      if (formErrors.locationUrl) setFormErrors({ ...formErrors, locationUrl: null });
                    }}
                    id="input-institute-location-url"
                  />
                  {formErrors.locationUrl ? (
                    <div className="form-error">{formErrors.locationUrl}</div>
                  ) : (
                    <div className="form-hint">Students can open this link to find the location for physical classes and tute pickup.</div>
                  )}
                </div>

                {/* Status Selection */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Active Status</label>
                  <div style={{ display: 'flex', gap: '20px', marginTop: '6px' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13.5px' }}>
                      <input
                        type="radio"
                        name="isActive"
                        checked={Number(formData.isActive) === 1}
                        onChange={() => setFormData({ ...formData, isActive: 1 })}
                      />
                      Active (Available for delivery / selection)
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13.5px' }}>
                      <input
                        type="radio"
                        name="isActive"
                        checked={Number(formData.isActive) === 0}
                        onChange={() => setFormData({ ...formData, isActive: 0 })}
                      />
                      Inactive (Disabled)
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  id="btn-submit-institute"
                >
                  {submitting ? 'Saving...' : editingId ? 'Update Institute' : 'Create Institute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingInstitute && (
        <div className="modal-overlay" onClick={() => !isDeleting && setDeletingInstitute(null)}>
          <div
            className="modal"
            style={{ maxWidth: '420px', width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444' }}>
                Confirm Deletion
              </h3>
              <button
                className="modal-close"
                onClick={() => setDeletingInstitute(null)}
                disabled={isDeleting}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>
                Are you sure you want to remove <strong>{deletingInstitute.name}</strong>?
              </p>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>
                This institute will be marked as deleted and will no longer be offered as a physical delivery or class point.
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setDeletingInstitute(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={isDeleting}
                id="btn-confirm-delete"
              >
                {isDeleting ? 'Deleting...' : 'Delete Institute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
