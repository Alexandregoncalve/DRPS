// contexts/SuperAdminContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const CTX = createContext(null);

export function SuperAdminProvider({ children }) {
  const [token,   setToken]   = useState(() => sessionStorage.getItem('sa_token') || null);
  const [usuario, setUsuario] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('sa_usuario') || 'null'); }
    catch { return null; }
  });

  const login = useCallback(async (email, senha) => {
    const r = await fetch(`${API}/api/superadmin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.erro || 'Erro ao fazer login');
    sessionStorage.setItem('sa_token',   data.token);
    sessionStorage.setItem('sa_usuario', JSON.stringify(data.usuario));
    setToken(data.token);
    setUsuario(data.usuario);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API}/api/superadmin/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
    sessionStorage.removeItem('sa_token');
    sessionStorage.removeItem('sa_usuario');
    setToken(null);
    setUsuario(null);
  }, [token]);

  // Helper de fetch autenticado
  const api = useCallback(async (path, opts = {}) => {
    const r = await fetch(`${API}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(opts.headers || {}),
      },
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.erro || `Erro ${r.status}`);
    return data;
  }, [token]);

  return (
    <CTX.Provider value={{ token, usuario, login, logout, api }}>
      {children}
    </CTX.Provider>
  );
}

export const useSuperAdmin = () => useContext(CTX);
