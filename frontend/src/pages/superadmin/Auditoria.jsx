// pages/superadmin/Auditoria.jsx
import { useEffect, useState, useCallback } from 'react';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';

const ACAO_COR = {
  login_superadmin:         '#6366f1',
  login_falhou:             '#ef4444',
  logout_superadmin:        '#64748b',
  criar_psicologo:          '#10b981',
  editar_psicologo:         '#f59e0b',
  bloquear_psicologo:       '#ef4444',
  desbloquear_psicologo:    '#10b981',
  redefinir_senha_psicologo:'#f59e0b',
};

export default function Auditoria() {
  const { api } = useSuperAdmin();
  const [logs,    setLogs]   = useState([]);
  const [total,   setTotal]  = useState(0);
  const [page,    setPage]   = useState(1);
  const [filtros, setFiltros] = useState({ acao: '', email: '' });
  const [loading, setLoad]   = useState(true);

  const carregar = useCallback(async () => {
    setLoad(true);
    try {
      const q = new URLSearchParams({ page, ...filtros }).toString();
      const d = await api(`/api/superadmin/auditoria?${q}`);
      setLogs(d.logs); setTotal(d.total);
    } catch {}
    finally { setLoad(false); }
  }, [page, filtros, api]);

  useEffect(() => { carregar(); }, [carregar]);

  const pages = Math.ceil(total / 50);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, margin: 0 }}>Log de Auditoria</h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{total} registro{total !== 1 ? 's' : ''}</p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: '1.25rem' }}>
        <input placeholder="Filtrar por ação…" value={filtros.acao}
          onChange={e => { setFiltros(f => ({ ...f, acao: e.target.value })); setPage(1); }}
          style={inputStyle}
        />
        <input placeholder="Filtrar por e-mail…" value={filtros.email}
          onChange={e => { setFiltros(f => ({ ...f, email: e.target.value })); setPage(1); }}
          style={inputStyle}
        />
      </div>

      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              {['Data/hora', 'Usuário', 'Ação', 'Entidade', 'IP'].map(h => (
                <th key={h} style={{ color: '#64748b', fontSize: 12, fontWeight: 500, padding: '0.75rem 1rem', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ color: '#64748b', padding: '2rem', textAlign: 'center' }}>Carregando…</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} style={{ color: '#64748b', padding: '2rem', textAlign: 'center' }}>Nenhum registro</td></tr>
            ) : logs.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid #0f172a' }}>
                <td style={{ ...td, color: '#64748b', fontSize: 12 }}>
                  {new Date(l.criado_em).toLocaleString('pt-BR')}
                </td>
                <td style={td}>{l.usuario_email || '—'}</td>
                <td style={td}>
                  <span style={{
                    background: (ACAO_COR[l.acao] || '#334155') + '22',
                    color: ACAO_COR[l.acao] || '#94a3b8',
                    borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 500,
                  }}>{l.acao}</span>
                </td>
                <td style={{ ...td, color: '#94a3b8', fontSize: 12 }}>
                  {l.entidade}{l.entidade_id ? ` #${l.entidade_id}` : ''}
                </td>
                <td style={{ ...td, color: '#64748b', fontSize: 12 }}>{l.ip || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {pages > 1 && (
          <div style={{ display: 'flex', gap: 6, padding: '0.75rem 1rem' }}>
            {Array.from({ length: Math.min(pages, 10) }, (_, i) => i + 1).map(n => (
              <button key={n} onClick={() => setPage(n)} style={{
                padding: '3px 10px', borderRadius: 6, border: '1px solid #334155',
                background: page === n ? '#312e81' : '#0f172a',
                color: page === n ? '#a5b4fc' : '#94a3b8', cursor: 'pointer', fontSize: 12,
              }}>{n}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const inputStyle = {
  padding: '0.6rem 0.875rem', background: '#1e293b',
  border: '1px solid #334155', borderRadius: 8,
  color: '#f1f5f9', fontSize: 14, outline: 'none', width: 240,
};
const td = { padding: '0.75rem 1rem', color: '#e2e8f0', fontSize: 13 };
