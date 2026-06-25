// pages/superadmin/Dashboard.jsx
import { useEffect, useState } from 'react';
import { useSuperAdmin } from '../../contexts/SuperAdminContext';

function Card({ titulo, valor, sub, cor = '#6366f1', icone }) {
  return (
    <div style={{
      background: '#1e293b', border: '1px solid #334155', borderRadius: 12,
      padding: '1.25rem', display: 'flex', alignItems: 'flex-start', gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, background: cor + '22',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, flexShrink: 0,
      }}>{icone}</div>
      <div>
        <div style={{ color: '#64748b', fontSize: 12, marginBottom: 2 }}>{titulo}</div>
        <div style={{ color: '#f1f5f9', fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{valor ?? '—'}</div>
        {sub && <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}

function diasAtras(dataStr) {
  if (!dataStr) return null;
  const dias = Math.floor((Date.now() - new Date(dataStr)) / 86400000);
  return dias === 0 ? 'hoje' : `há ${dias} dia${dias > 1 ? 's' : ''}`;
}

export default function Dashboard() {
  const { api } = useSuperAdmin();
  const [dados,   setDados]  = useState(null);
  const [loading, setLoad]   = useState(true);
  const [erro,    setErro]   = useState('');

  useEffect(() => {
    api('/api/superadmin/dashboard')
      .then(setDados)
      .catch(e => setErro(e.message))
      .finally(() => setLoad(false));
  }, []);

  if (loading) return <p style={{ color: '#94a3b8' }}>Carregando…</p>;
  if (erro)    return <p style={{ color: '#f87171' }}>Erro: {erro}</p>;

  const { psicologos, empresas, avaliacoes, paradas, auditoria } = dados;

  return (
    <div>
      <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, marginBottom: '0.25rem' }}>
        Dashboard
      </h1>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: '1.75rem' }}>
        Visão geral da plataforma NeXa DRPS
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <Card icone="👤" titulo="Psicólogos ativos"   valor={psicologos.ativos}       sub={`${psicologos.bloqueados} bloqueados`}    cor="#6366f1" />
        <Card icone="🏢" titulo="Empresas"             valor={empresas.total}          sub="cadastradas na plataforma"                 cor="#0ea5e9" />
        <Card icone="📋" titulo="Avaliações ativas"   valor={avaliacoes.ativas}       sub={`${avaliacoes.arquivadas} arquivadas`}     cor="#10b981" />
        <Card icone="✅" titulo="Com respostas"        valor={avaliacoes.com_respostas} sub={`${avaliacoes.sem_respostas} sem respostas`} cor="#f59e0b" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

        {/* Avaliações paradas */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
            <span>⚠️</span>
            <h2 style={{ color: '#fbbf24', fontSize: 15, fontWeight: 600, margin: 0 }}>
              Avaliações paradas há +7 dias
            </h2>
            {paradas.length > 0 && (
              <span style={{ background: '#7c2d12', color: '#fed7aa', borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>
                {paradas.length}
              </span>
            )}
          </div>

          {paradas.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 13 }}>Nenhuma avaliação parada. 🎉</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
              {paradas.map(p => (
                <div key={p.id} style={{ background: '#0f172a', borderRadius: 8, padding: '0.75rem', border: '1px solid #292524' }}>
                  <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500 }}>
                    {p.empresa_nome} — {p.setor_nome}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                    {p.psicologo_email} · {p.total_respostas} respostas
                  </div>
                  <div style={{ color: '#fb923c', fontSize: 11, marginTop: 3 }}>
                    Criada {diasAtras(p.criado_em)}
                    {p.ultima_resposta_em && ` · Última resposta ${diasAtras(p.ultima_resposta_em)}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimas ações */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: '1.25rem' }}>
          <h2 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 600, margin: '0 0 1rem' }}>
            🔍 Últimas ações
          </h2>
          {auditoria.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 13 }}>Nenhuma ação registrada.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {auditoria.map(a => (
                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.5rem 0', borderBottom: '1px solid #1e3a5f22' }}>
                  <div>
                    <div style={{ color: '#a5b4fc', fontSize: 12, fontWeight: 500 }}>{a.acao}</div>
                    <div style={{ color: '#64748b', fontSize: 11 }}>{a.usuario_email}</div>
                  </div>
                  <div style={{ color: '#475569', fontSize: 11, whiteSpace: 'nowrap', marginLeft: 8 }}>
                    {new Date(a.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
