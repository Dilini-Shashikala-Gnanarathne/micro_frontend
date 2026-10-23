import { createContext, useContext, useState, useEffect } from "react";
import { authLogout } from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ak_user")) || null; }
    catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem("ak_user", JSON.stringify(userData));
  };

  const logout = async () => {
    try { await authLogout(); } catch {}
    setUser(null);
    localStorage.removeItem("ak_user");
    window.location.href = "/login";
  };

  const isAdmin = user?.role === "SUPER_ADMIN" || user?.role === "SUB_ADMIN";
  const isStudent = user?.role === "STUDENT";

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isStudent, loading, setLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
