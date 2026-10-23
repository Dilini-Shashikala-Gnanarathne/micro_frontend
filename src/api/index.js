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

// Courses
export const getCourses = (params) => api.get('/api/courses/filter', { params });
export const getCourseById = (id) => api.get(`/api/course/${id}`);

// Packages
export const getPackages = (params) => api.get('/api/academic/packages/filter', { params });

// Lessons
export const getLessons = (params) => api.get('/api/lessons/filter', { params });

// Enrollment
export const enrollCourse = (data) => api.post('/api/enroll/course', data);
export const enrollPackage = (data) => api.post('/api/enroll/package', data);
export const enrollLesson = (data) => api.post('/api/enroll/lesson', data);
export const updateEnrollment = (data) => api.post('/api/enroll/update', data);
export const cancelEnrollment = (data) => api.post('/api/enroll/cancel', data);
export const getEnrollDetails = (id) => api.get('/api/enroll', { params: { id } });

// Course Requests (admin)
export const getCourseRequests = (params) => api.get('/api/enroll/requests/course', { params });
export const getPackageRequests = (params) => api.get('/api/enroll/requests/package', { params });

// Payment evidence
export const uploadPaymentSlip = (formData) => api.post('/api/payment/evidence/upload', formData);

// Reject reasons
export const getRejectReasons = (params) => api.get('/api/payment/reject-reasons/filter', { params });

export default api;