import axios from 'axios';

const api = axios.create({
  baseURL: '',
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

const getUserRole = () => {
  try {
    const user = JSON.parse(localStorage.getItem('ak_user') || '{}');
    return user?.role || '';
  } catch {
    return '';
  }
};

// Auth
export const authLogin = (username, password) => {
  const form = new FormData();
  form.append('username', username);
  form.append('password', password);
  return api.post('/api/auth/login', form);
};

export const authLoginVerifyOtp = (txnId, otp) => {
  const form = new FormData();
  form.append('txnId', txnId);
  form.append('otp', otp);
  return api.post('/api/auth/login/verify', form);
};

export const authLogout = () => api.post('/api/auth/logout');

// Student Registration
export const registerStudent = (data) => api.post('/api/auth/register', data);

export const verifyRegisterOtp = (txnId, otp) => {
  const form = new FormData();
  form.append('txnId', txnId);
  form.append('otp', otp);
  return api.post('/api/auth/register/verify', form);
};

// Courses (Auto-selects Admin vs Student endpoint according to user role)
export const getCourses = (params) => {
  const role = getUserRole();
  const endpoint = (role === 'SUPER_ADMIN' || role === 'SUB_ADMIN')
    ? '/api/courses/filter'
    : '/api/student/courses/filter';
  return api.get(endpoint, { params }).catch((err) => {
    if (err.response?.status === 403 && endpoint === '/api/courses/filter') {
      return api.get('/api/student/courses/filter', { params });
    }
    throw err;
  });
};

export const getStudentCourses = (params) => api.get('/api/student/courses/filter', { params });
export const getAdminCourses = (params) => api.get('/api/courses/filter', { params });
export const getCourseById = (id) => api.get(`/api/course/${id}`);
export const createCourse = (formData) => api.post('/api/aca/course', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const updateCourse = (data) => api.put('/api/aca/course', data);
export const updateCourseStatus = (id, status) => api.put('/api/course/status', { id, status });
export const deleteCourse = (id) => api.delete(`/api/course/${id}`);

// Packages (Auto-selects Admin vs Student endpoint according to user role)
export const getPackages = (params) => {
  const role = getUserRole();
  const endpoint = (role === 'SUPER_ADMIN' || role === 'SUB_ADMIN')
    ? '/api/packages/filter'
    : '/api/student/packages/filter';
  return api.get(endpoint, { params }).catch((err) => {
    if (err.response?.status === 403 && endpoint === '/api/packages/filter') {
      return api.get('/api/student/packages/filter', { params });
    }
    throw err;
  });
};

export const getStudentPackages = (params) => api.get('/api/student/packages/filter', { params });
export const getAdminPackages = (params) => api.get('/api/packages/filter', { params });

// Lessons
export const getCourseLessons = (courseId) => api.get(`/api/course/${courseId}/lessons/all`);
export const getLessonById = (id) => api.get(`/api/lesson/${id}`);
export const getLessons = (params) => {
  if (params?.courseId) {
    return getCourseLessons(params.courseId);
  }
  return api.get('/api/lessons/all', { params });
};
export const getAllLessons = (params) => api.get('/api/lessons/all', { params });
export const createLesson = (data) => api.post('/api/lessons', data);
export const updateLesson = (data) => api.put('/api/lesson', data);
export const updateLessonStatus = (id, status) => api.put('/api/lesson/status', { id, status });
export const reorderLessons = (courseId, lessons) => api.put(`/api/course/${courseId}/lessons/reorder`, { lessons });
export const deleteLesson = (id) => api.delete(`/api/lesson/${id}`);

// Lesson Resources
export const addLessonResources = (formData) => api.post('/api/lesson/resources', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const updateLessonResource = (data) => api.put('/api/lesson/resource', data);
export const reorderLessonResources = (lessonId, resources) => api.put(`/api/lesson/${lessonId}/resources/reorder`, { resources });
export const deleteLessonResource = (resourceId) => api.delete(`/api/lesson/resource/${resourceId}`);

// Lesson Enrollment Catalog
export const getLessonsForEnroll = (params) => api.get('/api/lessons/enroll', { params });

// Enrollment
export const enrollCourse = (data) => api.post('/api/enroll/course', data);
export const enrollCourseFree = (data) => api.post('/api/enroll/course/free', data);
export const enrollPackage = (data) => api.post('/api/enroll/package', data);
export const enrollLesson = (data) => api.post('/api/enroll/lesson', data);
export const updateEnrollment = (data) => api.post('/api/enroll/update', data);
export const updateCourseEnrollment = (data) => api.put('/api/enroll/update/course', data);
export const updatePackageEnrollment = (data) => api.put('/api/enroll/update/package', data);
export const updateLessonEnrollment = (data) => api.put('/api/enroll/update/lesson', data);
export const cancelEnrollment = (data) => api.post('/api/enroll/cancel', data);
export const removeEnrollment = (enrollmentId) => api.patch('/api/enrollment/remove', { enrollmentId });
export const getEnrollDetails = (id) => api.get('/api/enroll', { params: { id } });

// Course Requests (admin)
export const getCourseRequests = (params) => api.get('/api/enroll/requests/course', { params });
export const getPackageRequests = (params) => api.get('/api/enroll/requests/package', { params });
export const getLessonRequests = (params) => api.get('/api/enroll/requests/lesson', { params });

// Payment approve & reject (admin)
export const approvePayment = (paymentId) => api.put(`/api/payment/${paymentId}/approve`);
export const rejectPayment = (paymentId, reason) => api.put(`/api/payment/${paymentId}/reject`, { reason });

// Payment evidence upload
export const uploadPaymentSlip = (formData) => api.post('/api/payment/evidence/upload', formData);

// Reject reasons
export const getRejectReasons = (params) => api.get('/api/payment/reject-reasons/filter', { params });


// Package Management
export const createPackage = (formData) => api.post('/api/academic/package', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const updatePackage = (formData) => api.post('/api/academic/package/update', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const getPackageById = (id) => api.get(`/api/academic/package/${id}`);
export const deletePackage = (id) => api.delete(`/api/academic/package/${id}`);
export const updatePackageStatus = (id, status) => api.put(`/api/academic/package/status/${id}`, { status });
export const getBatches = () => api.get('/api/user/batches/all');

export default api;

// Physical Institutes & Student Profile
export const getPhysicalInstitutes = () => api.get('/api/academic/physical-institutes/all');
export const getStudentProfile = (userId) => api.get('/api/user/student/' + userId);
export const createPhysicalInstitute = (data) => api.post('/api/academic/physical-institute', data);
export const updatePhysicalInstitute = (id, data) => api.put('/api/academic/physical-institute/' + id, data);
export const deletePhysicalInstitute = (id) => api.delete('/api/academic/physical-institute/' + id);

// Tute Requests
export const getTuteRequests = (params) => api.get('/api/academic/tute-requests/filter', { params });
export const updateTuteRequest = (id, data) => api.put('/api/academic/tute-request/' + id, data);
export const updateTuteRequestStatus = (id, status) => api.put('/api/academic/tute-request/' + id + '/status', { status });
export const deleteTuteRequest = (id) => api.delete('/api/academic/tute-request/' + id);
export const getTuteRequestsForPrint = (params) => api.get('/api/academic/tute-requests/print', { params });

// Enrollment Catalog & Filter
export const filterEnrollmentCourses = (params) => api.get('/api/student/courses/filter', { params });
export const filterEnrollmentPackages = (params) => api.get('/api/student/packages/filter', { params });

// Product Enrollment Details
export const getCourseEnrollmentProduct = (id) => api.get('/api/student/enroll/course/' + id);
export const getPackageEnrollmentProduct = (packageIdOrData, courseIds = []) => {
  if (typeof packageIdOrData === 'object' && packageIdOrData !== null) {
    const pkgId = packageIdOrData.packageId || packageIdOrData.package_id;
    const crsIds = packageIdOrData.courseIds || packageIdOrData.course_ids || [];
    return api.post('/api/student/enroll/package', {
      packageId: pkgId,
      courseIds: crsIds,
    });
  }
  return api.post('/api/student/enroll/package', {
    packageId: packageIdOrData,
    courseIds: Array.isArray(courseIds) ? courseIds : [],
  });
};
export const getLessonsForEnroll = (params) => api.get('/api/lessons/enroll', { params });

// Manual Enrollment (Admin)
export const createManualEnrollment = (data) => api.post('/api/manual/enrollments', data);
export const getStudents = (params) => api.get('/api/user/students/filter', { params });

// Academic Modules (Admin)
export const getModules = (params) => api.get('/api/academic/modules/filter', { params });
export const createModule = (data) => api.post('/api/academic/module', data);
export const updateModule = (id, data) => api.put(`/api/academic/module/${id}`, data);
export const deleteModule = (id) => api.delete(`/api/academic/module/${id}`);

// Exam Types (Admin)
export const getExamTypes = (params) => api.get('/api/academic/exam-types/filter', { params });
export const createExamType = (data) => api.post('/api/academic/exam-type', data);
export const updateExamType = (id, data) => api.put(`/api/academic/exam-type/${id}`, data);
export const deleteExamType = (id) => api.delete(`/api/academic/exam-type/${id}`);

// Free Card Students (Admin)
export const getFreeCardStudents = (params) => api.get('/api/user/free-card/students', { params });
export const addFreeCardStudent = (data) => api.post('/api/user/free-card/student', data);
export const addFreeCardStudentsBulk = (items) => api.post('/api/user/free-card/students/bulk', items);
export const updateFreeCardStudent = (studentId, data) => api.put(`/api/user/free-card/student/${studentId}`, data);
export const removeFreeCardStudent = (studentId, classId) => {
  const url = classId ? `/api/user/free-card/student/${studentId}?classId=${encodeURIComponent(classId)}` : `/api/user/free-card/student/${studentId}`;
  return api.delete(url);
};
export const removeFreeCardStudentsBulk = (items) => api.post('/api/user/free-card/students/bulk-remove', items);

// Student Incidents
export const getIncidentStates = () => api.get('/api/user/student/incident/states');
export const getStudentIncidents = (studentId, params) => api.get(`/api/user/student/${studentId}/incidents`, { params });
export const getStudentIncidentById = (incidentId) => api.get(`/api/user/student/incident/${incidentId}`);
export const createStudentIncident = (studentId, data) => api.post(`/api/user/student/${studentId}/incident`, data);
export const updateStudentIncident = (incidentId, data) => api.put(`/api/user/student/incident/${incidentId}`, data);
export const deleteStudentIncident = (incidentId) => api.delete(`/api/user/student/incident/${incidentId}`);




