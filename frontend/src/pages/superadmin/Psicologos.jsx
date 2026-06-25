// pages/superadmin/Psicologos.jsx
import { useEffect, useState, useCallback } from 'react';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';

const STATUS_COR = {
  ativo:     { bg: '#14532d', text: '#86efac', label: 'Ativo' },
  bloqueado: { bg: '#450a0a', text: '#fca5a5', label: 'Bloqueado' },
};

function Badge({ bloqueado }) {
  const s = bloqueado ? STATUS_COR.bloqueado : STATUS_COR.ativo;
  return (
    <span style={{
      background: s.bg, color: s.text,
      borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
    }}>{s.label}</span>
  );
}

function Modal({ titulo, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: '#1e293b', border: '1px solid #334155', borderRadius: 16,
        width: '100%', maxWidth: 480, padding: '1.75rem', position: 'relative',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ color: '#f1f5f9', fontSize: 17, fontWeight: 600, margin: 0 }}>{titulo}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Campo({ label, ...props }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 5 }}>{label}</label>
      <input {...props} style={{
        width: '100%', padding: '0.6rem 0.75rem',
        background: '#0f172a', border: '1px solid #334155',
        borderRadius: 8, color: '#f1f5f9', fontSize: 14,
        outline: 'none', boxSizing: 'border-box',
      }} />
    </div>
  );
}

export default function Psicologos() {
  const { api } = useSuperAdmin();
  const [lista,   setLista]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [busca,   setBusca]   = useState('');
  const [loading, setLoad]    = useState(true);
  const [modal,   setModal]   = useState(null); // 'criar' | 'editar' | 'senha' | 'avaliacoes'
  const [sel,     setSel]     = useState(null); // psicólogo selecionado
  const [form,    setForm]    = useState({});
  const [erro,    setErro]    = useState('');
  const [saving,  setSaving]  = useState(false);
  const [avals,   setAvals]   = useState([]);

  const carregar = useCallback(async () => {
    setLoad(true);
    setErro('');
    try {
      const d = await api(`/api/superadmin/psicologos?page=${page}&busca=${encodeURIComponent(busca)}`);
      setLista(d.psicologos);
      setTotal(d.total);
    } catch (e) { setErro(e.message); }
    finally { setLoad(false); }
  }, [page, busca, api]);

  useEffect(() => { carregar(); }, [carregar]);

  async function criar() {
    setSaving(true); setErro('');
    try {
      await api('/api/superadmin/psicologos', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setModal(null); setForm({});
      carregar();
    } catch (e) { setErro(e.message); }
    finally { setSaving(false); }
  }

  async function editar() {
    setSaving(true); setErro('');
    try {
      await api(`/api/superadmin/psicologos/${sel.id}`, {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      setModal(null); setForm({});
      carregar();
    } catch (e) { setErro(e.message); }
    finally { setSaving(false); }
  }

  async function redefinirSenha() {
    setSaving(true); setErro('');
    try {
      await api(`/api/superadmin/psicologos/${sel.id}/redefinir-senha`, {
        method: 'PATCH',
        body: JSON.stringify({ nova_senha: form.nova_senha }),
      });
      setModal(null); setForm({});
    } catch (e) { setErro(e.message); }
    finally { setSaving(false); }
  }

  async function toggleBloquear(p) {
    try {
      const rota = !p.ativo ? 'desbloquear' : 'bloquear';
      await api(`/api/superadmin/psicologos/${p.id}/${rota}`, { method: 'PATCH', body: '{}' });
      carregar();
    } catch (e) { alert(e.message); }
  }

  async function verAvaliacoes(p) {
    setSel(p);
    const d = await api(`/api/superadmin/psicologos/${p.id}/avaliacoes`);
    setAvals(d);
    setModal('avaliacoes');
  }

  const pages = Math.ceil(total / 20);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, margin: 0 }}>Psicólogos</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{total} cadastrado{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setModal('criar'); setForm({}); setErro(''); }}
          style={btnPrimario}>
          + Novo psicólogo
        </button>
      </div>

      {/* Busca */}
      <input
        placeholder="Buscar por nome ou e-mail…"
        value={busca}
        onChange={e => { setBusca(e.target.value); setPage(1); }}
        style={{ ...inputStyle, width: 320, marginBottom: '1.25rem' }}
      />

      {erro && <p style={{ color: '#f87171', marginBottom: '1rem' }}>{erro}</p>}

      {/* Tabela */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              {['Nome', 'E-mail', 'Avaliações', 'Status', 'Cadastro', 'Ações'].map(h => (
                <th key={h} style={{ color: '#64748b', fontSize: 12, fontWeight: 500, padding: '0.75rem 1rem', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ color: '#64748b', padding: '2rem', textAlign: 'center' }}>Carregando…</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan={6} style={{ color: '#64748b', padding: '2rem', textAlign: 'center' }}>Nenhum resultado</td></tr>
            ) : lista.map(p => (
              <tr key={p.id} style={{ borderBottom: '1px solid #1e3a5f22' }}>
                <td style={tdStyle}>{p.nome || '—'}</td>
                <td style={tdStyle}>{p.email}</td>
                <td style={tdStyle}>
                  <span style={{ color: '#a5b4fc', cursor: 'pointer' }} onClick={() => verAvaliacoes(p)}>
                    {p.total_avaliacoes} ({p.avaliacoes_ativas} ativas)
                  </span>
                </td>
                <td style={tdStyle}><Badge bloqueado={!p.ativo} /></td>
                <td style={{ ...tdStyle, color: '#64748b', fontSize: 12 }}>
                  {new Date(p.criado_em).toLocaleDateString('pt-BR')}
                </td>
                <td style={{ ...tdStyle, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => { setSel(p); setForm({ nome: p.nome, email: p.email }); setModal('editar'); setErro(''); }} style={btnSmall}>Editar</button>
                  <button onClick={() => { setSel(p); setForm({}); setModal('senha'); setErro(''); }} style={btnSmall}>Senha</button>
                  <button onClick={() => toggleBloquear(p)} style={{ ...btnSmall, color: !p.ativo ? '#86efac' : '#fca5a5' }}>
                    {!p.ativo ? 'Desbloquear' : 'Bloquear'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {pages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: '1rem' }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => setPage(n)} style={{
              padding: '4px 12px', borderRadius: 6, border: '1px solid #334155',
              background: page === n ? '#312e81' : '#1e293b',
              color: page === n ? '#a5b4fc' : '#94a3b8', cursor: 'pointer', fontSize: 13,
            }}>{n}</button>
          ))}
        </div>
      )}

      {/* Modal criar */}
      {modal === 'criar' && (
        <Modal titulo="Novo psicólogo" onClose={() => setModal(null)}>
          <Campo label="Nome completo" value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Dr. João Silva" />
          <Campo label="E-mail" type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="joao@exemplo.com" />
          <Campo label="Senha inicial (mín. 8 caracteres)" type="password" value={form.senha || ''} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} placeholder="••••••••" />
          <p style={{ color: '#64748b', fontSize: 12, marginBottom: '1rem' }}>O usuário deverá trocar a senha no primeiro login.</p>
          {erro && <p style={{ color: '#f87171', fontSize: 13, marginBottom: '0.75rem' }}>{erro}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={criar} disabled={saving} style={btnPrimario}>{saving ? 'Criando…' : 'Criar psicólogo'}</button>
            <button onClick={() => setModal(null)} style={btnSecundario}>Cancelar</button>
          </div>
        </Modal>
      )}

      {/* Modal editar */}
      {modal === 'editar' && sel && (
        <Modal titulo={`Editar — ${sel.email}`} onClose={() => setModal(null)}>
          <Campo label="Nome" value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
          <Campo label="E-mail" type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          {erro && <p style={{ color: '#f87171', fontSize: 13, marginBottom: '0.75rem' }}>{erro}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={editar} disabled={saving} style={btnPrimario}>{saving ? 'Salvando…' : 'Salvar'}</button>
            <button onClick={() => setModal(null)} style={btnSecundario}>Cancelar</button>
          </div>
        </Modal>
      )}

      {/* Modal redefinir senha */}
      {modal === 'senha' && sel && (
        <Modal titulo={`Redefinir senha — ${sel.email}`} onClose={() => setModal(null)}>
          <Campo label="Nova senha (mín. 8 caracteres)" type="password" value={form.nova_senha || ''} onChange={e => setForm(f => ({ ...f, nova_senha: e.target.value }))} placeholder="••••••••" />
          <p style={{ color: '#64748b', fontSize: 12, marginBottom: '1rem' }}>O usuário deverá trocar a senha no próximo login.</p>
          {erro && <p style={{ color: '#f87171', fontSize: 13, marginBottom: '0.75rem' }}>{erro}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={redefinirSenha} disabled={saving} style={btnPrimario}>{saving ? 'Salvando…' : 'Redefinir senha'}</button>
            <button onClick={() => setModal(null)} style={btnSecundario}>Cancelar</button>
          </div>
        </Modal>
      )}

      {/* Modal avaliações do psicólogo */}
      {modal === 'avaliacoes' && sel && (
        <Modal titulo={`Avaliações — ${sel.email}`} onClose={() => setModal(null)}>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {avals.length === 0 ? (
              <p style={{ color: '#64748b' }}>Nenhuma avaliação.</p>
            ) : avals.map(a => (
              <div key={a.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid #334155' }}>
                <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500 }}>{a.titulo || a.nome_empresa}</div>
                <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 3 }}>
                  {a.total_respostas} respostas · {a.arquivada ? '📁 Arquivada' : '🟢 Ativa'}
                  · {new Date(a.criado_em).toLocaleDateString('pt-BR')}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

const inputStyle = {
  padding: '0.6rem 0.875rem', background: '#1e293b',
  border: '1px solid #334155', borderRadius: 8,
  color: '#f1f5f9', fontSize: 14, outline: 'none',
};
const tdStyle = { padding: '0.875rem 1rem', color: '#e2e8f0', fontSize: 13, verticalAlign: 'middle' };
const btnPrimario = {
  padding: '0.6rem 1.25rem', background: '#4f46e5',
  color: '#fff', border: 'none', borderRadius: 8,
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const btnSecundario = {
  padding: '0.6rem 1.25rem', background: 'transparent',
  color: '#94a3b8', border: '1px solid #334155', borderRadius: 8,
  fontSize: 13, cursor: 'pointer',
};
const btnSmall = {
  padding: '3px 10px', background: '#0f172a',
  color: '#94a3b8', border: '1px solid #334155',
  borderRadius: 6, fontSize: 12, cursor: 'pointer',
};
