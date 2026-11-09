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
export const getCourseEnrolledStudents = (courseId, params) => api.get(`/api/course/${courseId}/enrolled-students`, { params });
export const getCourseNonEnrolledStudents = (courseId, params) => api.get(`/api/course/${courseId}/students/not-enrolled`, { params });
export const getCourseOldStudents = (courseId, params) => api.get(`/api/course/${courseId}/students/old`, { params });
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
export const getPackageById = (id) => api.get(`/api/academic/package/${id}`);
export const createPackage = (data) => api.post('/api/academic/package', data);
export const updatePackage = (data) => api.post('/api/academic/package/update', data);
export const updatePackageStatus = (id, status) => api.put(`/api/academic/package/status/${id}`, { status });
export const deletePackage = (id) => api.delete(`/api/academic/package/${id}`);
export const getPackageCourses = (packageId) => api.get(`/api/package/${packageId}/courses`);

// Lessons
export const getLessons = (params) => api.get('/api/lessons/enroll', { params });
export const getCourseLessons = (courseId) => api.get(`/api/course/${courseId}/lessons/all`);
export const getLessonById = (id) => api.get(`/api/lesson/${id}`);
export const createLesson = (data) => api.post('/api/aca/lesson', data);
export const updateLesson = (id, data) => api.put(`/api/aca/lesson/${id}`, data);
export const updateLessonStatus = (id, status) => api.put('/api/lesson/status', { id, status });
export const reorderLessons = (courseId, lessons) => api.put(`/api/course/${courseId}/lessons/reorder`, { lessons });
export const deleteLesson = (id) => api.delete(`/api/lesson/${id}`);

// Lesson Resources
export const getLessonResources = (lessonId) => api.get(`/api/lesson/${lessonId}/resources`);
export const createLessonResource = (data) => api.post('/api/lesson/resource', data);
export const addLessonResources = (formData) => api.post('/api/lesson/resources', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const updateLessonResource = (data) => api.put('/api/lesson/resource', data);
export const reorderLessonResources = (lessonId, resources) => api.put(`/api/lesson/${lessonId}/resources/reorder`, { resources });
export const deleteLessonResource = (id) => api.delete(`/api/lesson/resource/${id}`);

// Physical Institutes
export const getPhysicalInstitutes = (params) => api.get('/api/institutes/filter', { params });
export const createPhysicalInstitute = (data) => api.post('/api/institute', data);
export const updatePhysicalInstitute = (id, data) => api.put(`/api/institute/${id}`, data);
export const deletePhysicalInstitute = (id) => api.delete(`/api/institute/${id}`);

// Batches
export const getBatches = () => api.get('/api/user/batches/all');
export const createBatch = (data) => api.post('/api/user/batch', data);
export const updateBatch = (id, data) => api.put(`/api/user/batch/${id}`, data);
export const deleteBatch = (id) => api.delete(`/api/user/batch/${id}`);

// Enrollment Operations
export const enrollCourse = (data) => api.post('/api/enroll/course', data);
export const enrollCourseFree = (data) => api.post('/api/enroll/course/free', data);
export const enrollPackage = (data) => api.post('/api/enroll/package', data);
export const enrollLesson = (data) => api.post('/api/enroll/lesson', data);
export const cancelEnrollment = (data) => api.post('/api/enroll/cancel', data);
export const removeEnrollment = (data) => api.patch('/api/enrollment/remove', data);

export const updateCourseEnrollment = (data) => api.put('/api/enroll/update/course', data);
export const updatePackageEnrollment = (data) => api.put('/api/enroll/update/package', data);
export const updateLessonEnrollment = (data) => api.put('/api/enroll/update/lesson', data);

// Enrollment Approval & Rejection (Admin)
export const approveEnrollment = (orderId, data) => api.put(`/api/payment/${orderId}/approve`, data);
export const rejectEnrollment = (orderId, data) => api.put(`/api/payment/${orderId}/reject`, data);
export const approvePayment = (orderId, data) => api.put(`/api/payment/${orderId}/approve`, data);
export const rejectPayment = (orderId, rejectReason) => api.put(`/api/payment/${orderId}/reject`, typeof rejectReason === 'string' ? { rejectReason } : rejectReason);
export const deleteEnrollmentOrder = (orderId) => api.delete(`/api/enrollment/${orderId}`);

// Fulfillment & Payment Requests (Admin)
export const getCourseEnrollmentRequests = (params) => api.get('/api/enroll/requests/course', { params });
export const getPackageEnrollmentRequests = (params) => api.get('/api/enroll/requests/package', { params });
export const getLessonEnrollmentRequests = (params) => api.get('/api/enroll/requests/lesson', { params });
export const getCourseRequests = (params) => api.get('/api/enroll/requests/course', { params });
export const getPackageRequests = (params) => api.get('/api/enroll/requests/package', { params });
export const getLessonRequests = (params) => api.get('/api/enroll/requests/lesson', { params });

// Tute Requests
export const getTuteRequests = (params) => api.get('/api/academic/tute-requests/filter', { params });
export const updateTuteRequestStatus = (id, status) => api.put(`/api/academic/tute-request/${id}/status`, { status });
export const updateTuteRequest = (id, data) => api.put(`/api/academic/tute-request/${id}/status`, { status: data.status });
export const deleteTuteRequest = (id) => api.delete(`/api/academic/tute-request/${id}`);
export const getTuteRequestsForPrint = (params) => api.get('/api/academic/tute-requests/print', { params });

// Payment Slips & Evidence
export const uploadPaymentSlip = (formData) => api.post('/api/payment/evidence/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

// Student Catalog Filters
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

// User Profile & Account (All roles)
export const getOwnAccount = () => api.get('/api/user/me');
export const updateOwnAccount = (data) => api.put('/api/user/me', data);
export const deleteOwnAccount = (password) => api.delete('/api/user/profile/delete', { data: { password } });

// Student Details & Management
export const getStudentEssentialDetails = () => api.get('/api/user/student/essential-details');
export const updateStudentEssentialDetails = (data) => api.put('/api/user/student/essential-details', data);
export const updateStudentProfile = (data) => api.put('/api/user/student/profile', data);
export const getStudents = (params) => api.get('/api/user/students/filter', { params });
export const getStudentById = (userId) => api.get(`/api/user/student/${userId}`);
export const impersonateStudent = (userId) => api.post(`/api/user/student/${userId}/impersonate`);
export const deleteStudent = (userId) => api.delete(`/api/user/student/${userId}`);

// Admin Staff Management (Super Admin)
export const getAdmins = (params) => api.get('/api/user/admins/filter', { params });
export const getAllAdmins = () => api.get('/api/user/admins/all');
export const getAdminById = (userId) => api.get(`/api/user/admin/${userId}`);
export const createAdmin = (data) => api.post('/api/user/admin', data);
export const updateAdmin = (userId, data) => api.put(`/api/user/admin/${userId}`, data);
export const deleteAdmin = (userId) => api.delete(`/api/user/admin/${userId}`);
export const updateUserStatus = (userId, status) => api.put('/api/user/status', { userId, status });
export const forceResetPassword = (userId, password) => api.patch(`/api/user/password/force-reset/${userId}`, { password });

// Student Tags (Admin)
export const getStudentTags = () => api.get('/api/user/student/tag');
export const createStudentTag = (data) => api.post('/api/user/student/tag', data);
export const updateStudentTag = (id, data) => api.put(`/api/user/student/tag/${id}`, data);
export const deleteStudentTag = (id) => api.delete(`/api/user/student/tag/${id}`);
export const getStudentTagsByStudentId = (studentId) => api.get(`/api/user/student/${studentId}/tags`);
export const bulkSyncStudentTags = (assignments) => api.post('/api/user/student/tag/bulk-sync', { assignments });

// Payment & Financial Configurations (Admin)
export const getPaymentAmountConfigs = () => api.get('/api/payment/amount-configs/filter');
export const createPaymentAmountConfig = (data) => api.post('/api/payment/amount-config', data);
export const updatePaymentAmountConfig = (id, data) => api.put(`/api/payment/amount-config/${id}`, data);
export const deletePaymentAmountConfig = (id) => api.delete(`/api/payment/amount-config/${id}`);

export const getBankAccounts = (params) => api.get('/api/payment/bank-accounts/filter', { params });
export const createBankAccount = (data) => api.post('/api/payment/bank-account', data);
export const updateBankAccount = (id, data) => api.put(`/api/payment/bank-account/${id}`, data);
export const deleteBankAccount = (id) => api.delete(`/api/payment/bank-account/${id}`);

export const getRejectReasons = (params) => api.get('/api/payment/reject-reasons/filter', { params });
export const createRejectReason = (data) => api.post('/api/payment/reject-reason', data);
export const updateRejectReason = (id, data) => api.put(`/api/payment/reject-reason/${id}`, data);
export const deleteRejectReason = (id) => api.delete(`/api/payment/reject-reason/${id}`);

// Manual Enrollment (Admin)
export const createManualEnrollment = (data) => api.post('/api/manual/enrollments', data);

// Academic Modules
export const getModules = (params) => api.get('/api/academic/modules/filter', { params });
export const getActiveModules = () => api.get('/api/academic/modules/active');
export const getAllModulesForAdmin = () => api.get('/api/academic/modules/all');
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
export const addFreeCardStudentsBulk = (items) => api.post('/api/user/free-card/students/add', items);
export const updateFreeCardStudent = (studentId, data) => api.put(`/api/user/free-card/student/${studentId}`, data);
export const removeFreeCardStudent = (studentId, classId) => {
  const url = classId ? `/api/user/free-card/student/${studentId}?classId=${encodeURIComponent(classId)}` : `/api/user/free-card/student/${studentId}`;
  return api.delete(url);
};
export const removeFreeCardStudentsBulk = (items) => api.post('/api/user/free-card/students/remove', items);

// Student Incidents
export const getIncidentStates = () => api.get('/api/user/student/incident/states');
export const getStudentIncidents = (studentId, params) => api.get(`/api/user/student/${studentId}/incidents`, { params });
export const getStudentIncidentById = (incidentId) => api.get(`/api/user/student/incident/${incidentId}`);
export const createStudentIncident = (studentId, data) => api.post(`/api/user/student/${studentId}/incident`, data);
export const updateStudentIncident = (incidentId, data) => api.put(`/api/user/student/incident/${incidentId}`, data);
export const deleteStudentIncident = (incidentId) => api.delete(`/api/user/student/incident/${incidentId}`);

// Student Enrolled Courses Filter
export const getStudentEnrolledCourses = (params) => api.get('/api/student/enrolled-courses/filter', { params });

// Student Enrolled Lessons Filter
export const getStudentEnrolledLessons = (params) => api.get('/api/student/enrolled-lessons/filter', { params });

// Student Course With Lessons
export const getStudentCourseWithLessons = (id) => api.get(`/api/student/enrolled-course/${id}`);

// Student Lesson With Resources
export const getStudentLessonWithResources = (id) => api.get(`/api/student/enrolled-lesson/${id}`);

// Student Live Meetings
export const getStudentMeetings = () => api.get('/api/student/meetings');

// Student History
export const getStudentEnrollmentHistory = (params) => api.get('/api/student/history/enrollments', { params });
export const getStudentPaymentHistory = (params) => api.get('/api/student/history/payments', { params });
export const getStudentLessonRequestHistory = (params) => api.get('/api/student/history/lesson-requests', { params });
export const getStudentTuteRequestHistory = (params) => api.get('/api/student/history/tute-requests', { params });
