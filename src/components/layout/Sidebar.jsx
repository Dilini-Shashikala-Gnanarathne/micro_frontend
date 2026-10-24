import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const navItems = [
  { group: "General", items: [
    { label: "Dashboard", path: "/dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  ]},
  { group: "Academic", items: [
    { label: "Courses", path: "/courses", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
    { label: "Packages", path: "/packages", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
    { label: "Lessons", path: "/lessons", icon: "M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" },
    { label: "Institutes", path: "/institutes", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
    { label: "Enroll Student", path: "/enroll", icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" },
  ]},
  { group: "Payments", items: [
    { label: "Course Requests", path: "/payments/course", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" },
    { label: "Package Requests", path: "/payments/package", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  ]},
];

function NavIcon({ d }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">AK</div>
        <div>
          <div className="logo-text">AK ComMath</div>
          <div className="logo-sub">Learning Management</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((group) => (
          <div key={group.group}>
            <div className="nav-section-label">{group.group}</div>
            {group.items.map((item) => (
              <button
                key={item.path}
                className={`nav-item${isActive(item.path) ? " active" : ""}`}
                onClick={() => navigate(item.path)}
                id={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <NavIcon d={item.icon} />
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"10px"}}>
          <div className="user-avatar">{(user?.firstName?.[0] || user?.username?.[0] || "U").toUpperCase()}</div>
          <div>
            <div style={{fontWeight:600,fontSize:"13px"}}>{user?.firstName || user?.username || "User"}</div>
            <div style={{fontSize:"11px",color:"var(--text-muted)"}}>{user?.role}</div>
          </div>
        </div>
        <button className="btn btn-secondary btn-block btn-sm" onClick={logout} id="btn-logout">
          Sign Out
        </button>
      </div>
    </aside>
  );
}
