import { useState, useEffect } from "react";
import { useAuth, API } from "../../contexts/AuthContext";
import { Layout } from "../../components/Layout";
import { Card, Btn, BarraProgresso } from "../../components/ui";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";

// ---- HELPERS ----
function SemaforoCard({ label, valor, bg, textCor, labelCor, sub }) {
  return (
    <div className={`rounded-xl p-4 text-center ${bg} shadow-sm`}>
      <p className={`text-3xl font-bold ${textCor}`}>{valor}</p>
      <p className={`text-xs font-semibold mt-1 ${labelCor}`}>{label}</p>
      {sub && <p className={`text-xs mt-0.5 ${labelCor} opacity-80`}>{sub}</p>}
    </div>
  );
}

const SEMAFORO = [
  ['Crítico','bg-red-700','text-white','text-red-200'],
  ['Alto',   'bg-red-400','text-white','text-red-50'],
  ['Médio',  'bg-yellow-300','text-gray-900','text-yellow-800'],
  ['Baixo',  'bg-green-500','text-white','text-green-50'],
];

function BadgeNivel({ valor }) {
  const s = {
    'Crítico':'bg-red-700 text-white', 'Alto':'bg-red-400 text-white',
    'Médio':'bg-yellow-300 text-gray-900', 'Baixo':'bg-green-500 text-white'
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s[valor]||'bg-gray-200 text-gray-600'}`}>{valor||'—'}</span>;
}

function semaforoGrav(v) {
  if (v==='Alta')  return 'text-red-600 font-semibold';
  if (v==='Média') return 'text-yellow-600 font-semibold';
  if (v==='Baixa') return 'text-green-600 font-semibold';
  return 'text-gray-400';
}

// ---- LAUDO COMPLETO ----
function LaudoCompleto({ aval, resultados, onVoltar, usuarioLogado }) {
  const [msg, setMsg] = useState('');
  const [modalIdent, setModalIdent] = useState(false);
  const [dadosIdent, setDadosIdent] = useState({ funcoes:'', homens:'', mulheres:'', agravos:'', medidas_controle:'' });

  const totalSetores = resultados.resultados?.[0]?.setores_incluidos?.length ||
    Math.max(...(resultados.resultados||[]).map(r=>r.setores_incluidos?.length||0), 1);

  const topRiscos = [...(resultados.resultados||[])]
    .filter(r=>r.matriz_risco==='Alto'||r.matriz_risco==='Crítico')
    .sort((a,b)=>{
      const ord = {'Crítico':4,'Alto':3,'Médio':2,'Baixo':1};
      const difSetores = (b.setores_em_risco?.length||0)-(a.setores_em_risco?.length||0);
      if (difSetores !== 0) return difSetores; // primeiro ordena por nº de setores afetados
      return (ord[b.matriz_risco]||0)-(ord[a.matriz_risco]||0); // depois por nível
    }).slice(0,5);

  const topFortes = [...(resultados.resultados||[])].sort((a,b)=>(a.media_gravidade||5)-(b.media_gravidade||5)).slice(0,5);

  const radarData = (resultados.resultados||[]).map(r=>({
    topico: r.topico_nome.replace(/^(Baixa |Baixo |Má |Maus |Excesso de |Falta de |Trabalho |Eventos )/,'').slice(0,22),
    valor: parseFloat(r.media_gravidade)||0,
  }));

  function exportarCSV() {
    if (!resultados?.resultados) return;
    const rows = [['Tópico','Gravidade','Probabilidade','Matriz de Risco','Fonte Geradora']];
    resultados.resultados.forEach(r => {
      rows.push([`"${r.topico_nome}"`, r.classif_gravidade, r.classif_probabilidade, r.matriz_risco, `"${r.fonte_geradora}"`]);
    });
    const csv = rows.map(r=>r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url;
    a.download = `DRPS_${aval.empresa_nome}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  async function exportarPDF(ident={}) {
    if (!resultados?.resultados) return;
    setMsg('⏳ Gerando PDF...');
    let radarImgData = null;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const el = document.getElementById('radar-gestor');
      if (el) { const c = await html2canvas(el,{scale:2,backgroundColor:'#fff'}); radarImgData = c.toDataURL('image/png'); }
    } catch(e) {}
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({unit:'mm',format:'a4'});
    const data = new Date().toLocaleDateString('pt-BR');
    const m=15, larg=180; let y=15;
    const ln=(txt,sz=10,bold=false,cor=[30,30,30])=>{
      doc.setFontSize(sz);doc.setFont('helvetica',bold?'bold':'normal');doc.setTextColor(...cor);
      doc.splitTextToSize(String(txt),larg).forEach(l=>{if(y>275){doc.addPage();y=15;}doc.text(l,m,y);y+=sz*0.45;});y+=1;
    };
    const sep=(cor=[200,200,200])=>{doc.setDrawColor(...cor);doc.line(m,y,m+larg,y);y+=4;};
    doc.setFillColor(10,38,71);doc.rect(0,0,210,28,'F');
    doc.setTextColor(255,255,255);doc.setFontSize(16);doc.setFont('helvetica','bold');
    doc.text('DIAGNÓSTICO DE RISCOS PSICOSSOCIAIS',m,12);
    doc.setFontSize(10);doc.setFont('helvetica','normal');
    doc.text('Conforme NR-01 — NeXa Psicossocial',m,19);
    doc.text(`Gerado em: ${data}`,195,19,{align:'right'});y=36;
    ln('IDENTIFICAÇÃO',11,true,[10,38,71]);sep([10,38,71]);
    ln(`Empresa: ${aval.empresa_nome}`);ln(`Setor: ${aval.setor_nome}`);
    if(ident.funcoes) ln(`Funções: ${ident.funcoes}`);
    if(ident.homens||ident.mulheres) ln(`Trabalhadores: ${(parseInt(ident.homens)||0)+(parseInt(ident.mulheres)||0)} total (${ident.homens||0}H/${ident.mulheres||0}M)`);
    ln(`Respostas: ${aval.total_respostas||'—'}`);y+=4;
    if(radarImgData){ln('PANORAMA GERAL',11,true,[10,38,71]);sep([10,38,71]);doc.addImage(radarImgData,'PNG',m,y,larg,80);y+=86;}
    ln('CLASSIFICAÇÃO POR TÓPICO',11,true,[10,38,71]);sep([10,38,71]);
    doc.setFillColor(240,242,245);doc.rect(m,y,larg,7,'F');
    doc.setFontSize(8);doc.setFont('helvetica','bold');doc.setTextColor(80,80,80);
    doc.text('Fator de Risco',m+2,y+5);doc.text('Gravidade',m+100,y+5);doc.text('Prob.',m+125,y+5);doc.text('Matriz',m+145,y+5);y+=9;
    const corM={'Crítico':[153,0,0],'Alto':[220,80,80],'Médio':[202,178,0],'Baixo':[34,139,34]};
    const corG={'Alta':[180,0,0],'Média':[160,130,0],'Baixa':[34,139,34]};
    resultados.resultados.forEach((r,i)=>{
      if(y>270){doc.addPage();y=15;}
      if(i%2===0){doc.setFillColor(250,251,252);doc.rect(m,y-1,larg,8,'F');}
      doc.setFontSize(8);doc.setFont('helvetica','normal');doc.setTextColor(30,30,30);
      doc.text(doc.splitTextToSize(r.topico_nome,95)[0],m+2,y+4);
      doc.setTextColor(...(corG[r.classif_gravidade]||[100,100,100]));doc.setFont('helvetica','bold');
      doc.text(r.classif_gravidade||'—',m+100,y+4);
      doc.setTextColor(30,30,30);doc.setFont('helvetica','normal');doc.text(r.classif_probabilidade||'—',m+125,y+4);
      const cm=corM[r.matriz_risco]||[150,150,150];
      doc.setFillColor(...cm);doc.roundedRect(m+140,y,30,6,2,2,'F');
      doc.setTextColor(255,255,255);doc.setFontSize(9);doc.setFont('helvetica','bold');
      doc.text(r.matriz_risco||'—',m+155,y+4,{align:'center'});doc.setTextColor(30,30,30);y+=9;
    });
    const totalPags=doc.internal.getNumberOfPages();
    for(let i=1;i<=totalPags;i++){
      doc.setPage(i);doc.setFillColor(240,242,245);doc.rect(0,287,210,10,'F');
      doc.setFontSize(8);doc.setFont('helvetica','normal');doc.setTextColor(120,120,120);
      doc.text('NeXa Psicossocial — Sistema DRPS — NR-01',m,293);
      doc.text(`Pág. ${i}/${totalPags}`,195,293,{align:'right'});
    }
    doc.save(`DRPS_${aval.empresa_nome}_${data.replace(/\//g,'-')}.pdf`);
    setMsg('✅ PDF gerado!');
  }

  return (
    <Layout titulo="Laudo" subtitulo={`${aval.setor_nome} · ${aval.empresa_nome}`}
      acoes={
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={exportarCSV}>⬇ CSV</Btn>
          <Btn variant="secondary" onClick={()=>setModalIdent(true)}>📄 PDF</Btn>
          <Btn variant="secondary" onClick={onVoltar}>← Voltar</Btn>
        </div>
      }>
      {msg && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 mb-4">{msg}</div>}

      {/* SEMÁFORO — duas visões se for consolidado */}
      {aval.totais_ocorrencias ? (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-1">🎯 Fatores com risco <span className="font-normal text-gray-400">(de 13)</span></h3>
            <p className="text-xs text-gray-500 mb-3">Quantos fatores têm pelo menos 1 setor em risco</p>
            <div className="grid grid-cols-4 gap-2">
              {SEMAFORO.map(([k,bg,tc,lc])=>(
                <SemaforoCard key={k} label={k} valor={resultados.contagem?.[k]||0} bg={bg} textCor={tc} labelCor={lc}/>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-1">📋 Ocorrências totais <span className="font-normal text-gray-400">(todos os setores)</span></h3>
            <p className="text-xs text-gray-500 mb-3">Soma de todas as ocorrências em todos os setores</p>
            <div className="grid grid-cols-4 gap-2">
              {SEMAFORO.map(([k,bg,tc,lc])=>(
                <SemaforoCard key={k} label={k} valor={aval.totais_ocorrencias?.[k]||0} bg={bg} textCor={tc} labelCor={lc}/>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3 mb-6">
          {SEMAFORO.map(([k,bg,tc,lc])=>(
            <SemaforoCard key={k} label={k} valor={resultados.contagem?.[k]||0} bg={bg} textCor={tc} labelCor={lc}/>
          ))}
        </div>
      )}

      {/* TOP RISCOS + PONTOS FORTES */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">🔴 Fatores Mais Críticos</h3>
          <p className="text-xs text-gray-400 mb-3">Ordenados por quantos setores afetam</p>
          {topRiscos.length === 0 ? (
            <p className="text-xs text-green-600">✅ Nenhum fator em nível Alto ou Crítico</p>
          ) : (
            <div className="space-y-3">
              {topRiscos.map(r=>{
                const afetados = r.setores_em_risco?.length||0;
                const total = r.setores_incluidos?.length||totalSetores||5;
                const pct = total > 0 ? Math.round((afetados/total)*100) : 0;
                return (
                  <div key={r.topico_num}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-700 truncate flex-1 mr-2">{r.topico_nome}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <BadgeNivel valor={r.matriz_risco}/>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${pct>=60?'bg-red-500':pct>=40?'bg-orange-400':'bg-yellow-400'}`}
                          style={{width:`${pct}%`}}/>
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0 w-20 text-right">
                        {afetados} de {total} setor(es)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-1">🟢 Pontos Fortes</h3>
          <p className="text-xs text-gray-400 mb-3">Fatores com melhor desempenho na rede</p>
          <div className="space-y-2">
            {topFortes.map(r=>(
              <div key={r.topico_num} className="flex items-center justify-between">
                <span className="text-xs text-gray-700 truncate flex-1 mr-2">{r.topico_nome}</span>
                <span className={`text-xs font-medium ${semaforoGrav(r.classif_gravidade)}`}>{r.classif_gravidade}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* RADAR */}
      <Card className="p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">📡 Panorama Geral (Radar)</h3>
        <div id="radar-gestor">
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid/><PolarAngleAxis dataKey="topico" tick={{fontSize:10}}/>
              <Tooltip formatter={(v)=>[v.toFixed(2),'Gravidade']}/>
              <Radar dataKey="valor" stroke="#0A2647" fill="#0A2647" fillOpacity={0.25}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* TABELA */}
      <Card className="overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-3 py-2 text-xs text-gray-400 font-medium">Fator de Risco</th>
            <th className="px-2 py-2 text-xs text-gray-400 font-medium w-16">Grav.</th>
            <th className="px-2 py-2 text-xs text-gray-400 font-medium w-20">Resultado</th>
            {aval.totais_ocorrencias && <th className="px-2 py-2 text-xs text-gray-400 font-medium w-28">Setores afetados</th>}
          </tr></thead>
          <tbody>
            {resultados.resultados?.map((r,idx)=>(
              <tr key={r.topico_num} className={`border-b border-gray-50 ${idx%2===0?'':'bg-gray-50'}`}>
                <td className="px-3 py-2 text-xs text-gray-700">{r.topico_nome}</td>
                <td className="px-2 py-2 text-center"><span className={`text-xs font-medium ${semaforoGrav(r.classif_gravidade)}`}>{r.classif_gravidade}</span></td>
                <td className="px-2 py-2 text-center"><BadgeNivel valor={r.matriz_risco}/></td>
                {aval.totais_ocorrencias && (
                  <td className="px-2 py-2 text-center">
                    {r.setores_em_risco?.length > 0
                      ? <span className="text-xs text-red-600 font-medium">{r.setores_em_risco.length} em risco</span>
                      : <span className="text-xs text-green-600">—</span>
                    }
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* PLANO DE AÇÃO */}
      {resultados.resultados?.filter(r=>r.matriz_risco==='Alto'||r.matriz_risco==='Crítico').length > 0 && (
        <Card className="p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">⚡ Plano de Ação — Riscos Prioritários</h3>
          <div className="space-y-4">
            {resultados.resultados.filter(r=>r.matriz_risco==='Alto'||r.matriz_risco==='Crítico').map(r=>(
              <div key={r.topico_num} className="border-l-4 border-orange-400 pl-3">
                <div className="flex items-center gap-2 mb-1">
                  <BadgeNivel valor={r.matriz_risco}/>
                  <span className="text-xs font-semibold text-gray-800">{r.topico_nome}</span>
                  {r.setores_em_risco?.length > 0 && (
                    <span className="text-xs text-gray-400">· afeta {r.setores_em_risco.length} setor(es)</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mb-1">Fonte: {r.fonte_geradora}</p>
                {r.acoes_sugeridas?.length > 0 && (
                  <ul className="text-xs text-gray-700 space-y-0.5 list-disc list-inside">
                    {r.acoes_sugeridas.map((a,i)=><li key={i}>{a}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* MODAL IDENTIFICAÇÃO */}
      {modalIdent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-5 rounded-t-2xl" style={{background:'#0A2647'}}>
              <h2 className="text-white font-bold text-lg">📋 Identificação do Laudo — NR-01</h2>
              <p className="text-blue-200 text-sm mt-1">Preencha os dados complementares</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Preenchido automaticamente</p>
                <p className="text-sm text-gray-700"><span className="font-medium">Empresa:</span> {aval.empresa_nome}</p>
                <p className="text-sm text-gray-700"><span className="font-medium">Data:</span> {new Date().toLocaleDateString('pt-BR')}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Funções/cargos avaliados</label>
                <input type="text" placeholder="Ex: Analista, Assistente, Coordenador"
                  value={dadosIdent.funcoes} onChange={e=>setDadosIdent({...dadosIdent,funcoes:e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Homens</label>
                  <input type="number" min="0" placeholder="0" value={dadosIdent.homens}
                    onChange={e=>setDadosIdent({...dadosIdent,homens:e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Mulheres</label>
                  <input type="number" min="0" placeholder="0" value={dadosIdent.mulheres}
                    onChange={e=>setDadosIdent({...dadosIdent,mulheres:e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Possíveis agravos à saúde mental</label>
                <textarea rows={2} placeholder="Ex: Burnout, ansiedade..."
                  value={dadosIdent.agravos} onChange={e=>setDadosIdent({...dadosIdent,agravos:e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 resize-none"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Medidas de controle existentes</label>
                <textarea rows={2} placeholder="Ex: Programa de apoio psicológico..."
                  value={dadosIdent.medidas_controle} onChange={e=>setDadosIdent({...dadosIdent,medidas_controle:e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 resize-none"/>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={()=>setModalIdent(false)}
                  className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 text-sm font-medium hover:bg-gray-50">Cancelar</button>
                <button onClick={()=>{ setModalIdent(false); exportarPDF(dadosIdent); }}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-700">Gerar PDF →</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// ============================================================
// DASHBOARD GESTOR FILIAL
// ============================================================
function DashboardFilial({ headers }) {
  const { usuario } = useAuth();
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avalSel, setAvalSel] = useState(null);
  const [resultados, setResultados] = useState(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(()=>{
    fetch(`${API}/avaliacoes/consolidado/filial`,{headers})
      .then(r=>r.json()).then(d=>{setAvaliacoes(Array.isArray(d)?d:[]);setLoading(false);})
      .catch(()=>setLoading(false));
  },[]);

  async function verResultados(aval) {
    setCarregando(true);
    const r = await fetch(`${API}/avaliacoes/${aval.id}/resultados`,{headers});
    setResultados(await r.json()); setAvalSel(aval); setCarregando(false);
  }

  if (avalSel && resultados) return (
    <LaudoCompleto aval={avalSel} resultados={resultados} usuarioLogado={usuario}
      onVoltar={()=>{setAvalSel(null);setResultados(null);}}/>
  );

  return (
    <Layout titulo="Painel da Filial" subtitulo={usuario.empresa_nome||''}>
      {(loading||carregando) ? <p className="text-sm text-gray-400 text-center py-8">Carregando...</p>
      : avaliacoes.length===0 ? <Card className="p-8 text-center text-sm text-gray-400">Nenhuma avaliação disponível.</Card>
      : <div className="space-y-4">
          {avaliacoes.map(a=>(
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">{a.setor_nome}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    📅 {new Date(a.criado_em).toLocaleDateString('pt-BR')}
                    {a.data_fim && <span className={`ml-2 font-medium ${new Date(a.data_fim)<new Date()?'text-red-500':'text-amber-600'}`}>· Limite: {new Date(a.data_fim).toLocaleDateString('pt-BR')}</span>}
                  </p>
                </div>
                {(a.status==='processada'||a.status==='coletada')
                  ? <Btn variant="primary" onClick={()=>verResultados(a)} className="text-xs">Ver laudo →</Btn>
                  : <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Em coleta</span>}
              </div>
              <BarraProgresso coletadas={parseInt(a.total_respostas)||0} total={parseInt(a.total_funcionarios)||0}/>
              {(a.status==='processada'||a.status==='coletada') && (
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {SEMAFORO.map(([k,bg])=>(
                    <div key={k} className={`${bg} rounded-lg py-1.5 text-center`}>
                      <p className="text-sm font-bold text-white">{a.contagem?.[k]||0}</p>
                      <p className="text-xs text-white opacity-80">{k}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>}
    </Layout>
  );
}

// ============================================================
// DASHBOARD GESTOR MATRIZ
// ============================================================
function DashboardMatriz({ headers }) {
  const { usuario } = useAuth();
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [empresaSel, setEmpresaSel] = useState(null);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [avalSel, setAvalSel] = useState(null);
  const [resultados, setResultados] = useState(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(()=>{
    fetch(`${API}/avaliacoes/consolidado/matriz`,{headers})
      .then(r=>r.json()).then(d=>{setDados(d);setLoading(false);})
      .catch(()=>setLoading(false));
  },[]);

  async function verEmpresa(emp) { setEmpresaSel(emp); setAvaliacoes(emp.avaliacoes||[]); setAvalSel(null); setResultados(null); }

  async function verResultados(aval) {
    setCarregando(true);
    const r = await fetch(`${API}/avaliacoes/${aval.id}/resultados`,{headers});
    setResultados(await r.json()); setAvalSel(aval); setCarregando(false);
  }

  if (avalSel && resultados) return (
    <LaudoCompleto aval={avalSel} resultados={resultados} usuarioLogado={usuario}
      onVoltar={()=>{setAvalSel(null);setResultados(null);}}/>
  );

  // ---- AVALIAÇÕES DE UMA FILIAL ----
  if (empresaSel) return (
    <Layout titulo={empresaSel.empresa_nome} subtitulo="Avaliações por setor"
      acoes={<Btn variant="secondary" onClick={()=>{setEmpresaSel(null);setAvalSel(null);setResultados(null);}}>← Voltar</Btn>}>
      {carregando && <p className="text-sm text-gray-400 text-center py-4">Carregando laudo...</p>}

      {/* RESUMO FILIAL + LAUDO CONSOLIDADO */}
      <Card className="p-4 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-gray-800">{empresaSel.empresa_nome}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {empresaSel.totais?.Alto>0 || empresaSel.totais?.Crítico>0
                ? `⚠️ ${(empresaSel.totais?.Alto||0)+(empresaSel.totais?.Crítico||0)} fatores exigem atenção`
                : '✅ Situação sob controle'}
            </p>
          </div>
          <Btn variant="primary" onClick={async()=>{
            setCarregando(true);
            const r = await fetch(`${API}/avaliacoes/consolidado/laudo-empresa/${empresaSel.empresa_id}`,{headers});
            const d = await r.json();
            if(!d.erro){ setAvalSel({empresa_nome:empresaSel.empresa_nome,setor_nome:`Consolidado — ${d.total_setores} setor(es)`,total_respostas:'—',totais_ocorrencias:dados?.totais_ocorrencias}); setResultados(d); }
            setCarregando(false);
          }}>📄 Laudo da filial</Btn>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {SEMAFORO.map(([k,bg])=>(
            <div key={k} className={`${bg} rounded-lg py-2 text-center`}>
              <p className="text-sm font-bold text-white">{empresaSel.totais?.[k]||0}</p>
              <p className="text-xs text-white opacity-80">{k}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* AVALIAÇÕES POR SETOR */}
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Avaliações por setor</h3>
      <div className="space-y-3">
        {avaliacoes.map(a=>(
          <Card key={a.id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-bold text-gray-900">{a.setor_nome}</p>
                <p className="text-xs text-gray-400">📅 {new Date(a.criado_em).toLocaleDateString('pt-BR')} · {a.total_respostas||0} resposta(s)</p>
              </div>
              <Btn variant="ghost" onClick={()=>verResultados(a)} className="text-xs">Ver laudo →</Btn>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {SEMAFORO.map(([k,bg])=>(
                <div key={k} className={`${bg} rounded-lg py-1.5 text-center`}>
                  <p className="text-sm font-bold text-white">{a.contagem?.[k]||0}</p>
                  <p className="text-xs text-white opacity-80">{k}</p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </Layout>
  );

  // ---- PAINEL PRINCIPAL MATRIZ ----
  const totalAlto = (dados?.totais_geral?.Alto||0) + (dados?.totais_geral?.Crítico||0);
  const totalSetores = dados?.empresas?.reduce((a,e)=>a+(e.avaliacoes?.length||0),0)||0;

  return (
    <Layout titulo="Painel Executivo" subtitulo="Diagnóstico Psicossocial da Rede">
      {loading ? <p className="text-sm text-gray-400 text-center py-8">Carregando dados...</p>
      : !dados || dados.empresas?.length===0 ? <Card className="p-8 text-center text-sm text-gray-400">Nenhuma avaliação processada ainda.</Card>
      : <>
          {/* RESUMO EXECUTIVO */}
          <Card className="p-5 mb-4 border-l-4 border-l-blue-600">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Situação geral da rede</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {totalAlto > 0
                    ? `⚠️ ${totalAlto} dos 13 fatores de risco exigem atenção em pelo menos 1 setor`
                    : '✅ Todos os fatores estão sob controle na rede'}
                </p>
                <p className="text-xs text-gray-400 mt-1">{dados.empresas?.length} empresa(s) · {totalSetores} setor(es) avaliado(s)</p>
              </div>
              <Btn variant="primary" onClick={async()=>{
                setLoading(true);
                const r = await fetch(`${API}/avaliacoes/consolidado/laudo-rede`,{headers});
                const d = await r.json();
                if(!d.erro){
                  setAvalSel({empresa_nome:'Rede Completa',setor_nome:`Consolidado — ${d.total_empresas} empresa(s)`,total_respostas:'—',totais_ocorrencias:dados.totais_ocorrencias});
                  setResultados(d);
                }
                setLoading(false);
              }}>📄 Laudo consolidado da rede</Btn>
            </div>
          </Card>

          {/* DOIS SEMÁFOROS */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="p-4">
              <h3 className="text-sm font-bold text-gray-800 mb-1">🎯 Fatores com risco <span className="font-normal text-gray-400">(de 13)</span></h3>
              <p className="text-xs text-gray-500 mb-3">Fatores com pelo menos 1 setor em risco na rede</p>
              <div className="grid grid-cols-4 gap-2">
                {SEMAFORO.map(([k,bg,tc,lc])=>(
                  <SemaforoCard key={k} label={k} valor={dados.totais_geral?.[k]||0} bg={bg} textCor={tc} labelCor={lc}/>
                ))}
              </div>
            </Card>
            <Card className="p-4">
              <h3 className="text-sm font-bold text-gray-800 mb-1">📋 Ocorrências totais <span className="font-normal text-gray-400">(todos os setores)</span></h3>
              <p className="text-xs text-gray-500 mb-3">Total de ocorrências por nível em todos os setores</p>
              <div className="grid grid-cols-4 gap-2">
                {SEMAFORO.map(([k,bg,tc,lc])=>(
                  <SemaforoCard key={k} label={k} valor={dados.totais_ocorrencias?.[k]||0} bg={bg} textCor={tc} labelCor={lc}/>
                ))}
              </div>
            </Card>
          </div>

          {/* SITUAÇÃO POR FILIAL */}
          <h3 className="text-sm font-semibold text-gray-700 mb-3">🏢 Situação por Filial</h3>
          <div className="space-y-3">
            {[...dados.empresas].sort((a,b)=>
              ((b.totais?.Crítico||0)*4+(b.totais?.Alto||0)*3)-((a.totais?.Crítico||0)*4+(a.totais?.Alto||0)*3)
            ).map(emp=>{
              const risco = (emp.totais?.Crítico||0)+(emp.totais?.Alto||0);
              return (
                <div key={emp.empresa_id}
                  className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-shadow ${risco>0?'border-l-4 border-l-red-400':'border-gray-200'}`}
                  onClick={()=>verEmpresa(emp)}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{emp.empresa_nome}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {risco > 0
                          ? `⚠️ ${risco} fator(es) exigem atenção · ${emp.avaliacoes?.length||0} setor(es) avaliado(s)`
                          : `✅ Situação sob controle · ${emp.avaliacoes?.length||0} setor(es)`}
                      </p>
                    </div>
                    <span className="text-xs text-blue-600 font-medium">Ver detalhes →</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {SEMAFORO.map(([k,bg])=>(
                      <div key={k} className={`${bg} rounded-lg py-1.5 text-center`}>
                        <p className="text-sm font-bold text-white">{emp.totais?.[k]||0}</p>
                        <p className="text-xs text-white opacity-80">{k}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>}
    </Layout>
  );
}

// ============================================================
// ROTEADOR
// ============================================================
export default function DashboardGestor() {
  const { token, usuario } = useAuth();
  const headers = { "Content-Type":"application/json", Authorization:`Bearer ${token}` };
  if (usuario.papel==='gestor_matriz') return <DashboardMatriz headers={headers}/>;
  return <DashboardFilial headers={headers}/>;
}
