// pages/psicologo/Resultados.jsx
// Laudo completo NR-01 — Sprint 3 — VERSÃO COMPLETA 21 SEÇÕES
// Caminho: frontend/src/pages/psicologo/Resultados.jsx

import { useState, useEffect, useRef } from "react";
import ModalConfigurarRelatorio from "./ModalConfigurarRelatorio";
import { API } from "../../contexts/AuthContext";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip, BarChart, Bar,
  XAxis, YAxis, Cell, Legend,
} from "recharts";

// ── Helpers de cor ───────────────────────────────────────────────────────────
const COR_ZONA = {
  Crítico: { bg: '#7f1d1d', text: '#fca5a5' },
  Alto:    { bg: '#7c2d12', text: '#fdba74' },
  Médio:   { bg: '#713f12', text: '#fde68a' },
  Baixo:   { bg: '#14532d', text: '#86efac' },
};
const COR_BAR = { Crítico: '#ef4444', Alto: '#f97316', Médio: '#eab308', Baixo: '#22c55e' };
const CORES_SETOR = ['#6366f1','#f59e0b','#10b981','#ec4899','#3b82f6','#f97316','#8b5cf6','#14b8a6'];

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

function Secao({ titulo, icone, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
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

function InfoBox({ cor, titulo, children }) {
  const cores = {
    verde:    { bg: '#14532d22', border: '#14532d66', title: '#86efac' },
    amarelo:  { bg: '#71390f22', border: '#71390f66', title: '#fde68a' },
    vermelho: { bg: '#7f1d1d22', border: '#7f1d1d66', title: '#fca5a5' },
    azul:     { bg: '#1e3a5f22', border: '#1e3a5f66', title: '#93c5fd' },
  };
  const c = cores[cor] || cores.azul;
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10, padding: '14px 18px', marginBottom: 12 }}>
      {titulo && <p style={{ color: c.title, fontWeight: 700, fontSize: 13, margin: '0 0 6px' }}>{titulo}</p>}
      <div style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.6 }}>{children}</div>
    </div>
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
  const [modalConfig, setModalConfig] = useState(false);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => { carregar(); }, [avaliacaoId]);

  async function carregar() {
    setLoading(true); setErro('');
    try {
      // Se for consolidado, usa endpoint dedicado
      const url = avaliacaoId === 'consolidado'
        ? `${API}/laudo/consolidado`
        : `${API}/laudo/${avaliacaoId}`;
      const r = await fetch(url, { headers });
      if (!r.ok) throw new Error((await r.json()).erro);
      const d = await r.json();
      setDados(d);
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
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400 }}>
      <p style={{ color:'#94a3b8' }}>Carregando laudo...</p>
    </div>
  );

  if (erro) return (
    <div style={{ padding:32 }}>
      <p style={{ color:'#f87171', marginBottom:16 }}>❌ {erro}</p>
      <button onClick={onVoltar} style={btnSecundario}>← Voltar</button>
    </div>
  );

  const { avaliacao, config, resultados, contagem, top5, radarData,
    inventarioMTE, inventarioFontes, matrizAIHA, controles, glossario, periodicidade, comparativo } = dados;

  const ABAS = [
    { id: 'resumo',      label: '📊 Resumo' },
    { id: 'resultados',  label: '📋 Resultados' },
    { id: 'inventario',  label: '🔍 Inventário MTE' },
    { id: 'fontes',      label: '📌 Fontes' },
    { id: 'aiha',        label: '⚠️ Matriz AIHA' },
    { id: 'comparativo', label: '🏢 Comparativo' },
    { id: 'metodologia', label: '📖 Metodologia' },
    { id: 'plano',       label: '📝 Plano de Ação' },
    { id: 'documentos',  label: '📄 Documentos' },
    { id: 'conclusao',   label: '✍️ Conclusão' },
    { id: 'glossario',   label: '📚 Glossário' },
  ];

  const nomeEmpresa = config?.nome_empresa || avaliacao.empresa_nome;
  const responsavel = config?.responsavel_nome || avaliacao.psicologo_nome;
  const registro    = config?.responsavel_registro || avaliacao.psicologo_crp || '';
  const periodo     = config?.periodo_avaliacao || new Date(avaliacao.criado_em).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const corLaudo    = config?.cor_laudo || '#6366f1';
  const totalRisco  = (contagem.Alto || 0) + (contagem.Crítico || 0);
  const totalAtencao = contagem.Médio || 0;

  // Monta comparativo por setor a partir dos dados
  const setoresComparativos = (() => {
    if (!comparativo || !comparativo.length) return [];
    const setores = {};
    comparativo.forEach(r => {
      if (!setores[r.setor_nome]) setores[r.setor_nome] = {};
      setores[r.setor_nome][r.topico_num] = { media: parseFloat(r.media_gravidade), zona: r.matriz_risco };
    });
    return setores;
  })();

  const topicosUnicos = resultados.map(r => ({ num: r.topico_num, nome: r.topico_nome }));
  const nomesSetores = Object.keys(setoresComparativos);

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
        <button onClick={() => setModalConfig(true)} style={{
          padding: '8px 16px', background: '#334155', border: '1px solid #475569',
          borderRadius: 8, color: '#e2e8f0', fontSize: 13, cursor: 'pointer', flexShrink: 0,
        }}>⚙️ Configurar relatório</button>
      </div>

      {/* Abas */}
      <div style={{ background: '#1e293b', borderBottom: '1px solid #334155',
        display: 'flex', overflowX: 'auto', padding: '0 16px' }}>
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAbaAtiva(a.id)} style={{
            padding: '10px 14px', background: 'none', border: 'none',
            color: abaAtiva === a.id ? corLaudo : '#64748b',
            borderBottom: abaAtiva === a.id ? `2px solid ${corLaudo}` : '2px solid transparent',
            fontSize: 12, fontWeight: abaAtiva === a.id ? 600 : 400,
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}>{a.label}</button>
        ))}
      </div>

      {/* Conteúdo */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 60px' }}>

        {/* ── ABA: RESUMO ──────────────────────────────────────────────────── */}
        {abaAtiva === 'resumo' && (
          <div>
            {/* Seção 1 — Cabeçalho */}
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
                  <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 800, margin: '4px 0 6px' }}>
                    {config?.titulo_tecnico === 'CUSTOM' ? config.titulo_personalizado
                      : config?.titulo_tecnico === 'AEP'  ? 'AEP-FRP — Avaliação Ergonômica Preliminar'
                      : config?.titulo_tecnico === 'IRP'  ? 'Inventário de Riscos Psicossociais'
                      : 'DRPS — Diagnóstico de Riscos Psicossociais (NR-01)'}
                  </h1>
                  <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>
                    Análise COPSOQ II · {avaliacao.setor_nome}
                  </p>
                  <p style={{ color: '#64748b', fontSize: 12, marginTop: 6 }}>
                    Período: {periodo} · Responsável: {responsavel}{registro && ` · Reg.: ${registro}`}
                  </p>
                </div>
                <div style={{ background: '#0f172a', borderRadius: 10, padding: '12px 20px', textAlign: 'center', flexShrink: 0 }}>
                  <p style={{ color: corLaudo, fontSize: 28, fontWeight: 800, margin: 0 }}>{avaliacao.total_respostas}</p>
                  <p style={{ color: '#64748b', fontSize: 11, margin: 0 }}>TOTAL DE<br/>RESPOSTAS</p>
                </div>
              </div>
            </Card>

            {/* Seção 4 — Semáforo */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
              {[
                ['Crítico', contagem.Crítico, '#7f1d1d', '#fca5a5', 'Requer ação imediata'],
                ['Alto',    contagem.Alto,    '#7c2d12', '#fdba74', 'Risco relevante'],
                ['Médio',   contagem.Médio,   '#713f12', '#fde68a', 'Estado de alerta'],
                ['Baixo',   contagem.Baixo,   '#14532d', '#86efac', 'Situação favorável'],
              ].map(([k, v, bg, tc, desc]) => (
                <div key={k} style={{ background: bg, borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
                  <p style={{ color: tc, fontSize: 36, fontWeight: 800, margin: 0 }}>{v}</p>
                  <p style={{ color: tc, fontSize: 13, fontWeight: 600, margin: '4px 0 2px', opacity: 0.9 }}>{k}</p>
                  <p style={{ color: tc, fontSize: 10, margin: 0, opacity: 0.65 }}>{desc}</p>
                </div>
              ))}
            </div>

            {/* Seção 2 — Top 5 + Seção 3 — Radar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <Card>
                <h3 style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600, marginBottom: 14, marginTop: 0 }}>
                  🔴 Top 5 Riscos Prioritários
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {top5.map((r, i) => (
                    <div key={r.topico_num} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#475569', fontSize: 12, fontWeight: 700, width: 18 }}>{i+1}.</span>
                      <span style={{ color: '#cbd5e1', fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.topico_nome}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span style={{ color: COR_BAR[r.matriz_risco] || '#94a3b8', fontSize: 12, fontWeight: 700 }}>
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
                      formatter={(v, n, p) => [parseFloat(v).toFixed(2), p.payload.topico_completo]}
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 12 }}
                    />
                    <Radar dataKey="valor" stroke={corLaudo} fill={corLaudo} fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Seção 6 — Ranking barras */}
            <Card style={{ marginBottom: 24 }}>
              <h3 style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600, marginBottom: 16, marginTop: 0 }}>
                📊 Ranking por Dimensão
              </h3>
              <ResponsiveContainer width="100%" height={resultados.length * 32 + 20}>
                <BarChart data={[...resultados].sort((a,b) => b.media_gravidade - a.media_gravidade)}
                  layout="vertical" margin={{ left: 200, right: 60, top: 0, bottom: 0 }}>
                  <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis type="category" dataKey="topico_nome" tick={{ fontSize: 11, fill: '#94a3b8' }} width={195} />
                  <Tooltip formatter={v => [parseFloat(v).toFixed(2), 'Score']}
                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', fontSize: 12 }} />
                  <Bar dataKey="media_gravidade" radius={[0, 4, 4, 0]}>
                    {[...resultados].sort((a,b) => b.media_gravidade - a.media_gravidade).map((r, i) => (
                      <Cell key={i} fill={COR_BAR[r.matriz_risco] || '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Seção 20 — Periodicidade */}
            <Card>
              <h3 style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600, marginBottom: 10, marginTop: 0 }}>
                📅 Periodicidade de Reavaliação Recomendada
              </h3>
              <p style={{ color: '#fbbf24', fontSize: 14, fontWeight: 600, margin: '0 0 6px' }}>
                Recomendação: reavaliação em <strong>{periodicidade.meses} meses</strong> — próxima avaliação até{' '}
                {new Date(periodicidade.proxima_avaliacao).toLocaleDateString('pt-BR')}
              </p>
              <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>{periodicidade.justificativa}</p>
              <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {['Alteração organizacional significativa','Evento sentinela (afastamento em massa, conflito grave)','Mudança no quadro de exposição','Solicitação do SESMT ou representantes dos trabalhadores'].map((g, i) => (
                  <span key={i} style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 6,
                    padding: '3px 10px', fontSize: 11, color: '#94a3b8' }}>⚡ {g}</span>
                ))}
              </div>
              <p style={{ color: '#475569', fontSize: 11, marginTop: 10 }}>
                Ref. NR-01 itens 1.5.4.1 e 1.5.4.2. A reavaliação deve ser antecipada se houver qualquer dos gatilhos acima.
              </p>
            </Card>
          </div>
        )}

        {/* ── ABA: RESULTADOS POR DIMENSÃO ─────────────────────────────────── */}
        {abaAtiva === 'resultados' && (
          <div>
            {/* Seção 7 — Tabela */}
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
                      .sort((a,b) => ({ Crítico:4, Alto:3, Médio:2, Baixo:1 }[b.matriz_risco]||0) - ({ Crítico:4, Alto:3, Médio:2, Baixo:1 }[a.matriz_risco]||0))
                      .map(r => (
                        <tr key={r.topico_num} style={{ borderBottom: '1px solid #0f172a' }}>
                          <td style={td}>{r.topico_num}</td>
                          <td style={{ ...td, fontWeight: 500 }}>{r.topico_nome}</td>
                          <td style={td}>
                            <span style={{ color: COR_BAR[r.matriz_risco]||'#94a3b8', fontWeight: 700 }}>
                              {parseFloat(r.media_gravidade).toFixed(2)}
                            </span>
                          </td>
                          <td style={td}>{r.classif_gravidade}</td>
                          <td style={td}>{r.classif_probabilidade}</td>
                          <td style={td}><BadgeZona zona={r.matriz_risco} /></td>
                          <td style={td}>
                            <select value={probLocal[r.topico_num]||2}
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
                  {salvando ? 'Processando...' : '🔄 Recalcular'}
                </button>
                <p style={{ color: '#64748b', fontSize: 12, margin: 0 }}>
                  Ajuste a probabilidade conforme evidências da empresa.
                </p>
              </div>
            </Secao>

            {/* Seção 8 — Critérios de interpretação */}
            <Secao titulo="Critérios de Interpretação e Privacidade" icone="🔐">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <p style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>ZONAS DE RISCO COPSOQ II</p>
                  {[
                    ['Crítico', '#7f1d1d', '#fca5a5', 'Score < 1.99', 'Dimensões negativas. Exposição intensa — ação imediata obrigatória.'],
                    ['Alto',    '#7c2d12', '#fdba74', 'Score 2.00–2.32', 'Dimensões negativas. Risco relevante — plano de ação prioritário.'],
                    ['Médio',   '#713f12', '#fde68a', 'Score 2.33–3.65', 'Zona de atenção — monitoramento contínuo e ações preventivas.'],
                    ['Baixo',   '#14532d', '#86efac', 'Score ≥ 3.66', 'Dimensões negativas. Situação favorável — manter e aprimorar.'],
                  ].map(([z, bg, tc, range, desc]) => (
                    <div key={z} style={{ background: bg, borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ color: tc, fontWeight: 700, fontSize: 13 }}>{z}</span>
                        <span style={{ color: tc, fontSize: 11, opacity: 0.8 }}>{range}</span>
                      </div>
                      <p style={{ color: tc, fontSize: 12, margin: 0, opacity: 0.85 }}>{desc}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>PRIVACIDADE E ANONIMATO</p>
                  <InfoBox cor="azul" titulo="🔒 Garantia de Anonimato">
                    <p style={{ margin: '0 0 8px' }}>
                      Todas as respostas são <strong>estritamente anônimas</strong>. Nenhuma resposta individual
                      pode ser rastreada ou associada a um respondente específico.
                    </p>
                    <p style={{ margin: '0 0 8px' }}>
                      Os dados são tratados exclusivamente de forma <strong>agregada e estatística</strong>,
                      em conformidade com a LGPD (Lei 13.709/2018) e NR-01.
                    </p>
                    <p style={{ margin: 0 }}>
                      Resultados de grupos com menos de 5 respondentes não são exibidos individualmente
                      para preservar o anonimato.
                    </p>
                  </InfoBox>
                  <InfoBox cor="verde" titulo="📋 Base Normativa">
                    <p style={{ margin: 0 }}>
                      Avaliação realizada conforme NR-01 (Portaria MTE 1.419/2024), utilizando o instrumento
                      COPSOQ II validado para o Brasil. Os resultados integram o Gerenciamento de Riscos
                      Ocupacionais (GRO) e o Programa de Gerenciamento de Riscos (PGR).
                    </p>
                  </InfoBox>
                </div>
              </div>
            </Secao>
          </div>
        )}

        {/* ── ABA: INVENTÁRIO MTE ──────────────────────────────────────────── */}
        {abaAtiva === 'inventario' && (
          <Secao titulo="Fatores de Risco Psicossociais — Manual MTE 2025" icone="🔍">
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 20 }}>
              Tradução das dimensões COPSOQ II para os 13 fatores canônicos reconhecidos pelo MTE/SIT
              (Guia de informações sobre Fatores de Riscos Psicossociais — NR-01 GRO, julho/2025, pág. 7).
              Atendem NR-01 item 1.5.4.4.6.1.
            </p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {['Indícios', 'Monitoramento', 'Não identificado'].map(s => {
                const count = inventarioMTE.filter(f => f.status === s).length;
                const cor = s === 'Indícios' ? '#ef4444' : s === 'Monitoramento' ? '#eab308' : '#22c55e';
                return (
                  <div key={s} style={{ background: '#1e293b', border: `1px solid ${cor}33`,
                    borderRadius: 8, padding: '8px 20px', textAlign: 'center' }}>
                    <p style={{ color: cor, fontSize: 22, fontWeight: 700, margin: 0 }}>{count}</p>
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
                  <div key={f.num} style={{ background: '#1e293b', border: '1px solid #334155',
                    borderLeft: `4px solid ${cor}`, borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ color: '#64748b', fontSize: 11, fontWeight: 600 }}>#{f.num}</span>
                          <p style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600, margin: 0 }}>{f.nome}</p>
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 8px', lineHeight: 1.5 }}>{f.descricao}</p>
                        {f.dimensoes_associadas?.length > 0 && (
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
                      <div style={{ flexShrink: 0, textAlign: 'center' }}>
                        <span style={{ background: bg, color: cor, border: `1px solid ${cor}44`,
                          borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600 }}>
                          {f.status}
                        </span>
                        {f.possivel_agravo && (
                          <p style={{ color: '#64748b', fontSize: 10, marginTop: 4, maxWidth: 120 }}>{f.possivel_agravo}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Secao>
        )}

        {/* ── ABA: FONTES E CIRCUNSTÂNCIAS ─────────────────────────────────── */}
        {abaAtiva === 'fontes' && (
          <Secao titulo="Inventário de Riscos — Fontes e Circunstâncias" icone="📌">
            <InfoBox cor="azul">
              Atende à NR-01 item 1.5.4.4.6.1 (Portaria MTE 1.419/2024): para cada risco identificado,
              descreve <strong>fontes geradoras</strong>, <strong>circunstâncias de exposição</strong> e{' '}
              <strong>possíveis agravos</strong>. Caráter orientativo — o responsável técnico pelo PGR
              deve refinar com base no contexto operacional concreto.
            </InfoBox>
            {inventarioFontes.length === 0 ? (
              <Card><p style={{ color: '#64748b', textAlign: 'center' }}>Nenhuma dimensão em zona de atenção ou risco. ✅</p></Card>
            ) : inventarioFontes.map(f => (
              <Card key={f.topico_num} style={{ marginBottom: 16, borderLeft: `4px solid ${COR_BAR[f.matriz_risco]||'#334155'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ color: '#f1f5f9', fontSize: 15, fontWeight: 700, margin: 0 }}>{f.topico_nome}</h3>
                  <BadgeZona zona={f.matriz_risco} size="md" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  {[
                    ['FONTES GERADORAS', f.fontes_geradoras || [], '#64748b', '#cbd5e1'],
                    ['CIRCUNSTÂNCIAS DE EXPOSIÇÃO', f.circunstancias_exposicao || [], '#64748b', '#cbd5e1'],
                    ['POSSÍVEIS AGRAVOS', f.possiveis_agravos || [], '#64748b', '#fbbf24'],
                  ].map(([titulo, itens, tc, li]) => (
                    <div key={titulo}>
                      <p style={{ color: tc, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>{titulo}</p>
                      <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {itens.map((s, i) => (
                          <li key={i} style={{ color: li, fontSize: 12, marginBottom: 4, lineHeight: 1.5 }}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </Secao>
        )}

        {/* ── ABA: MATRIZ AIHA ─────────────────────────────────────────────── */}
        {abaAtiva === 'aiha' && (
          <div>
            <Secao titulo="Inventário de Riscos — Matriz AIHA 5×5" icone="⚠️">
              <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
                Conversão automática dos resultados COPSOQ II para a matriz Probabilidade × Severidade (AIHA 5×5).
              </p>

              {/* Seção 11 — Critérios de tolerabilidade */}
              <Card style={{ marginBottom: 24 }}>
                <h3 style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600, marginBottom: 14, marginTop: 0 }}>
                  📏 Critérios de Tolerabilidade do Risco
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <p style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>CLASSIFICAÇÃO COPSOQ II</p>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #334155' }}>
                          <th style={{ color: '#64748b', padding: '6px 8px', textAlign: 'left', fontWeight: 500 }}>Zona</th>
                          <th style={{ color: '#64748b', padding: '6px 8px', textAlign: 'left', fontWeight: 500 }}>Limiar (dim. negativas)</th>
                          <th style={{ color: '#64748b', padding: '6px 8px', textAlign: 'left', fontWeight: 500 }}>Interpretação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['Crítico',  '#fca5a5', '< 2.00',    'Exposição intensa — ação imediata'],
                          ['Alto',     '#fdba74', '2.00–2.32', 'Risco relevante — prioridade alta'],
                          ['Médio',    '#fde68a', '2.33–3.65', 'Atenção — monitoramento contínuo'],
                          ['Baixo',    '#86efac', '≥ 3.66',    'Favorável — manter práticas'],
                        ].map(([z, tc, lim, interp]) => (
                          <tr key={z} style={{ borderBottom: '1px solid #0f172a' }}>
                            <td style={{ ...td, fontSize: 12 }}><span style={{ color: tc, fontWeight: 600 }}>{z}</span></td>
                            <td style={{ ...td, fontSize: 12 }}>{lim}</td>
                            <td style={{ ...td, fontSize: 12, color: '#94a3b8' }}>{interp}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <p style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>CLASSIFICAÇÃO AIHA P×S</p>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #334155' }}>
                          <th style={{ color: '#64748b', padding: '6px 8px', textAlign: 'left', fontWeight: 500 }}>Nível</th>
                          <th style={{ color: '#64748b', padding: '6px 8px', textAlign: 'left', fontWeight: 500 }}>P×S</th>
                          <th style={{ color: '#64748b', padding: '6px 8px', textAlign: 'left', fontWeight: 500 }}>Ação requerida</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['Trivial',      '#86efac', '1–2',   'Nenhuma ação específica'],
                          ['Tolerável',    '#86efac', '3',     'Monitorar periodicamente'],
                          ['Moderado',     '#fde68a', '4–9',   'Ações preventivas programadas'],
                          ['Substancial',  '#fdba74', '10–14', 'Ação corretiva urgente'],
                          ['Intolerável',  '#fca5a5', '15–25', 'Paralisar — ação imediata'],
                        ].map(([n, tc, pxs, acao]) => (
                          <tr key={n} style={{ borderBottom: '1px solid #0f172a' }}>
                            <td style={{ ...td, fontSize: 12 }}><span style={{ color: tc, fontWeight: 600 }}>{n}</span></td>
                            <td style={{ ...td, fontSize: 12 }}>{pxs}</td>
                            <td style={{ ...td, fontSize: 12, color: '#94a3b8' }}>{acao}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>

              {/* Seção 17 — Grid visual 5×5 */}
              <Card style={{ marginBottom: 24 }}>
                <h3 style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600, marginBottom: 16, marginTop: 0 }}>
                  Matriz de Risco Visual — Probabilidade × Severidade
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', minWidth: 500 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 130, color: '#64748b', fontSize: 11, padding: 8 }}>Prob. \ Sev.</th>
                        {['1—Leve','2—Baixa','3—Moderada','4—Alta','5—Extrema'].map(s => (
                          <th key={s} style={{ color: '#94a3b8', fontSize: 11, fontWeight: 500, padding: '8px 12px', textAlign: 'center' }}>{s}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[5,4,3,2,1].map(prob => {
                        const labels = ['','Rara','Pouco Provável','Possível','Provável','Muito Provável'];
                        return (
                          <tr key={prob}>
                            <td style={{ color: '#94a3b8', fontSize: 11, padding: '6px 8px', textAlign: 'right' }}>
                              {prob}—{labels[prob]}
                            </td>
                            {[1,2,3,4,5].map(sev => {
                              const pxs = prob * sev;
                              const corBg = pxs<=2?'#166534':pxs<=3?'#14532d':pxs<=8?'#713f12':pxs<=14?'#7c2d12':'#7f1d1d';
                              const corTx = pxs<=3?'#86efac':pxs<=8?'#fde68a':'#fca5a5';
                              const fatores = matrizAIHA.filter(f => f.severidade===sev && f.probabilidade===prob);
                              return (
                                <td key={sev} style={{ background: corBg, padding: '6px 8px', textAlign: 'center',
                                  border: '1px solid #0f172a', minWidth: 80 }}>
                                  <span style={{ color: corTx, fontSize: 13, fontWeight: 700 }}>{pxs}</span>
                                  {fatores.map((f, i) => (
                                    <div key={i} style={{ background: '#0f172a88', borderRadius: 4,
                                      padding: '2px 4px', fontSize: 9, color: '#e2e8f0', marginTop: 3, lineHeight: 1.3 }}>
                                      T{f.topico_num}
                                    </div>
                                  ))}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                  {[['#166534','#86efac','Trivial (1-2)'],['#14532d','#86efac','Tolerável (3)'],
                    ['#713f12','#fde68a','Moderado (4-8)'],['#7c2d12','#fca5a5','Substancial (9-14)'],
                    ['#7f1d1d','#fca5a5','Intolerável (15-25)']].map(([bg, tc, label]) => (
                    <div key={label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ width:14, height:14, background:bg, borderRadius:2 }} />
                      <span style={{ color:tc, fontSize:11 }}>{label}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Tabela AIHA */}
              <Card>
                <h3 style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600, marginBottom: 16, marginTop: 0 }}>
                  Fatores de Risco — Detalhamento AIHA
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155' }}>
                        {['Fator de Risco (PGR)','Score','Severidade','Probabilidade','P×S','Nível de Risco'].map(h => (
                          <th key={h} style={{ color:'#64748b', fontSize:11, fontWeight:500, padding:'8px 12px', textAlign:'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrizAIHA.map((f, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #0f172a' }}>
                          <td style={{ ...td, fontWeight:500, maxWidth:200 }}><div style={{ fontSize:13 }}>{f.fator_pgr}</div></td>
                          <td style={{ ...td, color:'#94a3b8' }}>{parseFloat(f.score).toFixed(2)}</td>
                          <td style={td}>{f.severidade}—{f.severidade_label}</td>
                          <td style={td}>{f.probabilidade}—{f.probabilidade_label}</td>
                          <td style={{ ...td, fontWeight:700, color:'#fbbf24' }}>{f.pxs}</td>
                          <td style={td}>
                            <span style={{ background:f.cor+'22', color:f.cor, border:`1px solid ${f.cor}44`,
                              borderRadius:6, padding:'3px 10px', fontSize:12, fontWeight:600 }}>
                              {f.nivel_risco}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p style={{ color:'#475569', fontSize:11, marginTop:12 }}>
                  Legenda AIHA: Trivial (1-2) · Tolerável (3) · Moderado (4-9) · Substancial (10-14) · Intolerável (15-25).
                  Probabilidade estimada deve ser validada pelo responsável técnico com dados do GRO.
                </p>
              </Card>
            </Secao>
          </div>
        )}

        {/* ── ABA: COMPARATIVO POR SETOR ───────────────────────────────────── */}
        {abaAtiva === 'comparativo' && (
          <div>
            {/* Seção 15 — Tabela comparativa */}
            <Secao titulo="Comparativo por Setor — Tabela" icone="🏢">
              {nomesSetores.length < 2 ? (
                <InfoBox cor="azul">
                  Comparativo disponível quando há avaliações processadas em múltiplos setores da mesma empresa.
                </InfoBox>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155' }}>
                        <th style={{ color:'#64748b', fontWeight:500, padding:'8px 12px', textAlign:'left', minWidth:180 }}>Dimensão</th>
                        {nomesSetores.map(s => (
                          <th key={s} style={{ color:'#64748b', fontWeight:500, padding:'8px 12px', textAlign:'center', minWidth:100 }}>{s}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topicosUnicos.map(t => (
                        <tr key={t.num} style={{ borderBottom: '1px solid #0f172a' }}>
                          <td style={{ ...td, fontSize:12 }}>{t.nome}</td>
                          {nomesSetores.map(s => {
                            const d = setoresComparativos[s]?.[t.num];
                            if (!d) return <td key={s} style={{ ...td, textAlign:'center', color:'#475569' }}>—</td>;
                            const bg = COR_ZONA[d.zona]?.bg || '#1e293b';
                            const tc = COR_ZONA[d.zona]?.text || '#94a3b8';
                            return (
                              <td key={s} style={{ ...td, textAlign:'center' }}>
                                <span style={{ background:bg, color:tc, borderRadius:6, padding:'3px 10px', fontSize:11, fontWeight:600 }}>
                                  {d.media.toFixed(2)}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Secao>

            {/* Seção 16 — Radar comparativo */}
            {nomesSetores.length >= 2 && (
              <Secao titulo="Radar Comparativo por Setor" icone="📡">
                <Card>
                  <ResponsiveContainer width="100%" height={380}>
                    <RadarChart data={topicosUnicos.map(t => {
                      const point = { topico: t.nome.slice(0, 20) };
                      nomesSetores.forEach(s => {
                        point[s] = setoresComparativos[s]?.[t.num]?.media || 0;
                      });
                      return point;
                    })}>
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis dataKey="topico" tick={{ fontSize: 9, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ background:'#1e293b', border:'1px solid #334155', fontSize:11 }} />
                      <Legend wrapperStyle={{ fontSize:12, color:'#94a3b8' }} />
                      {nomesSetores.map((s, i) => (
                        <Radar key={s} name={s} dataKey={s}
                          stroke={CORES_SETOR[i % CORES_SETOR.length]}
                          fill={CORES_SETOR[i % CORES_SETOR.length]}
                          fillOpacity={0.1} />
                      ))}
                    </RadarChart>
                  </ResponsiveContainer>
                </Card>
              </Secao>
            )}
          </div>
        )}

        {/* ── ABA: METODOLOGIA ─────────────────────────────────────────────── */}
        {abaAtiva === 'metodologia' && (
          <div>
            {/* Seção 9 — Metodologia */}
            <Secao titulo="Metodologia e Base Científica" icone="📖">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <InfoBox cor="azul" titulo="🔬 COPSOQ II — Copenhagen Psychosocial Questionnaire">
                  <p style={{ margin: '0 0 8px' }}>
                    Instrumento desenvolvido pelo Instituto Nacional de Saúde Ocupacional da Dinamarca (NIOH),
                    validado e adaptado para o Brasil. Avalia múltiplas dimensões psicossociais do trabalho
                    com base em evidências científicas sólidas.
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Referência:</strong> Kristensen, T.S., Hannerz, H., Høgh, A. & Borg, V. (2005).
                    The Copenhagen Psychosocial Questionnaire — a tool for the assessment and improvement of
                    the psychosocial work environment. <em>Scandinavian Journal of Work, Environment & Health</em>, 31(6), 438-449.
                  </p>
                </InfoBox>
                <InfoBox cor="verde" titulo="⚖️ Base Normativa — NR-01">
                  <p style={{ margin: '0 0 8px' }}>
                    Avaliação realizada em conformidade com a <strong>NR-01 (Portaria MTE 1.419/2024)</strong>,
                    que tornou obrigatória a inclusão dos riscos psicossociais no Gerenciamento de Riscos
                    Ocupacionais (GRO) e no Programa de Gerenciamento de Riscos (PGR).
                  </p>
                  <p style={{ margin: 0 }}>
                    Vigência: a partir de <strong>26 de maio de 2025</strong> para empresas de grau de risco 3 e 4,
                    e a partir de <strong>26 de maio de 2026</strong> para demais empresas.
                  </p>
                </InfoBox>
              </div>

              <Card style={{ marginBottom: 16 }}>
                <h3 style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600, marginBottom: 14, marginTop: 0 }}>
                  📐 Como os Resultados São Calculados
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  {[
                    ['1. Coleta', 'Colaboradores respondem anonimamente ao questionário com 52 perguntas, em escala Likert de 1 a 5, agrupadas em 13 dimensões psicossociais.'],
                    ['2. Cálculo', 'Para cada dimensão, calcula-se a média das respostas (gravidade). Dimensões negativas têm escala invertida: scores menores indicam maior exposição ao risco.'],
                    ['3. Classificação', 'A média é convertida para a zona de risco (Baixo/Médio/Alto/Crítico) pelos limiares COPSOQ II. A matriz de risco cruza gravidade e probabilidade estimada.'],
                  ].map(([titulo, texto]) => (
                    <div key={titulo} style={{ background: '#0f172a', borderRadius: 8, padding: '14px 16px' }}>
                      <p style={{ color: corLaudo, fontSize: 12, fontWeight: 700, margin: '0 0 8px' }}>{titulo}</p>
                      <p style={{ color: '#94a3b8', fontSize: 12, margin: 0, lineHeight: 1.6 }}>{texto}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600, marginBottom: 12, marginTop: 0 }}>
                  🏛️ Hierarquia de Controles (NR-01 item 1.5.4.3)
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    ['1ª', 'Eliminação', 'Remover a fonte do risco do ambiente de trabalho', '#ef4444'],
                    ['2ª', 'Substituição', 'Substituir por processo, material ou equipamento menos perigoso', '#f97316'],
                    ['3ª', 'Controles de Engenharia', 'Isolamento, enclausuramento, ventilação, barreiras', '#eab308'],
                    ['4ª', 'Controles Administrativos', 'Procedimentos, treinamentos, rotação de tarefas, comunicação', '#22c55e'],
                    ['5ª', 'EPI', 'Equipamentos de proteção individual como última medida', '#6366f1'],
                  ].map(([ord, nome, desc, cor]) => (
                    <div key={ord} style={{ display:'flex', gap:12, alignItems:'flex-start',
                      background:'#0f172a', borderRadius:8, padding:'10px 14px' }}>
                      <span style={{ color:cor, fontWeight:800, fontSize:14, flexShrink:0, width:24 }}>{ord}</span>
                      <div>
                        <p style={{ color:'#e2e8f0', fontSize:13, fontWeight:600, margin:'0 0 2px' }}>{nome}</p>
                        <p style={{ color:'#94a3b8', fontSize:12, margin:0 }}>{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </Secao>
          </div>
        )}

        {/* ── ABA: PLANO DE AÇÃO ───────────────────────────────────────────── */}
        {abaAtiva === 'plano' && (
          <div>
            {resultados.filter(r => r.matriz_risco==='Crítico'||r.matriz_risco==='Alto').length > 0 && (
              <Secao titulo="Plano de Ação — Eliminação/Controle de Risco" icone="🚨">
                <InfoBox cor="vermelho">
                  Dimensões em zona vermelha indicam risco crítico — ação imediata obrigatória.
                  Conforme NR-01 item 1.5.5.2.2, defina cronograma com responsáveis, formas de
                  acompanhamento e aferição de resultados.
                </InfoBox>
                {resultados.filter(r => r.matriz_risco==='Crítico'||r.matriz_risco==='Alto')
                  .map(r => <CardPlano key={r.topico_num} resultado={r} />)}
              </Secao>
            )}
            {resultados.filter(r => r.matriz_risco==='Médio').length > 0 && (
              <Secao titulo="Plano de Ação — Monitoramento Preventivo" icone="⚠️">
                <InfoBox cor="amarelo">
                  Dimensões em zona amarela requerem monitoramento contínuo e ações preventivas
                  para evitar agravamento. Conforme NR-01 item 1.5.4.1.
                </InfoBox>
                {resultados.filter(r => r.matriz_risco==='Médio')
                  .map(r => <CardPlano key={r.topico_num} resultado={r} />)}
              </Secao>
            )}
            {controles.length > 0 && (
              <Secao titulo="Controles Implantados Declarados" icone="✅">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {controles.map(c => (
                    <div key={c.id} style={{ background:'#14532d22', border:'1px solid #14532d44',
                      borderRadius:8, padding:'10px 14px' }}>
                      <p style={{ color:'#86efac', fontSize:13, fontWeight:500, margin:'0 0 4px' }}>{c.nome}</p>
                      {c.descricao && <p style={{ color:'#64748b', fontSize:11, margin:0 }}>{c.descricao}</p>}
                    </div>
                  ))}
                </div>
              </Secao>
            )}
          </div>
        )}

        {/* ── ABA: DOCUMENTOS MODELO ───────────────────────────────────────── */}
        {abaAtiva === 'documentos' && (
          <div>
            {/* Seção 14 — Documentos modelo */}
            <Secao titulo="Documentos Modelo para Implementação" icone="📄">
              <InfoBox cor="azul">
                Modelos de documentos prontos para adaptação pela empresa. Personalize com o nome da organização,
                CNPJ, responsável e aplique conforme necessidade identificada no diagnóstico.
              </InfoBox>

              {/* Seção 19 — Comunicado */}
              <Card style={{ marginBottom: 16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                  <div>
                    <h3 style={{ color:'#f1f5f9', fontSize:14, fontWeight:700, margin:'0 0 4px' }}>
                      📢 Comunicado aos Trabalhadores
                    </h3>
                    <p style={{ color:'#94a3b8', fontSize:12, margin:0 }}>
                      Informe os colaboradores sobre os resultados da avaliação e próximas etapas.
                    </p>
                  </div>
                  <button onClick={() => copiarComunicado(nomeEmpresa, periodo, avaliacao.total_respostas, totalRisco, totalAtencao, responsavel, registro)}
                    style={btnSecundario}>📋 Copiar texto</button>
                </div>
                <div style={{ background:'#0f172a', borderRadius:8, padding:'16px 20px',
                  border:'1px solid #334155', fontFamily:'serif', lineHeight:1.8 }}>
                  <p style={{ color:'#94a3b8', fontSize:12, margin:'0 0 12px', fontStyle:'italic' }}>
                    [Modelo — adapte conforme necessário]
                  </p>
                  <p style={{ color:'#e2e8f0', fontSize:13, margin:'0 0 10px' }}>
                    <strong>Assunto: Resultados da Avaliação de Riscos Psicossociais — {nomeEmpresa}</strong>
                  </p>
                  <p style={{ color:'#cbd5e1', fontSize:13, margin:'0 0 10px' }}>Prezado(a) colaborador(a),</p>
                  <p style={{ color:'#cbd5e1', fontSize:13, margin:'0 0 10px' }}>
                    Informamos que foi concluída a Avaliação de Riscos Psicossociais (DRPS/NR-01) referente
                    ao período de <strong style={{ color:'#e2e8f0' }}>{periodo}</strong>, com a participação de{' '}
                    <strong style={{ color:'#e2e8f0' }}>{avaliacao.total_respostas} colaboradores</strong>.
                  </p>
                  <p style={{ color:'#cbd5e1', fontSize:13, margin:'0 0 10px' }}>
                    Os resultados identificaram <strong style={{ color: totalRisco > 0 ? '#fdba74' : '#86efac' }}>
                    {totalRisco} dimensão(ões) em zona de risco</strong> e{' '}
                    <strong style={{ color: totalAtencao > 0 ? '#fde68a' : '#86efac' }}>
                    {totalAtencao} em zona de atenção</strong>, para as quais serão adotadas medidas
                    de controle e monitoramento conforme plano de ação estabelecido.
                  </p>
                  <p style={{ color:'#cbd5e1', fontSize:13, margin:'0 0 10px' }}>
                    Reforçamos que todas as respostas são anônimas e os dados são tratados exclusivamente
                    de forma agregada, em conformidade com a LGPD e NR-01.
                  </p>
                  <p style={{ color:'#cbd5e1', fontSize:13, margin:'0 0 10px' }}>
                    O laudo completo e o plano de ação estarão disponíveis com o SESMT/RH.
                    Quaisquer dúvidas, entre em contato com o responsável técnico:{' '}
                    <strong style={{ color:'#e2e8f0' }}>{responsavel}</strong>
                    {registro && <span> ({registro})</span>}.
                  </p>
                  <p style={{ color:'#cbd5e1', fontSize:13, margin:0 }}>Atenciosamente,<br/>
                    <strong style={{ color:'#e2e8f0' }}>{nomeEmpresa}</strong><br/>
                    <span style={{ color:'#64748b', fontSize:12 }}>SESMT / Departamento de Saúde Ocupacional</span>
                  </p>
                </div>
              </Card>

              {/* Documentos modelo */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { titulo: '🚫 Política Antiassédio', desc: 'Política de prevenção e combate ao assédio moral e sexual no trabalho. Obrigatória conforme NR-01 e Lei 14.457/2022.', tags: ['Obrigatório','NR-01','Lei 14.457/2022'] },
                  { titulo: '🔄 Gestão de Mudança Organizacional', desc: 'Procedimento para comunicação e gestão de mudanças com impacto nos trabalhadores, minimizando riscos psicossociais.', tags: ['Recomendado','GRO'] },
                  { titulo: '🤝 Programa de Mentoria e Acolhimento', desc: 'Programa estruturado de integração e suporte para novos colaboradores e em momentos de transição de cargo.', tags: ['Preventivo'] },
                  { titulo: '🏆 Política de Reconhecimento', desc: 'Diretrizes para reconhecimento e valorização de colaboradores, fator protetor dos riscos psicossociais.', tags: ['Preventivo'] },
                  { titulo: '🏠 Desconexão e Trabalho Remoto', desc: 'Protocolo para garantia do direito à desconexão e boas práticas no trabalho remoto/híbrido.', tags: ['Recomendado','Home Office'] },
                  { titulo: '🧠 Programa de Saúde Mental', desc: 'Estrutura para suporte à saúde mental dos trabalhadores, incluindo triagem, encaminhamento e acompanhamento.', tags: ['Recomendado','SESMT'] },
                ].map(doc => (
                  <div key={doc.titulo} style={{ background:'#1e293b', border:'1px solid #334155',
                    borderRadius:10, padding:'16px 18px' }}>
                    <p style={{ color:'#f1f5f9', fontSize:14, fontWeight:600, margin:'0 0 6px' }}>{doc.titulo}</p>
                    <p style={{ color:'#94a3b8', fontSize:12, margin:'0 0 10px', lineHeight:1.5 }}>{doc.desc}</p>
                    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      {doc.tags.map(t => (
                        <span key={t} style={{ background:'#0f172a', border:'1px solid #334155',
                          borderRadius:4, padding:'2px 8px', fontSize:10, color:'#64748b' }}>{t}</span>
                      ))}
                    </div>
                    <p style={{ color:'#475569', fontSize:11, marginTop:8, marginBottom:0 }}>
                      📌 Solicite o modelo ao responsável técnico ou SESMT para personalização.
                    </p>
                  </div>
                ))}
              </div>
            </Secao>
          </div>
        )}

        {/* ── ABA: CONCLUSÃO ───────────────────────────────────────────────── */}
        {abaAtiva === 'conclusao' && (
          <div>
            {/* Seção 21 — Conclusão */}
            <Secao titulo="Conclusão e Assinatura do Responsável Técnico" icone="✍️">
              <Card style={{ marginBottom: 20 }}>
                <h3 style={{ color:'#f1f5f9', fontSize:14, fontWeight:600, marginBottom:14, marginTop:0 }}>
                  📝 Texto de Conclusão (gerado automaticamente)
                </h3>
                <div style={{ background:'#0f172a', borderRadius:10, padding:'20px 24px',
                  border:'1px solid #334155', lineHeight:1.8 }}>
                  <p style={{ color:'#cbd5e1', fontSize:13, margin:'0 0 12px' }}>
                    O presente Diagnóstico de Riscos Psicossociais (DRPS) foi conduzido na empresa{' '}
                    <strong style={{ color:'#e2e8f0' }}>{nomeEmpresa}</strong>
                    {config?.cnpj && <span>, CNPJ <strong style={{ color:'#e2e8f0' }}>{config.cnpj}</strong></span>},
                    no setor <strong style={{ color:'#e2e8f0' }}>{avaliacao.setor_nome}</strong>,
                    com referência ao período de <strong style={{ color:'#e2e8f0' }}>{periodo}</strong>.
                  </p>
                  <p style={{ color:'#cbd5e1', fontSize:13, margin:'0 0 12px' }}>
                    A avaliação contou com a participação de{' '}
                    <strong style={{ color:'#e2e8f0' }}>{avaliacao.total_respostas} respondentes</strong>
                    {avaliacao.taxa_adesao != null && (
                      <span>, representando uma taxa de adesão de{' '}
                        <strong style={{ color: avaliacao.taxa_adesao >= 60 ? '#86efac' : '#fde68a' }}>
                          {avaliacao.taxa_adesao}%
                        </strong>
                        {avaliacao.taxa_adesao < 60 && ' (abaixo do mínimo recomendado de 60% — interpretar com cautela)'}
                      </span>
                    )}.
                    Foram analisadas <strong style={{ color:'#e2e8f0' }}>{resultados.length} dimensões</strong> psicossociais
                    pelo instrumento COPSOQ II, adaptado e validado para o Brasil.
                  </p>
                  <p style={{ color:'#cbd5e1', fontSize:13, margin:'0 0 12px' }}>
                    Os resultados evidenciaram{' '}
                    <strong style={{ color: totalRisco > 0 ? '#fdba74' : '#86efac' }}>
                      {totalRisco} dimensão(ões) em zona de risco (Alto/Crítico)
                    </strong>
                    {totalRisco > 0 && ' — demandam plano de ação imediato conforme NR-01 item 1.5.5.2.2'} e{' '}
                    <strong style={{ color: totalAtencao > 0 ? '#fde68a' : '#86efac' }}>
                      {totalAtencao} dimensão(ões) em zona de atenção (Médio)
                    </strong>
                    {totalAtencao > 0 && ' — requerem monitoramento contínuo e ações preventivas'}.
                    {contagem.Baixo > 0 && (
                      <span>{' '}<strong style={{ color:'#86efac' }}>{contagem.Baixo} dimensão(ões) em situação favorável (Baixo risco)</strong>.</span>
                    )}
                  </p>
                  <p style={{ color:'#cbd5e1', fontSize:13, margin:'0 0 12px' }}>
                    Este laudo integra o Gerenciamento de Riscos Ocupacionais (GRO) e o Programa de
                    Gerenciamento de Riscos (PGR) da organização, em conformidade com a NR-01
                    (Portaria MTE 1.419/2024) e as diretrizes do Manual de Fatores de Riscos Psicossociais
                    do MTE/SIT (julho/2025).
                  </p>
                  <p style={{ color:'#cbd5e1', fontSize:13, margin:'0 0 20px' }}>
                    Recomenda-se reavaliação em <strong style={{ color:'#fbbf24' }}>{periodicidade.meses} meses</strong>,
                    com próxima avaliação prevista para{' '}
                    <strong style={{ color:'#fbbf24' }}>
                      {new Date(periodicidade.proxima_avaliacao).toLocaleDateString('pt-BR')}
                    </strong>.
                  </p>

                  {/* Assinatura */}
                  <div style={{ borderTop:'1px solid #334155', paddingTop:20, marginTop:8 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:32 }}>
                      <div>
                        <div style={{ borderBottom:'1px solid #475569', paddingBottom:8, marginBottom:8 }}>
                          <p style={{ color:'#e2e8f0', fontSize:14, fontWeight:600, margin:0 }}>{responsavel}</p>
                        </div>
                        <p style={{ color:'#64748b', fontSize:12, margin:'4px 0 0' }}>Responsável Técnico</p>
                        {registro && <p style={{ color:'#94a3b8', fontSize:12, margin:'2px 0 0' }}>Registro: {registro}</p>}
                        <p style={{ color:'#64748b', fontSize:11, margin:'2px 0 0' }}>
                          Data: {new Date().toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <div style={{ borderBottom:'1px solid #475569', paddingBottom:8, marginBottom:8 }}>
                          <p style={{ color:'#e2e8f0', fontSize:14, fontWeight:600, margin:0 }}>{nomeEmpresa}</p>
                        </div>
                        <p style={{ color:'#64748b', fontSize:12, margin:'4px 0 0' }}>Empresa / Contratante</p>
                        {config?.cnpj && <p style={{ color:'#94a3b8', fontSize:12, margin:'2px 0 0' }}>CNPJ: {config.cnpj}</p>}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <InfoBox cor="azul" titulo="ℹ️ Sobre este laudo">
                Este documento foi gerado pelo sistema NeXa DRPS com base nas respostas coletadas
                anonimamente. Os dados são tratados de forma agregada, em conformidade com a LGPD
                (Lei 13.709/2018) e NR-01 (Portaria MTE 1.419/2024). O responsável técnico identificado
                acima é o signatário deste diagnóstico.
              </InfoBox>
            </Secao>
          </div>
        )}

        {/* ── ABA: GLOSSÁRIO ───────────────────────────────────────────────── */}
        {abaAtiva === 'glossario' && (
          <Secao titulo="Glossário de Dimensões" icone="📚">
            <p style={{ color:'#94a3b8', fontSize:13, marginBottom:20 }}>
              Definições das dimensões avaliadas pelo COPSOQ II, agrupadas por categoria temática.
            </p>
            {(glossario || []).map(grupo => (
              <div key={grupo.tema} style={{ marginBottom: 24 }}>
                <p style={{ color:'#64748b', fontSize:11, fontWeight:700, letterSpacing:'0.08em',
                  marginBottom:12, textTransform:'uppercase' }}>{grupo.tema}</p>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {grupo.dimensoes.map(d => (
                    <div key={d.nome} style={{ background:'#1e293b', border:'1px solid #334155',
                      borderRadius:8, padding:'10px 14px' }}>
                      <p style={{ color:'#e2e8f0', fontSize:13, fontWeight:600, margin:'0 0 4px' }}>{d.nome}</p>
                      <p style={{ color:'#94a3b8', fontSize:12, margin:0, lineHeight:1.6 }}>{d.def}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Secao>
        )}

      </div>

      {/* Modal Configurar Relatório */}
      {modalConfig && (
        <ModalConfigurarRelatorio
          avaliacao={{ id: avaliacaoId, empresa_nome: dados?.avaliacao?.empresa_nome, setor_nome: dados?.avaliacao?.setor_nome }}
          token={token}
          onFechar={() => setModalConfig(false)}
          onSalvo={() => { setModalConfig(false); carregar(); }}
        />
      )}
    </div>
  );
}

// ── Helper: copiar comunicado ─────────────────────────────────────────────────
function copiarComunicado(empresa, periodo, n, risco, atencao, resp, reg) {
  const texto = `Assunto: Resultados da Avaliação de Riscos Psicossociais — ${empresa}

Prezado(a) colaborador(a),

Informamos que foi concluída a Avaliação de Riscos Psicossociais (DRPS/NR-01) referente ao período de ${periodo}, com a participação de ${n} colaboradores.

Os resultados identificaram ${risco} dimensão(ões) em zona de risco e ${atencao} em zona de atenção, para as quais serão adotadas medidas de controle e monitoramento conforme plano de ação estabelecido.

Reforçamos que todas as respostas são anônimas e os dados são tratados exclusivamente de forma agregada, em conformidade com a LGPD e NR-01.

O laudo completo e o plano de ação estarão disponíveis com o SESMT/RH. Quaisquer dúvidas, entre em contato com o responsável técnico: ${resp}${reg ? ` (${reg})` : ''}.

Atenciosamente,
${empresa}
SESMT / Departamento de Saúde Ocupacional`;
  navigator.clipboard.writeText(texto).then(() => alert('✅ Texto copiado!'));
}

// ── Card do Plano de Ação ─────────────────────────────────────────────────────
function CardPlano({ resultado: r }) {
  const [expandido, setExpandido] = useState(false);
  return (
    <Card style={{ marginBottom: 16, borderLeft: `4px solid ${COR_BAR[r.matriz_risco]||'#334155'}` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <BadgeZona zona={r.matriz_risco} />
            <h3 style={{ color:'#f1f5f9', fontSize:14, fontWeight:700, margin:0 }}>{r.topico_nome}</h3>
          </div>
          <p style={{ color:'#94a3b8', fontSize:12, margin:0 }}>
            Fator PGR · Score: {parseFloat(r.media_gravidade).toFixed(2)}
          </p>
        </div>
        <button onClick={() => setExpandido(!expandido)} style={{ ...btnSecundario, fontSize:11 }}>
          {expandido ? '▲ Recolher' : '▼ Ver ficha'}
        </button>
      </div>

      {(r.acoes_sugeridas || []).map((acao, i) => (
        <div key={i} style={{ background:'#0f172a', borderRadius:8, padding:'12px 14px', marginBottom:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
            <span style={{ background:'#1e3a5f', color:'#93c5fd', borderRadius:4,
              padding:'1px 7px', fontSize:10, fontWeight:600 }}>ADMINISTRATIVA</span>
            <span style={{ color:'#e2e8f0', fontSize:13 }}>{acao}</span>
          </div>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <span style={{ color:'#64748b', fontSize:11 }}>Responsável: <span style={{ color:'#94a3b8' }}>—</span></span>
            <span style={{ color:'#64748b', fontSize:11 }}>Prazo: <span style={{ color:'#94a3b8' }}>—</span></span>
            <span style={{ color:'#64748b', fontSize:11 }}>Status: <span style={{ color:'#fbbf24' }}>Pendente</span></span>
          </div>
        </div>
      ))}

      {expandido && (
        <div style={{ marginTop:12, background:'#0f172a', borderRadius:8, padding:'14px 16px' }}>
          <p style={{ color:'#64748b', fontSize:11, fontWeight:700, margin:'0 0 8px', letterSpacing:'0.08em' }}>
            FICHA DE IMPLEMENTAÇÃO — NR-01 HIERARQUIA DE CONTROLES
          </p>
          {r.fonte_geradora && (
            <p style={{ color:'#94a3b8', fontSize:12, margin:'0 0 8px' }}>
              <strong style={{ color:'#475569' }}>Fonte geradora:</strong> {r.fonte_geradora}
            </p>
          )}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            {[['Responsável pela ação','—'],['Prazo de implementação','—'],['Forma de acompanhamento','—'],
              ['Recurso necessário','—'],['Data de verificação','—'],['Status','Pendente']].map(([k,v]) => (
              <div key={k} style={{ background:'#1e293b', borderRadius:6, padding:'8px 10px' }}>
                <p style={{ color:'#475569', fontSize:10, margin:'0 0 2px' }}>{k}</p>
                <p style={{ color:'#94a3b8', fontSize:12, margin:0 }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Estilos base ──────────────────────────────────────────────────────────────
const td = { padding: '10px 12px', color: '#cbd5e1', fontSize: 13, verticalAlign: 'middle' };
const btnPrimario = {
  padding: '8px 20px', background: '#4f46e5', color: '#fff',
  border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
};
const btnSecundario = {
  padding: '7px 16px', background: 'transparent', color: '#94a3b8',
  border: '1px solid #334155', borderRadius: 8, fontSize: 13, cursor: 'pointer',
};
