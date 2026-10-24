import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CoursesPage from "./pages/CoursesPage";
import PackagesPage from "./pages/PackagesPage";
import LessonsPage from "./pages/LessonsPage";
import EnrollPage from "./pages/EnrollPage";
import CoursePaymentsPage from "./pages/CoursePaymentsPage";
import PackagePaymentsPage from "./pages/PackagePaymentsPage";
import CreatePackagePage from "./pages/CreatePackagePage";
import PackageBuyPage from "./pages/PackageBuyPage";
import InstitutesPage from "./pages/InstitutesPage";
import TuteRequestsPage from "./pages/TuteRequestsPage";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              borderRadius: "8px",
              fontFamily: "Inter, sans-serif",
              fontSize: "13.5px",
              fontWeight: 500,
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/packages" element={<PackagesPage />} />
            <Route path="/packages/:id/buy" element={<PackageBuyPage />} />
            <Route
              path="/packages/create"
              element={
                <ProtectedRoute adminOnly>
                  <CreatePackagePage />
                </ProtectedRoute>
              }
            />
            <Route path="/lessons" element={<LessonsPage />} />
            <Route path="/institutes" element={<InstitutesPage />} />
            <Route
              path="/tute-requests"
              element={
                <ProtectedRoute adminOnly>
                  <TuteRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/enroll" element={<EnrollPage />} />
            <Route path="/payments/course" element={<CoursePaymentsPage />} />
            <Route path="/payments/package" element={<PackagePaymentsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;