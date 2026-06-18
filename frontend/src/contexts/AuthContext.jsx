import { createContext, useContext, useState } from "react";

export const AuthContext = createContext(null);
export const API = "/api";
export function useAuth() { return useContext(AuthContext); }

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("drps_token"));
  const [usuario, setUsuario] = useState(() => {
    try { return JSON.parse(localStorage.getItem("drps_usuario")); } catch { return null; }
  });

  function onLogin(t, u) {
    setToken(t); setUsuario(u);
    localStorage.setItem("drps_token", t);
    localStorage.setItem("drps_usuario", JSON.stringify(u));
  }

  function logout() {
    fetch(`${API}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    localStorage.removeItem("drps_token");
    localStorage.removeItem("drps_usuario");
    setToken(null); setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ token, usuario, onLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
