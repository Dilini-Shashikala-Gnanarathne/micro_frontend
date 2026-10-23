import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  if (adminOnly && user.role !== "SUPER_ADMIN" && user.role !== "SUB_ADMIN") {
    navigate("/dashboard", { replace: true });
    return null;
  }

  return children;
}
