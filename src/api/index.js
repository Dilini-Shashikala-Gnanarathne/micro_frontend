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
export const getPackageEnrollmentProduct = (data) => api.post('/api/student/enroll/package', data);

// Manual Enrollment (Admin)
export const createManualEnrollment = (data) => api.post('/api/manual/enrollments', data);
export const getStudents = (params) => api.get('/api/user/students/filter', { params });

