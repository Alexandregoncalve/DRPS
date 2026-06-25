// pages/superadmin/Empresas.jsx
import { useEffect, useState, useCallback } from 'react';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';

export default function Empresas() {
  const { api } = useSuperAdmin();
  const [lista,   setLista]  = useState([]);
  const [total,   setTotal]  = useState(0);
  const [page,    setPage]   = useState(1);
  const [busca,   setBusca]  = useState('');
  const [loading, setLoad]   = useState(true);
  const [erro,    setErro]   = useState('');
  const [sel,     setSel]    = useState(null);
  const [avals,   setAvals]  = useState([]);

  const carregar = useCallback(async () => {
    setLoad(true);
    try {
      const d = await api(`/api/superadmin/empresas?page=${page}&busca=${encodeURIComponent(busca)}`);
      setLista(d.empresas); setTotal(d.total);
    } catch (e) { setErro(e.message); }
    finally { setLoad(false); }
  }, [page, busca, api]);

  useEffect(() => { carregar(); }, [carregar]);

  async function verAvaliacoes(empresa) {
    setSel(empresa);
    try {
      const d = await api(`/api/superadmin/empresas/${empresa.id}/avaliacoes`);
      setAvals(d);
    } catch (e) { setAvals([]); }
  }

  const pages = Math.ceil(total / 20);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, margin: 0 }}>Empresas</h1>
        <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{total} empresa{total !== 1 ? 's' : ''}</p>
      </div>

      <input placeholder="Buscar por nome ou CNPJ…" value={busca}
        onChange={e => { setBusca(e.target.value); setPage(1); }}
        style={{ padding: '0.6rem 0.875rem', background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#f1f5f9', fontSize: 14, outline: 'none', width: 320, marginBottom: '1.25rem' }}
      />

      {erro && <p style={{ color: '#f87171' }}>{erro}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: sel ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
        {/* Lista */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                {['Empresa', 'CNPJ', 'Setores', 'Avaliações', 'Respostas', 'Cadastro'].map(h => (
                  <th key={h} style={{ color: '#64748b', fontSize: 12, fontWeight: 500, padding: '0.75rem 1rem', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ color: '#64748b', padding: '2rem', textAlign: 'center' }}>Carregando…</td></tr>
              ) : lista.length === 0 ? (
                <tr><td colSpan={6} style={{ color: '#64748b', padding: '2rem', textAlign: 'center' }}>Nenhuma empresa</td></tr>
              ) : lista.map(e => (
                <tr key={e.id}
                  onClick={() => verAvaliacoes(e)}
                  style={{
                    borderBottom: '1px solid #0f172a',
                    background: sel?.id === e.id ? '#1e3a5f' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <td style={{ padding: '0.875rem 1rem', color: '#e2e8f0', fontSize: 13, fontWeight: 500 }}>{e.nome}</td>
                  <td style={{ padding: '0.875rem 1rem', color: '#94a3b8', fontSize: 12 }}>{e.cnpj || '—'}</td>
                  <td style={{ padding: '0.875rem 1rem', color: '#94a3b8', fontSize: 13 }}>{e.total_setores}</td>
                  <td style={{ padding: '0.875rem 1rem', color: '#a5b4fc', fontSize: 13 }}>{e.total_avaliacoes} ({e.avaliacoes_ativas} ativas)</td>
                  <td style={{ padding: '0.875rem 1rem', color: '#94a3b8', fontSize: 13 }}>{e.total_respostas}</td>
                  <td style={{ padding: '0.875rem 1rem', color: '#64748b', fontSize: 12 }}>
                    {new Date(e.criado_em).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pages > 1 && (
            <div style={{ display: 'flex', gap: 6, padding: '0.75rem 1rem' }}>
              {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
                <button key={n} onClick={ev => { ev.stopPropagation(); setPage(n); }} style={{
                  padding: '3px 10px', borderRadius: 6, border: '1px solid #334155',
                  background: page === n ? '#312e81' : '#0f172a',
                  color: page === n ? '#a5b4fc' : '#94a3b8', cursor: 'pointer', fontSize: 12,
                }}>{n}</button>
              ))}
            </div>
          )}
        </div>

        {/* Painel de avaliações */}
        {sel && (
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 600, margin: 0 }}>{sel.nome}</h2>
                {sel.cnpj && <p style={{ color: '#64748b', fontSize: 12, margin: '2px 0 0' }}>CNPJ: {sel.cnpj}</p>}
              </div>
              <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 480, overflowY: 'auto' }}>
              {avals.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: 13 }}>Nenhuma avaliação.</p>
              ) : avals.map(a => (
                <div key={a.id} style={{ background: '#0f172a', borderRadius: 8, padding: '0.75rem' }}>
                  <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500 }}>
                    {a.setor_nome} — {a.empresa_nome}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 3 }}>
                    {a.psicologo_nome} · {a.total_respostas} respostas
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                    <span style={{
                      background: a.status === 'aberta' ? '#14532d' : '#1c1917',
                      color: a.status === 'aberta' ? '#86efac' : '#78716c',
                      borderRadius: 20, padding: '1px 8px', fontSize: 11,
                    }}>{a.status}</span>
                    <span style={{ color: '#475569', fontSize: 11 }}>
                      {new Date(a.criado_em).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
