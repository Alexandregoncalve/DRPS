import { useState, useEffect } from "react";
import { useAuth, API } from "../../contexts/AuthContext";
import { Layout } from "../../components/Layout";
import { Card, Btn, BadgeRisco, BarraProgresso } from "../../components/ui";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
// ---- HELPERS COMPARTILHADOS ----
function SemaforoCard({ label, valor, bg, textCor, labelCor }) {
  return (
    <div className={`rounded-xl p-4 text-center ${bg} shadow-sm`}>
      <p className={`text-3xl font-bold ${textCor}`}>{valor}</p>
      <p className={`text-xs font-semibold mt-1 ${labelCor}`}>{label}</p>
    </div>
  );
}

const SEMAFORO_CARDS = [
  ['Crítico','bg-red-700','text-white','text-red-200'],
  ['Alto',   'bg-red-400','text-white','text-red-50'],
  ['Médio',  'bg-yellow-300','text-gray-900','text-yellow-800'],
  ['Baixo',  'bg-green-500','text-white','text-green-50'],
];

function BadgeMatriz({ valor }) {
  const estilos = {
    'Crítico': 'bg-red-700 text-white',
    'Alto':    'bg-red-400 text-white',
    'Médio':   'bg-yellow-300 text-gray-900',
    'Baixo':   'bg-green-500 text-white',
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${estilos[valor]||'bg-gray-200 text-gray-600'}`}>{valor||'—'}</span>;
}

function semaforoGrav(v) {
  if (v==='Alta')  return 'text-red-600 font-semibold';
  if (v==='Média') return 'text-yellow-600 font-semibold';
  if (v==='Baixa') return 'text-green-600 font-semibold';
  return 'text-gray-400';
}

// ---- LAUDO COMPLETO (somente leitura, com exportações) ----
function LaudoCompleto({ aval, resultados, onVoltar, usuarioLogado }) {
  const [msg, setMsg] = useState('');
  const [modalIdent, setModalIdent] = useState(false);
  const [dadosIdent, setDadosIdent] = useState({
    funcoes: '', homens: '', mulheres: '', agravos: '', medidas_controle: ''
  });

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
    a.download = `DRPS_${aval.empresa_nome}_${aval.setor_nome}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  async function exportarPDF(ident = {}) {
    if (!resultados?.resultados) return;
    setMsg('⏳ Gerando PDF...');
    let radarImgData = null;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const radarEl = document.getElementById('radar-chart-container-gestor');
      if (radarEl) {
        const canvas = await html2canvas(radarEl, { scale: 2, backgroundColor: '#ffffff' });
        radarImgData = canvas.toDataURL('image/png');
      }
    } catch(e) { console.warn('html2canvas:', e); }

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const data = new Date().toLocaleDateString('pt-BR');
    const margem = 15;
    const largura = 180;
    let y = 15;

    function linha(texto, tamanho=10, negrito=false, cor=[30,30,30]) {
      doc.setFontSize(tamanho); doc.setFont('helvetica', negrito?'bold':'normal'); doc.setTextColor(...cor);
      const linhas = doc.splitTextToSize(String(texto), largura);
      linhas.forEach(l => { if (y>275){doc.addPage();y=15;} doc.text(l,margem,y); y+=tamanho*0.45; }); y+=1;
    }
    function separador(cor=[200,200,200]) {
      if(y>275){doc.addPage();y=15;} doc.setDrawColor(...cor); doc.line(margem,y,margem+largura,y); y+=4;
    }
    function retanguloColorido(texto,bgR,bgG,bgB,x,yPos,w,h=7) {
      doc.setFillColor(bgR,bgG,bgB); doc.roundedRect(x,yPos,w,h,2,2,'F');
      doc.setTextColor(255,255,255); doc.setFontSize(9); doc.setFont('helvetica','bold');
      doc.text(texto,x+w/2,yPos+4.8,{align:'center'}); doc.setTextColor(30,30,30);
    }

    // CABEÇALHO
    doc.setFillColor(10,38,71); doc.rect(0,0,210,28,'F');
    doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont('helvetica','bold');
    doc.text('DIAGNÓSTICO DE RISCOS PSICOSSOCIAIS',margem,12);
    doc.setFontSize(10); doc.setFont('helvetica','normal');
    doc.text('Conforme NR-01 — NeXa Psicossocial',margem,19);
    doc.text(`Gerado em: ${data}`,195,19,{align:'right'}); y=36;

    // IDENTIFICAÇÃO COMPLETA NR-01
    linha('IDENTIFICAÇÃO',11,true,[10,38,71]); separador([10,38,71]);
    linha(`Empresa: ${aval.empresa_nome}`); linha(`Setor: ${aval.setor_nome}`);
    linha(`Data de Elaboração: ${data}`);
    if (ident.funcoes) linha(`Funções/Cargos Avaliados: ${ident.funcoes}`);
    if (ident.homens||ident.mulheres) {
      const total=(parseInt(ident.homens)||0)+(parseInt(ident.mulheres)||0);
      linha(`Trabalhadores: ${total} total (${ident.homens||0} homens / ${ident.mulheres||0} mulheres)`);
    }
    linha(`Respostas coletadas: ${aval.total_respostas||'—'}`);
    if (ident.agravos) linha(`Possíveis Agravos à Saúde Mental: ${ident.agravos}`);
    if (ident.medidas_controle) linha(`Medidas de Controle Existentes: ${ident.medidas_controle}`);
    y+=4;

    // SEMÁFORO
    linha('MATRIZ DE RISCO — RESUMO',11,true,[10,38,71]); separador([10,38,71]);
    const conts = [
      ['Crítico',resultados.contagem?.Crítico||0,153,0,0],
      ['Alto',resultados.contagem?.Alto||0,220,80,80],
      ['Médio',resultados.contagem?.Médio||0,202,178,0],
      ['Baixo',resultados.contagem?.Baixo||0,34,139,34],
    ];
    const colW=42;
    conts.forEach(([label,val,r,g,b],i)=>{
      const cx=margem+i*(colW+3); doc.setFillColor(r,g,b); doc.roundedRect(cx,y,colW,16,3,3,'F');
      doc.setTextColor(255,255,255); doc.setFontSize(18); doc.setFont('helvetica','bold');
      doc.text(String(val),cx+colW/2,y+9,{align:'center'});
      doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.text(label,cx+colW/2,y+14,{align:'center'});
    });
    doc.setTextColor(30,30,30); y+=22;

    // RADAR
    if (radarImgData) {
      if(y>200){doc.addPage();y=15;}
      linha('PANORAMA GERAL — RADAR',11,true,[10,38,71]); separador([10,38,71]);
      doc.addImage(radarImgData,'PNG',margem,y,largura,80); y+=86;
    }

    // TABELA
    linha('CLASSIFICAÇÃO POR TÓPICO',11,true,[10,38,71]); separador([10,38,71]);
    doc.setFillColor(240,242,245); doc.rect(margem,y,largura,7,'F');
    doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(80,80,80);
    doc.text('Fator de Risco',margem+2,y+5); doc.text('Gravidade',margem+100,y+5);
    doc.text('Prob.',margem+125,y+5); doc.text('Matriz',margem+145,y+5); y+=9;

    const corMatriz={'Crítico':[153,0,0],'Alto':[220,80,80],'Médio':[202,178,0],'Baixo':[34,139,34]};
    const corGrav={'Alta':[180,0,0],'Média':[160,130,0],'Baixa':[34,139,34]};

    resultados.resultados.forEach((r,idx)=>{
      if(y>270){doc.addPage();y=15;}
      if(idx%2===0){doc.setFillColor(250,251,252);doc.rect(margem,y-1,largura,8,'F');}
      doc.setFontSize(8);doc.setFont('helvetica','normal');doc.setTextColor(30,30,30);
      doc.text(doc.splitTextToSize(r.topico_nome,95)[0],margem+2,y+4);
      const cg=corGrav[r.classif_gravidade]||[100,100,100];
      doc.setTextColor(...cg);doc.setFont('helvetica','bold');doc.text(r.classif_gravidade||'—',margem+100,y+4);
      doc.setTextColor(30,30,30);doc.setFont('helvetica','normal');doc.text(r.classif_probabilidade||'—',margem+125,y+4);
      const cm=corMatriz[r.matriz_risco]||[150,150,150];
      retanguloColorido(r.matriz_risco||'—',...cm,margem+140,y,30,6); y+=9;
    });
    y+=4;

    // PLANO DE AÇÃO
    const riscos=resultados.resultados.filter(r=>r.matriz_risco==='Alto'||r.matriz_risco==='Crítico');
    if(riscos.length>0){
      if(y>240){doc.addPage();y=15;}
      linha('PLANO DE AÇÃO — RISCOS PRIORITÁRIOS',11,true,[10,38,71]); separador([10,38,71]);
      riscos.forEach(r=>{
        if(y>260){doc.addPage();y=15;}
        const cm=corMatriz[r.matriz_risco]||[150,150,150];
        doc.setFillColor(...cm); doc.roundedRect(margem,y,20,6,2,2,'F');
        doc.setTextColor(255,255,255);doc.setFontSize(8);doc.setFont('helvetica','bold');
        doc.text(r.matriz_risco,margem+10,y+4,{align:'center'});
        doc.setTextColor(30,30,30);doc.setFont('helvetica','bold');doc.setFontSize(9);
        doc.text(r.topico_nome,margem+23,y+4); y+=8;
        linha(`Fonte: ${r.fonte_geradora}`,8,false,[80,80,80]);
        r.acoes_sugeridas?.forEach(a=>{if(y>270){doc.addPage();y=15;} linha(`• ${a}`,8);});
        y+=3;
      });
    }

    // RODAPÉ
    const totalPags=doc.internal.getNumberOfPages();
    for(let i=1;i<=totalPags;i++){
      doc.setPage(i); doc.setFillColor(240,242,245); doc.rect(0,287,210,10,'F');
      doc.setFontSize(8);doc.setFont('helvetica','normal');doc.setTextColor(120,120,120);
      doc.text('NeXa Psicossocial — Sistema DRPS — Diagnóstico de Riscos Psicossociais (NR-01)',margem,293);
      doc.text(`Pág. ${i}/${totalPags}`,195,293,{align:'right'});
    }
    doc.save(`DRPS_${aval.empresa_nome}_${aval.setor_nome}_${data.replace(/\//g,'-')}.pdf`);
    setMsg('✅ PDF gerado com sucesso!');
  }
  const topRiscos = [...(resultados.resultados||[])].sort((a,b)=>{
    const ord = {'Crítico':4,'Alto':3,'Médio':2,'Baixo':1};
    return (ord[b.matriz_risco]||0)-(ord[a.matriz_risco]||0);
  }).slice(0,5);

  const topFortes = [...(resultados.resultados||[])].sort((a,b)=>
    (a.media_gravidade||5)-(b.media_gravidade||5)
  ).slice(0,5);

  const radarData = (resultados.resultados||[]).map(r=>({
    topico: r.topico_nome.replace(/^(Baixa |Baixo |Má |Maus |Excesso de |Falta de |Trabalho |Eventos )/,'').slice(0,22),
    valor: parseFloat(r.media_gravidade)||0,
  }));

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

      {/* SEMÁFORO */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {SEMAFORO_CARDS.map(([k,bg,tc,lc])=>(
          <SemaforoCard key={k} label={k} valor={resultados.contagem?.[k]||0} bg={bg} textCor={tc} labelCor={lc}/>
        ))}
      </div>

      {/* TOP RISCOS + PONTOS FORTES */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">🔴 Top 5 Riscos Prioritários</h3>
          <div className="space-y-2">
            {topRiscos.map(r=>(
              <div key={r.topico_num} className="flex items-center justify-between">
                <span className="text-xs text-gray-700 truncate flex-1 mr-2">{r.topico_nome}</span>
                <BadgeMatriz valor={r.matriz_risco}/>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">🟢 Top 5 Pontos Fortes</h3>
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
        <div id="radar-chart-container-gestor">
          <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData}>
            <PolarGrid/>
            <PolarAngleAxis dataKey="topico" tick={{fontSize:10}}/>
            <Tooltip formatter={(v)=>[v.toFixed(2),'Gravidade média']}/>
            <Radar name="Gravidade" dataKey="valor" stroke="#0A2647" fill="#0A2647" fillOpacity={0.25}/>
          </RadarChart>
        </ResponsiveContainer>
        </div>
      </Card>
      <Card className="overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-3 py-2 text-xs text-gray-400 font-medium">Tópico</th>
            <th className="px-2 py-2 text-xs text-gray-400 font-medium w-16">Grav.</th>
            <th className="px-2 py-2 text-xs text-gray-400 font-medium w-14">Prob.</th>
            <th className="px-2 py-2 text-xs text-gray-400 font-medium w-20">Matriz</th>
          </tr></thead>
          <tbody>
            {resultados.resultados?.map((r,idx)=>(
              <tr key={r.topico_num} className={`border-b border-gray-50 ${idx%2===0?'':'bg-gray-50'}`}>
                <td className="px-3 py-2 text-xs text-gray-700">{r.topico_nome}</td>
                <td className="px-2 py-2 text-center"><span className={`text-xs font-medium ${semaforoGrav(r.classif_gravidade)}`}>{r.classif_gravidade}</span></td>
                <td className="px-2 py-2 text-center"><span className="text-xs text-gray-600">{r.classif_probabilidade}</span></td>
                <td className="px-2 py-2 text-center"><BadgeMatriz valor={r.matriz_risco}/></td>
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
                  <BadgeMatriz valor={r.matriz_risco}/>
                  <span className="text-xs font-semibold text-gray-800">{r.topico_nome}</span>
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

      {/* MODAL IDENTIFICAÇÃO NR-01 */}
      {modalIdent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-5 rounded-t-2xl" style={{background:'#0A2647'}}>
              <h2 className="text-white font-bold text-lg">📋 Identificação do Laudo — NR-01</h2>
              <p className="text-blue-200 text-sm mt-1">Preencha os dados complementares para o laudo oficial</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3 space-y-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Preenchido automaticamente</p>
                <p className="text-sm text-gray-700"><span className="font-medium">Empresa:</span> {aval.empresa_nome}</p>
                <p className="text-sm text-gray-700"><span className="font-medium">Setor:</span> {aval.setor_nome}</p>
                <p className="text-sm text-gray-700"><span className="font-medium">Data:</span> {new Date().toLocaleDateString('pt-BR')}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Funções/cargos avaliados neste setor</label>
                <input type="text" placeholder="Ex: Analista, Assistente, Coordenador"
                  value={dadosIdent.funcoes} onChange={e=>setDadosIdent({...dadosIdent,funcoes:e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Quantidade — Homens</label>
                  <input type="number" min="0" placeholder="0"
                    value={dadosIdent.homens} onChange={e=>setDadosIdent({...dadosIdent,homens:e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Quantidade — Mulheres</label>
                  <input type="number" min="0" placeholder="0"
                    value={dadosIdent.mulheres} onChange={e=>setDadosIdent({...dadosIdent,mulheres:e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Possíveis agravos à saúde mental</label>
                <textarea rows={2} placeholder="Ex: Burnout, transtornos de ansiedade..."
                  value={dadosIdent.agravos} onChange={e=>setDadosIdent({...dadosIdent,agravos:e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 resize-none"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Medidas de controle existentes</label>
                <textarea rows={2} placeholder="Ex: Programa de apoio psicológico, canal de denúncias..."
                  value={dadosIdent.medidas_controle} onChange={e=>setDadosIdent({...dadosIdent,medidas_controle:e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 resize-none"/>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={()=>setModalIdent(false)}
                  className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-3 text-sm font-medium hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={()=>{ setModalIdent(false); exportarPDF(dadosIdent); }}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-bold hover:bg-blue-700">
                  Gerar PDF completo →
                </button>
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
  const [carregandoLaudo, setCarregandoLaudo] = useState(false);

  useEffect(() => {
    fetch(`${API}/avaliacoes/consolidado/filial`, { headers })
      .then(r=>r.json()).then(d=>{ setAvaliacoes(Array.isArray(d)?d:[]); setLoading(false); })
      .catch(()=>setLoading(false));
  }, []);

  async function verResultados(aval) {
    setCarregandoLaudo(true);
    const r = await fetch(`${API}/avaliacoes/${aval.id}/resultados`, { headers });
    const d = await r.json();
    setResultados(d);
    setAvalSel(aval);
    setCarregandoLaudo(false);
  }

  if (avalSel && resultados) return (
    <LaudoCompleto aval={avalSel} resultados={resultados}
      onVoltar={()=>{ setAvalSel(null); setResultados(null); }} usuarioLogado={usuario}/>
  );

  return (
    <Layout titulo="Painel da Filial" subtitulo={usuario.empresa_nome||''}>
      {loading || carregandoLaudo ? (
        <p className="text-sm text-gray-400 text-center py-8">
          {carregandoLaudo ? 'Carregando laudo...' : 'Carregando avaliações...'}
        </p>
      ) : avaliacoes.length === 0 ? (
        <Card className="p-8 text-center text-sm text-gray-400">Nenhuma avaliação disponível ainda.</Card>
      ) : (
        <div className="space-y-4">
          {avaliacoes.map(a=>(
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">{a.setor_nome}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    📅 {new Date(a.criado_em).toLocaleDateString('pt-BR')}
                    {a.data_fim && <span className={`ml-2 font-medium ${new Date(a.data_fim)<new Date()?'text-red-500':'text-amber-600'}`}>
                      · Limite: {new Date(a.data_fim).toLocaleDateString('pt-BR')}
                    </span>}
                  </p>
                </div>
                {a.status==='processada'
                  ? <Btn variant="primary" onClick={()=>verResultados(a)} className="text-xs">Ver laudo completo →</Btn>
                  : <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">Em coleta</span>
                }
              </div>
              <BarraProgresso coletadas={parseInt(a.total_respostas)||0} total={parseInt(a.total_funcionarios)||0}/>
              {a.status==='processada' && (
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {SEMAFORO_CARDS.map(([k,bg])=>(
                    <div key={k} className={`${bg} rounded-lg py-1.5 text-center`}>
                      <p className="text-sm font-bold text-white">{a.contagem?.[k]||0}</p>
                      <p className="text-xs text-white opacity-80">{k}</p>
                    </div>
                  ))}
                </div>
              )}
              {a.top_riscos?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">⚠️ Principais riscos:</p>
                  <div className="flex flex-wrap gap-1">
                    {a.top_riscos.map((r,i)=>(
                      <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                        {r.topico_nome.split(' ').slice(0,3).join(' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}

// ============================================================
// DASHBOARD GESTOR MATRIZ
// ============================================================
function DashboardMatriz({ headers }) {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [empresaSel, setEmpresaSel] = useState(null);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [avalSel, setAvalSel] = useState(null);
  const [resultados, setResultados] = useState(null);
  const [carregandoLaudo, setCarregandoLaudo] = useState(false);

  useEffect(() => {
    fetch(`${API}/avaliacoes/consolidado/matriz`, { headers })
      .then(r=>r.json()).then(d=>{ setDados(d); setLoading(false); })
      .catch(()=>setLoading(false));
  }, []);

  async function verEmpresa(empresa) {
    setEmpresaSel(empresa);
    setAvaliacoes(empresa.avaliacoes||[]);
    setAvalSel(null); setResultados(null);
  }

  async function verResultados(aval) {
    setCarregandoLaudo(true);
    const r = await fetch(`${API}/avaliacoes/${aval.id}/resultados`, { headers });
    const d = await r.json();
    // Adiciona acoes_sugeridas do calculo.js se não vier do banco
    setResultados(d);
    setAvalSel(aval);
    setCarregandoLaudo(false);
  }

  // ---- LAUDO INDIVIDUAL ----
  if (avalSel && resultados) return (
    <LaudoCompleto aval={avalSel} resultados={resultados}
      onVoltar={()=>{ setAvalSel(null); setResultados(null); }} usuarioLogado={usuario}/>
  );

  // ---- AVALIAÇÕES DE UMA FILIAL ----
  if (empresaSel) return (
    <Layout titulo={empresaSel.empresa_nome} subtitulo="Avaliações por setor"
      acoes={<Btn variant="secondary" onClick={()=>{ setEmpresaSel(null); setAvalSel(null); setResultados(null); }}>← Voltar</Btn>}>

      {carregandoLaudo && (
        <p className="text-sm text-gray-400 text-center py-4">Carregando laudo...</p>
      )}

      {/* SEMÁFORO CONSOLIDADO DA FILIAL */}
      <Card className="p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 Resumo consolidado — {empresaSel.empresa_nome}</h3>
        <div className="grid grid-cols-4 gap-3">
          {SEMAFORO_CARDS.map(([k,bg,tc,lc])=>(
            <SemaforoCard key={k} label={k} valor={empresaSel.totais?.[k]||0} bg={bg} textCor={tc} labelCor={lc}/>
          ))}
        </div>
      </Card>

      {/* LISTA DE AVALIAÇÕES */}
      <div className="space-y-3">
        {avaliacoes.length === 0 ? (
          <Card className="p-6 text-sm text-gray-400 text-center">Nenhuma avaliação processada.</Card>
        ) : avaliacoes.map(a=>(
          <Card key={a.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-gray-900">{a.setor_nome}</p>
                <p className="text-xs text-gray-400">
                  📅 {new Date(a.criado_em).toLocaleDateString('pt-BR')}
                  · {a.total_respostas||0} resposta(s)
                </p>
              </div>
              <Btn variant="primary" onClick={()=>verResultados(a)} className="text-xs">
                Ver laudo completo →
              </Btn>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {SEMAFORO_CARDS.map(([k,bg])=>(
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

  // ---- CONSOLIDADO TODAS AS FILIAIS ----
  return (
    <Layout titulo="Painel Matriz" subtitulo="Comparativo entre filiais">
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-8">Carregando dados...</p>
      ) : !dados || dados.empresas?.length === 0 ? (
        <Card className="p-8 text-center text-sm text-gray-400">
          Nenhuma avaliação processada ainda.
        </Card>
      ) : (
        <>
          {/* TOTAIS GERAIS */}
          <Card className="p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 Consolidado Geral — Todas as Filiais</h3>
            <div className="grid grid-cols-4 gap-3">
              {SEMAFORO_CARDS.map(([k,bg,tc,lc])=>(
                <SemaforoCard key={k} label={k} valor={dados.totais_geral?.[k]||0} bg={bg} textCor={tc} labelCor={lc}/>
              ))}
            </div>
          </Card>

          {/* RANKING FILIAIS */}
          <h3 className="text-sm font-semibold text-gray-700 mb-3">🏢 Situação por Filial</h3>
          <div className="space-y-3">
            {[...dados.empresas].sort((a,b)=>
              ((b.totais?.Crítico||0)*4+(b.totais?.Alto||0)*3) -
              ((a.totais?.Crítico||0)*4+(a.totais?.Alto||0)*3)
            ).map(emp=>{
              const temRisco = (emp.totais?.Crítico||0)+(emp.totais?.Alto||0) > 0;
              return (
                <div key={emp.empresa_id}
                  className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-shadow ${temRisco?'border-l-4 border-l-red-400':'border-gray-200'}`}
                  onClick={()=>verEmpresa(emp)}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{emp.empresa_nome}</p>
                      <p className="text-xs text-gray-400">
                        {emp.empresa_tipo==='filial'
                          ? `Filial${emp.matriz_nome?` de ${emp.matriz_nome}`:''}`
                          : emp.empresa_tipo}
                        · {emp.avaliacoes?.length||0} avaliação(ões)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {temRisco && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">⚠️ Atenção</span>}
                      <span className="text-xs text-blue-600 font-medium">Ver detalhes →</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {SEMAFORO_CARDS.map(([k,bg])=>(
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
        </>
      )}
    </Layout>
  );
}

// ============================================================
// ROTEADOR PRINCIPAL
// ============================================================
export default function DashboardGestor() {
  const { token, usuario } = useAuth();
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  if (usuario.papel === 'gestor_matriz') return <DashboardMatriz headers={headers}/>;
  return <DashboardFilial headers={headers}/>;
}
