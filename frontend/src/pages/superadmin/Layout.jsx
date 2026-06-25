import { useState } from 'react';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';

const NAV = [
  { id: 'dashboard',  label: 'Dashboard', icon: '📊' },
  { id: 'psicologos', label: 'Usuários',  icon: '👤' },
  { id: 'empresas',   label: 'Empresas',  icon: '🏢' },
  { id: 'auditoria',  label: 'Auditoria', icon: '🔍' },
];

const estiloInput = {
  width: '100%', padding: '0.65rem 4.5rem 0.65rem 0.875rem',
  background: '#0f172a', border: '1px solid #334155',
  borderRadius: 8, color: '#f1f5f9', fontSize: 14,
  outline: 'none', boxSizing: 'border-box', display: 'block',
};

function CampoSenha({ label, value, onChange }) {
  const [ver, setVer] = useState(false);
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', color: '#94a3b8', fontSize: 12, marginBottom: 5 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={ver ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          autoComplete="new-password"
          style={estiloInput}
        />
        <button
          type="button"
          tabIndex={-1}
          onMouseDown={e => { e.preventDefault(); setVer(v => !v); }}
          style={{
            position: 'absolute', right: 10, top: '50%',
            transform: 'translateY(-50%)', background: 'none', border: 'none',
            color: '#6366f1', fontSize: 12, cursor: 'pointer', fontWeight: 600, padding: 4,
          }}
        >
          {ver ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
    </div>
  );
}

function ModalTrocarSenha({ onClose, api }) {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha,  setNovaSenha]  = useState('');
  const [confirmar,  setConfirmar]  = useState('');
  const [erro,       setErro]       = useState('');
  const [sucesso,    setSucesso]    = useState('');
  const [loading,    setLoading]    = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(''); setSucesso('');
    if (!senhaAtual)             { setErro('Digite a senha atual.'); return; }
    if (novaSenha.length < 8)   { setErro('Nova senha deve ter ao menos 8 caracteres.'); return; }
    if (novaSenha !== confirmar) { setErro('As senhas não coincidem.'); return; }
    setLoading(true);
    try {
      await api('/api/superadmin/auth/trocar-senha', {
        method: 'POST',
        body: JSON.stringify({ senhaAtual, novaSenha }),
      });
      setSucesso('Senha alterada com sucesso!');
      setTimeout(() => onClose(), 2000);
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }}>
      <div style={{
        background: '#1e293b', border: '1px solid #334155', borderRadius: 16,
        width: '100%', maxWidth: 420, padding: '2rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ color: '#f1f5f9', fontSize: 17, fontWeight: 600, margin: 0 }}>🔑 Trocar Senha</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <CampoSenha label="Senha atual"         value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} />
          <CampoSenha label="Nova senha"           value={novaSenha}  onChange={e => setNovaSenha(e.target.value)} />
          <CampoSenha label="Confirmar nova senha" value={confirmar}  onChange={e => setConfirmar(e.target.value)} />

          {erro    && <div style={{ background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '0.75rem', color: '#fca5a5', fontSize: 13, marginBottom: '1rem' }}>{erro}</div>}
          {sucesso && <div style={{ background: '#14532d', border: '1px solid #166534', borderRadius: 8, padding: '0.75rem', color: '#86efac', fontSize: 13, marginBottom: '1rem' }}>{sucesso}</div>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={loading} style={{
              flex: 1, padding: '0.65rem', background: '#6366f1', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>{loading ? 'Salvando...' : 'Salvar nova senha'}</button>
            <button type="button" onClick={onClose} style={{
              padding: '0.65rem 1rem', background: 'transparent', color: '#94a3b8',
              border: '1px solid #334155', borderRadius: 8, fontSize: 14, cursor: 'pointer',
            }}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SuperAdminLayout({ pagina, setPagina, children }) {
  const { usuario, logout, api } = useSuperAdmin();
  const [modalSenha, setModalSenha] = useState(false);

  return (
    <div translate="no" lang="pt-BR" style={{ display: 'flex', minHeight: '100vh', background: '#0f172a', fontFamily: 'system-ui,sans-serif' }}>
      <aside style={{
        width: 240, background: '#1e293b', borderRight: '1px solid #334155',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 10,
      }}>
        <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👑</div>
            <div>
              <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 14 }}>NeXa DRPS</div>
              <div style={{ color: '#6366f1', fontSize: 11, fontWeight: 500 }}>Super Admin</div>
            </div>
          </div>
        </div>

        <nav style={{ padding: '0.75rem 0.5rem', flex: 1 }}>
          {NAV.map(item => (
            <button key={item.id} onClick={() => setPagina(item.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '0.6rem 0.875rem', borderRadius: 8, border: 'none',
              background: pagina === item.id ? '#312e81' : 'transparent',
              color: pagina === item.id ? '#a5b4fc' : '#94a3b8',
              fontSize: 14, fontWeight: pagina === item.id ? 600 : 400,
              cursor: 'pointer', marginBottom: 2, textAlign: 'left',
            }}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '0.875rem 1rem', borderTop: '1px solid #334155' }}>
          <div style={{ color: '#64748b', fontSize: 11, marginBottom: 2 }}>Conectado como</div>
          <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500, marginBottom: 10 }}>{usuario?.email}</div>
          <button onClick={() => setModalSenha(true)} style={{ width: '100%', padding: '0.5rem', borderRadius: 8, marginBottom: 6, background: '#312e81', border: '1px solid #4f46e5', color: '#a5b4fc', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
            🔑 Trocar senha
          </button>
          <button onClick={logout} style={{ width: '100%', padding: '0.5rem', borderRadius: 8, background: 'transparent', border: '1px solid #334155', color: '#94a3b8', fontSize: 13, cursor: 'pointer' }}>
            Sair
          </button>
        </div>
      </aside>

      <main style={{ marginLeft: 240, flex: 1, padding: '2rem', minWidth: 0 }}>{children}</main>

      {modalSenha && <ModalTrocarSenha onClose={() => setModalSenha(false)} api={api} />}
    </div>
  );
}
