// pages/superadmin/Layout.jsx
// translate="no" previne o Chrome de traduzir e corromper o DOM do React
import { useSuperAdmin } from '../../contexts/SuperAdminContext';

const NAV = [
  { id: 'dashboard',  label: 'Dashboard', icon: '📊' },
  { id: 'psicologos', label: 'Usuários',  icon: '👤' },
  { id: 'empresas',   label: 'Empresas',  icon: '🏢' },
  { id: 'auditoria',  label: 'Auditoria', icon: '🔍' },
];

export default function SuperAdminLayout({ pagina, setPagina, children }) {
  const { usuario, logout } = useSuperAdmin();

  return (
    <div translate="no" lang="pt-BR" style={{ display: 'flex', minHeight: '100vh', background: '#0f172a', fontFamily: 'system-ui,sans-serif' }}>

      <aside style={{
        width: 240, background: '#1e293b', borderRight: '1px solid #334155',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
        position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 10,
      }}>
        <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}>👑</div>
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
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '0.875rem 1rem', borderTop: '1px solid #334155' }}>
          <div style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>Conectado como</div>
          <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500, marginBottom: 10 }}>
            {usuario?.email}
          </div>
          <button onClick={logout} style={{
            width: '100%', padding: '0.5rem', borderRadius: 8,
            background: '#1e293b', border: '1px solid #334155',
            color: '#94a3b8', fontSize: 13, cursor: 'pointer',
          }}>Sair</button>
        </div>
      </aside>

      <main style={{ marginLeft: 240, flex: 1, padding: '2rem', minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
