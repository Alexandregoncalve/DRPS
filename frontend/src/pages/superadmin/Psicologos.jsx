// pages/superadmin/Psicologos.jsx
// Corrigido: seletor de papel ao criar + coluna "Avaliações" (sem tradução)

import { useEffect, useState, useCallback } from 'react';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';

const PAPEIS = [
  { value: 'admin',         label: 'Admin NeXa',      cor: '#6366f1' },
  { value: 'psicologo',     label: 'Psicólogo / SST', cor: '#0ea5e9' },
  { value: 'gestor_matriz', label: 'Gestor Matriz',   cor: '#10b981' },
  { value: 'gestor_filial', label: 'Gestor Filial',   cor: '#f59e0b' },
];

const PAPEL_COR = Object.fromEntries(PAPEIS.map(p => [p.value, p.cor]));
const PAPEL_LABEL = Object.fromEntries(PAPEIS.map(p => [p.value, p.label]));

function BadgePapel({ papel }) {
  const cor = PAPEL_COR[papel] || '#64748b';
  const label = PAPEL_LABEL[papel] || papel;
  return (
    <span style={{
      background: cor + '22', color: cor, border: `1px solid ${cor}44`,
      borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
    }}>{label}</span>
  );
}

function BadgeStatus({ ativo }) {
  return (
    <span style={{
      background: ativo ? '#14532d' : '#450a0a',
      color: ativo ? '#86efac' : '#fca5a5',
      borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 600,
    }}>{ativo ? 'Ativo' : 'Bloqueado'}</span>
  );
}

function Modal({ titulo, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: '#1e293b', border: '1px solid #334155', borderRadius: 16,
        width: '100%', maxWidth: 500, padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ color: '#f1f5f9', fontSize: 17, fontWeight: 600, margin: 0 }}>{titulo}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '0.65rem 0.875rem',
  background: '#0f172a', border: '1px solid #334155',
  borderRadius: 8, color: '#f1f5f9', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
};

export default function Psicologos() {
  const { api } = useSuperAdmin();
  const [lista,   setLista]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [busca,   setBusca]   = useState('');
  const [loading, setLoad]    = useState(true);
  const [modal,   setModal]   = useState(null);
  const [sel,     setSel]     = useState(null);
  const [form,    setForm]    = useState({});
  const [erro,    setErro]    = useState('');
  const [saving,  setSaving]  = useState(false);
  const [avals,   setAvals]   = useState([]);

  const carregar = useCallback(async () => {
    setLoad(true); setErro('');
    try {
      const d = await api(`/api/superadmin/psicologos?page=${page}&busca=${encodeURIComponent(busca)}`);
      setLista(d.psicologos); setTotal(d.total);
    } catch (e) { setErro(e.message); }
    finally { setLoad(false); }
  }, [page, busca, api]);

  useEffect(() => { carregar(); }, [carregar]);

  async function criar() {
    setSaving(true); setErro('');
    try {
      await api('/api/superadmin/psicologos', {
        method: 'POST', body: JSON.stringify(form),
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
        method: 'PATCH', body: JSON.stringify(form),
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
        method: 'PATCH', body: JSON.stringify({ nova_senha: form.nova_senha }),
      });
      setModal(null); setForm({});
    } catch (e) { setErro(e.message); }
    finally { setSaving(false); }
  }

  async function toggleBloquear(u) {
    try {
      const rota = u.ativo ? 'bloquear' : 'desbloquear';
      await api(`/api/superadmin/psicologos/${u.id}/${rota}`, { method: 'PATCH', body: '{}' });
      carregar();
    } catch (e) { alert(e.message); }
  }

  async function verAvaliacoes(u) {
    setSel(u);
    const d = await api(`/api/superadmin/psicologos/${u.id}/avaliacoes`);
    setAvals(d);
    setModal('avaliacoes');
  }

  const pages = Math.ceil(total / 20);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, margin: 0 }}>Usuários</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>{total} cadastrado{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => { setModal('criar'); setForm({ papel: 'psicologo' }); setErro(''); }}
          style={btnPrimario}>+ Novo usuário</button>
      </div>

      <input placeholder="Buscar por nome ou e-mail…" value={busca}
        onChange={e => { setBusca(e.target.value); setPage(1); }}
        style={{ ...inputStyle, width: 320, marginBottom: '1.25rem' }} />

      {erro && <p style={{ color: '#f87171', marginBottom: '1rem' }}>{erro}</p>}

      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #334155' }}>
              {['Nome', 'E-mail', 'Perfil', 'Avaliações', 'Status', 'Cadastro', 'Ações'].map(h => (
                <th key={h} style={{ color: '#64748b', fontSize: 12, fontWeight: 500, padding: '0.75rem 1rem', textAlign: 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ color: '#64748b', padding: '2rem', textAlign: 'center' }}>Carregando…</td></tr>
            ) : lista.length === 0 ? (
              <tr><td colSpan={7} style={{ color: '#64748b', padding: '2rem', textAlign: 'center' }}>Nenhum resultado</td></tr>
            ) : lista.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #0f172a' }}>
                <td style={tdStyle}>{u.nome || '—'}</td>
                <td style={{ ...tdStyle, color: '#94a3b8', fontSize: 12 }}>{u.email}</td>
                <td style={tdStyle}><BadgePapel papel={u.papel} /></td>
                <td style={tdStyle}>
                  <span style={{ color: '#a5b4fc', cursor: 'pointer', fontSize: 13 }}
                    onClick={() => verAvaliacoes(u)}>
                    {u.total_avaliacoes} ({u.avaliacoes_ativas} ativas)
                  </span>
                </td>
                <td style={tdStyle}><BadgeStatus ativo={u.ativo} /></td>
                <td style={{ ...tdStyle, color: '#64748b', fontSize: 12 }}>
                  {new Date(u.criado_em).toLocaleDateString('pt-BR')}
                </td>
                <td style={{ ...tdStyle }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => { setSel(u); setForm({ nome: u.nome, email: u.email, papel: u.papel }); setModal('editar'); setErro(''); }}
                      style={btnSmall}>Editar</button>
                    <button onClick={() => { setSel(u); setForm({}); setModal('senha'); setErro(''); }}
                      style={btnSmall}>Senha</button>
                    <button onClick={() => toggleBloquear(u)}
                      style={{ ...btnSmall, color: u.ativo ? '#fca5a5' : '#86efac' }}>
                      {u.ativo ? 'Bloquear' : 'Desbloquear'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

      {/* Modal Criar */}
      {modal === 'criar' && (
        <Modal titulo="Novo usuário" onClose={() => setModal(null)}>
          <Campo label="Nome completo">
            <input style={inputStyle} placeholder="Ex: Simone Dias"
              value={form.nome || ''} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
          </Campo>
          <Campo label="E-mail">
            <input style={inputStyle} type="email" placeholder="simone@exemplo.com.br"
              value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </Campo>
          <Campo label="Senha inicial (mín. 8 caracteres)">
            <input style={inputStyle} type="password" placeholder="Nexa@2026"
              value={form.senha || ''} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} />
          </Campo>
          <Campo label="Perfil de acesso">
            <select style={inputStyle} value={form.papel || 'psicologo'}
              onChange={e => setForm(f => ({ ...f, papel: e.target.value }))}>
              {PAPEIS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </Campo>

          {/* Descrição do perfil selecionado */}
          <div style={{ background: '#0f172a', borderRadius: 8, padding: '10px 12px', marginBottom: '1rem' }}>
            <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>
              {form.papel === 'admin'         && '🔧 Acesso total à organização — gerencia avaliações, empresas e usuários.'}
              {form.papel === 'psicologo'     && '🧠 Cria e gerencia avaliações e laudos das suas empresas.'}
              {form.papel === 'gestor_matriz' && '🏢 Somente leitura — vê resultados de toda a rede de filiais.'}
              {form.papel === 'gestor_filial' && '🏬 Somente leitura — vê resultados da sua filial e acompanha o plano de ação.'}
            </p>
            <p style={{ color: '#475569', fontSize: 11, margin: '6px 0 0' }}>
              O usuário deverá trocar a senha no primeiro login.
            </p>
          </div>

          {erro && <p style={{ color: '#f87171', fontSize: 13, marginBottom: '0.75rem' }}>{erro}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={criar} disabled={saving} style={btnPrimario}>{saving ? 'Criando…' : 'Criar usuário'}</button>
            <button onClick={() => setModal(null)} style={btnSecundario}>Cancelar</button>
          </div>
        </Modal>
      )}

      {/* Modal Editar */}
      {modal === 'editar' && sel && (
        <Modal titulo={`Editar — ${sel.nome || sel.email}`} onClose={() => setModal(null)}>
          <Campo label="Nome">
            <input style={inputStyle} value={form.nome || ''}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
          </Campo>
          <Campo label="E-mail">
            <input style={inputStyle} type="email" value={form.email || ''}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </Campo>
          <Campo label="Perfil de acesso">
            <select style={inputStyle} value={form.papel || sel.papel}
              onChange={e => setForm(f => ({ ...f, papel: e.target.value }))}>
              {PAPEIS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </Campo>
          {erro && <p style={{ color: '#f87171', fontSize: 13, marginBottom: '0.75rem' }}>{erro}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={editar} disabled={saving} style={btnPrimario}>{saving ? 'Salvando…' : 'Salvar'}</button>
            <button onClick={() => setModal(null)} style={btnSecundario}>Cancelar</button>
          </div>
        </Modal>
      )}

      {/* Modal Senha */}
      {modal === 'senha' && sel && (
        <Modal titulo={`Redefinir senha — ${sel.email}`} onClose={() => setModal(null)}>
          <Campo label="Nova senha (mín. 8 caracteres)">
            <input style={inputStyle} type="password" placeholder="Nova@Senha123"
              value={form.nova_senha || ''}
              onChange={e => setForm(f => ({ ...f, nova_senha: e.target.value }))} />
          </Campo>
          <p style={{ color: '#64748b', fontSize: 12, marginBottom: '1rem' }}>
            O usuário deverá trocar a senha no próximo login.
          </p>
          {erro && <p style={{ color: '#f87171', fontSize: 13, marginBottom: '0.75rem' }}>{erro}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={redefinirSenha} disabled={saving} style={btnPrimario}>
              {saving ? 'Salvando…' : 'Redefinir senha'}
            </button>
            <button onClick={() => setModal(null)} style={btnSecundario}>Cancelar</button>
          </div>
        </Modal>
      )}

      {/* Modal Avaliações */}
      {modal === 'avaliacoes' && sel && (
        <Modal titulo={`Avaliações — ${sel.nome || sel.email}`} onClose={() => setModal(null)}>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {avals.length === 0 ? (
              <p style={{ color: '#64748b' }}>Nenhuma avaliação.</p>
            ) : avals.map(a => (
              <div key={a.id} style={{ padding: '0.75rem 0', borderBottom: '1px solid #334155' }}>
                <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500 }}>
                  {a.empresa_nome} — {a.setor_nome}
                </div>
                <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 3 }}>
                  {a.total_respostas} respostas ·{' '}
                  <span style={{ color: a.status === 'aberta' ? '#86efac' : '#94a3b8' }}>
                    {a.status}
                  </span>
                  {' · '}{new Date(a.criado_em).toLocaleDateString('pt-BR')}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

const tdStyle   = { padding: '0.875rem 1rem', color: '#e2e8f0', fontSize: 13, verticalAlign: 'middle' };
const btnPrimario  = { padding: '0.6rem 1.25rem', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' };
const btnSecundario = { padding: '0.6rem 1.25rem', background: 'transparent', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, fontSize: 13, cursor: 'pointer' };
const btnSmall  = { padding: '3px 10px', background: '#0f172a', color: '#94a3b8', border: '1px solid #334155', borderRadius: 6, fontSize: 12, cursor: 'pointer' };
