// pages/superadmin/Login.jsx
import { useState } from 'react';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';

export default function SuperAdminLogin() {
  const { login } = useSuperAdmin();
  const [email,    setEmail]    = useState('');
  const [senha,    setSenha]    = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [erro,     setErro]     = useState('');
  const [load,     setLoad]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(''); setLoad(true);
    try {
      await login(email.trim().toLowerCase(), senha);
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoad(false);
    }
  }

  return (
    <div translate="no" lang="pt-BR" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#0f172a',
    }}>
      <div style={{
        background: '#1e293b', borderRadius: 16, padding: '2.5rem 2rem',
        width: '100%', maxWidth: 400, boxShadow: '0 25px 50px rgba(0,0,0,.5)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1rem', fontSize: 28,
          }}>👑</div>
          <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 600, margin: 0 }}>NeXa DRPS</h1>
          <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>Painel Super Admin</p>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off">
          {/* E-mail */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 6 }}>
              E-mail
            </label>
            <input
              type="email"
              required
              autoFocus
              autoComplete="username"
              placeholder="admin@nexadrps.com.br"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Senha com mostrar/ocultar */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 6 }}>
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={verSenha ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                style={{ ...inputStyle, paddingRight: 80 }}
              />
              <button
                type="button"
                onClick={() => setVerSenha(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  color: '#6366f1', fontSize: 12,
                  cursor: 'pointer', fontWeight: 600,
                }}
              >
                {verSenha ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {erro && (
            <div style={{
              background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 8,
              padding: '0.75rem 1rem', color: '#fca5a5', fontSize: 13, marginBottom: '1rem',
            }}>{erro}</div>
          )}

          <button
            type="submit"
            disabled={load}
            style={{
              width: '100%', padding: '0.75rem',
              background: load ? '#4338ca' : '#6366f1',
              color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 600,
              cursor: load ? 'not-allowed' : 'pointer',
            }}
          >
            {load ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p style={{ color: '#475569', fontSize: 11, textAlign: 'center', marginTop: '1.5rem' }}>
          Acesso restrito — NeXa DRPS v3.0
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '0.7rem 0.875rem',
  background: '#0f172a', border: '1px solid #334155',
  borderRadius: 8, color: '#f1f5f9', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
};
