// pages/psicologo/Resultados.jsx
// Laudo completo NR-01 — Sprint 3
// Substitui a view "resultados" dentro do Painel.jsx

import { useState, useEffect, useRef } from "react";
import { API } from "../../contexts/AuthContext";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip, BarChart, Bar,
  XAxis, YAxis, Cell, Legend,
} from "recharts";

// ── Helpers de cor ───────────────────────────────────────────────────────────
const COR_ZONA = {
  Crítico: { bg: '#7f1d1d', text: '#fca5a5', badge: 'bg-red-900 text-red-200' },
  Alto:    { bg: '#7c2d12', text: '#fdba74', badge: 'bg-orange-900 text-orange-200' },
  Médio:   { bg: '#713f12', text: '#fde68a', badge: 'bg-yellow-900 text-yellow-200' },
  Baixo:   { bg: '#14532d', text: '#86efac', badge: 'bg-green-900 text-green-200' },
};
const COR_BAR = { Crítico: '#ef4444', Alto: '#f97316', Médio: '#eab308', Baixo: '#22c55e' };

function BadgeZona({ zona, size = 'sm' }) {
  const c = COR_ZONA[zona] || { bg: '#1e293b', text: '#94a3b8' };
  return (
    <span style={{
      background: c.bg, color: c.text,
      padding: size === 'sm' ? '2px 10px' : '4px 14px',
      borderRadius: 20, fontSize: size === 'sm' ? 11 : 13,
      fontWeight: 600, whiteSpace: 'nowrap',
    }}>{zona}</span>
  );
}

function Secao({ titulo, icone, children, id }) {
  return (
    <div id={id} style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
        borderBottom: '2px solid #334155', paddingBottom: 10 }}>
        <span style={{ fontSize: 20 }}>{icone}</span>
        <h2 style={{ color: '#f1f5f9', fontSize: 17, fontWeight: 700, margin: 0 }}>{titulo}</h2>
      </div>
      {children}
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: '#1e293b', border: '1px solid #334155',
      borderRadius: 12, padding: 20, ...style,
    }}>{children}</div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Resultados({ avaliacaoId, token, onVoltar }) {
  const [dados,     setDados]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [erro,      setErro]      = useState('');
  const [abaAtiva,  setAbaAtiva]  = useState('resumo');
  const [probLocal, setProbLocal] = useState({});
  const [salvando,  setSalvando]  = useState(false);
  const [msg,       setMsg]       = useState('');
  const printRef = useRef();

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => { carregar(); }, [avaliacaoId]);

  async function carregar() {
    setLoading(true); setErro('');
    try {
      const r = await fetch(`${API}/laudo/${avaliacaoId}`, { headers });
      if (!r.ok) throw new Error((await r.json()).erro);
      const d = await r.json();
      setDados(d);
      // Inicializa probabilidades locais
      const p = {};
      d.resultados.forEach(r => { p[r.topico_num] = r.media_probabilidade || 2; });
      setProbLocal(p);
    } catch (e) { setErro(e.message); }
    finally { setLoading(false); }
  }

  async function salvarProbabilidades() {
    setSalvando(true); setMsg('');
    try {
      const probs = Object.entries(probLocal).map(([t, v]) => ({ topico_num: parseInt(t), valor: parseInt(v) }));
      await fetch(`${API}/avaliacoes/${avaliacaoId}/probabilidades`, {
        method: 'POST', headers, body: JSON.stringify({ probabilidades: probs }),
      });
      await fetch(`${API}/avaliacoes/${avaliacaoId}/processar`, { method: 'POST', headers });
      await carregar();
      setMsg('✅ Matriz atualizada!');
    } catch (e) { setMsg(`❌ ${e.message}`); }
    finally { setSalvando(false); }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
      <p style={{ color: '#94a3b8' }}>Carregando laudo...</p>
    </div>
  );

  if (erro) return (
    <div style={{ padding: 32 }}>
      <p style={{ color: '#f87171', marginBottom: 16 }}>❌ {erro}</p>
      <button onClick={onVoltar} style={btnSecundario}>← Voltar</button>
    </div>
  );

  const { avaliacao, config, resultados, contagem, top5, radarData,
    inventarioMTE, inventarioFontes, matrizAIHA, controles, glossario, periodicidade } = dados;

  const ABAS = [
    { id: 'resumo',      label: '📊 Resumo' },
    { id: 'resultados',  label: '📋 Resultados' },
    { id: 'inventario',  label: '🔍 Inventário MTE' },
    { id: 'fontes',      label: '📌 Fontes' },
    { id: 'aiha',        label: '⚠️ Matriz AIHA' },
    { id: 'plano',       label: '📝 Plano de Ação' },
    { id: 'glossario',   label: '📚 Glossário' },
  ];

  const nomeEmpresa = config?.nome_empresa || avaliacao.empresa_nome;
  const responsavel = config?.responsavel_nome || avaliacao.psicologo_nome;
  const registro    = config?.responsavel_registro || avaliacao.psicologo_crp || '';
  const periodo     = config?.periodo_avaliacao || new Date(avaliacao.criado_em).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const corLaudo    = config?.cor_laudo || '#6366f1';

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#0f172a', minHeight: '100vh', color: '#e2e8f0' }}>

      {/* Barra superior */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155',
        padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <button onClick={onVoltar} style={{ ...btnSecundario, fontSize: 13 }}>← Voltar</button>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15, margin: 0 }}>
            {nomeEmpresa} — {avaliacao.setor_nome}
          </p>
          <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>
            {avaliacao.total_respostas} respostas · {periodo}
            {avaliacao.taxa_adesao != null && ` · ${avaliacao.taxa_adesao}% de adesão`}
          </p>
        </div>
        {msg && <span style={{ fontSize: 13, color: msg.startsWith('✅') ? '#86efac' : '#f87171' }}>{msg}</span>}
      </div>

      {/* Abas */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155',
        display: 'flex', overflowX: 'auto', padding: '0 24px' }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAbaAtiva(a.id)} style={{
            padding: '10px 16px', background: 'none', border: 'none',
            color: abaAtiva === a.id ? corLaudo : '#64748b',
            borderBottom: abaAtiva === a.id ? `2px solid ${corLaudo}` : '2px solid transparent',
            fontSize: 13, fontWeight: abaAtiva === a.id ? 600 : 400,
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}>{a.label}</button>
        ))}
      </div>

      {/* Conteúdo */}
      <div ref={printRef} style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 48px' }}>

        {/* ── ABA: RESUMO ─────────────────────────────────────────────────── */}
        {abaAtiva === 'resumo' && (
          <div>
            {/* Cabeçalho do laudo */}
            <Card style={{ marginBottom: 24, borderLeft: `4px solid ${corLaudo}` }}>
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                {config?.logo_empresa && (
                  <img src={config.logo_empresa} alt="Logo" style={{ height: 60, objectFit: 'contain', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ color: corLaudo, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', margin: 0 }}>
                    {nomeEmpresa.toUpperCase()}
                    {config?.cnpj && ` · CNPJ: ${config.cnpj}`}
                  </p>
                  <h1 style={{ color: '#f1f5f9', fontSize: 24, fontWeight: 800, margin: '4px 0 8px' }}>
                    {config?.titulo_tecnico === 'CUSTOM' ? config.titulo_personalizado
                      : config?.titulo_tecnico === 'DRPS' ? 'DRPS — Diagnóstico de Riscos Psicossociais (NR-01)'
                      : config?.titulo_tecnico === 'AEP'  ? 'AEP-FRP — Avaliação Ergonômica Preliminar'
                      : config?.titulo_tecnico === 'IRP'  ? 'Inventário de Riscos Psicossociais'
                      : 'DRPS — Diagnóstico de Riscos Psicossociais (NR-01)'}
                  </h1>
                  <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
                    Análise de Riscos Psicossociais (COPSOQ II) · {avaliacao.setor_nome}
                  </p>
                  <p style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>
                    Período: {periodo} · Responsável Técnico: {responsavel}{registro && ` (${registro})`}
                  </p>
                </div>
                <div style={{ background: '#0f172a', borderRadius: 10, padding: '12px 20px', textAlign: 'center', flexShrink: 0 }}>
                  <p style={{ color: corLaudo, fontSize: 28, fontWeight: 800, margin: 0 }}>{avaliacao.total_respostas}</p>
                  <p style={{ color: '#64748b', fontSize: 11, margin: 0 }}>TOTAL DE<br/>RESPOSTAS</p>
                </div>
              </div>
            </Card>

            {/* Semáforo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
              {[
                ['Crítico',  contagem.Crítico, '#7f1d1d', '#fca5a5'],
                ['Alto',     contagem.Alto,    '#7c2d12', '#fdba74'],
                ['Médio',    contagem.Médio,   '#713f12', '#fde68a'],
                ['Baixo',    contagem.Baixo,   '#14532d', '#86efac'],
              ].map(([k, v, bg, tc]) => (
                <div key={k} style={{ background: bg, borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
                  <p style={{ color: tc, fontSize: 36, fontWeight: 800, margin: 0 }}>{v}</p>
                  <p style={{ color: tc, fontSize: 13, fontWeight: 600, margin: '4px 0 0', opacity: 0.85 }}>{k}</p>
                </div>
              ))}
            </div>

            {/* Top 5 + Radar lado a lado */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <Card>
                <h3 style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600, marginBottom: 14, marginTop: 0 }}>
                  🔴 Top 5 Riscos Prioritários
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {top5.map(r => (
                    <div key={r.topico_num} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ color: '#cbd5e1', fontSize: 13, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.topico_nome}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span style={{ color: '#94a3b8', fontSize: 12 }}>
                          {parseFloat(r.media_gravidade).toFixed(2)}
                        </span>
                        <BadgeZona zona={r.matriz_risco} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600, marginBottom: 10, marginTop: 0 }}>
                  📡 Panorama Geral (Radar)
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="topico" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                    <Tooltip
                      formatter={(v, n, p) => [v.toFixed(2), p.payload.topico_completo]}
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 12 }}
                    />
                    <Radar dataKey="valor" stroke={corLaudo} fill={corLaudo} fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Ranking barras horizontais */}
            <Card style={{ marginBottom: 24 }}>
              <h3 style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600, marginBottom: 16, marginTop: 0 }}>
                📊 Ranking por Dimensão
              </h3>
              <ResponsiveContainer width="100%" height={resultados.length * 32 + 20}>
                <BarChart data={[...resultados].sort((a, b) => b.media_gravidade - a.media_gravidade)}
                  layout="vertical" margin={{ left: 200, right: 60, top: 0, bottom: 0 }}>
                  <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="topico_nome" tick={{ fontSize: 11, fill: '#94a3b8' }}
                    width={195} />
                  <Tooltip
                    formatter={v => [parseFloat(v).toFixed(2), 'Score']}
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 12 }}
                  />
                  <Bar dataKey="media_gravidade" radius={[0, 4, 4, 0]}>
                    {resultados.map((r, i) => (
                      <Cell key={i} fill={COR_BAR[r.matriz_risco] || '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Periodicidade */}
            <Card>
              <h3 style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600, marginBottom: 10, marginTop: 0 }}>
                📅 Periodicidade de Reavaliação Recomendada
              </h3>
              <p style={{ color: '#fbbf24', fontSize: 14, fontWeight: 600, margin: '0 0 6px' }}>
                Recomendação: reavaliação em <strong>{periodicidade.meses} meses</strong> — próxima avaliação até{' '}
                {new Date(periodicidade.proxima_avaliacao).toLocaleDateString('pt-BR')}
              </p>
              <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>{periodicidade.justificativa}</p>
              <p style={{ color: '#475569', fontSize: 11, marginTop: 8 }}>
                Atenção NR-01 itens 1.5.4.1 e 1.5.4.2. A reavaliação deve ser antecipada se houver alteração
                organizacional significativa, evento sentinela ou mudança no quadro de exposição.
              </p>
            </Card>
          </div>
        )}

        {/* ── ABA: RESULTADOS POR DIMENSÃO ────────────────────────────────── */}
        {abaAtiva === 'resultados' && (
          <div>
            <Secao titulo="Resultados por Dimensão" icone="📋">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      {['#', 'Dimensão', 'Pontuação Média', 'Classificação', 'Probabilidade', 'Matriz de Risco', 'Ajustar Prob.'].map(h => (
                        <th key={h} style={{ color: '#64748b', fontSize: 11, fontWeight: 500, padding: '10px 12px', textAlign: 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...resultados]
                      .sort((a, b) => {
                        const ord = { Crítico: 4, Alto: 3, Médio: 2, Baixo: 1 };
                        return (ord[b.matriz_risco] || 0) - (ord[a.matriz_risco] || 0);
                      })
                      .map(r => (
                        <tr key={r.topico_num} style={{ borderBottom: '1px solid #0f172a' }}>
                          <td style={td}>{r.topico_num}</td>
                          <td style={{ ...td, fontWeight: 500 }}>{r.topico_nome}</td>
                          <td style={td}>
                            <span style={{ color: COR_BAR[r.matriz_risco] || '#94a3b8', fontWeight: 700 }}>
                              {parseFloat(r.media_gravidade).toFixed(2)}
                            </span>
                          </td>
                          <td style={td}>{r.classif_gravidade}</td>
                          <td style={td}>{r.classif_probabilidade}</td>
                          <td style={td}><BadgeZona zona={r.matriz_risco} /></td>
                          <td style={td}>
                            <select
                              value={probLocal[r.topico_num] || 2}
                              onChange={e => setProbLocal(p => ({ ...p, [r.topico_num]: parseInt(e.target.value) }))}
                              style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6,
                                color: '#f1f5f9', padding: '4px 8px', fontSize: 12 }}>
                              <option value={1}>1 — Baixa</option>
                              <option value={2}>2 — Média</option>
                              <option value={3}>3 — Alta</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
                <button onClick={salvarProbabilidades} disabled={salvando} style={btnPrimario}>
                  {salvando ? 'Processando...' : '🔄 Recalcular com novas probabilidades'}
                </button>
                <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>
                  Ajuste a probabilidade de cada dimensão conforme evidências da empresa (absenteísmo, afastamentos, histórico).
                </p>
              </div>
            </Secao>
          </div>
        )}

        {/* ── ABA: INVENTÁRIO MTE ─────────────────────────────────────────── */}
        {abaAtiva === 'inventario' && (
          <Secao titulo="Fatores de Risco Psicossociais — Manual MTE 2025" icone="🔍">
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
              Tradução das dimensões COPSOQ II para a lista canônica de 13 fatores de risco psicossociais
              reconhecidos pelo MTE/SIT no Guia de informações sobre os Fatores de Riscos Psicossociais
              Relacionados ao Trabalho — NR-01 GRO (julho/2025, pág. 7). Atendem NR-01 item 1.5.4.4.6.1.
            </p>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {['Indícios', 'Monitoramento', 'Não identificado'].map(s => {
                const count = inventarioMTE.filter(f => f.status === s).length;
                const cor = s === 'Indícios' ? '#ef4444' : s === 'Monitoramento' ? '#eab308' : '#22c55e';
                return (
                  <div key={s} style={{ background: '#1e293b', border: `1px solid ${cor}33`,
                    borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
                    <p style={{ color: cor, fontSize: 20, fontWeight: 700, margin: 0 }}>{count}</p>
                    <p style={{ color: '#64748b', fontSize: 11, margin: 0 }}>{s}</p>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {inventarioMTE.map(f => {
                const cor = f.status === 'Indícios' ? '#ef4444' : f.status === 'Monitoramento' ? '#eab308' : '#22c55e';
                const bg  = f.status === 'Indícios' ? '#7f1d1d22' : f.status === 'Monitoramento' ? '#71390f22' : '#14532d22';
                return (
                  <div key={f.num} style={{ background: '#1e293b', border: `1px solid #334155`,
                    borderLeft: `4px solid ${cor}`, borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>#{f.num}</span>
                          <p style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600, margin: 0 }}>{f.nome}</p>
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 8px', lineHeight: 1.5 }}>{f.descricao}</p>
                        {f.dimensoes_associadas.length > 0 && (
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {f.dimensoes_associadas.map((d, i) => (
                              <span key={i} style={{ background: '#0f172a', border: '1px solid #334155',
                                borderRadius: 4, padding: '2px 8px', fontSize: 11, color: '#94a3b8' }}>
                                {d.nome} ({parseFloat(d.score).toFixed(2)})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        <span style={{ background: bg, color: cor, border: `1px solid ${cor}44`,
                          borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                          {f.status}
                        </span>
                        <p style={{ color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 4 }}>
                          {f.possivel_agravo}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Secao>
        )}

        {/* ── ABA: FONTES E CIRCUNSTÂNCIAS ────────────────────────────────── */}
        {abaAtiva === 'fontes' && (
          <Secao titulo="Inventário de Riscos — Identificação, Fontes e Circunstâncias" icone="📌">
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
              Atende à NR-01 item 1.5.4.4.6.1 (Portaria MTE 1.419/2024), que exige para cada risco identificado
              a descrição das <strong style={{ color: '#e2e8f0' }}>fontes geradoras</strong>, das{' '}
              <strong style={{ color: '#e2e8f0' }}>circunstâncias de exposição</strong> e dos{' '}
              <strong style={{ color: '#e2e8f0' }}>possíveis agravos</strong>. Fontes e circunstâncias têm
              caráter orientativo — o responsável técnico pelo PGR deve refinar com base no contexto operacional
              concreto da organização.
            </p>

            {inventarioFontes.length === 0 ? (
              <Card>
                <p style={{ color: '#64748b', textAlign: 'center' }}>
                  Nenhuma dimensão em zona de atenção ou risco. ✅
                </p>
              </Card>
            ) : inventarioFontes.map(f => (
              <Card key={f.topico_num} style={{ marginBottom: 16, borderLeft: `4px solid ${COR_BAR[f.matriz_risco] || '#334155'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 700, margin: 0 }}>{f.topico_nome}</h3>
                  <BadgeZona zona={f.matriz_risco} size="md" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div>
                    <p style={{ color: '#64748b', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>
                      FONTES GERADORAS
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {(f.fontes_geradoras || []).map((s, i) => (
                        <li key={i} style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 4, lineHeight: 1.5 }}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p style={{ color: '#64748b', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>
                      CIRCUNSTÂNCIAS DE EXPOSIÇÃO
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {(f.circunstancias_exposicao || []).map((s, i) => (
                        <li key={i} style={{ color: '#cbd5e1', fontSize: 12, marginBottom: 4, lineHeight: 1.5 }}>{s}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p style={{ color: '#64748b', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>
                      POSSÍVEIS AGRAVOS
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                      {(f.possiveis_agravos || []).map((s, i) => (
                        <li key={i} style={{ color: '#fbbf24', fontSize: 12, marginBottom: 4, lineHeight: 1.5 }}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ))}
          </Secao>
        )}

        {/* ── ABA: MATRIZ AIHA 5×5 ────────────────────────────────────────── */}
        {abaAtiva === 'aiha' && (
          <Secao titulo="Inventário de Riscos Psicossociais — Matriz AIHA 5×5" icone="⚠️">
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
              Conversão automática dos resultados COPSOQ II para a matriz de risco Probabilidade × Severidade (AIHA 5×5).
              A Severidade é derivada do percentual do score. A Probabilidade é estimada percentualmente.
              O implementador deve ajustar a probabilidade conforme evidências complementares
              (absenteísmo, afastamentos CID-F, histórico).
            </p>

            {/* Grid visual 5×5 */}
            <Card style={{ marginBottom: 24 }}>
              <h3 style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600, marginBottom: 16, marginTop: 0 }}>
                Matriz de Risco — Probabilidade × Severidade
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', minWidth: 500 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 120, color: '#64748b', fontSize: 11, padding: 8 }}></th>
                      {['1 — Leve', '2 — Baixa', '3 — Moderada', '4 — Alta', '5 — Extrema'].map(s => (
                        <th key={s} style={{ color: '#94a3b8', fontSize: 11, fontWeight: 500, padding: '8px 12px', textAlign: 'center' }}>
                          {s}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: '#64748b', fontSize: 11, padding: '0 0 8px', fontWeight: 600 }}>
                        SEVERIDADE →
                      </td>
                    </tr>
                  </thead>
                  <tbody>
                    {[5, 4, 3, 2, 1].map(prob => {
                      const labels = ['', 'Rara', 'Pouco Provável', 'Possível', 'Provável', 'Muito Provável'];
                      return (
                        <tr key={prob}>
                          <td style={{ color: '#94a3b8', fontSize: 11, padding: '6px 8px', textAlign: 'right' }}>
                            {prob} — {labels[prob]}
                          </td>
                          {[1, 2, 3, 4, 5].map(sev => {
                            const pxs = prob * sev;
                            const cor = pxs <= 2 ? '#166534' : pxs <= 3 ? '#14532d' : pxs <= 8 ? '#713f12' : pxs <= 14 ? '#7c2d12' : '#7f1d1d';
                            const tc  = pxs <= 3 ? '#86efac' : pxs <= 8 ? '#fde68a' : '#fca5a5';
                            // Verifica se algum fator está nessa célula
                            const fatoresNaCelula = matrizAIHA.filter(f => f.severidade === sev && f.probabilidade === prob);
                            return (
                              <td key={sev} style={{ background: cor, padding: '6px 8px', textAlign: 'center',
                                border: '1px solid #0f172a', minWidth: 80, position: 'relative' }}>
                                <span style={{ color: tc, fontSize: 13, fontWeight: 700 }}>{pxs}</span>
                                {fatoresNaCelula.map((f, i) => (
                                  <div key={i} style={{ background: '#0f172a88', borderRadius: 4, padding: '2px 4px',
                                    fontSize: 9, color: '#e2e8f0', marginTop: 3, lineHeight: 1.3 }}>
                                    T{f.topico_num}
                                  </div>
                                ))}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '4px 0' }}>
                        <span style={{ color: '#64748b', fontSize: 10 }}>↑ PROBABILIDADE</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                {[['#166534','#86efac','Trivial (1-2)'], ['#14532d','#86efac','Tolerável (3)'],
                  ['#713f12','#fde68a','Moderado (4-8)'], ['#7c2d12','#fca5a5','Substancial (9-14)'],
                  ['#7f1d1d','#fca5a5','Intolerável (15-25)']].map(([bg, tc, label]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 14, height: 14, background: bg, borderRadius: 2 }} />
                    <span style={{ color: tc, fontSize: 11 }}>{label}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Tabela AIHA */}
            <Card>
              <h3 style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600, marginBottom: 16, marginTop: 0 }}>
                Fatores de Risco Psicossociais — Detalhamento AIHA
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      {['Fator de Risco (PGR)', 'Score', 'Severidade', 'Probabilidade', 'P×S', 'Nível de Risco'].map(h => (
                        <th key={h} style={{ color: '#64748b', fontSize: 11, fontWeight: 500, padding: '8px 12px', textAlign: 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrizAIHA.map((f, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #0f172a' }}>
                        <td style={{ ...td, fontWeight: 500, maxWidth: 200 }}>
                          <div style={{ fontSize: 13 }}>{f.fator_pgr}</div>
                        </td>
                        <td style={{ ...td, color: '#94a3b8' }}>{parseFloat(f.score).toFixed(2)}</td>
                        <td style={td}>{f.severidade} — {f.severidade_label}</td>
                        <td style={td}>{f.probabilidade} — {f.probabilidade_label}</td>
                        <td style={{ ...td, fontWeight: 700, color: '#fbbf24' }}>{f.pxs}</td>
                        <td style={td}>
                          <span style={{ background: f.cor + '22', color: f.cor, border: `1px solid ${f.cor}44`,
                            borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                            {f.nivel_risco}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ color: '#475569', fontSize: 11, marginTop: 12 }}>
                Legenda AIHA: Trivial (1-2) · Tolerável (3) · Moderado (4-9) · Substancial (10-14) · Intolerável (15-25).
                A probabilidade estimada deve ser validada pelo responsável técnico com base em dados complementares do GRO.
              </p>
            </Card>
          </Secao>
        )}

        {/* ── ABA: PLANO DE AÇÃO ──────────────────────────────────────────── */}
        {abaAtiva === 'plano' && (
          <div>
            {/* Zona Vermelha */}
            {resultados.filter(r => r.matriz_risco === 'Crítico' || r.matriz_risco === 'Alto').length > 0 && (
              <Secao titulo="Plano de Ação — Eliminação/Controle de Risco" icone="🚨">
                <div style={{ background: '#7f1d1d22', border: '1px solid #7f1d1d44', borderRadius: 8,
                  padding: '10px 16px', marginBottom: 20 }}>
                  <p style={{ color: '#fca5a5', fontSize: 13, margin: 0 }}>
                    Dimensões em zona vermelha indicam risco crítico. Demandam ação imediata e plano de mitigação.
                    Conforme NR-01 item 1.5.5.2.2 — definir cronograma com responsáveis, formas de acompanhamento
                    e aferição de resultados.
                  </p>
                </div>
                {resultados
                  .filter(r => r.matriz_risco === 'Crítico' || r.matriz_risco === 'Alto')
                  .map(r => <CardPlano key={r.topico_num} resultado={r} />)}
              </Secao>
            )}

            {/* Zona Amarela */}
            {resultados.filter(r => r.matriz_risco === 'Médio').length > 0 && (
              <Secao titulo="Plano de Ação — Monitoramento Preventivo" icone="⚠️">
                <div style={{ background: '#71390f22', border: '1px solid #71390f44', borderRadius: 8,
                  padding: '10px 16px', marginBottom: 20 }}>
                  <p style={{ color: '#fde68a', fontSize: 13, margin: 0 }}>
                    Dimensões em zona amarela indicam atenção necessária. Embora não representem risco imediato,
                    exigem monitoramento contínuo e ações preventivas para evitar agravamento.
                  </p>
                </div>
                {resultados
                  .filter(r => r.matriz_risco === 'Médio')
                  .map(r => <CardPlano key={r.topico_num} resultado={r} />)}
              </Secao>
            )}

            {/* Controles implantados */}
            {controles.length > 0 && (
              <Secao titulo="Controles Implantados Declarados" icone="✅">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {controles.map(c => (
                    <div key={c.id} style={{ background: '#14532d22', border: '1px solid #14532d44',
                      borderRadius: 8, padding: '10px 14px' }}>
                      <p style={{ color: '#86efac', fontSize: 13, fontWeight: 500, margin: '0 0 4px' }}>{c.nome}</p>
                      {c.descricao && <p style={{ color: '#64748b', fontSize: 11, margin: 0 }}>{c.descricao}</p>}
                    </div>
                  ))}
                </div>
              </Secao>
            )}
          </div>
        )}

        {/* ── ABA: GLOSSÁRIO ──────────────────────────────────────────────── */}
        {abaAtiva === 'glossario' && (
          <Secao titulo="Glossário de Dimensões" icone="📚">
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
              Definições das dimensões avaliadas pelo COPSOQ II, agrupadas por tema.
            </p>
            {glossario.map(grupo => (
              <div key={grupo.tema} style={{ marginBottom: 24 }}>
                <p style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                  marginBottom: 12, textTransform: 'uppercase' }}>{grupo.tema}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {grupo.dimensoes.map(d => (
                    <div key={d.nome} style={{ background: '#1e293b', border: '1px solid #334155',
                      borderRadius: 8, padding: '10px 14px' }}>
                      <p style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, margin: '0 0 4px' }}>{d.nome}</p>
                      <p style={{ color: '#94a3b8', fontSize: 12, margin: 0, lineHeight: 1.6 }}>{d.def}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Secao>
        )}

      </div>
    </div>
  );
}

// ── Card do Plano de Ação ────────────────────────────────────────────────────
function CardPlano({ resultado: r }) {
  const [expandido, setExpandido] = useState(false);
  return (
    <Card style={{ marginBottom: 16, borderLeft: `4px solid ${COR_BAR[r.matriz_risco] || '#334155'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <BadgeZona zona={r.matriz_risco} />
            <h3 style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 700, margin: 0 }}>{r.topico_nome}</h3>
          </div>
          <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>
            Fator de Atenção (PGR) · Score: {parseFloat(r.media_gravidade).toFixed(2)}
          </p>
        </div>
        <span style={{ color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>
          Ações preventivas — Hierarquia NR-01 1.5.4.3
        </span>
      </div>

      {(r.acoes_sugeridas || []).map((acao, i) => (
        <div key={i} style={{ background: '#0f172a', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ background: '#1e3a5f', color: '#93c5fd', borderRadius: 4,
                  padding: '1px 7px', fontSize: 10, fontWeight: 600 }}>ADMINISTRATIVA</span>
                <span style={{ color: '#e2e8f0', fontSize: 13 }}>{acao}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ color: '#64748b', fontSize: 11 }}>Responsável: <span style={{ color: '#94a3b8' }}>—</span></span>
                <span style={{ color: '#64748b', fontSize: 11 }}>Prazo: <span style={{ color: '#94a3b8' }}>—</span></span>
                <span style={{ color: '#64748b', fontSize: 11 }}>Status: <span style={{ color: '#94a3b8' }}>Pendente</span></span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {r.fonte_geradora && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: '#0f172a', borderRadius: 6 }}>
          <p style={{ color: '#64748b', fontSize: 11, margin: 0 }}>
            <strong style={{ color: '#475569' }}>Fonte geradora:</strong> {r.fonte_geradora}
          </p>
        </div>
      )}
    </Card>
  );
}

// ── Estilos base ─────────────────────────────────────────────────────────────
const td = { padding: '10px 12px', color: '#cbd5e1', fontSize: 13, verticalAlign: 'middle' };
const btnPrimario = {
  padding: '8px 20px', background: '#4f46e5', color: '#fff',
  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const btnSecundario = {
  padding: '7px 16px', background: 'transparent', color: '#94a3b8',
  border: '1px solid #334155', borderRadius: 8, fontSize: 13, cursor: 'pointer',
};
