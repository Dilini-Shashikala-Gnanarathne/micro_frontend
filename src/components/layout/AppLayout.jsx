import Sidebar from "./Sidebar";
import { Outlet, useLocation } from "react-router-dom";

const pageTitles = {
  "/dashboard": "Dashboard",
  "/courses": "Courses",
  "/packages": "Packages",
  "/lessons": "Lessons",
  "/enroll": "Enroll Student",
  "/payments/course": "Course Payment Requests",
  "/payments/package": "Package Payment Requests",
};

export default function AppLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || "AK ComMath";
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <div className="topbar-title">{title}</div>
          <div className="topbar-right">
            <div style={{fontSize:"12.5px",color:"var(--text-muted)"}}>
              {new Date().toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}
            </div>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
