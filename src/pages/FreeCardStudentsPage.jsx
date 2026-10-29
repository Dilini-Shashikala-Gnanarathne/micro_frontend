import { useEffect, useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  getFreeCardStudents,
  addFreeCardStudent,
  addFreeCardStudentsBulk,
  updateFreeCardStudent,
  removeFreeCardStudent,
  removeFreeCardStudentsBulk,
  getStudents,
  getBatches,
  getCourses,
  getAdminCourses,
} from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function FreeCardStudentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'SUPER_ADMIN';

  // Data states
  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  // Filters & Pagination state
  const [keyword, setKeyword] = useState('');
  const [batchId, setBatchId] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortDir, setSortDir] = useState('DESC');

  // Checkbox selection state for bulk actions
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // Grant / Bulk Add Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [searchedStudents, setSearchedStudents] = useState([]);
  const [selectedStudentsList, setSelectedStudentsList] = useState([]);
  const [addCourseId, setAddCourseId] = useState('');
  const [addNote, setAddNote] = useState('');
  const [addTag, setAddTag] = useState('');
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Quick Add Class to Student Modal state
  const [quickAddStudent, setQuickAddStudent] = useState(null);
  const [quickAddCourseId, setQuickAddCourseId] = useState('');
  const [submittingQuickAdd, setSubmittingQuickAdd] = useState(false);

  // Edit Free Card Modal state
  const [editingStudent, setEditingStudent] = useState(null);
  const [editNote, setEditNote] = useState('');
  const [editTag, setEditTag] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Revoke/Delete Modal state
  const [revokingTarget, setRevokingTarget] = useState(null); // { student, classId?, className? }
  const [submittingRevoke, setSubmittingRevoke] = useState(false);

  // Bulk Remove Modal state
  const [isBulkRemoveModalOpen, setIsBulkRemoveModalOpen] = useState(false);
  const [submittingBulkRemove, setSubmittingBulkRemove] = useState(false);

  // Fetch courses helper
  const fetchCoursesList = useCallback(async () => {
    try {
      const res = await getCourses({ size: 100 });
      const raw = res.data?.data || res.data || {};
      const items = Array.isArray(raw)
        ? raw
        : Array.isArray(raw.data)
        ? raw.data
        : Array.isArray(raw.items)
        ? raw.items
        : Array.isArray(raw.courses)
        ? raw.courses
        : [];
      setCourses(items);
      return items;
    } catch (err) {
      try {
        const fallbackRes = await getAdminCourses({ size: 100 });
        const raw = fallbackRes.data?.data || fallbackRes.data || {};
        const items = Array.isArray(raw)
          ? raw
          : Array.isArray(raw.data)
          ? raw.data
          : Array.isArray(raw.items)
          ? raw.items
          : [];
        setCourses(items);
        return items;
      } catch (e) {
        console.error('Failed to fetch courses:', e);
        return [];
      }
    }
  }, []);

  // Load batches and courses on mount
  useEffect(() => {
    getBatches()
      .then((res) => {
        const list = res.data?.data || res.data || [];
        setBatches(Array.isArray(list) ? list : []);
      })
      .catch(() => {});

    fetchCoursesList();
  }, [fetchCoursesList]);

  // Fetch Free-Card Students
  const fetchFreeCardStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        size: pageSize,
        sortDir,
      };

      if (keyword.trim()) params.keyword = keyword.trim();
      if (batchId) params.batchId = batchId;
      if (courseFilter) params.classId = courseFilter;
      if (tagFilter.trim()) params.tag = tagFilter.trim();

      const res = await getFreeCardStudents(params);
      const data = res.data?.data || res.data || {};

      const list = data.students || (Array.isArray(data) ? data : []);
      const total = data.pagination?.total ?? list.length;

      setStudents(list);
      setTotalItems(total);
      // Clear selections that are no longer in list
      setSelectedStudentIds((prev) => prev.filter((id) => list.some((s) => s.student_id === id)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch free-card students');
      setStudents([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortDir, keyword, batchId, courseFilter, tagFilter]);

  useEffect(() => {
    fetchFreeCardStudents();
  }, [fetchFreeCardStudents]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Checkbox selection handlers
  const isAllSelected = students.length > 0 && students.every((s) => selectedStudentIds.includes(s.student_id));
  const isSomeSelected = selectedStudentIds.length > 0 && !isAllSelected;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = students.map((s) => s.student_id);
      setSelectedStudentIds(Array.from(new Set([...selectedStudentIds, ...allIds])));
    } else {
      const currentIds = new Set(students.map((s) => s.student_id));
      setSelectedStudentIds((prev) => prev.filter((id) => !currentIds.has(id)));
    }
  };

  const handleToggleSelectRow = (studentId) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  // Search candidate students for granting free card
  const handleSearchStudents = async (query) => {
    setStudentSearchTerm(query);
    if (!query.trim()) {
      setSearchedStudents([]);
      return;
    }

    setSearchingStudents(true);
    try {
      const res = await getStudents({ name: query.trim(), size: 15 });
      const items = res.data?.data?.items || res.data?.data?.data || res.data?.data || [];
      // Filter out students already selected in the modal
      const unselected = items.filter((s) => !selectedStudentsList.some((sel) => sel.id === s.id));
      setSearchedStudents(unselected);
    } catch (err) {
      setSearchedStudents([]);
    } finally {
      setSearchingStudents(false);
    }
  };

  // Open Grant Modal
  const openAddModal = () => {
    setSelectedStudentsList([]);
    setStudentSearchTerm('');
    setSearchedStudents([]);
    setAddCourseId(courseFilter || (courses[0]?.id || ''));
    setAddNote('');
    setAddTag('');
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    if (submittingAdd) return;
    setIsAddModalOpen(false);
    setSelectedStudentsList([]);
  };

  const handleAddStudentToSelection = (student) => {
    if (!selectedStudentsList.some((s) => s.id === student.id)) {
      setSelectedStudentsList((prev) => [...prev, student]);
    }
    setStudentSearchTerm('');
    setSearchedStudents([]);
  };

  const handleRemoveStudentFromSelection = (studentId) => {
    setSelectedStudentsList((prev) => prev.filter((s) => s.id !== studentId));
  };

  // Submit Grant Free Card (Bulk / Single)
  const handleSubmitAdd = async (e) => {
    e.preventDefault();
    if (selectedStudentsList.length === 0) {
      return toast.error('Please select at least one student.');
    }

    if (!addCourseId) {
      return toast.error('Please select a course / class.');
    }

    if (addTag.trim().length > 8) {
      return toast.error('Tag cannot exceed 8 characters.');
    }

    if (addNote.trim().length > 100) {
      return toast.error('Note cannot exceed 100 characters.');
    }

    // Build payload array as requested
    const payload = selectedStudentsList.map((stu) => ({
      studentId: stu.id,
      classId: addCourseId,
      note: addNote.trim() || null,
      tag: addTag.trim() || null,
    }));

    setSubmittingAdd(true);
    try {
      await addFreeCardStudentsBulk(payload);
      toast.success(
        payload.length > 1
          ? `Free cards granted to ${payload.length} students!`
          : `Free card granted to ${selectedStudentsList[0].name || selectedStudentsList[0].fname || 'student'}!`
      );
      closeAddModal();
      fetchFreeCardStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to grant free cards.');
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Quick Add Class to a specific student
  const openQuickAddModal = (stu) => {
    setQuickAddStudent(stu);
    // Suggest a course not already in their freeClasses
    const existingIds = (stu.freeClasses || []).map((fc) => fc.classId);
    const available = courses.find((c) => !existingIds.includes(c.id));
    setQuickAddCourseId(available?.id || courses[0]?.id || '');
  };

  const handleQuickAddSubmit = async (e) => {
    e.preventDefault();
    if (!quickAddStudent || !quickAddCourseId) return;

    setSubmittingQuickAdd(true);
    try {
      await addFreeCardStudent({
        studentId: quickAddStudent.student_id,
        classId: quickAddCourseId,
        note: quickAddStudent.note || null,
        tag: quickAddStudent.tag || null,
      });

      toast.success('Course assigned to free card student successfully!');
      setQuickAddStudent(null);
      fetchFreeCardStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign course.');
    } finally {
      setSubmittingQuickAdd(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (stu) => {
    setEditingStudent(stu);
    setEditNote(stu.note || '');
    setEditTag(stu.tag || '');
  };

  const closeEditModal = () => {
    if (submittingEdit) return;
    setEditingStudent(null);
  };

  // Submit Edit Free Card
  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;

    if (editTag.trim().length > 8) {
      return toast.error('Tag cannot exceed 8 characters.');
    }

    if (editNote.trim().length > 100) {
      return toast.error('Note cannot exceed 100 characters.');
    }

    setSubmittingEdit(true);
    try {
      await updateFreeCardStudent(editingStudent.student_id, {
        note: editNote.trim() || null,
        tag: editTag.trim() || null,
      });

      toast.success('Free-card details updated successfully!');
      closeEditModal();
      fetchFreeCardStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update free card.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Revoke/Remove handler (Single Class OR Full Card)
  const handleConfirmRevoke = async () => {
    if (!revokingTarget) return;

    setSubmittingRevoke(true);
    try {
      const studentId = revokingTarget.student.student_id;
      const classId = revokingTarget.classId || null;

      await removeFreeCardStudent(studentId, classId);

      if (classId) {
        toast.success(`Class removed from ${revokingTarget.student.name || 'student'}.`);
      } else {
        toast.success(`Free card revoked for ${revokingTarget.student.name || 'student'}.`);
      }

      setRevokingTarget(null);

      if (students.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchFreeCardStudents();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke.');
    } finally {
      setSubmittingRevoke(false);
    }
  };

  // Bulk Remove handler
  const handleConfirmBulkRemove = async () => {
    if (selectedStudentIds.length === 0) return;

    setSubmittingBulkRemove(true);
    try {
      // Build bulk remove payload: if courseFilter is set, remove that course; otherwise remove all
      const items = selectedStudentIds.map((id) => ({
        studentId: id,
        classId: courseFilter || null,
      }));

      await removeFreeCardStudentsBulk(items);
      toast.success(`Successfully removed ${selectedStudentIds.length} free cards!`);
      setSelectedStudentIds([]);
      setIsBulkRemoveModalOpen(false);
      fetchFreeCardStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to bulk remove free cards.');
    } finally {
      setSubmittingBulkRemove(false);
    }
  };

  return (
    <div className="page-content">
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
            Free-Card Students
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13.5 }}>
            Manage privileged students granted free access cards, course exemptions, and scholarship tags.
          </p>
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={openAddModal} id="btn-add-free-card">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Grant Free Card
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          </div>
          <div className="stat-info">
            <div className="label">Total Free-Card Holders</div>
            <div className="value">{totalItems}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--secondary-light)', color: 'var(--secondary)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
            </svg>
          </div>
          <div className="stat-info">
            <div className="label">Available Courses</div>
            <div className="value" style={{ color: 'var(--secondary)' }}>{courses.length}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ecfdf5', color: '#059669' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="stat-info">
            <div className="label">Active on this Page</div>
            <div className="value" style={{ color: '#059669' }}>{students.length}</div>
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {isAdmin && selectedStudentIds.length > 0 && (
        <div style={{
          position: 'sticky',
          top: 16,
          zIndex: 20,
          background: 'var(--primary-dark, #1e3a8a)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: 'var(--radius)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '4px 10px',
              borderRadius: '999px',
              fontSize: 12.5,
              fontWeight: 700
            }}>
              {selectedStudentIds.length}
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>
              student(s) selected
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="btn btn-sm"
              style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none' }}
              onClick={() => setSelectedStudentIds([])}
            >
              Deselect All
            </button>
            <button
              className="btn btn-sm"
              style={{ background: '#ef4444', color: 'white', border: 'none', fontWeight: 600 }}
              onClick={() => setIsBulkRemoveModalOpen(true)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 14, height: 14 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              Bulk Remove Free Card
            </button>
          </div>
        </div>
      )}

      {/* Main Filter & Table Card */}
      <div className="card">
        {/* Filter Toolbar */}
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 14, background: '#fafbfc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1 }}>
            {/* Keyword Search */}
            <div className="search-input" style={{ minWidth: 240, maxWidth: 320, flex: 1 }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                className="form-control"
                placeholder="Search name, ID, phone, note, or course..."
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(1);
                }}
                id="input-search-free-card"
              />
            </div>

            {/* Batch Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Batch:</label>
              <select
                className="form-control"
                style={{ width: 140 }}
                value={batchId}
                onChange={(e) => {
                  setBatchId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Batches</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name || b.year}</option>
                ))}
              </select>
            </div>

            {/* Course Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Course:</label>
              <select
                className="form-control"
                style={{ width: 160 }}
                value={courseFilter}
                onChange={(e) => {
                  setCourseFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>

            {/* Tag Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Tag:</label>
              <input
                type="text"
                className="form-control"
                style={{ width: 110 }}
                placeholder="e.g. VIP"
                value={tagFilter}
                maxLength={8}
                onChange={(e) => {
                  setTagFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            {/* Sort Order */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Sort:</label>
              <select
                className="form-control"
                style={{ width: 130 }}
                value={sortDir}
                onChange={(e) => {
                  setSortDir(e.target.value);
                  setPage(1);
                }}
              >
                <option value="DESC">Recent First</option>
                <option value="ASC">Oldest First</option>
              </select>
            </div>

            {/* Clear Filters */}
            {(keyword || batchId || courseFilter || tagFilter) && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setKeyword('');
                  setBatchId('');
                  setCourseFilter('');
                  setTagFilter('');
                  setPage(1);
                }}
                title="Reset filters"
              >
                Clear
              </button>
            )}
          </div>

          {/* Page size & Refresh */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select
              className="form-control"
              style={{ width: 105, fontSize: 12.5 }}
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>

            <button
              className="btn btn-secondary btn-sm"
              onClick={fetchFreeCardStudents}
              disabled={loading}
              title="Refresh list"
              style={{ height: 36, padding: '0 12px' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{
                width: 38,
                height: 38,
                border: '3px solid var(--border)',
                borderTopColor: 'var(--primary)',
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 0.8s linear infinite'
              }} />
              <p style={{ fontWeight: 500 }}>Loading free-card students...</p>
            </div>
          ) : students.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: 'var(--text-muted)'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" style={{ width: 32, height: 32 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 002.25 19.5z" />
                </svg>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                {keyword || batchId || courseFilter || tagFilter ? 'No matching free-card students' : 'No free-card students assigned yet'}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, maxWidth: 400, margin: '0 auto 18px' }}>
                {keyword || batchId || courseFilter || tagFilter
                  ? 'Try clearing your filters or searching with different keywords.'
                  : 'Grant free academic cards to students for full tuition exemption and scholarship benefits.'}
              </p>
              {isAdmin && (
                <button className="btn btn-primary btn-sm" onClick={openAddModal}>
                  + Grant Free Card to Student
                </button>
              )}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  {isAdmin && (
                    <th style={{ width: 44, textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = isSomeSelected;
                        }}
                        onChange={handleSelectAll}
                        style={{ cursor: 'pointer', width: 16, height: 16 }}
                      />
                    </th>
                  )}
                  <th style={{ width: 50 }}>#</th>
                  <th>Student Info</th>
                  <th style={{ width: 130 }}>Batch</th>
                  <th style={{ width: 100 }}>Tag</th>
                  <th>Assigned Free Classes</th>
                  <th>Note / Justification</th>
                  <th style={{ width: 95 }}>Status</th>
                  {isAdmin && <th style={{ width: 170, textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {students.map((stu, index) => {
                  const rowNumber = (page - 1) * pageSize + index + 1;
                  const isChecked = selectedStudentIds.includes(stu.student_id);
                  const freeClasses = stu.freeClasses || [];

                  return (
                    <tr
                      key={stu.student_id}
                      style={{
                        background: isChecked ? 'rgba(59, 130, 246, 0.05)' : undefined,
                        transition: 'background 0.15s ease'
                      }}
                    >
                      {isAdmin && (
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectRow(stu.student_id)}
                            style={{ cursor: 'pointer', width: 16, height: 16 }}
                          />
                        </td>
                      )}
                      <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                        {rowNumber}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {stu.profileUrl ? (
                            <img
                              src={stu.profileUrl}
                              alt=""
                              style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{
                              width: 34,
                              height: 34,
                              borderRadius: '50%',
                              background: 'var(--primary-light)',
                              color: 'var(--primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: 13,
                              flexShrink: 0
                            }}>
                              {(stu.name?.[0] || stu.firstName?.[0] || 'S').toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-primary)' }}>
                              {stu.name || `${stu.firstName} ${stu.lastName}`.trim()}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                              ID: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{stu.academicId || stu.student_id}</span>
                              {stu.mobile && ` • ${stu.mobile}`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)' }}>
                          {stu.batchName || '—'}
                        </span>
                      </td>
                      <td>
                        {stu.tag ? (
                          <span className="badge badge-primary" style={{ fontWeight: 700, letterSpacing: '0.04em' }}>
                            #{stu.tag}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                          {freeClasses.length === 0 ? (
                            <span style={{ color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>
                              All courses or unassigned
                            </span>
                          ) : (
                            freeClasses.map((fc) => (
                              <span
                                key={fc.freeClassId || fc.classId}
                                className="badge"
                                style={{
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  border: '1px solid #bfdbfe',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  fontSize: 11.5,
                                  padding: '3px 8px'
                                }}
                              >
                                <span>{fc.classCode ? `${fc.classCode} • ` : ''}{fc.className || 'Class'}</span>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => setRevokingTarget({
                                      student: stu,
                                      classId: fc.classId,
                                      className: fc.className || fc.classCode
                                    })}
                                    title={`Remove ${fc.className} from this student`}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#ef4444',
                                      cursor: 'pointer',
                                      padding: 0,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      fontWeight: 800,
                                      fontSize: 12,
                                      marginLeft: 2
                                    }}
                                  >
                                    ✕
                                  </button>
                                )}
                              </span>
                            ))
                          )}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => openQuickAddModal(stu)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 7px', fontSize: 11, height: 22, borderRadius: 4 }}
                              title="Assign another course"
                            >
                              + Course
                            </button>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: 12.5, color: stu.note ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {stu.note || '—'}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${stu.status === 'ACTIVE' ? 'badge-success' : 'badge-gray'}`}>
                          {stu.status || 'ACTIVE'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => openEditModal(stu)}
                              title="Edit tag and note"
                              style={{ padding: '5px 9px' }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ width: 14, height: 14 }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                              Edit
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setRevokingTarget({ student: stu })}
                              title="Revoke free card completely"
                              style={{ padding: '5px 9px', color: 'var(--danger)' }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" style={{ width: 14, height: 14 }}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                              Revoke
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

        {/* Pagination Bar */}
        {!loading && students.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            flexWrap: 'wrap',
            gap: 12
          }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Showing <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{(page - 1) * pageSize + 1}</span> to{' '}
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{Math.min(page * pageSize, totalItems)}</span> of{' '}
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalItems}</span> students
            </div>

            <div className="pagination" style={{ margin: 0 }}>
              <button
                className="page-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                title="Previous Page"
              >
                ‹
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => {
                  const prev = arr[idx - 1];
                  const hasGap = prev && p - prev > 1;

                  return (
                    <span key={p} style={{ display: 'inline-flex', alignItems: 'center' }}>
                      {hasGap && <span style={{ padding: '0 4px', color: 'var(--text-muted)' }}>…</span>}
                      <button
                        className={`page-btn${p === page ? ' active' : ''}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    </span>
                  );
                })}

              <button
                className="page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                title="Next Page"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      {/* GRANT / BULK GRANT FREE CARD MODAL */}
      {isAddModalOpen && (
        <div className="modal-overlay" onClick={closeAddModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 20, height: 20 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                  </svg>
                </div>
                <div>
                  <h3 className="modal-title">Grant Free Academic Card</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Exempt student(s) from class tuition fees (Single or Bulk)
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={closeAddModal} disabled={submittingAdd}>✕</button>
            </div>

            <form onSubmit={handleSubmitAdd}>
              <div className="modal-body">
                {/* Students Picker (Supports multi-student) */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Select Student(s) <span>*</span>
                    </label>
                    {selectedStudentsList.length > 0 && (
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--primary)' }}>
                        {selectedStudentsList.length} student(s) selected
                      </span>
                    )}
                  </div>

                  {/* Selected students chips */}
                  {selectedStudentsList.length > 0 && (
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                      padding: 8,
                      background: '#f8fafc',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      marginBottom: 8,
                      maxHeight: 120,
                      overflowY: 'auto'
                    }}>
                      {selectedStudentsList.map((s) => (
                        <span
                          key={s.id}
                          style={{
                            background: 'white',
                            border: '1px solid #bfdbfe',
                            borderRadius: '999px',
                            padding: '3px 10px',
                            fontSize: 12,
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            color: 'var(--text-primary)'
                          }}
                        >
                          <span>{s.fname || s.firstName} {s.lname || s.lastName} ({s.academicId || s.academic_id})</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveStudentFromSelection(s.id)}
                            style={{
                              border: 'none',
                              background: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontWeight: 800,
                              fontSize: 12,
                              padding: 0
                            }}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Search Input for Students */}
                  <div className="search-input" style={{ width: '100%' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Type name, academic ID, or phone to add student..."
                      value={studentSearchTerm}
                      onChange={(e) => handleSearchStudents(e.target.value)}
                      disabled={submittingAdd}
                    />
                  </div>

                  {/* Search Results Dropdown */}
                  {searchingStudents && (
                    <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)' }}>
                      Searching students...
                    </div>
                  )}

                  {searchedStudents.length > 0 && !searchingStudents && (
                    <div style={{
                      maxHeight: 160,
                      overflowY: 'auto',
                      border: '1.5px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      marginTop: 4,
                      background: 'white'
                    }}>
                      {searchedStudents.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => handleAddStudentToSelection(s)}
                          style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid var(--border)',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'background 0.15s ease'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>
                              {s.fname || s.firstName} {s.lname || s.lastName}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              ID: {s.academicId || s.academic_id} • {s.mobile}
                            </div>
                          </div>
                          <span style={{ fontSize: 11.5, color: 'var(--primary)', fontWeight: 700 }}>
                            + Add
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Course / Class Selection */}
                <div className="form-group">
                  <label className="form-label">
                    Target Course / Class <span>*</span>
                  </label>
                  <select
                    className="form-control"
                    value={addCourseId}
                    onChange={(e) => setAddCourseId(e.target.value)}
                    required
                    disabled={submittingAdd}
                  >
                    <option value="">Select a Course...</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code}) - {c.medium || 'English'}
                      </option>
                    ))}
                  </select>
                  <div className="form-hint">
                    The free card student will receive 100% tuition exemption for this class.
                  </div>
                </div>

                {/* Tag Input */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Card Tag (Optional)
                    </label>
                    <span style={{ fontSize: 11, color: addTag.length > 7 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {addTag.length} / 8 chars
                    </span>
                  </div>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. SCHOLAR, VIP, STAFF, 2026A"
                    value={addTag}
                    maxLength={8}
                    onChange={(e) => setAddTag(e.target.value.toUpperCase())}
                    disabled={submittingAdd}
                  />
                  <div className="form-hint">
                    Short identifier tag (max 8 uppercase characters).
                  </div>
                </div>

                {/* Note Input */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Note / Reason (Optional)
                    </label>
                    <span style={{ fontSize: 11, color: addNote.length > 90 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {addNote.length} / 100 chars
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="e.g. Merit scholarship approval for high performance"
                    value={addNote}
                    maxLength={100}
                    onChange={(e) => setAddNote(e.target.value)}
                    disabled={submittingAdd}
                  />
                  <div className="form-hint">
                    Internal administration remarks (max 100 characters).
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeAddModal} disabled={submittingAdd}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingAdd || selectedStudentsList.length === 0 || !addCourseId}
                >
                  {submittingAdd
                    ? 'Granting...'
                    : selectedStudentsList.length > 1
                    ? `Grant to ${selectedStudentsList.length} Students`
                    : 'Grant Free Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ASSIGN COURSE TO EXISTING FREE-CARD HOLDER */}
      {quickAddStudent && (
        <div className="modal-overlay" onClick={() => !submittingQuickAdd && setQuickAddStudent(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3 className="modal-title">Assign Course to Free Card</h3>
              <button className="modal-close" onClick={() => !submittingQuickAdd && setQuickAddStudent(null)}>✕</button>
            </div>

            <form onSubmit={handleQuickAddSubmit}>
              <div className="modal-body">
                <div style={{
                  background: 'var(--bg)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  marginBottom: 16
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {quickAddStudent.name || `${quickAddStudent.firstName} ${quickAddStudent.lastName}`.trim()}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    Academic ID: {quickAddStudent.academicId || '—'}
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Select Course <span>*</span>
                  </label>
                  <select
                    className="form-control"
                    value={quickAddCourseId}
                    onChange={(e) => setQuickAddCourseId(e.target.value)}
                    required
                    disabled={submittingQuickAdd}
                  >
                    <option value="">Select a Course...</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setQuickAddStudent(null)}
                  disabled={submittingQuickAdd}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingQuickAdd || !quickAddCourseId}
                >
                  {submittingQuickAdd ? 'Assigning...' : 'Assign Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FREE CARD MODAL */}
      {editingStudent && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Free Card Details</h3>
              <button className="modal-close" onClick={closeEditModal} disabled={submittingEdit}>✕</button>
            </div>

            <form onSubmit={handleSubmitEdit}>
              <div className="modal-body">
                <div style={{
                  background: 'var(--bg)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  marginBottom: 16
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {editingStudent.name || `${editingStudent.firstName} ${editingStudent.lastName}`.trim()}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    Academic ID: {editingStudent.academicId || '—'}
                  </div>
                </div>

                {/* Tag Input */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Card Tag
                    </label>
                    <span style={{ fontSize: 11, color: editTag.length > 7 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {editTag.length} / 8 chars
                    </span>
                  </div>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. SCHOLAR"
                    value={editTag}
                    maxLength={8}
                    onChange={(e) => setEditTag(e.target.value.toUpperCase())}
                    disabled={submittingEdit}
                  />
                </div>

                {/* Note Input */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Note / Remarks
                    </label>
                    <span style={{ fontSize: 11, color: editNote.length > 90 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {editNote.length} / 100 chars
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    className="form-control"
                    placeholder="Remarks..."
                    value={editNote}
                    maxLength={100}
                    onChange={(e) => setEditNote(e.target.value)}
                    disabled={submittingEdit}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeEditModal} disabled={submittingEdit}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingEdit}>
                  {submittingEdit ? 'Saving...' : 'Update Free Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SINGLE / SPECIFIC CLASS REVOKE CONFIRMATION MODAL */}
      {revokingTarget && (
        <div className="modal-overlay" onClick={() => !submittingRevoke && setRevokingTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header" style={{ borderBottomColor: 'var(--danger-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'var(--danger-light)',
                  color: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 20, height: 20 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <h3 className="modal-title" style={{ color: '#9b1c1c' }}>
                  {revokingTarget.classId ? 'Remove Free Class' : 'Revoke Free Card'}
                </h3>
              </div>
              <button className="modal-close" onClick={() => !submittingRevoke && setRevokingTarget(null)}>✕</button>
            </div>

            <div className="modal-body">
              <p style={{ color: 'var(--text-primary)', marginBottom: 12 }}>
                {revokingTarget.classId ? (
                  <>
                    Are you sure you want to remove <strong>{revokingTarget.className || 'this course'}</strong> from this student's free card?
                  </>
                ) : (
                  <>
                    Are you sure you want to revoke the entire free card privilege for this student?
                  </>
                )}
              </p>
              <div style={{
                background: 'var(--bg)',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                marginBottom: 14
              }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 14 }}>
                  {revokingTarget.student.name || `${revokingTarget.student.firstName} ${revokingTarget.student.lastName}`.trim()}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  Academic ID: {revokingTarget.student.academicId || '—'}
                  {revokingTarget.student.tag && ` • Tag: #${revokingTarget.student.tag}`}
                </div>
              </div>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                {revokingTarget.classId
                  ? 'If this was the student’s only free class, their free-card status will be completely reset.'
                  : 'All assigned free classes and tuition waivers will be removed immediately.'}
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setRevokingTarget(null)}
                disabled={submittingRevoke}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmRevoke}
                disabled={submittingRevoke}
              >
                {submittingRevoke
                  ? 'Removing...'
                  : revokingTarget.classId
                  ? 'Yes, Remove Class'
                  : 'Yes, Revoke Card'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK REMOVE CONFIRMATION MODAL */}
      {isBulkRemoveModalOpen && (
        <div className="modal-overlay" onClick={() => !submittingBulkRemove && setIsBulkRemoveModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header" style={{ borderBottomColor: 'var(--danger-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'var(--danger-light)',
                  color: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: 20, height: 20 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </div>
                <h3 className="modal-title" style={{ color: '#9b1c1c' }}>
                  Bulk Remove Free Cards
                </h3>
              </div>
              <button className="modal-close" onClick={() => !submittingBulkRemove && setIsBulkRemoveModalOpen(false)}>✕</button>
            </div>

            <div className="modal-body">
              <p style={{ color: 'var(--text-primary)', marginBottom: 12 }}>
                Are you sure you want to remove free card privileges for{' '}
                <strong>{selectedStudentIds.length}</strong> selected student(s)?
              </p>
              {courseFilter && (
                <div style={{
                  background: '#eff6ff',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12.5,
                  color: '#1e40af',
                  marginBottom: 12
                }}>
                  Active course filter is set. Only the filtered course will be removed from these students.
                </div>
              )}
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                This action will delete the assigned free classes and revoke privileges for these students.
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsBulkRemoveModalOpen(false)}
                disabled={submittingBulkRemove}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmBulkRemove}
                disabled={submittingBulkRemove}
              >
                {submittingBulkRemove ? 'Removing...' : `Yes, Remove for ${selectedStudentIds.length} Students`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
