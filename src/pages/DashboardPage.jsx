import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const StatCard = ({ label, value, color, icon, bg }) => (
    <div className="stat-card">
        <div className="stat-icon" style={{ background: bg }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke={color}>
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
            </svg>
        </div>
        <div className="stat-info">
            <div className="label">{label}</div>
            <div className="value">{value}</div>
        </div>
    </div>
);

export default function DashboardPage() {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();

    return (
        <div>
            <div style={{ marginBottom: "24px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: 800 }}>
                    Good morning, {user?.firstName || "User"} 👋
                </h2>
                <p style={{ color: "var(--text-secondary)", marginTop: "4px" }}>
                    Here is what is happening in AK ComMath today.
                </p>
            </div>

            <div className="stats-grid">
                <StatCard label="Total Courses" value="—" color="#1a56db" bg="var(--primary-light)"
                    icon="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                <StatCard label="Active Students" value="—" color="#0e9f6e" bg="var(--secondary-light)"
                    icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                <StatCard label="Pending Payments" value="—" color="#c27803" bg="var(--warning-light)"
                    icon="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                <StatCard label="Total Lessons" value="—" color="#f05252" bg="var(--danger-light)"
                    icon="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">Quick Actions</span>
                    </div>
                    <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {isAdmin && (
                            <>
                                <button className="btn btn-primary" id="qa-enroll" onClick={() => navigate("/enroll")}>
                                    + Enroll a Student
                                </button>
                                <button className="btn btn-secondary" id="qa-manual-enroll" onClick={() => navigate("/manual-enrollment")}>
                                    ⚡ Manual Student Enrollment
                                </button>
                                <button className="btn btn-secondary" id="qa-courses" onClick={() => navigate("/courses")}>
                                    View All Courses
                                </button>
                                <button className="btn btn-secondary" id="qa-payments" onClick={() => navigate("/payments/course")}>
                                    Review Payment Requests
                                </button>
                                <button className="btn btn-secondary" id="qa-tute-requests" onClick={() => navigate("/tute-requests")}>
                                    Manage Tute Requests & Deliveries
                                </button>
                            </>
                        )}
                        {!isAdmin && (
                            <>
                                <button className="btn btn-primary" id="qa-enroll-self" onClick={() => navigate("/enroll")}>
                                    Enroll in a Course
                                </button>
                                <button className="btn btn-secondary" id="qa-my-courses" onClick={() => navigate("/courses")}>
                                    Browse Courses
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="card">
                    <div className="card-header">
                        <span className="card-title">System Overview</span>
                    </div>
                    <div className="card-body">
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                            {[
                                { label: "Combined Mathematics LMS", desc: "Advanced Level Sri Lanka" },
                                { label: "PHP REST API Backend", desc: "Running on XAMPP/Apache" },
                                { label: "React + Vite Frontend", desc: "Proxy to localhost" },
                            ].map((item) => (
                                <div key={item.label} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--secondary)", flexShrink: 0 }} />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: "13.5px" }}>{item.label}</div>
                                        <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{item.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
