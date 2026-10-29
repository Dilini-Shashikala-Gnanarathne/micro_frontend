import { useEffect, useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  getStudentIncidents,
  getStudentIncidentById,
  createStudentIncident,
  updateStudentIncident,
  deleteStudentIncident,
  getIncidentStates,
  getStudents,
} from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function StudentIncidentsPage() {
  const { user, isAdmin, isStudent } = useAuth();

  // Selected student
  const [selectedStudent, setSelectedStudent] = useState(null);

  // States loaded dynamically from database table usr_incident_state
  const [incidentStates, setIncidentStates] = useState([]);

  // Student search state (Admin)
  const [studentSearch, setStudentSearch] = useState('');
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [searchedStudents, setSearchedStudents] = useState([]);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);

  // Incidents data state
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [stateFilter, setStateFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Active incident for View / Edit / Delete
  const [activeIncident, setActiveIncident] = useState(null);

  // Form states strictly matching usr_student_incident:
  // note (varchar(500)), incident_state_id (tinyint), datetime (datetime)
  const [formData, setFormData] = useState({
    note: '',
    incident_state_id: '',
    datetime: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch available incident states from usr_incident_state
  const fetchIncidentStates = useCallback(async () => {
    try {
      const res = await getIncidentStates();
      const data = res.data?.data ?? res.data ?? [];
      const list = Array.isArray(data) ? data : [];
      setIncidentStates(list);
    } catch (e) {
      console.error('Failed to load incident states:', e);
      setIncidentStates([
        { id: 1, name: 'Active' },
        { id: 2, name: 'Checked' },
        { id: 3, name: 'Resolved' },
      ]);
    }
  }, []);

  useEffect(() => {
    fetchIncidentStates();
  }, [fetchIncidentStates]);

  // Set logged-in student as selected student if role is STUDENT
  useEffect(() => {
    if (isStudent && user) {
      const studentId = user.id || user.userId || user.user_id;
      setSelectedStudent({
        id: studentId,
        fname: user.firstName || user.fname || '',
        lname: user.lastName || user.lname || '',
        academicId: user.academicId || user.academic_id || '',
        mobile: user.mobile || user.whatsappNumber || '',
        email: user.email || '',
      });
    }
  }, [isStudent, user]);

  // 2. Fetch incidents for selected student from usr_student_incident
  const fetchIncidents = useCallback(async () => {
    if (!selectedStudent?.id) {
      setIncidents([]);
      return;
    }

    setLoading(true);
    try {
      const params = {};
      if (stateFilter !== 'ALL') {
        params.incident_state_id = stateFilter;
      }

      const res = await getStudentIncidents(selectedStudent.id, params);
      const data = res.data?.data ?? res.data ?? [];
      const list = Array.isArray(data) ? data : (data.items || data.incidents || []);
      setIncidents(list);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load incidents';
      toast.error(msg);
      setIncidents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedStudent, stateFilter]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // Search students (Admin)
  const handleSearchStudents = async (query) => {
    setStudentSearch(query);
    if (!query.trim()) {
      setSearchedStudents([]);
      setIsSearchDropdownOpen(false);
      return;
    }

    setSearchingStudents(true);
    try {
      const res = await getStudents({ name: query.trim(), size: 10 });
      const raw = res.data?.data || res.data || {};
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw.items)
        ? raw.items
        : Array.isArray(raw.data)
        ? raw.data
        : [];
      setSearchedStudents(list);
      setIsSearchDropdownOpen(true);
    } catch (e) {
      console.error('Failed to search students:', e);
    } finally {
      setSearchingStudents(false);
    }
  };

  const handleSelectStudent = (s) => {
    setSelectedStudent({
      id: s.id || s.userId || s.user_id,
      fname: s.fname || s.firstName || '',
      lname: s.lname || s.lastName || '',
      academicId: s.academicId || s.academic_id || '',
      mobile: s.mobile || s.whatsappNumber || s.phone || '',
      email: s.email || '',
    });
    setStudentSearch('');
    setIsSearchDropdownOpen(false);
  };

  const toLocalISOString = (dateStr) => {
    const d = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openCreateModal = () => {
    if (!selectedStudent?.id) {
      toast.error('Please select a student first.');
      return;
    }
    const defaultStateId = incidentStates.length > 0 ? incidentStates[0].id : 1;
    setFormData({
      note: '',
      incident_state_id: defaultStateId,
      datetime: toLocalISOString(),
    });
    setFormErrors({});
    setIsCreateModalOpen(true);
  };

  const openEditModal = (incident) => {
    setActiveIncident(incident);
    setFormData({
      note: incident.note || '',
      incident_state_id: incident.incident_state_id ?? (incidentStates[0]?.id || 1),
      datetime: toLocalISOString(incident.datetime || incident.created_at),
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  const openDetailModal = async (incident) => {
    setActiveIncident(incident);
    setIsDetailModalOpen(true);
    try {
      const res = await getStudentIncidentById(incident.id);
      const detail = res.data?.data || res.data;
      if (detail && typeof detail === 'object') {
        setActiveIncident(detail);
      }
    } catch {
      // Fallback
    }
  };

  const openDeleteModal = (incident) => {
    setActiveIncident(incident);
    setIsDeleteModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    const noteTrimmed = (formData.note || '').trim();

    if (!noteTrimmed) {
      errs.note = 'Incident note is required.';
    } else if (noteTrimmed.length > 500) {
      errs.note = `Note cannot exceed 500 characters (currently ${noteTrimmed.length} characters).`;
    }

    if (!formData.incident_state_id && formData.incident_state_id !== 0) {
      errs.incident_state_id = 'Incident state is required.';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        note: formData.note.trim(),
        incident_state_id: Number(formData.incident_state_id),
        datetime: formData.datetime ? formData.datetime.replace('T', ' ') + ':00' : null,
      };

      await createStudentIncident(selectedStudent.id, payload);
      toast.success('Incident recorded successfully!');
      setIsCreateModalOpen(false);
      fetchIncidents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record incident');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const payload = {
        note: formData.note.trim(),
        incident_state_id: Number(formData.incident_state_id),
        datetime: formData.datetime ? formData.datetime.replace('T', ' ') + ':00' : null,
      };

      await updateStudentIncident(activeIncident.id, payload);
      toast.success('Incident updated successfully!');
      setIsEditModalOpen(false);
      fetchIncidents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update incident');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickStateChange = async (incidentId, newStateId) => {
    try {
      await updateStudentIncident(incidentId, { incident_state_id: Number(newStateId) });
      toast.success('State updated successfully');
      fetchIncidents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update state');
    }
  };

  const handleDeleteSubmit = async () => {
    if (!activeIncident?.id) return;
    setSubmitting(true);
    try {
      await deleteStudentIncident(activeIncident.id);
      toast.success('Incident deleted successfully!');
      setIsDeleteModalOpen(false);
      fetchIncidents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete incident');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredIncidents = useMemo(() => {
    return incidents.filter((item) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const noteMatch = (item.note || '').toLowerCase().includes(query);
        const idMatch = (item.id || '').toLowerCase().includes(query);
        if (!noteMatch && !idMatch) return false;
      }
      return true;
    });
  }, [incidents, searchQuery]);

  const renderStateBadge = (stateId, stateName) => {
    const name = stateName || incidentStates.find((s) => s.id === Number(stateId))?.name || `State #${stateId}`;
    const lower = name.toLowerCase();
    let badgeClass = 'badge-primary';

    if (lower.includes('resolve') || lower.includes('done') || lower.includes('close')) {
      badgeClass = 'badge-success';
    } else if (lower.includes('check') || lower.includes('investigat')) {
      badgeClass = 'badge-primary';
    } else if (lower.includes('active') || lower.includes('open') || lower.includes('pend')) {
      badgeClass = 'badge-warning';
    }

    return (
      <span className={`badge ${badgeClass}`} style={{ fontWeight: 600, padding: '4px 10px' }}>
        {name}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', marginBottom: '4px' }}>
            Student Incidents
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
            {isAdmin
              ? 'Manage student academic and disciplinary incident reports in accordance with incident states.'
              : 'Review your logged incident reports.'}
          </p>
        </div>

        {isAdmin && selectedStudent && (
          <button
            className="btn btn-primary"
            onClick={openCreateModal}
            id="btn-report-incident"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Report Incident
          </button>
        )}
      </div>

      {/* Admin Student Selector Section */}
      {isAdmin && (
        <div
          style={{
            background: 'var(--bg-white)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🎯</span>
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Target Student</h2>
            </div>
            {selectedStudent && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setSelectedStudent(null);
                  setIncidents([]);
                }}
              >
                Change Student
              </button>
            )}
          </div>

          {!selectedStudent ? (
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search student by name, academic ID, or mobile number..."
                  value={studentSearch}
                  onChange={(e) => handleSearchStudents(e.target.value)}
                  onFocus={() => {
                    if (searchedStudents.length > 0) setIsSearchDropdownOpen(true);
                  }}
                  id="input-student-search"
                  style={{ paddingLeft: '38px', height: '44px' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                {searchingStudents && (
                  <span
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                    }}
                  >
                    Searching...
                  </span>
                )}
              </div>

              {/* Autocomplete Dropdown */}
              {isSearchDropdownOpen && searchedStudents.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 20,
                    background: 'white',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: 'var(--shadow-md)',
                    marginTop: '4px',
                    maxHeight: '260px',
                    overflowY: 'auto',
                  }}
                >
                  {searchedStudents.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => handleSelectStudent(s)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--primary-light)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13.5px' }}>
                          {s.fname || s.firstName || ''} {s.lname || s.lastName || ''}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          ID: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{s.academicId || s.academic_id || 'N/A'}</span>
                          {s.mobile && ` • Mobile: ${s.mobile}`}
                          {s.email && ` • ${s.email}`}
                        </div>
                      </div>
                      <span className="btn btn-outline btn-sm">Select</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Selected Student Info Banner */
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                background: 'var(--bg)',
                padding: '14px 18px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    color: 'white',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                  }}
                >
                  {(selectedStudent.fname?.[0] || 'S').toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '15px' }}>
                      {selectedStudent.fname} {selectedStudent.lname}
                    </span>
                    {selectedStudent.academicId && (
                      <span className="badge badge-primary">{selectedStudent.academicId}</span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {selectedStudent.mobile && `Mobile: ${selectedStudent.mobile}`}
                    {selectedStudent.email && ` • ${selectedStudent.email}`}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Active Incidents
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>
                    {incidents.length}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Student View Banner */}
      {isStudent && (
        <div
          style={{
            background: 'var(--bg-white)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            padding: '16px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
              Logged In As: {selectedStudent?.fname} {selectedStudent?.lname}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Student ID: {selectedStudent?.academicId || 'Self'}
            </div>
          </div>
          <span className="badge badge-primary">Your Record</span>
        </div>
      )}

      {/* Main Content Area */}
      {!selectedStudent && isAdmin ? (
        <div
          style={{
            background: 'white',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border)',
            padding: '50px 20px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>📋</div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
            No Student Selected
          </h3>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto' }}>
            Please select a student using the search input above to inspect or report incidents.
          </p>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--bg-white)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
          }}
        >
          {/* Filter Bar & Tabs */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px',
            }}
          >
            {/* Dynamic State Filter Pills from usr_incident_state */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setStateFilter('ALL')}
                className="btn btn-sm"
                style={{
                  borderRadius: '20px',
                  padding: '5px 12px',
                  fontWeight: 600,
                  fontSize: '12.5px',
                  background: stateFilter === 'ALL' ? 'var(--primary)' : 'var(--bg)',
                  color: stateFilter === 'ALL' ? 'white' : 'var(--text-secondary)',
                  border: '1px solid',
                  borderColor: stateFilter === 'ALL' ? 'var(--primary)' : 'var(--border)',
                }}
              >
                All States ({incidents.length})
              </button>
              {incidentStates.map((st) => {
                const count = incidents.filter((i) => Number(i.incident_state_id) === Number(st.id)).length;
                return (
                  <button
                    key={st.id}
                    onClick={() => setStateFilter(String(st.id))}
                    className="btn btn-sm"
                    style={{
                      borderRadius: '20px',
                      padding: '5px 12px',
                      fontWeight: 600,
                      fontSize: '12.5px',
                      background: stateFilter === String(st.id) ? 'var(--primary)' : 'var(--bg)',
                      color: stateFilter === String(st.id) ? 'white' : 'var(--text-secondary)',
                      border: '1px solid',
                      borderColor: stateFilter === String(st.id) ? 'var(--primary)' : 'var(--border)',
                    }}
                  >
                    {st.name} <span style={{ opacity: 0.8, fontSize: '11px' }}>({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Keyword Search */}
            <div style={{ position: 'relative', width: '240px' }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search in note..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ height: '36px', fontSize: '13px', paddingLeft: '32px' }}
              />
              <span
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              >
                🔍
              </span>
            </div>
          </div>

          {/* Incidents Table */}
          <div className="table-wrap">
            {loading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
                <div>Loading incidents...</div>
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div style={{ padding: '60px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>📋</div>
                <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  No Incidents Found
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {stateFilter !== 'ALL' || searchQuery
                    ? 'No incidents match the active filter criteria.'
                    : 'No incidents recorded for this student.'}
                </p>
                {isAdmin && (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={openCreateModal}
                    style={{ marginTop: '14px' }}
                  >
                    + Report First Incident
                  </button>
                )}
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '160px' }}>Incident Date</th>
                    <th style={{ width: '140px' }}>Incident State</th>
                    <th>Incident Note</th>
                    <th style={{ width: '140px' }}>Reported By</th>
                    <th style={{ width: '160px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncidents.map((incident) => {
                    const dt = incident.datetime || incident.created_at;
                    const dateFormatted = dt ? new Date(dt).toLocaleString() : 'N/A';

                    return (
                      <tr key={incident.id}>
                        <td style={{ fontSize: '12.5px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {dateFormatted}
                        </td>
                        <td>
                          {isAdmin ? (
                            <select
                              value={incident.incident_state_id ?? (incidentStates[0]?.id || 1)}
                              onChange={(e) => handleQuickStateChange(incident.id, e.target.value)}
                              style={{
                                fontSize: '11.5px',
                                fontWeight: 600,
                                padding: '3px 8px',
                                borderRadius: '14px',
                                border: '1px solid var(--border)',
                                cursor: 'pointer',
                                background: 'var(--bg)',
                              }}
                            >
                              {incidentStates.map((st) => (
                                <option key={st.id} value={st.id}>
                                  {st.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            renderStateBadge(incident.incident_state_id, incident.incident_state_name)
                          )}
                        </td>
                        <td>
                          <div
                            style={{
                              maxWidth: '460px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: 'var(--text-primary)',
                              fontWeight: 500,
                            }}
                            title={incident.note}
                          >
                            {incident.note}
                          </div>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {incident.reported_by_username || (incident.reported_by ? incident.reported_by.substring(0, 8) + '...' : 'System')}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => openDetailModal(incident)}
                              title="View Details"
                            >
                              View
                            </button>
                            {isAdmin && (
                              <>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => openEditModal(incident)}
                                  title="Edit"
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => openDeleteModal(incident)}
                                  title="Delete"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* CREATE INCIDENT MODAL (Strictly usr_student_incident fields) */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => !submitting && setIsCreateModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Report Student Incident</h3>
              <button
                className="modal-close"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={submitting}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                {/* Student indicator */}
                <div
                  style={{
                    background: 'var(--primary-light)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary-dark)' }}>
                    Student: {selectedStudent?.fname} {selectedStudent?.lname}
                  </span>
                  <span className="badge badge-primary">{selectedStudent?.academicId || 'ID'}</span>
                </div>

                {/* Note Field (Max 500 chars as in varchar(500)) */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Incident Description / Note <span>*</span>
                    </label>
                    <span style={{ fontSize: '11px', color: (formData.note || '').length > 450 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {(formData.note || '').length} / 500
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={500}
                    className={`form-control ${formErrors.note ? 'error' : ''}`}
                    placeholder="Enter factual incident details (maximum 500 characters)..."
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  />
                  {formErrors.note && <div className="form-error">{formErrors.note}</div>}
                </div>

                {/* Incident State from usr_incident_state */}
                <div className="form-group">
                  <label className="form-label">
                    Incident State <span>*</span>
                  </label>
                  <select
                    className="form-control"
                    value={formData.incident_state_id}
                    onChange={(e) => setFormData({ ...formData, incident_state_id: Number(e.target.value) })}
                  >
                    {incidentStates.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} (ID: {st.id})
                      </option>
                    ))}
                  </select>
                  {formErrors.incident_state_id && <div className="form-error">{formErrors.incident_state_id}</div>}
                </div>

                {/* Incident Datetime */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Incident Date & Time</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={formData.datetime}
                    onChange={(e) => setFormData({ ...formData, datetime: e.target.value })}
                  />
                  <div className="form-hint">Defaults to current time if left unchanged.</div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Reporting...' : 'Save & Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT INCIDENT MODAL */}
      {isEditModalOpen && (
        <div className="modal-overlay" onClick={() => !submitting && setIsEditModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Incident Report</h3>
              <button
                className="modal-close"
                onClick={() => setIsEditModalOpen(false)}
                disabled={submitting}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                {/* Note Field (Max 500 chars) */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Incident Description / Note <span>*</span>
                    </label>
                    <span style={{ fontSize: '11px', color: (formData.note || '').length > 450 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {(formData.note || '').length} / 500
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={500}
                    className={`form-control ${formErrors.note ? 'error' : ''}`}
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  />
                  {formErrors.note && <div className="form-error">{formErrors.note}</div>}
                </div>

                {/* State */}
                <div className="form-group">
                  <label className="form-label">Incident State</label>
                  <select
                    className="form-control"
                    value={formData.incident_state_id}
                    onChange={(e) => setFormData({ ...formData, incident_state_id: Number(e.target.value) })}
                  >
                    {incidentStates.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} (ID: {st.id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Incident Datetime */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Incident Date & Time</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={formData.datetime}
                    onChange={(e) => setFormData({ ...formData, datetime: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Update Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {isDetailModalOpen && activeIncident && (
        <div className="modal-overlay" onClick={() => setIsDetailModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Incident Details</h3>
              <button className="modal-close" onClick={() => setIsDetailModalOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '18px',
                  background: 'var(--bg)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                    Incident State
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    {renderStateBadge(activeIncident.incident_state_id, activeIncident.incident_state_name)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>
                    Incident Date
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {new Date(activeIncident.datetime || activeIncident.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Note Content */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Incident Description
                </div>
                <div
                  style={{
                    background: '#fcfcfd',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '14px',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {activeIncident.note}
                </div>
              </div>

              {/* Database Schema Metadata */}
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>ID: </span>
                    <span style={{ fontFamily: 'monospace' }}>{activeIncident.id}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Student User ID: </span>
                    <span style={{ fontFamily: 'monospace' }}>{activeIncident.student_user_id}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Reported By: </span>
                    <span>{activeIncident.reported_by_username || activeIncident.reported_by}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>State ID: </span>
                    <span>{activeIncident.incident_state_id}</span>
                  </div>
                  {activeIncident.created_at && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Created At: </span>
                      {new Date(activeIncident.created_at).toLocaleString()}
                    </div>
                  )}
                  {activeIncident.updated_at && (
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Last Updated: </span>
                      {new Date(activeIncident.updated_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setIsDetailModalOpen(false)}>
                Close
              </button>
              {isAdmin && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    openEditModal(activeIncident);
                  }}
                >
                  Edit Incident
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && activeIncident && (
        <div className="modal-overlay" onClick={() => !submitting && setIsDeleteModalOpen(false)}>
          <div className="modal" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: 'var(--danger)' }}>
                Delete Incident Record
              </h3>
              <button
                className="modal-close"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={submitting}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '28px' }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '6px' }}>
                    Are you sure you want to delete this incident?
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    This incident record will be soft deleted from{' '}
                    <strong>
                      {selectedStudent?.fname} {selectedStudent?.lname}
                    </strong>
                    's history.
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteSubmit}
                disabled={submitting}
              >
                {submitting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
