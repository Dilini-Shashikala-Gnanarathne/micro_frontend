import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  getLessons,
  getCourseLessons,
  getCourses,
  createLesson,
  updateLesson,
  updateLessonStatus,
  reorderLessons,
  deleteLesson,
  getLessonById,
  addLessonResources,
  updateLessonResource,
  reorderLessonResources,
  deleteLessonResource,
  getLessonsForEnroll,
} from "../api";
import toast from "react-hot-toast";

const INITIAL_LESSON_FORM = {
  name: "",
  courseId: "",
  description: "",
  date: new Date().toISOString().split("T")[0],
  watchTimeHours: 2,
  watchTimeLimitSeconds: 7200,
  isFree: false,
  status: "ACTIVE",
  note: "",
};

const INITIAL_RESOURCE_FORM = {
  resourceType: "VIDEO", // VIDEO, MEETING, DOCUMENT, URL
  name: "",
  url: "",
  meetingDatetime: "",
  size: "",
};

export default function LessonsPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  // Active Tab: 'lessons' | 'enroll'
  const [activeTab, setActiveTab] = useState("lessons");

  // Courses list for filter & form
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Lesson list state
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    name: "",
    courseId: "",
    status: "",
  });
  const [selectedLessonIds, setSelectedLessonIds] = useState([]);

  // Create / Edit Lesson Modal
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [lessonForm, setLessonForm] = useState(INITIAL_LESSON_FORM);
  const [submittingLesson, setSubmittingLesson] = useState(false);

  // Delete Lesson Modal
  const [deletingLesson, setDeletingLesson] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Reorder Lessons Modal
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [reorderLessonsList, setReorderLessonsList] = useState([]);
  const [reordering, setReordering] = useState(false);

  // View Lesson & Manage Resources Modal
  const [viewingLesson, setViewingLesson] = useState(null);
  const [loadingLessonDetails, setLoadingLessonDetails] = useState(false);
  const [resourcesList, setResourcesList] = useState([]);
  const [savingResourceOrder, setSavingResourceOrder] = useState(false);

  // Add Resource Modal
  const [isAddResourceModalOpen, setIsAddResourceModalOpen] = useState(false);
  const [resourceForm, setResourceForm] = useState(INITIAL_RESOURCE_FORM);
  const [resourceFile, setResourceFile] = useState(null);
  const [submittingResource, setSubmittingResource] = useState(false);

  // Edit Resource Modal
  const [editingResource, setEditingResource] = useState(null);
  const [editResourceForm, setEditResourceForm] = useState({
    id: "",
    name: "",
    url: "",
    meetingDatetime: "",
    size: "",
    resourceType: "",
  });
  const [submittingEditResource, setSubmittingEditResource] = useState(false);

  // Delete Resource State
  const [deletingResourceId, setDeletingResourceId] = useState(null);

  // Enroll Lessons Catalog Tab state (GET /api/lessons/enroll)
  const [enrollLessons, setEnrollLessons] = useState([]);
  const [loadingEnroll, setLoadingEnroll] = useState(false);
  const [enrollPagination, setEnrollPagination] = useState({
    name: "",
    date: "",
    page: 1,
    size: 10,
    sortBy: "request_at",
    sortDir: "DESC",
  });
  const [enrollTotalPages, setEnrollTotalPages] = useState(1);
  const [enrollTotalItems, setEnrollTotalItems] = useState(0);

  // Fetch Courses
  const fetchCourses = useCallback(async () => {
    setLoadingCourses(true);
    try {
      const res = await getCourses({ size: 100 });
      const raw = res.data?.data;
      const list = Array.isArray(raw?.items)
        ? raw.items
        : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
        ? raw
        : [];
      setCourses(list);
    } catch {
      // ignore
    } finally {
      setLoadingCourses(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Fetch Main Lessons (GET /api/lessons/all or /api/course/{courseId}/lessons/all)
  const fetchLessons = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      if (filters.courseId) {
        res = await getCourseLessons(filters.courseId);
      } else {
        res = await getLessons({
          name: filters.name || undefined,
          status: filters.status || undefined,
        });
      }

      const data = res.data?.data;
      let list = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : [];

      // Filter locally if search text or status applied while courseId is selected
      if (filters.name) {
        const q = filters.name.toLowerCase();
        list = list.filter(
          (l) =>
            l.name?.toLowerCase().includes(q) ||
            l.description?.toLowerCase().includes(q)
        );
      }
      if (filters.status) {
        list = list.filter((l) => l.status === filters.status);
      }

      setLessons(list);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch lessons");
      setLessons([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (activeTab === "lessons") {
      fetchLessons();
    }
  }, [activeTab, fetchLessons]);

  // Fetch Lessons for Enroll Tab (GET /api/lessons/enroll)
  const fetchEnrollLessons = useCallback(async () => {
    setLoadingEnroll(true);
    try {
      const params = {
        name: enrollPagination.name || undefined,
        date: enrollPagination.date || undefined,
        page: enrollPagination.page,
        size: enrollPagination.size,
        sortBy: enrollPagination.sortBy,
        sortDir: enrollPagination.sortDir,
      };
      const res = await getLessonsForEnroll(params);
      const data = res.data?.data || res.data || {};
      const items = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
      setEnrollLessons(items);
      const totalCount = data.total ?? data.totalItems ?? items.length;
      setEnrollTotalItems(totalCount);
      setEnrollTotalPages(
        data.totalPages || Math.ceil(totalCount / enrollPagination.size) || 1
      );
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to fetch enrollment lessons"
      );
      setEnrollLessons([]);
    } finally {
      setLoadingEnroll(false);
    }
  }, [enrollPagination]);

  useEffect(() => {
    if (activeTab === "enroll") {
      fetchEnrollLessons();
    }
  }, [activeTab, fetchEnrollLessons]);

  // Checkbox selection
  const toggleLessonSelect = (id) => {
    setSelectedLessonIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const currentList = activeTab === "lessons" ? lessons : enrollLessons;
    if (
      selectedLessonIds.length === currentList.length &&
      currentList.length > 0
    ) {
      setSelectedLessonIds([]);
    } else {
      setSelectedLessonIds(currentList.map((l) => l.id));
    }
  };

  // Open Create Lesson Modal
  const handleOpenCreateModal = () => {
    setIsEditMode(false);
    setEditingLessonId(null);
    setLessonForm({
      ...INITIAL_LESSON_FORM,
      courseId: filters.courseId || (courses[0]?.id || ""),
    });
    setIsLessonModalOpen(true);
  };

  // Open Edit Lesson Modal
  const handleOpenEditModal = (lesson) => {
    setIsEditMode(true);
    setEditingLessonId(lesson.id);
    const watchSecs = lesson.watchTimeLimitSeconds || 0;
    setLessonForm({
      name: lesson.name || "",
      courseId: lesson.courseId || lesson.course_id || "",
      description: lesson.description || "",
      date: lesson.date ? lesson.date.split("T")[0] : "",
      watchTimeHours: watchSecs > 0 ? (watchSecs / 3600).toFixed(1) : "",
      watchTimeLimitSeconds: watchSecs,
      isFree: Boolean(lesson.isFree),
      status: lesson.status || "ACTIVE",
      note: lesson.note || "",
    });
    setIsLessonModalOpen(true);
  };

  // Submit Create / Edit Lesson (POST /api/lessons or PUT /api/lesson)
  const handleSubmitLesson = async (e) => {
    e.preventDefault();
    if (!lessonForm.name.trim()) {
      toast.error("Lesson name is required");
      return;
    }
    if (!isEditMode && !lessonForm.courseId) {
      toast.error("Please select a parent course");
      return;
    }

    setSubmittingLesson(true);
    try {
      const watchTimeSec = lessonForm.watchTimeHours
        ? Math.round(parseFloat(lessonForm.watchTimeHours) * 3600)
        : null;

      if (isEditMode) {
        // PUT /api/lesson
        const payload = {
          id: editingLessonId,
          name: lessonForm.name.trim(),
          description: lessonForm.description || null,
          date: lessonForm.date || null,
          watchTimeLimitSeconds: watchTimeSec,
          status: lessonForm.status,
          isFree: lessonForm.isFree ? 1 : 0,
          note: lessonForm.note || null,
        };
        await updateLesson(payload);
        toast.success("Lesson updated successfully");
      } else {
        // POST /api/lessons
        const payload = {
          name: lessonForm.name.trim(),
          courseId: lessonForm.courseId,
          description: lessonForm.description || null,
          date: lessonForm.date || null,
          watchTimeLimitSeconds: watchTimeSec,
          isFree: lessonForm.isFree ? 1 : 0,
          status: lessonForm.status,
          note: lessonForm.note || null,
        };
        await createLesson(payload);
        toast.success("Lesson created successfully");
      }
      setIsLessonModalOpen(false);
      fetchLessons();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to save lesson. Please verify fields."
      );
    } finally {
      setSubmittingLesson(false);
    }
  };

  // Quick Status Change (PUT /api/lesson/status)
  const handleStatusChange = async (lessonId, newStatus) => {
    try {
      await updateLessonStatus(lessonId, newStatus);
      toast.success(`Lesson status updated to ${newStatus}`);
      setLessons((prev) =>
        prev.map((l) => (l.id === lessonId ? { ...l, status: newStatus } : l))
      );
      if (viewingLesson && viewingLesson.id === lessonId) {
        setViewingLesson((prev) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update status");
    }
  };

  // Delete Lesson (DELETE /api/lesson/{lessonId})
  const handleConfirmDeleteLesson = async () => {
    if (!deletingLesson) return;
    setDeleting(true);
    try {
      await deleteLesson(deletingLesson.id);
      toast.success(`Lesson "${deletingLesson.name}" deleted successfully.`);
      setDeletingLesson(null);
      fetchLessons();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete lesson");
    } finally {
      setDeleting(false);
    }
  };

  // Open Reorder Lessons Modal
  const handleOpenReorderModal = async () => {
    if (!filters.courseId) {
      toast.error("Please select a specific course first to reorder its lessons");
      return;
    }
    try {
      const res = await getCourseLessons(filters.courseId);
      const data = res.data?.data;
      const list = Array.isArray(data) ? data : [];
      setReorderLessonsList(
        list.map((l, index) => ({
          ...l,
          tempOrder: l.order ?? index,
        }))
      );
      setIsReorderModalOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load course lessons");
    }
  };

  const moveLessonInList = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= reorderLessonsList.length) return;
    const updated = [...reorderLessonsList];
    const item = updated.splice(index, 1)[0];
    updated.splice(targetIndex, 0, item);
    setReorderLessonsList(updated);
  };

  // Save Lessons Order (PUT /api/course/{courseId}/lessons/reorder)
  const handleSaveLessonsOrder = async () => {
    if (!filters.courseId) return;
    setReordering(true);
    try {
      const payload = reorderLessonsList.map((item, index) => ({
        id: item.id,
        order: index,
      }));
      await reorderLessons(filters.courseId, payload);
      toast.success("Lessons order updated successfully!");
      setIsReorderModalOpen(false);
      fetchLessons();
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to save lessons order"
      );
    } finally {
      setReordering(false);
    }
  };

  // View Lesson & Resources (GET /api/lesson/{lessonId})
  const handleOpenLessonDetails = async (lessonId) => {
    setLoadingLessonDetails(true);
    try {
      const res = await getLessonById(lessonId);
      const lessonData = res.data?.data || {};
      setViewingLesson(lessonData);
      setResourcesList(lessonData.resources || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch lesson details");
    } finally {
      setLoadingLessonDetails(false);
    }
  };

  // Add Lesson Resource (POST /api/lesson/resources)
  const handleOpenAddResourceModal = () => {
    setResourceForm({
      ...INITIAL_RESOURCE_FORM,
    });
    setResourceFile(null);
    setIsAddResourceModalOpen(true);
  };

  const handleAddResourceSubmit = async (e) => {
    e.preventDefault();
    if (!viewingLesson?.id) return;
    if (!resourceForm.name.trim()) {
      toast.error("Resource name is required");
      return;
    }

    if (
      resourceForm.resourceType !== "DOCUMENT" &&
      !resourceForm.url?.trim()
    ) {
      toast.error("Resource URL is required");
      return;
    }

    if (
      resourceForm.resourceType === "DOCUMENT" &&
      !resourceFile
    ) {
      toast.error("Please attach a document file");
      return;
    }

    if (
      resourceForm.resourceType === "MEETING" &&
      !resourceForm.meetingDatetime
    ) {
      toast.error("Meeting datetime is required for meeting resources");
      return;
    }

    setSubmittingResource(true);
    try {
      const formData = new FormData();
      formData.append("lessonId", viewingLesson.id);

      // Backend expects 'YYYY-MM-DD HH:mm:ss' for meetingDatetime
      let formattedMeetingDt = null;
      if (resourceForm.meetingDatetime) {
        formattedMeetingDt = resourceForm.meetingDatetime.replace("T", " ");
        if (formattedMeetingDt.length === 16) {
          formattedMeetingDt += ":00";
        }
      }

      const resourcePayload = [
        {
          resourceType: resourceForm.resourceType,
          name: resourceForm.name.trim(),
          url: resourceForm.url ? resourceForm.url.trim() : null,
          meetingDatetime: formattedMeetingDt,
          size: resourceForm.size ? parseFloat(resourceForm.size) : null,
          order: resourcesList.length,
        },
      ];

      formData.append("resources", JSON.stringify(resourcePayload));

      if (resourceFile) {
        // Backend expects $_FILES['documents'] as an array of files matching index
        formData.append("documents[]", resourceFile);
      }

      await addLessonResources(formData);
      toast.success("Resource added successfully!");
      setIsAddResourceModalOpen(false);

      // Refresh lesson details
      handleOpenLessonDetails(viewingLesson.id);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to add lesson resource"
      );
    } finally {
      setSubmittingResource(false);
    }
  };

  // Open Edit Resource Modal
  const handleOpenEditResourceModal = (resource) => {
    setEditingResource(resource);
    let dt = resource.meetingDatetime || "";
    if (dt && dt.includes(" ")) {
      dt = dt.replace(" ", "T").substring(0, 16);
    }
    setEditResourceForm({
      id: resource.id,
      name: resource.name || "",
      url: resource.url || "",
      meetingDatetime: dt,
      size: resource.size ?? "",
      resourceType: resource.resourceType,
    });
  };

  // Submit Edit Resource (PUT /api/lesson/resource)
  const handleEditResourceSubmit = async (e) => {
    e.preventDefault();
    if (!editingResource || !viewingLesson) return;

    setSubmittingEditResource(true);
    try {
      let formattedDt = null;
      if (editResourceForm.meetingDatetime) {
        formattedDt = editResourceForm.meetingDatetime.replace("T", " ");
        if (formattedDt.length === 16) formattedDt += ":00";
      }

      const payload = {
        id: editingResource.id,
        lessonId: viewingLesson.id,
        name: editResourceForm.name || null,
        url:
          editResourceForm.resourceType !== "DOCUMENT"
            ? editResourceForm.url || null
            : undefined,
        meetingDatetime: formattedDt,
        size: editResourceForm.size
          ? parseFloat(editResourceForm.size)
          : null,
      };

      await updateLessonResource(payload);
      toast.success("Resource updated successfully!");
      setEditingResource(null);
      handleOpenLessonDetails(viewingLesson.id);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to update resource"
      );
    } finally {
      setSubmittingEditResource(false);
    }
  };

  // Move resource up or down in list
  const moveResourceInList = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= resourcesList.length) return;
    const updated = [...resourcesList];
    const item = updated.splice(index, 1)[0];
    updated.splice(targetIndex, 0, item);
    setResourcesList(updated);
  };

  // Save Resource Order (PUT /api/lesson/{lessonId}/resources/reorder)
  const handleSaveResourceOrder = async () => {
    if (!viewingLesson?.id) return;
    setSavingResourceOrder(true);
    try {
      const payload = resourcesList.map((res, index) => ({
        id: res.id,
        order: index,
      }));
      await reorderLessonResources(viewingLesson.id, payload);
      toast.success("Resource order saved successfully!");
      handleOpenLessonDetails(viewingLesson.id);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to reorder resources"
      );
    } finally {
      setSavingResourceOrder(false);
    }
  };

  // Delete Resource (DELETE /api/lesson/resource/{resourceId})
  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm("Are you sure you want to delete this resource?")) return;
    setDeletingResourceId(resourceId);
    try {
      await deleteLessonResource(resourceId);
      toast.success("Resource deleted successfully");
      handleOpenLessonDetails(viewingLesson.id);
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to delete resource"
      );
    } finally {
      setDeletingResourceId(null);
    }
  };

  const getResourceTypeBadge = (type) => {
    switch (type) {
      case "VIDEO":
        return { label: "Video", bg: "#e0f2fe", color: "#0369a1", icon: "🎬" };
      case "MEETING":
        return { label: "Live Meeting", bg: "#fef3c7", color: "#92400e", icon: "📅" };
      case "DOCUMENT":
        return { label: "Document", bg: "#f3e8ff", color: "#6b21a8", icon: "📄" };
      case "URL":
        return { label: "Web Link", bg: "#dcfce7", color: "#166534", icon: "🔗" };
      default:
        return { label: type || "Resource", bg: "#f3f4f6", color: "#374151", icon: "📎" };
    }
  };

  return (
    <div className="page-content">
      {/* Top Page Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text-primary)",
              marginBottom: 4,
            }}
          >
            Lesson Management
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13.5 }}>
            Create, filter, view, re-order lessons, and manage video/meeting/doc attachments.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {selectedLessonIds.length > 0 && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() =>
                navigate(
                  `/enroll?type=lesson&lessonIds=${selectedLessonIds.join(",")}`
                )
              }
              id="btn-enroll-selected-header"
            >
              Enroll in {selectedLessonIds.length} Selected →
            </button>
          )}

          {isAdmin && (
            <>
              {filters.courseId && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleOpenReorderModal}
                  id="btn-reorder-lessons"
                  title="Reorder lessons in this course"
                >
                  ⇅ Reorder Lessons
                </button>
              )}
              <button
                className="btn btn-primary btn-sm"
                onClick={handleOpenCreateModal}
                id="btn-create-lesson"
              >
                + Create Lesson
              </button>
            </>
          )}

          <button
            className="btn btn-outline btn-sm"
            onClick={() => navigate("/enroll?type=lesson")}
            id="btn-enroll-test"
          >
            + Enroll Page
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "20px",
        }}
      >
        <button
          onClick={() => setActiveTab("lessons")}
          style={{
            padding: "10px 18px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            border: "none",
            borderBottom:
              activeTab === "lessons"
                ? "3px solid var(--primary)"
                : "3px solid transparent",
            background: "transparent",
            color:
              activeTab === "lessons"
                ? "var(--primary)"
                : "var(--text-secondary)",
            transition: "all 0.2s ease",
          }}
          id="tab-all-lessons"
        >
          All Course Lessons
        </button>
        <button
          onClick={() => setActiveTab("enroll")}
          style={{
            padding: "10px 18px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            border: "none",
            borderBottom:
              activeTab === "enroll"
                ? "3px solid var(--primary)"
                : "3px solid transparent",
            background: "transparent",
            color:
              activeTab === "enroll"
                ? "var(--primary)"
                : "var(--text-secondary)",
            transition: "all 0.2s ease",
          }}
          id="tab-enroll-lessons"
        >
          Lessons for Enrollment Catalog
        </button>
      </div>

      {/* Selected Lessons Action Toolbar */}
      {selectedLessonIds.length > 0 && (
        <div
          style={{
            background: "var(--primary-light)",
            border: "1.5px solid var(--primary)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 16px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: "13.5px",
              fontWeight: 600,
              color: "var(--primary)",
            }}
          >
            ⚡ <strong>{selectedLessonIds.length}</strong> lesson(s) selected
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setSelectedLessonIds([])}
            >
              Clear
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() =>
                navigate(
                  `/enroll?type=lesson&lessonIds=${selectedLessonIds.join(",")}`
                )
              }
              id="btn-enroll-selected-banner"
            >
              Proceed to Enroll ({selectedLessonIds.length}) →
            </button>
          </div>
        </div>
      )}

      {/* TAB 1: ALL COURSE LESSONS */}
      {activeTab === "lessons" && (
        <div className="card">
          <div className="card-header">
            <div
              className="filter-bar"
              style={{
                margin: 0,
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div className="search-input" style={{ flex: 1, minWidth: "220px" }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  className="form-control"
                  placeholder="Search by lesson name or description..."
                  id="lesson-search"
                  value={filters.name}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, name: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && fetchLessons()}
                  style={{ paddingLeft: "32px" }}
                />
              </div>

              {/* Course Filter Dropdown */}
              <select
                className="form-control"
                style={{ maxWidth: "260px" }}
                value={filters.courseId}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, courseId: e.target.value }))
                }
                id="lesson-course-select"
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.code ? `(${c.code})` : ""}
                  </option>
                ))}
              </select>

              <select
                className="form-control"
                style={{ maxWidth: "150px" }}
                id="lesson-status"
                value={filters.status}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.target.value }))
                }
              >
                <option value="">All Status</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="DRAFT">DRAFT</option>
                <option value="DEACTIVE">DEACTIVE</option>
              </select>

              <button
                className="btn btn-primary"
                onClick={fetchLessons}
                id="btn-lesson-filter"
              >
                Filter
              </button>
              {(filters.name || filters.courseId || filters.status) && (
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    setFilters({ name: "", courseId: "", status: "" })
                  }
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="table-wrap">
            {loading ? (
              <div className="page-loader" style={{ padding: "40px" }}>
                <div className="spinner spinner-dark" />
              </div>
            ) : lessons.length === 0 ? (
              <div className="empty-state" style={{ padding: "40px 20px" }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.2}
                  stroke="currentColor"
                  style={{ width: "48px", height: "48px", margin: "0 auto 12px" }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                  />
                </svg>
                <p style={{ fontWeight: 600 }}>No lessons found.</p>
                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                  Try selecting a different course or creating a new lesson.
                </p>
                {isAdmin && (
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 12 }}
                    onClick={handleOpenCreateModal}
                  >
                    + Create First Lesson
                  </button>
                )}
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "36px" }}>
                      <input
                        type="checkbox"
                        checked={
                          lessons.length > 0 &&
                          selectedLessonIds.length === lessons.length
                        }
                        onChange={toggleSelectAll}
                        id="check-select-all-lessons"
                      />
                    </th>
                    <th>#</th>
                    <th>Lesson Name</th>
                    <th>Course</th>
                    <th>Date</th>
                    <th>Watch Limit</th>
                    <th>Status</th>
                    <th>Access</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((l, i) => (
                    <tr key={l.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedLessonIds.includes(l.id)}
                          onChange={() => toggleLessonSelect(l.id)}
                          id={`check-lesson-${l.id}`}
                        />
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                        {l.order !== undefined && l.order !== null
                          ? l.order
                          : i + 1}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {l.name}
                        </div>
                        {l.description && (
                          <div
                            style={{
                              fontSize: "11.5px",
                              color: "var(--text-muted)",
                              maxWidth: "320px",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {l.description}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
                        <strong>{l.courseName || l.course_name || "—"}</strong>
                        {(l.courseCode || l.course_code) && (
                          <span
                            style={{
                              marginLeft: "6px",
                              color: "var(--text-muted)",
                            }}
                          >
                            ({l.courseCode || l.course_code})
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: "13px" }}>
                        {l.date
                          ? new Date(l.date).toLocaleDateString()
                          : "—"}
                      </td>
                      <td style={{ fontSize: "12.5px" }}>
                        {l.watchTimeLimitSeconds && l.watchTimeLimitSeconds > 0
                          ? `${Math.round(l.watchTimeLimitSeconds / 3600)}h (${Math.round(
                              l.watchTimeLimitSeconds / 60
                            )}m)`
                          : "Unlimited"}
                      </td>
                      <td>
                        {isAdmin ? (
                          <select
                            value={l.status}
                            onChange={(e) =>
                              handleStatusChange(l.id, e.target.value)
                            }
                            className={`badge ${
                              l.status === "ACTIVE"
                                ? "badge-success"
                                : l.status === "DRAFT"
                                ? "badge-warning"
                                : "badge-gray"
                            }`}
                            style={{
                              border: "none",
                              cursor: "pointer",
                              outline: "none",
                            }}
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="DRAFT">DRAFT</option>
                            <option value="DEACTIVE">DEACTIVE</option>
                          </select>
                        ) : (
                          <span
                            className={`badge ${
                              l.status === "ACTIVE"
                                ? "badge-success"
                                : l.status === "DRAFT"
                                ? "badge-warning"
                                : "badge-gray"
                            }`}
                          >
                            {l.status}
                          </span>
                        )}
                      </td>
                      <td>
                        {l.isFree ? (
                          <span className="badge badge-success">Free</span>
                        ) : (
                          <span className="badge badge-primary">Paid</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <div
                          style={{
                            display: "inline-flex",
                            gap: "6px",
                            alignItems: "center",
                          }}
                        >
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenLessonDetails(l.id)}
                            title="View lesson resources and attachments"
                            id={`btn-resources-${l.id}`}
                          >
                            📂 Resources
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenEditModal(l)}
                                title="Edit lesson"
                                id={`btn-edit-${l.id}`}
                              >
                                ✏️ Edit
                              </button>
                              {isSuperAdmin && (
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{
                                    color: "var(--danger)",
                                    borderColor: "var(--danger)",
                                  }}
                                  onClick={() => setDeletingLesson(l)}
                                  title="Delete lesson"
                                  id={`btn-delete-${l.id}`}
                                >
                                  🗑️
                                </button>
                              )}
                            </>
                          )}

                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() =>
                              navigate(`/enroll?type=lesson&lessonIds=${l.id}`)
                            }
                            id={`btn-enroll-${l.id}`}
                          >
                            Enroll
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: LESSONS FOR ENROLLMENT CATALOG (GET /api/lessons/enroll) */}
      {activeTab === "enroll" && (
        <div className="card">
          <div className="card-header">
            <div
              className="filter-bar"
              style={{
                margin: 0,
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div className="search-input" style={{ flex: 1, minWidth: "220px" }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  className="form-control"
                  placeholder="Search enrollment lessons by title..."
                  value={enrollPagination.name}
                  onChange={(e) =>
                    setEnrollPagination((p) => ({
                      ...p,
                      name: e.target.value,
                      page: 1,
                    }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && fetchEnrollLessons()}
                  style={{ paddingLeft: "32px" }}
                />
              </div>

              <input
                type="date"
                className="form-control"
                style={{ maxWidth: "180px" }}
                value={enrollPagination.date}
                onChange={(e) =>
                  setEnrollPagination((p) => ({
                    ...p,
                    date: e.target.value,
                    page: 1,
                  }))
                }
                title="Filter by date"
              />

              <select
                className="form-control"
                style={{ maxWidth: "160px" }}
                value={`${enrollPagination.sortBy}:${enrollPagination.sortDir}`}
                onChange={(e) => {
                  const [sortBy, sortDir] = e.target.value.split(":");
                  setEnrollPagination((p) => ({
                    ...p,
                    sortBy,
                    sortDir,
                    page: 1,
                  }));
                }}
              >
                <option value="request_at:DESC">Newest First</option>
                <option value="request_at:ASC">Oldest First</option>
                <option value="name:ASC">Name (A-Z)</option>
                <option value="name:DESC">Name (Z-A)</option>
                <option value="date:DESC">Date (Latest)</option>
              </select>

              <button className="btn btn-primary" onClick={fetchEnrollLessons}>
                Filter
              </button>
              {(enrollPagination.name || enrollPagination.date) && (
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    setEnrollPagination((p) => ({
                      ...p,
                      name: "",
                      date: "",
                      page: 1,
                    }))
                  }
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="table-wrap">
            {loadingEnroll ? (
              <div className="page-loader" style={{ padding: "40px" }}>
                <div className="spinner spinner-dark" />
              </div>
            ) : enrollLessons.length === 0 ? (
              <div className="empty-state" style={{ padding: "40px 20px" }}>
                <p style={{ fontWeight: 600 }}>
                  No enrollment lessons found matching criteria.
                </p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "36px" }}>
                      <input
                        type="checkbox"
                        checked={
                          enrollLessons.length > 0 &&
                          selectedLessonIds.length === enrollLessons.length
                        }
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>#</th>
                    <th>Lesson Name</th>
                    <th>Course Code / Name</th>
                    <th>Date</th>
                    <th>Access</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Enrollment Action</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollLessons.map((l, i) => (
                    <tr key={l.id || i}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedLessonIds.includes(l.id)}
                          onChange={() => toggleLessonSelect(l.id)}
                        />
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                        {(enrollPagination.page - 1) * enrollPagination.size +
                          i +
                          1}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{l.name}</div>
                        {l.description && (
                          <div
                            style={{
                              fontSize: "11.5px",
                              color: "var(--text-muted)",
                            }}
                          >
                            {l.description?.slice(0, 80)}...
                          </div>
                        )}
                      </td>
                      <td>
                        <strong>{l.courseName || l.course_name || "—"}</strong>
                      </td>
                      <td>
                        {l.date ? new Date(l.date).toLocaleDateString() : "—"}
                      </td>
                      <td>
                        {l.isFree ? (
                          <span className="badge badge-success">Free</span>
                        ) : (
                          <span className="badge badge-primary">Paid</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            l.status === "ACTIVE"
                              ? "badge-success"
                              : "badge-gray"
                          }`}
                        >
                          {l.status || "ACTIVE"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() =>
                            navigate(`/enroll?type=lesson&lessonIds=${l.id}`)
                          }
                        >
                          Enroll Now →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Controls */}
          {enrollTotalPages > 1 && (
            <div
              className="pagination"
              style={{
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Showing {(enrollPagination.page - 1) * enrollPagination.size + 1}{" "}
                to{" "}
                {Math.min(
                  enrollPagination.page * enrollPagination.size,
                  enrollTotalItems
                )}{" "}
                of {enrollTotalItems} lessons
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  className="page-btn"
                  disabled={enrollPagination.page <= 1}
                  onClick={() =>
                    setEnrollPagination((p) => ({ ...p, page: p.page - 1 }))
                  }
                >
                  ‹
                </button>
                {Array.from({ length: enrollTotalPages }, (_, idx) => idx + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === enrollTotalPages ||
                      Math.abs(p - enrollPagination.page) <= 2
                  )
                  .map((p) => (
                    <button
                      key={p}
                      className={`page-btn ${
                        enrollPagination.page === p ? "active" : ""
                      }`}
                      onClick={() =>
                        setEnrollPagination((prev) => ({ ...prev, page: p }))
                      }
                    >
                      {p}
                    </button>
                  ))}
                <button
                  className="page-btn"
                  disabled={enrollPagination.page >= enrollTotalPages}
                  onClick={() =>
                    setEnrollPagination((p) => ({ ...p, page: p.page + 1 }))
                  }
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CREATE / EDIT LESSON MODAL (POST /api/lessons & PUT /api/lesson) */}
      {isLessonModalOpen && (
        <div className="modal-overlay" onClick={() => setIsLessonModalOpen(false)}>
          <div
            className="modal"
            style={{ maxWidth: "600px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">
                {isEditMode ? "Edit Lesson" : "Create New Lesson"}
              </h2>
              <button
                className="modal-close"
                onClick={() => setIsLessonModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitLesson}>
              <div className="modal-body" style={{ maxHeight: "75vh" }}>
                {!isEditMode && (
                  <div className="form-group">
                    <label className="form-label">
                      Course <span>*</span>
                    </label>
                    <select
                      className="form-control"
                      value={lessonForm.courseId}
                      onChange={(e) =>
                        setLessonForm({ ...lessonForm, courseId: e.target.value })
                      }
                      required
                    >
                      <option value="">Select Course</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.code ? `(${c.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">
                    Lesson Name <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Session 01: Vector Geometry & Matrices"
                    value={lessonForm.name}
                    onChange={(e) =>
                      setLessonForm({ ...lessonForm, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Key concepts, goals, and topic summaries covered in this lesson..."
                    value={lessonForm.description}
                    onChange={(e) =>
                      setLessonForm({
                        ...lessonForm,
                        description: e.target.value,
                      })
                    }
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label className="form-label">Session Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={lessonForm.date}
                      onChange={(e) =>
                        setLessonForm({ ...lessonForm, date: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Watch Time Limit (Hours)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      className="form-control"
                      placeholder="e.g. 2 for 2 hours (leave blank for unlimited)"
                      value={lessonForm.watchTimeHours}
                      onChange={(e) =>
                        setLessonForm({
                          ...lessonForm,
                          watchTimeHours: e.target.value,
                        })
                      }
                    />
                    <span className="form-hint">
                      Converts to seconds automatically
                    </span>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label className="form-label">Lesson Status</label>
                    <select
                      className="form-control"
                      value={lessonForm.status}
                      onChange={(e) =>
                        setLessonForm({ ...lessonForm, status: e.target.value })
                      }
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="DRAFT">DRAFT</option>
                      <option value="DEACTIVE">DEACTIVE</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Access Type</label>
                    <select
                      className="form-control"
                      value={lessonForm.isFree ? "1" : "0"}
                      onChange={(e) =>
                        setLessonForm({
                          ...lessonForm,
                          isFree: e.target.value === "1",
                        })
                      }
                    >
                      <option value="0">Paid Lesson (Enrollment Required)</option>
                      <option value="1">Free Lesson (Open Preview)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Internal / Admin Note</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder="Instructor notes, exam requirements, or reference reminders..."
                    value={lessonForm.note}
                    onChange={(e) =>
                      setLessonForm({ ...lessonForm, note: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsLessonModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingLesson}
                >
                  {submittingLesson ? "Saving..." : isEditMode ? "Save Changes" : "Create Lesson"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VIEW LESSON & MANAGE RESOURCES (GET /api/lesson/{lessonId}) */}
      {viewingLesson && (
        <div className="modal-overlay" onClick={() => setViewingLesson(null)}>
          <div
            className="modal"
            style={{ maxWidth: "780px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <h2 className="modal-title">{viewingLesson.name}</h2>
                  <span
                    className={`badge ${
                      viewingLesson.status === "ACTIVE"
                        ? "badge-success"
                        : viewingLesson.status === "DRAFT"
                        ? "badge-warning"
                        : "badge-gray"
                    }`}
                  >
                    {viewingLesson.status}
                  </span>
                  {viewingLesson.isFree ? (
                    <span className="badge badge-success">Free</span>
                  ) : (
                    <span className="badge badge-primary">Paid</span>
                  )}
                </div>
                {viewingLesson.course?.name && (
                  <div
                    style={{
                      fontSize: "12.5px",
                      color: "var(--text-secondary)",
                      marginTop: 2,
                    }}
                  >
                    Course: <strong>{viewingLesson.course.name}</strong>
                  </div>
                )}
              </div>
              <button
                className="modal-close"
                onClick={() => setViewingLesson(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ maxHeight: "75vh" }}>
              {/* Lesson Overview Box */}
              <div
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  padding: "14px 18px",
                  marginBottom: 20,
                  fontSize: "13px",
                }}
              >
                {viewingLesson.description && (
                  <p style={{ marginBottom: 8, color: "var(--text-primary)" }}>
                    {viewingLesson.description}
                  </p>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: "20px",
                    flexWrap: "wrap",
                    color: "var(--text-secondary)",
                    fontSize: "12.5px",
                  }}
                >
                  {viewingLesson.date && (
                    <div>
                      📅 Date:{" "}
                      <strong>
                        {new Date(viewingLesson.date).toLocaleDateString()}
                      </strong>
                    </div>
                  )}
                  <div>
                    ⏱️ Watch Limit:{" "}
                    <strong>
                      {viewingLesson.watchTimeLimitSeconds &&
                      viewingLesson.watchTimeLimitSeconds > 0
                        ? `${Math.round(
                            viewingLesson.watchTimeLimitSeconds / 3600
                          )} Hours`
                        : "Unlimited"}
                    </strong>
                  </div>
                  {viewingLesson.totalDocumentSize ? (
                    <div>
                      📁 Total Docs:{" "}
                      <strong>{viewingLesson.totalDocumentSize} MB</strong>
                    </div>
                  ) : null}
                </div>
                {viewingLesson.note && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      fontStyle: "italic",
                    }}
                  >
                    Note: {viewingLesson.note}
                  </div>
                )}
              </div>

              {/* Resources Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <h3 style={{ fontSize: "15px", fontWeight: 700 }}>
                  Lesson Resources & Materials ({resourcesList.length})
                </h3>
                <div style={{ display: "flex", gap: "8px" }}>
                  {isAdmin && resourcesList.length > 1 && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={handleSaveResourceOrder}
                      disabled={savingResourceOrder}
                      title="Save the current order sequence of resources"
                    >
                      {savingResourceOrder ? "Saving..." : "Save Resource Order"}
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleOpenAddResourceModal}
                      id="btn-add-resource"
                    >
                      + Add Resource
                    </button>
                  )}
                </div>
              </div>

              {/* Resources List */}
              {loadingLessonDetails ? (
                <div className="page-loader" style={{ padding: "30px" }}>
                  <div className="spinner spinner-dark" />
                </div>
              ) : resourcesList.length === 0 ? (
                <div
                  style={{
                    padding: "30px",
                    textAlign: "center",
                    border: "1.5px dashed var(--border)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--text-muted)",
                  }}
                >
                  <p style={{ fontSize: "14px", fontWeight: 500 }}>
                    No resources attached to this lesson yet.
                  </p>
                  {isAdmin && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ marginTop: 10 }}
                      onClick={handleOpenAddResourceModal}
                    >
                      + Add Video, Meeting, or Document
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {resourcesList.map((res, index) => {
                    const badge = getResourceTypeBadge(res.resourceType);
                    return (
                      <div
                        key={res.id || index}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px 16px",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-sm)",
                          background: "var(--bg-white)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            flex: 1,
                          }}
                        >
                          {/* Reorder Arrows */}
                          {isAdmin && (
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "2px",
                              }}
                            >
                              <button
                                type="button"
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  cursor: index === 0 ? "default" : "pointer",
                                  opacity: index === 0 ? 0.3 : 1,
                                  fontSize: "10px",
                                }}
                                disabled={index === 0}
                                onClick={() => moveResourceInList(index, -1)}
                                title="Move up"
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  cursor:
                                    index === resourcesList.length - 1
                                      ? "default"
                                      : "pointer",
                                  opacity:
                                    index === resourcesList.length - 1 ? 0.3 : 1,
                                  fontSize: "10px",
                                }}
                                disabled={index === resourcesList.length - 1}
                                onClick={() => moveResourceInList(index, 1)}
                                title="Move down"
                              >
                                ▼
                              </button>
                            </div>
                          )}

                          {/* Type Badge */}
                          <div
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              background: badge.bg,
                              color: badge.color,
                              fontSize: "12px",
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <span>{badge.icon}</span>
                            <span>{badge.label}</span>
                          </div>

                          {/* Resource Details */}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "13.5px" }}>
                              {res.name || "Untitled Resource"}
                            </div>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "var(--text-secondary)",
                                display: "flex",
                                gap: "12px",
                                marginTop: "2px",
                              }}
                            >
                              {res.meetingDatetime && (
                                <span>
                                  🕒 Meeting:{" "}
                                  <strong>
                                    {new Date(res.meetingDatetime).toLocaleString()}
                                  </strong>
                                </span>
                              )}
                              {res.size && (
                                <span>
                                  💾 Size: <strong>{res.size} MB</strong>
                                </span>
                              )}
                              {res.isEnded && (
                                <span style={{ color: "var(--danger)" }}>
                                  [Meeting Ended]
                                </span>
                              )}
                              {res.canJoin && (
                                <span style={{ color: "var(--secondary)", fontWeight: 600 }}>
                                  [Live / Joinable Now]
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                          {res.url && (
                            <a
                              href={res.url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary btn-sm"
                            >
                              {res.resourceType === "MEETING"
                                ? "Join 🚀"
                                : res.resourceType === "DOCUMENT"
                                ? "Download 📄"
                                : "Open Link ↗"}
                            </a>
                          )}

                          {isAdmin && (
                            <>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleOpenEditResourceModal(res)}
                                title="Edit metadata"
                              >
                                ✏️
                              </button>
                              {isSuperAdmin && (
                                <button
                                  className="btn btn-outline btn-sm"
                                  style={{
                                    color: "var(--danger)",
                                    borderColor: "var(--danger)",
                                  }}
                                  onClick={() => handleDeleteResource(res.id)}
                                  disabled={deletingResourceId === res.id}
                                  title="Delete resource"
                                >
                                  {deletingResourceId === res.id ? "..." : "🗑️"}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewingLesson(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD RESOURCE MODAL (POST /api/lesson/resources) */}
      {isAddResourceModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsAddResourceModalOpen(false)}
        >
          <div
            className="modal"
            style={{ maxWidth: "540px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">Add Lesson Resource</h2>
              <button
                className="modal-close"
                onClick={() => setIsAddResourceModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddResourceSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">
                    Resource Type <span>*</span>
                  </label>
                  <select
                    className="form-control"
                    value={resourceForm.resourceType}
                    onChange={(e) =>
                      setResourceForm({
                        ...resourceForm,
                        resourceType: e.target.value,
                      })
                    }
                  >
                    <option value="VIDEO">Video Stream / Link (VIDEO)</option>
                    <option value="MEETING">Live Meeting / Zoom (MEETING)</option>
                    <option value="DOCUMENT">Document File / PDF (DOCUMENT)</option>
                    <option value="URL">External Link / Website (URL)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Resource Name <span>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Session 1 Lecture Video or Notes PDF"
                    value={resourceForm.name}
                    onChange={(e) =>
                      setResourceForm({ ...resourceForm, name: e.target.value })
                    }
                    required
                  />
                </div>

                {resourceForm.resourceType === "DOCUMENT" ? (
                  <div className="form-group">
                    <label className="form-label">
                      Document File <span>*</span>
                    </label>
                    <input
                      type="file"
                      className="form-control"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        setResourceFile(file);
                        if (file) {
                          setResourceForm((rf) => ({
                            ...rf,
                            size: (file.size / (1024 * 1024)).toFixed(2),
                          }));
                        }
                      }}
                      required
                    />
                    <span className="form-hint">
                      Supported formats: PDF, DOCX, ZIP (Max 50MB)
                    </span>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">
                      Resource URL <span>*</span>
                    </label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://..."
                      value={resourceForm.url}
                      onChange={(e) =>
                        setResourceForm({ ...resourceForm, url: e.target.value })
                      }
                      required
                    />
                  </div>
                )}

                {resourceForm.resourceType === "MEETING" && (
                  <div className="form-group">
                    <label className="form-label">
                      Meeting Datetime <span>*</span>
                    </label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={resourceForm.meetingDatetime}
                      onChange={(e) =>
                        setResourceForm({
                          ...resourceForm,
                          meetingDatetime: e.target.value,
                        })
                      }
                      required
                    />
                    <span className="form-hint">
                      Date and scheduled start time for student attendance
                    </span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Size (MB)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    placeholder="e.g. 15.5"
                    value={resourceForm.size}
                    onChange={(e) =>
                      setResourceForm({ ...resourceForm, size: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddResourceModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingResource}
                >
                  {submittingResource ? "Adding Resource..." : "Add Resource"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: EDIT RESOURCE MODAL (PUT /api/lesson/resource) */}
      {editingResource && (
        <div
          className="modal-overlay"
          onClick={() => setEditingResource(null)}
        >
          <div
            className="modal"
            style={{ maxWidth: "520px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">Edit Resource</h2>
              <button
                className="modal-close"
                onClick={() => setEditingResource(null)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleEditResourceSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Resource Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editResourceForm.name}
                    onChange={(e) =>
                      setEditResourceForm({
                        ...editResourceForm,
                        name: e.target.value,
                      })
                    }
                    required
                  />
                </div>

                {editResourceForm.resourceType !== "DOCUMENT" ? (
                  <div className="form-group">
                    <label className="form-label">Resource URL</label>
                    <input
                      type="url"
                      className="form-control"
                      value={editResourceForm.url}
                      onChange={(e) =>
                        setEditResourceForm({
                          ...editResourceForm,
                          url: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      background: "var(--warning-light)",
                      border: "1px solid var(--warning)",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      fontSize: "12.5px",
                      marginBottom: "16px",
                    }}
                  >
                    Note: Document files cannot be replaced directly. To change
                    the file, delete this resource and upload a new one.
                  </div>
                )}

                {editResourceForm.resourceType === "MEETING" && (
                  <div className="form-group">
                    <label className="form-label">Meeting Datetime</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={editResourceForm.meetingDatetime}
                      onChange={(e) =>
                        setEditResourceForm({
                          ...editResourceForm,
                          meetingDatetime: e.target.value,
                        })
                      }
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Size (MB)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={editResourceForm.size}
                    onChange={(e) =>
                      setEditResourceForm({
                        ...editResourceForm,
                        size: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingResource(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submittingEditResource}
                >
                  {submittingEditResource ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: REORDER LESSONS MODAL (PUT /api/course/{courseId}/lessons/reorder) */}
      {isReorderModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsReorderModalOpen(false)}
        >
          <div
            className="modal"
            style={{ maxWidth: "560px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title">Reorder Lessons within Course</h2>
              <button
                className="modal-close"
                onClick={() => setIsReorderModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: "65vh" }}>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  marginBottom: 14,
                }}
              >
                Use the arrow buttons to arrange the lessons into the desired
                chronological teaching order.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {reorderLessonsList.map((lesson, idx) => (
                  <div
                    key={lesson.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "13px",
                          color: "var(--primary)",
                          minWidth: "24px",
                        }}
                      >
                        #{idx + 1}
                      </span>
                      <span style={{ fontWeight: 600, fontSize: "13.5px" }}>
                        {lesson.name}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "4px" }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={idx === 0}
                        onClick={() => moveLessonInList(idx, -1)}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={idx === reorderLessonsList.length - 1}
                        onClick={() => moveLessonInList(idx, 1)}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsReorderModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveLessonsOrder}
                disabled={reordering}
              >
                {reordering ? "Saving Order..." : "Save Lessons Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: DELETE LESSON CONFIRMATION (DELETE /api/lesson/{lessonId}) */}
      {deletingLesson && (
        <div className="modal-overlay" onClick={() => setDeletingLesson(null)}>
          <div
            className="modal"
            style={{ maxWidth: "420px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: "var(--danger)" }}>
                Delete Lesson
              </h2>
              <button
                className="modal-close"
                onClick={() => setDeletingLesson(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "14px", marginBottom: "12px" }}>
                Are you sure you want to permanently delete lesson:
              </p>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "14.5px",
                  padding: "10px",
                  background: "var(--danger-light)",
                  color: "var(--danger)",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: "14px",
                }}
              >
                {deletingLesson.name}
              </div>
              <p style={{ fontSize: "12.5px", color: "var(--text-muted)" }}>
                This will also remove associated student watch histories and resource attachments.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeletingLesson(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDeleteLesson}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete Lesson"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}