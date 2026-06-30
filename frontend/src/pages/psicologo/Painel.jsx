import { useState, useEffect, useRef } from "react";
import { useAuth, API } from "../../contexts/AuthContext";
import { Layout } from "../../components/Layout";
import { Card, Btn, BadgeRisco, BarraProgresso, Alert, Input, Select } from "../../components/ui";
import CriteriosProbabilidadeModal from "./CriteriosProbabilidadeModal";
import Resultados from "./Resultados";
import ColaboradoresModal from "./ColaboradoresModal";
import Financeiro from "./Financeiro";
import ImportarColaboradoresModal from "./ImportarColaboradoresModal";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";

const SETORES_COMUNS = [
  "Administrativo", "Comercial / Vendas", "Financeiro", "Recursos Humanos",
  "Tecnologia da Informação", "Operacional", "Produção", "Logística",
  "Atendimento / SAC", "Marketing", "Jurídico", "Diretoria / Gestão",
  "Qualidade", "Compras", "Manutenção",
];

// ── Dashboard Gerencial do Admin — Novo Layout ───────────────────────────────
function DashboardAdmin({ avaliacoes, onVerResultados, onNovaAvaliacao, onVerConsolidado, onAbrirColaboradores, onImportar, onReprocessar, headers }) {
  const [carregandoLaudo, setCarregandoLaudo] = useState(false);

  const processadas = avaliacoes.filter(a => a.status === 'processada');
  const contagem = { Crítico: 0, Alto: 0, Médio: 0, Baixo: 0 };
  processadas.forEach(a => {
    if (a.contagem) Object.keys(contagem).forEach(k => { contagem[k] += (a.contagem[k] || 0); });
  });

  const porEmpresa = {};
  processadas.forEach(a => {
    if (!porEmpresa[a.empresa_nome]) porEmpresa[a.empresa_nome] = { nome: a.empresa_nome, avaliacoes: [], contagem: { Crítico:0, Alto:0, Médio:0, Baixo:0 } };
    porEmpresa[a.empresa_nome].avaliacoes.push(a);
    if (a.contagem) Object.keys(porEmpresa[a.empresa_nome].contagem).forEach(k => { porEmpresa[a.empresa_nome].contagem[k] += (a.contagem[k] || 0); });
  });
  const empresas = Object.values(porEmpresa).sort((a,b) =>
    ((b.contagem.Crítico*4 + b.contagem.Alto*3)) - ((a.contagem.Crítico*4 + a.contagem.Alto*3))
  );

  const COR_BADGE = { Crítico: 'bg-red-100 text-red-700', Alto: 'bg-orange-100 text-orange-700', Médio: 'bg-yellow-100 text-yellow-700', Baixo: 'bg-green-100 text-green-700' };
  const COR_SEM = [
    ['Crítico','#7f1d1d','#fca5a5'],
    ['Alto',   '#7c2d12','#fdba74'],
    ['Médio',  '#713f12','#fde68a'],
    ['Baixo',  '#14532d','#86efac'],
  ];

  if (avaliacoes.length === 0) return null;

  return (
    <div className="mb-6">

      {/* 1. VISÃO CONSOLIDADA — topo, mais importante */}
      {processadas.length > 0 && (
        <Card className="p-4 mb-3 border-l-4 border-l-blue-500">
          <div className="mb-3">
            <p className="text-sm font-semibold text-gray-900">Visão consolidada da rede</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {processadas.length} avaliação(ões) processada(s) em {empresas.length} empresa(s)
            </p>
          </div>
          <div className="flex gap-2">
            {COR_SEM.map(([k, bg, tc]) => (
              <div key={k} style={{ background: bg, flex: 1 }} className="rounded-xl py-3 text-center">
                <p style={{ color: tc }} className="text-2xl font-bold">{contagem[k]}</p>
                <p style={{ color: tc }} className="text-xs mt-1 opacity-90">{k}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 2. DUAS COLUNAS — Por empresa + Avaliações individuais */}
      <div className="grid grid-cols-2 gap-3">

        {/* COLUNA ESQUERDA — Por empresa/filial */}
        <Card className="p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Por empresa</p>
          {empresas.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Nenhuma avaliação processada</p>
          ) : (
            <div className="space-y-2">

              {/* LINHA 1: CONSOLIDADO — soma de tudo */}
              <div className="flex items-center justify-between p-2 rounded-lg border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="text-xs font-bold text-blue-800">Consolidado</p>
                  <p className="text-xs text-blue-500 mt-0.5">{processadas.length} setor(es) · todas as empresas</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {['Crítico','Alto','Médio','Baixo'].map(k => contagem[k] > 0 && (
                      <span key={k} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${COR_BADGE[k]}`}>
                        {contagem[k]} {k}
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={async () => {
                    setCarregandoLaudo(true);
                    try {
                      const r = await fetch(`${API}/avaliacoes/consolidado/laudo-rede`, { headers });
                      const d = await r.json();
                      if (!d.erro) onVerConsolidado(d);
                    } catch(e) {}
                    setCarregandoLaudo(false);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-bold flex-shrink-0">
                  {carregandoLaudo ? '...' : 'Ver →'}
                </button>
              </div>

              {/* LINHAS: cada empresa/filial */}
              {empresas.map(emp => (
                <div key={emp.nome} className="flex items-center justify-between p-2 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-xs font-semibold text-gray-800 truncate">{emp.nome}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{emp.avaliacoes.length} setor(es)</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {['Crítico','Alto','Médio','Baixo'].map(k => emp.contagem[k] > 0 && (
                        <span key={k} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${COR_BADGE[k]}`}>
                          {emp.contagem[k]} {k}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => onVerResultados(emp.avaliacoes[0])}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex-shrink-0">
                    Ver →
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* COLUNA DIREITA — Avaliações individuais */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Avaliações individuais</p>
            <div className="flex gap-1">
              <button onClick={onImportar} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded px-2 py-1 hover:bg-indigo-100">📥 Importar</button>
              <Btn onClick={onNovaAvaliacao} className="text-xs py-1 px-2">+ Nova</Btn>
            </div>
          </div>
          {avaliacoes.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Nenhuma avaliação</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {avaliacoes.map(a => (
                <div key={a.id} className="py-2.5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 mr-2">
                      <p className="text-xs font-semibold text-gray-800 truncate">{a.empresa_nome} · {a.setor_nome}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(a.criado_em).toLocaleDateString('pt-BR')}
                        {a.data_fim && <span className={`ml-1 ${new Date(a.data_fim) < new Date() ? 'text-red-500' : 'text-amber-500'}`}>· Limite {new Date(a.data_fim).toLocaleDateString('pt-BR')}</span>}
                      </p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${a.status==='processada'?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700'}`}>
                          {a.status==='processada'?'Processada':'Em coleta'}
                        </span>
                        {a.status==='processada' && ['Crítico','Alto','Médio','Baixo'].map(k => a.contagem?.[k] > 0 && (
                          <span key={k} className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${COR_BADGE[k]}`}>
                            {a.contagem[k]} {k}
                          </span>
                        ))}
                      </div>
                      <div className="mt-1.5">
                        <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, Math.round(((a.respostas_coletadas||0)/(a.setor_total_funcionarios||1))*100))}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{a.respostas_coletadas||0} responderam</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0 mt-0.5">
                      <button onClick={() => onVerResultados(a)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                        Ver →
                      </button>
                      <button onClick={() => onAbrirColaboradores(a)}
                        className="text-xs text-green-600 hover:text-green-800 font-medium">
                        📱 WhatsApp
                      </button>
                      {(a.respostas_coletadas > 0) && (
                        <button onClick={() => onReprocessar(a)}
                          className="text-xs text-amber-600 hover:text-amber-800 font-medium">
                          🔄 Processar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function PainelPrincipal() {
  const { token, usuario } = useAuth();
  const isAdmin = usuario.papel === "admin";
  const [view, setView] = useState("avaliacoes");
  const [empresas, setEmpresas] = useState([]);
  const [empresasTodas, setEmpresasTodas] = useState([]);
  const [setores, setSetores] = useState([]);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [avalSelecionada, setAvalSelecionada] = useState(null);
  const [avalCriada, setAvalCriada] = useState(null);
  const [resultados, setResultados] = useState(null);
  const [laudoConsolidado, setLaudoConsolidado] = useState(null);
  const [modalColaboradores, setModalColaboradores] = useState(null);
  const [modalImportar, setModalImportar] = useState(false); // avaliacao selecionada
  const [probabilidades, setProbabilidades] = useState({});
  const [msg, setMsg] = useState(""); const [erro, setErro] = useState("");
  const [processando, setProcessando] = useState(false);
  const [topicoModalAberto, setTopicoModalAberto] = useState(null);
  const [modalIdentificacao, setModalIdentificacao] = useState(false);
  const [dadosIdentificacao, setDadosIdentificacao] = useState({
    funcoes: '', homens: '', mulheres: '', agravos: '', medidas_controle: ''
  });
  const [novaEmp, setNovaEmp] = useState({ nome:"", cnpj:"", total_funcionarios:"", tipo:"matriz", matriz_id:"" });
  const [novoSetor, setNovoSetor] = useState({ nome:"", total_funcionarios:"" });
  const [adicionandoSetor, setAdicionandoSetor] = useState(false);
  const [novaAval, setNovaAval] = useState({ empresa_id:"", setor_id:"", data_fim:"" });
  const [novoUsr, setNovoUsr] = useState({ nome:"", email:"", senha:"", papel:"gestor_matriz", crp:"", tipo_registro:"crp", numero_registro:"", empresa_vinculada_id:"", forcar_troca:true });
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [empresaSel, setEmpresaSel] = useState(null);
  const [usuarioEditando, setUsuarioEditando] = useState(null);

  const headers = { "Content-Type":"application/json", Authorization:`Bearer ${token}` };

  useEffect(() => { carregarTudo(); }, []);

  async function carregarTudo() {
    const [eR, aR, etR] = await Promise.all([
      fetch(`${API}/empresas`,{headers}),
      fetch(`${API}/avaliacoes`,{headers}),
      fetch(`${API}/empresas/todas`,{headers})
    ]);
    const [emps, avals, empsT] = await Promise.all([eR.json(), aR.json(), etR.json()]);
    setEmpresas(Array.isArray(emps)?emps:[]);
    setEmpresasTodas(Array.isArray(empsT)?empsT:[]);
    setAvaliacoes(Array.isArray(avals)?avals:[]);
    if (isAdmin) { const uR = await fetch(`${API}/usuarios`,{headers}); setUsuarios(await uR.json()); }
  }

  async function carregarSetores(id) {
    if (!id) return setSetores([]);
    const r = await fetch(`${API}/empresas/${id}/setores`,{headers});
    setSetores(await r.json());
  }

  function fmtCNPJ(v) {
    v=v.replace(/\D/g,'');
    if(v.length<=14) v=v.replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1/$2').replace(/(\d{4})(\d)/,'$1-$2');
    return v;
  }

  async function criarEmpresa(e) {
    e.preventDefault(); setErro("");
    const r = await fetch(`${API}/empresas`,{method:"POST",headers,body:JSON.stringify(novaEmp)});
    const d = await r.json();
    if (!r.ok) { setErro(d.erro); return; }
    setMsg(`✅ ${novaEmp.tipo==="filial"?"Filial":"Empresa"} "${novaEmp.nome}" criada!`);
    setNovaEmp({nome:"",cnpj:"",total_funcionarios:"",tipo:"matriz",matriz_id:""});
    setEmpresaSel(null); carregarTudo(); setView("empresas");
  }

  async function adicionarSetor(e) {
    e.preventDefault();
    if (!novaAval.empresa_id) return;
    await fetch(`${API}/empresas/setores`,{method:"POST",headers,body:JSON.stringify({...novoSetor,empresa_id:novaAval.empresa_id})});
    setNovoSetor({nome:"",total_funcionarios:""}); setAdicionandoSetor(false);
    carregarSetores(novaAval.empresa_id);
  }

  async function criarAvaliacao(e) {
    e.preventDefault(); setErro("");
    const r = await fetch(`${API}/avaliacoes`,{method:"POST",headers,body:JSON.stringify(novaAval)});
    const d = await r.json();
    if (!r.ok) { setErro(d.erro); return; }
    // ✅ CORRIGIDO: guarda a avaliação criada e mostra QR Code aqui
    setAvalCriada(d);
    setNovaAval({empresa_id:"",setor_id:"",data_fim:""});
    carregarTudo();
    setView("avaliacao_criada");
  }

  async function criarUsuario(e) {
    e.preventDefault(); setErro("");
    const r = await fetch(`${API}/usuarios`,{method:"POST",headers,body:JSON.stringify(novoUsr)});
    const d = await r.json();
    if (!r.ok) { setErro(d.erro); return; }
    setMsg(`✅ Usuário "${novoUsr.nome}" criado!`);
    setNovoUsr({nome:"",email:"",senha:"",papel:"gestor_matriz",crp:"",tipo_registro:"crp",numero_registro:"",empresa_vinculada_id:"",forcar_troca:true});
    carregarTudo(); setView("usuarios");
  }

  async function salvarEdicaoUsuario(e) {
    e.preventDefault(); setErro("");
    const r = await fetch(`${API}/usuarios/${usuarioEditando.id}`,{method:"PUT",headers,body:JSON.stringify(novoUsr)});
    const d = await r.json();
    if (!r.ok) { setErro(d.erro); return; }
    setMsg(`✅ Usuário "${novoUsr.nome}" atualizado!`);
    setNovoUsr({nome:"",email:"",senha:"",papel:"gestor_matriz",crp:"",tipo_registro:"crp",numero_registro:"",empresa_vinculada_id:""});
    setUsuarioEditando(null);
    carregarTudo(); setView("usuarios");
  }

  async function reprocessar(aval) {
    if (!confirm(`Reprocessar avaliação de ${aval.empresa_nome} · ${aval.setor_nome}?`)) return;
    try {
      const r = await fetch(`${API}/avaliacoes/${aval.id}/processar`, { method:'POST', headers });
      if (r.ok) { setMsg('✅ Processado com sucesso!'); carregarTudo(); }
      else setErro('Erro ao processar. Verifique se há respostas.');
    } catch(e) { setErro(e.message); }
    setTimeout(() => { setMsg(''); setErro(''); }, 3000);
  }

  async function verResultados(aval) {
    setAvalSelecionada(aval);
    setView("resultados");
  }

  async function salvarProbabilidades() {
    if (processando) return;
    setProcessando(true); setErro("");
    try {
      const probs=Object.entries(probabilidades).map(([t,v])=>({topico_num:parseInt(t),valor:parseInt(v)}));
      await fetch(`${API}/avaliacoes/${avalSelecionada.id}/probabilidades`,{method:"POST",headers,body:JSON.stringify({probabilidades:probs})});
      await fetch(`${API}/avaliacoes/${avalSelecionada.id}/processar`,{method:"POST",headers});
      const r3 = await fetch(`${API}/avaliacoes/${avalSelecionada.id}/resultados`,{headers});
      setResultados(await r3.json());
      setMsg("✅ Matriz processada!");
    } catch (e) { setErro(e.message); }
    finally { setProcessando(false); }
  }

  function semaforoMatriz(v) {
    if (v==='Crítico') return {cor:'bg-red-600 text-white', icone:'🔴', label:'Crítico'};
    if (v==='Alto')    return {cor:'bg-orange-500 text-white', icone:'🟠', label:'Alto'};
    if (v==='Médio')   return {cor:'bg-yellow-400 text-gray-900', icone:'🟡', label:'Médio'};
    if (v==='Baixo')   return {cor:'bg-green-500 text-white', icone:'🟢', label:'Baixo'};
    return {cor:'bg-gray-200 text-gray-600', icone:'⬜', label:v||'—'};
  }
  function semaforoGrav(v) {
    if (v==='Alta')   return 'text-red-600 font-semibold';
    if (v==='Média')  return 'text-yellow-600 font-semibold';
    if (v==='Baixa')  return 'text-green-600 font-semibold';
    return 'text-gray-400';
  }

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
    a.download = `DRPS_${avalSelecionada.empresa_nome}_${avalSelecionada.setor_nome}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  async function exportarPDF(ident = {}) {
    if (!resultados?.resultados) return;
    setMsg('⏳ Gerando PDF...');
    let radarImgData = null;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const radarEl = document.getElementById('radar-chart-container');
      if (radarEl) {
        const canvas = await html2canvas(radarEl, { scale: 2, backgroundColor: '#ffffff' });
        radarImgData = canvas.toDataURL('image/png');
      }
    } catch(e) {}
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const data = new Date().toLocaleDateString('pt-BR');
    const margem = 15, largura = 180; let y = 15;
    function linha(texto, tamanho=10, negrito=false, cor=[30,30,30]) {
      doc.setFontSize(tamanho); doc.setFont('helvetica', negrito ? 'bold' : 'normal'); doc.setTextColor(...cor);
      const linhas = doc.splitTextToSize(String(texto), largura);
      linhas.forEach(l => { if (y > 275) { doc.addPage(); y = 15; } doc.text(l, margem, y); y += tamanho * 0.45; }); y += 1;
    }
    function separador(cor=[200,200,200]) {
      doc.setDrawColor(...cor); doc.line(margem, y, margem + largura, y); y += 4;
    }
    doc.setFillColor(10, 38, 71); doc.rect(0, 0, 210, 28, 'F');
    doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont('helvetica','bold');
    doc.text('DIAGNÓSTICO DE RISCOS PSICOSSOCIAIS', margem, 12);
    doc.setFontSize(10); doc.setFont('helvetica','normal');
    doc.text('Conforme NR-01 — NeXa Psicossocial', margem, 19);
    doc.text(`Gerado em: ${data}`, 195, 19, {align:'right'}); y = 36;
    linha('IDENTIFICAÇÃO', 11, true, [10,38,71]); separador([10,38,71]);
    linha(`Empresa: ${avalSelecionada.empresa_nome}`);
    linha(`Setor: ${avalSelecionada.setor_nome}`);
    linha(`Responsável Técnico: ${usuario.nome}${usuario.crp ? ` — CRP: ${usuario.crp}` : ''}`);
    linha(`Data de Elaboração: ${data}`);
    if (ident.funcoes) linha(`Funções/Cargos Avaliados: ${ident.funcoes}`);
    if (ident.homens || ident.mulheres) {
      const total = (parseInt(ident.homens)||0) + (parseInt(ident.mulheres)||0);
      linha(`Trabalhadores: ${total} total (${ident.homens||0} homens / ${ident.mulheres||0} mulheres)`);
    }
    linha(`Respostas coletadas: ${avalSelecionada.total_respostas || '—'}`);
    if (ident.agravos) linha(`Possíveis Agravos à Saúde Mental: ${ident.agravos}`);
    if (ident.medidas_controle) linha(`Medidas de Controle Existentes: ${ident.medidas_controle}`);
    y += 4;
    const conts = [['Crítico', resultados.contagem?.Crítico||0,153,0,0],['Alto',resultados.contagem?.Alto||0,220,80,80],['Médio',resultados.contagem?.Médio||0,202,178,0],['Baixo',resultados.contagem?.Baixo||0,34,139,34]];
    linha('MATRIZ DE RISCO — RESUMO', 11, true, [10,38,71]); separador([10,38,71]);
    const colW = 42;
    conts.forEach(([label, val, r, g, b], i) => {
      const cx = margem + i * (colW + 3);
      doc.setFillColor(r, g, b); doc.roundedRect(cx, y, colW, 16, 3, 3, 'F');
      doc.setTextColor(255,255,255); doc.setFontSize(18); doc.setFont('helvetica','bold');
      doc.text(String(val), cx + colW/2, y + 9, {align:'center'});
      doc.setFontSize(8); doc.setFont('helvetica','normal');
      doc.text(label, cx + colW/2, y + 14, {align:'center'});
    });
    doc.setTextColor(30,30,30); y += 22;
    if (radarImgData) {
      linha('PANORAMA GERAL — RADAR', 11, true, [10,38,71]); separador([10,38,71]);
      doc.addImage(radarImgData, 'PNG', margem, y, largura, 80); y += 86;
    }
    doc.save(`DRPS_${avalSelecionada.empresa_nome}_${avalSelecionada.setor_nome}_${data.replace(/\//g,'-')}.pdf`);
    setMsg('✅ PDF gerado com sucesso!');
  }

  // ── VIEW: AVALIAÇÃO CRIADA (com QR Code) ─────────────────────────────────
  if (view === "avaliacao_criada" && avalCriada) {
    const linkAval = avalCriada.link_anonimo || `${window.location.origin}/responder/${avalCriada.token_anonimo}`;
    return (
      <Layout titulo="Avaliação criada!" subtitulo="Compartilhe o link com os colaboradores">
        <Card className="p-6 max-w-lg">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">✅</div>
            <h2 className="text-lg font-bold text-gray-900">Avaliação criada com sucesso!</h2>
            <p className="text-sm text-gray-500 mt-1">
              Compartilhe o link ou QR Code abaixo com os colaboradores do setor para responderem anonimamente.
            </p>
          </div>

          {/* QR CODE */}
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(linkAval)}`}
                alt="QR Code"
                className="rounded-lg border border-gray-200"
              />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1 font-medium">Link direto:</p>
              <div className="flex gap-2 items-center mb-3">
                <input
                  readOnly
                  value={linkAval}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-2 flex-1 bg-gray-50 text-gray-700"
                />
                <Btn variant="secondary" onClick={() => navigator.clipboard.writeText(linkAval).then(() => setMsg('✅ Link copiado!'))}>
                  Copiar
                </Btn>
              </div>
              <p className="text-xs text-gray-400">
                O QR Code pode ser impresso e afixado no local de trabalho para facilitar o acesso.
              </p>
            </div>
          </div>

          {msg && <Alert type="success">{msg}</Alert>}

          <div className="flex gap-3">
            <Btn onClick={() => { setAvalCriada(null); setView("avaliacoes"); }}>
              Ver avaliações
            </Btn>
            <Btn variant="secondary" onClick={() => { setAvalCriada(null); setView("nova"); }}>
              + Nova avaliação
            </Btn>
          </div>
        </Card>
      </Layout>
    );
  }

  // ── VIEW: RESULTADOS — usa o componente Resultados.jsx completo ────────
  if (view === "resultados" && avalSelecionada) {
    return (
      <Resultados
        avaliacaoId={avalSelecionada.id}
        token={token}
        onVoltar={() => setView("avaliacoes")}
      />
    );
  }

  // ── VIEW: CONSOLIDADO — mesmo componente, tela cheia ─────────────────────
  if (view === "consolidado") {
    return (
      <Resultados
        avaliacaoId="consolidado"
        token={token}
        onVoltar={() => setView("avaliacoes")}
      />
    );
  }

  return (
    <Layout titulo={isAdmin?"Admin":"Psicólogo"} subtitulo={usuario.crp||""}
      acoes={
        <div className="flex gap-2">
          <Btn variant={view==="avaliacoes"?"primary":"secondary"} onClick={()=>setView("avaliacoes")}>Avaliações</Btn>
          <Btn variant={view==="empresas"?"primary":"secondary"} onClick={()=>setView("empresas")}>Empresas</Btn>
          {isAdmin && <Btn variant={view==="usuarios"?"primary":"secondary"} onClick={()=>setView("usuarios")}>Usuários</Btn>}
          {isAdmin && <Btn variant={view==="financeiro"?"primary":"secondary"} onClick={()=>setView("financeiro")}>💰 Financeiro</Btn>}
        </div>
      }>

      {msg && <Alert type="success">{msg}</Alert>}
      {erro && <Alert type="error">{erro}</Alert>}

      {/* AVALIAÇÕES */}
      {view==="avaliacoes" && (
        <div>
          {isAdmin && (
            <DashboardAdmin
              avaliacoes={avaliacoes}
              onVerResultados={verResultados}
              onNovaAvaliacao={() => setView("nova")}
              onVerConsolidado={(d) => { setLaudoConsolidado(d); setView('consolidado'); }}
              onAbrirColaboradores={(a) => setModalColaboradores(a)}
              onImportar={() => setModalImportar(true)}
              onReprocessar={reprocessar}
              headers={headers}
            />
          )}

          {/* Lista simples para psicólogo (não admin) */}
          {!isAdmin && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-medium text-gray-900 text-sm">Avaliações</h2>
                <div className="flex gap-2">
                  <Btn variant="secondary" onClick={()=>setModalImportar(true)}>📥 Importar</Btn>
                  <Btn onClick={()=>setView("nova")}>+ Nova avaliação</Btn>
                </div>
              </div>
              <div className="space-y-3">
                {avaliacoes.length===0 ? <Card className="p-6 text-sm text-gray-400">Nenhuma avaliação.</Card>
                  : avaliacoes.map(a=>(
                    <Card key={a.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{a.empresa_nome} · {a.setor_nome}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            📅 Aberta em: {new Date(a.criado_em).toLocaleDateString("pt-BR")}
                            {a.data_fim && (
                              <span className={`ml-2 font-medium ${new Date(a.data_fim) < new Date() ? 'text-red-500' : 'text-amber-600'}`}>
                                · ⏱ Limite: {new Date(a.data_fim).toLocaleDateString("pt-BR")}
                                {new Date(a.data_fim) < new Date() && ' (encerrada)'}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5"><BadgeRisco valor={a.status}/></p>
                        </div>
                        <Btn variant="ghost" onClick={()=>verResultados(a)} className="text-xs">Ver resultados</Btn>
                      </div>
                      <BarraProgresso coletadas={parseInt(a.respostas_coletadas)||0} total={parseInt(a.setor_total_funcionarios)||0}/>
                    </Card>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* EMPRESAS */}
      {view==="empresas" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-gray-900 text-sm">Empresas</h2>
            <Btn onClick={()=>{ setNovaEmp({nome:"",cnpj:"",total_funcionarios:"",tipo:"matriz",matriz_id:""}); setEmpresaSel(null); setView("cadastrar_empresa"); }}>+ Nova empresa</Btn>
          </div>
          <div className="space-y-3">
            {empresas.length===0 ? <Card className="p-6 text-sm text-gray-400">Nenhuma empresa.</Card>
              : empresas.map(emp=>(
                <Card key={emp.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">{emp.nome}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Matriz</span>
                        {emp.total_filiais>0 && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{emp.total_filiais} filial(is)</span>}
                      </div>
                      {emp.cnpj && <p className="text-xs text-gray-400">{emp.cnpj}</p>}
                      <div className="flex gap-4 mt-1 text-xs text-gray-400">
                        <span>{emp.total_setores} setores</span>
                        <span>{emp.total_funcionarios_setores||0} funcionários</span>
                      </div>
                    </div>
                    <Btn variant="secondary" className="text-xs" onClick={()=>{
                      setEmpresaSel(emp); setNovaEmp({nome:"",cnpj:"",total_funcionarios:"",tipo:"filial",matriz_id:emp.id}); setView("cadastrar_empresa");
                    }}>+ Filial</Btn>
                  </div>
                </Card>
              ))
            }
          </div>
        </div>
      )}

      {/* CADASTRAR EMPRESA/FILIAL */}
      {view==="cadastrar_empresa" && (
        <Card className="p-6 max-w-md">
          <h2 className="font-medium text-gray-900 mb-4">{empresaSel?`Nova filial de ${empresaSel.nome}`:"Nova empresa (matriz)"}</h2>
          <form onSubmit={criarEmpresa} className="space-y-3">
            {!empresaSel && (
              <div><label className="text-xs text-gray-500 block mb-1">Tipo</label>
                <div className="flex gap-3">
                  {["matriz","filial"].map(t=>(
                    <label key={t} className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer text-sm transition-all ${novaEmp.tipo===t?"border-blue-500 bg-blue-50 text-blue-800":"border-gray-200 text-gray-600"}`}>
                      <input type="radio" name="tipo" value={t} checked={novaEmp.tipo===t} onChange={()=>setNovaEmp({...novaEmp,tipo:t})} className="sr-only"/>
                      {t==="matriz"?"🏢 Matriz":"🏬 Filial"}
                    </label>
                  ))}
                </div>
              </div>
            )}
            {novaEmp.tipo==="filial" && !empresaSel && (
              <Select label="Empresa matriz *" required value={novaEmp.matriz_id} onChange={e=>setNovaEmp({...novaEmp,matriz_id:e.target.value})}>
                <option value="">Selecione</option>
                {empresas.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}
              </Select>
            )}
            <Input label="Nome *" required placeholder={novaEmp.tipo==="filial"?"Ex: Filial Porto Alegre":"Ex: Empresa Ltda"} value={novaEmp.nome} onChange={e=>setNovaEmp({...novaEmp,nome:e.target.value})}/>
            <Input label="CNPJ" placeholder="00.000.000/0001-00" value={novaEmp.cnpj} maxLength={18} onChange={e=>setNovaEmp({...novaEmp,cnpj:fmtCNPJ(e.target.value)})}/>
            <Input label="Total de funcionários" type="number" min="1" placeholder="Ex: 50" value={novaEmp.total_funcionarios} onChange={e=>setNovaEmp({...novaEmp,total_funcionarios:e.target.value})}/>
            <div className="flex gap-2 pt-1">
              <Btn type="submit">Criar {novaEmp.tipo==="filial"?"filial":"empresa"}</Btn>
              <Btn variant="secondary" onClick={()=>{ setEmpresaSel(null); setView("empresas"); }}>Cancelar</Btn>
            </div>
          </form>
        </Card>
      )}

      {/* NOVA AVALIAÇÃO */}
      {view==="nova" && (
        <Card className="p-6 max-w-md">
          <h2 className="font-medium text-gray-900 mb-4">Nova avaliação</h2>
          <div className="space-y-3">
            <Select label="Empresa *" required value={novaAval.empresa_id}
              onChange={e=>{ setNovaAval({...novaAval,empresa_id:e.target.value,setor_id:""}); carregarSetores(e.target.value); setAdicionandoSetor(false); }}>
              <option value="">Selecione</option>
              {empresasTodas.filter(e=>e.tipo==="matriz").map(matriz=>(
                <optgroup key={matriz.id} label={matriz.nome}>
                  <option value={matriz.id}>{matriz.nome} (matriz)</option>
                  {empresasTodas.filter(f=>f.matriz_id===matriz.id).map(filial=>(
                    <option key={filial.id} value={filial.id}>↳ {filial.nome}</option>
                  ))}
                </optgroup>
              ))}
            </Select>
            {novaAval.empresa_id && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-gray-500">Setor *</label>
                  <button type="button" onClick={()=>setAdicionandoSetor(!adicionandoSetor)} className="text-xs text-blue-600 hover:underline">
                    {adicionandoSetor?"Cancelar":"+ Novo setor"}
                  </button>
                </div>
                {adicionandoSetor && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-2">
                    <form onSubmit={adicionarSetor} className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-1.5">Setores comuns (clique para usar)</p>
                        <div className="flex flex-wrap gap-1.5">
                          {SETORES_COMUNS.map(s => (
                            <button key={s} type="button"
                              onClick={() => setNovoSetor({ ...novoSetor, nome: s })}
                              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${novoSetor.nome===s ? "border-blue-500 bg-blue-100 text-blue-800" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"}`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Input required placeholder="Ou digite um nome personalizado" value={novoSetor.nome} onChange={e=>setNovoSetor({...novoSetor,nome:e.target.value})}/>
                      <Input type="number" min="1" placeholder="Nº de funcionários" value={novoSetor.total_funcionarios} onChange={e=>setNovoSetor({...novoSetor,total_funcionarios:e.target.value})}/>
                      <Btn type="submit" className="text-xs py-1.5">Adicionar</Btn>
                    </form>
                  </div>
                )}
                {setores.length===0 ? <p className="text-xs text-gray-400 py-2">Nenhum setor. Adicione acima.</p>
                  : <div className="space-y-2">{setores.map(s=>(
                    <label key={s.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${novaAval.setor_id===s.id?"border-blue-500 bg-blue-50":"border-gray-200 hover:border-gray-300"}`}>
                      <input type="radio" name="setor" value={s.id} checked={novaAval.setor_id===s.id} onChange={()=>setNovaAval({...novaAval,setor_id:s.id})} className="text-blue-600"/>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{s.nome}</p>
                        <BarraProgresso coletadas={parseInt(s.respostas_coletadas)||0} total={parseInt(s.total_funcionarios)||0}/>
                      </div>
                    </label>
                  ))}</div>
                }
              </div>
            )}
            <Input label="Data de encerramento" type="date" value={novaAval.data_fim} onChange={e=>setNovaAval({...novaAval,data_fim:e.target.value})}/>
            <div className="flex gap-2 pt-1">
              <Btn onClick={criarAvaliacao} disabled={!novaAval.empresa_id||!novaAval.setor_id}>Criar e gerar link</Btn>
              <Btn variant="secondary" onClick={()=>setView("avaliacoes")}>Cancelar</Btn>
            </div>
          </div>
        </Card>
      )}

      {/* USUÁRIOS */}
      {view==="usuarios" && isAdmin && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-gray-900 text-sm">Usuários</h2>
            <Btn onClick={()=>setView("novo_usuario")}>+ Novo usuário</Btn>
          </div>
          <Card className="overflow-hidden">
            {usuarios.length===0 ? <p className="text-sm text-gray-400 p-6">Nenhum usuário.</p>
              : <table className="w-full text-sm">
                <thead><tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Nome</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">E-mail</th>
                  <th className="px-4 py-3 text-xs text-gray-400 font-medium">Perfil</th>
                  <th className="px-4 py-3 text-xs text-gray-400 font-medium">Empresa</th>
                  <th className="px-4 py-3"></th>
                </tr></thead>
                <tbody>{usuarios.map(u=>(
                  <tr key={u.id} className={`border-b border-gray-50 hover:bg-gray-50 ${u.ativo===false?'opacity-50':''}`}>
                    <td className="px-4 py-3 text-gray-800">
                      {u.nome}
                      {u.ativo===false && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Desabilitado</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3 text-center"><BadgeRisco valor={u.papel}/></td>
                    <td className="px-4 py-3 text-center text-xs text-gray-400">{u.empresa_nome||"—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        {u.ativo!==false && (
                          <Btn variant="ghost" className="text-xs" onClick={()=>{
                            setUsuarioEditando(u);
                            setNovoUsr({nome:u.nome,email:u.email,senha:"",papel:u.papel,crp:u.crp||"",tipo_registro:u.tipo_registro||"crp",numero_registro:u.numero_registro||"",empresa_vinculada_id:u.empresa_vinculada_id||"",forcar_troca:false});
                            setView("editar_usuario");
                          }}>Editar</Btn>
                        )}
                        {u.ativo!==false && (
                          <Btn variant="ghost" className="text-xs text-orange-600" onClick={async()=>{
                            if (!confirm(`Resetar senha de "${u.nome}" para Senha@010203?`)) return;
                            const r = await fetch(`${API}/usuarios/${u.id}`,{
                              method:"PUT", headers,
                              body:JSON.stringify({nome:u.nome,email:u.email,papel:u.papel,crp:u.crp||"",empresa_vinculada_id:u.empresa_vinculada_id||"",senha:"Senha@010203",forcar_troca:true})
                            });
                            if (r.ok) setMsg(`✅ Senha de "${u.nome}" resetada para Senha@010203`);
                            else setErro("Erro ao resetar senha");
                          }}>🔑 Reset</Btn>
                        )}
                        {u.id !== usuario.id && (
                          u.ativo===false
                          ? <Btn variant="ghost" className="text-xs text-green-600" onClick={async()=>{
                              const r = await fetch(`${API}/usuarios/${u.id}/ativo`,{method:"PATCH",headers,body:JSON.stringify({ativo:true})});
                              if (r.ok) { setMsg(`✅ "${u.nome}" reativado!`); carregarTudo(); }
                              else setErro("Erro ao reativar usuário");
                            }}>✅ Reativar</Btn>
                          : <Btn variant="ghost" className="text-xs text-red-600" onClick={async()=>{
                              if (!confirm(`Desabilitar "${u.nome}"? Ele não conseguirá mais fazer login.`)) return;
                              const r = await fetch(`${API}/usuarios/${u.id}/ativo`,{method:"PATCH",headers,body:JSON.stringify({ativo:false})});
                              if (r.ok) { setMsg(`⊘ "${u.nome}" desabilitado!`); carregarTudo(); }
                              else setErro("Erro ao desabilitar usuário");
                            }}>⊘ Desabilitar</Btn>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            }
          </Card>
        </div>
      )}

      {/* NOVO USUÁRIO */}
      {view==="novo_usuario" && isAdmin && (
        <Card className="p-6 max-w-md">
          <h2 className="font-medium text-gray-900 mb-4">Novo usuário</h2>
          <form onSubmit={criarUsuario} className="space-y-3">
            <Input label="Nome *" required value={novoUsr.nome} onChange={e=>setNovoUsr({...novoUsr,nome:e.target.value})}/>
            <Input label="E-mail *" required type="email" value={novoUsr.email} onChange={e=>setNovoUsr({...novoUsr,email:e.target.value})}/>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Senha *</label>
              <div className="relative">
                <input
                  type={mostrarSenha ? "text" : "password"}
                  required
                  placeholder="Senha@010203 (padrão)"
                  value={novoUsr.senha}
                  onChange={e=>setNovoUsr({...novoUsr,senha:e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-20"
                />
                <button type="button"
                  onMouseDown={e=>{ e.preventDefault(); setMostrarSenha(v=>!v); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:underline">
                  {mostrarSenha ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Deixe em branco para usar a senha padrão: <span className="font-mono">Senha@010203</span>
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={novoUsr.forcar_troca}
                onChange={e=>setNovoUsr({...novoUsr,forcar_troca:e.target.checked})}
                className="w-4 h-4 text-blue-600 rounded"/>
              <span className="text-sm text-gray-700">Forçar troca de senha no primeiro acesso</span>
            </label>
            <Select label="Perfil *" value={novoUsr.papel} onChange={e=>setNovoUsr({...novoUsr,papel:e.target.value})}>
              <option value="psicologo">Psicólogo</option>
              <option value="gestor_matriz">Gestor Matriz</option>
              <option value="gestor_filial">Gestor Filial</option>
            </Select>
            {["gestor_matriz","gestor_filial"].includes(novoUsr.papel) && (
              <Select label="Empresa vinculada" value={novoUsr.empresa_vinculada_id}
                onChange={e=>setNovoUsr({...novoUsr,empresa_vinculada_id:e.target.value})}>
                <option value="">Selecione</option>
                {empresasTodas.filter(e=>e.tipo==="matriz").map(matriz=>(
                  <optgroup key={matriz.id} label={matriz.nome}>
                    <option value={matriz.id}>{matriz.nome} (matriz)</option>
                    {empresasTodas.filter(f=>f.matriz_id===matriz.id).map(filial=>(
                      <option key={filial.id} value={filial.id}>↳ {filial.nome}</option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            )}

            {/* Perfil profissional — define o tipo de documento automaticamente */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tipo de registro profissional *
                <span className="ml-1 text-gray-400 font-normal">(define o tipo de laudo automaticamente)</span>
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {[
                  { value:"crp",   label:"🧠 Psicólogo — CRP",           placeholder:"CRP 00/000000" },
                  { value:"crea",  label:"⚙️ Eng. Segurança — CREA",      placeholder:"CREA 00000-D/UF" },
                  { value:"cft",   label:"🦺 Técnico SST — CFT",          placeholder:"CFT 000000" },
                  { value:"crm",   label:"🏥 Médico do Trabalho — CRM",   placeholder:"CRM UF 000000" },
                  { value:"rh",    label:"👥 Profissional de RH",         placeholder:"Registro (opcional)" },
                  { value:"outro", label:"📋 Outro habilitado",            placeholder:"Registro (opcional)" },
                ].map(op => (
                  <label key={op.value} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs transition-colors ${novoUsr.tipo_registro===op.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                    <input type="radio" name="tipo_registro_novo" value={op.value}
                      checked={novoUsr.tipo_registro===op.value}
                      onChange={() => setNovoUsr({...novoUsr, tipo_registro:op.value, crp: op.value==="crp" ? novoUsr.crp : ""})}
                      className="hidden" />
                    {op.label}
                  </label>
                ))}
              </div>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={[
                  { value:"crp",   placeholder:"CRP 00/000000" },
                  { value:"crea",  placeholder:"CREA 00000-D/UF" },
                  { value:"cft",   placeholder:"CFT 000000" },
                  { value:"crm",   placeholder:"CRM UF 000000" },
                  { value:"rh",    placeholder:"Número de registro (opcional)" },
                  { value:"outro", placeholder:"Número de registro (opcional)" },
                ].find(o=>o.value===novoUsr.tipo_registro)?.placeholder || "Número de registro"}
                value={novoUsr.tipo_registro==="crp" ? novoUsr.crp : novoUsr.numero_registro}
                onChange={e => novoUsr.tipo_registro==="crp"
                  ? setNovoUsr({...novoUsr, crp:e.target.value, numero_registro:e.target.value})
                  : setNovoUsr({...novoUsr, numero_registro:e.target.value})}
              />
              <p className="text-xs text-gray-400 mt-1">
                {novoUsr.tipo_registro==="crp" && "→ Laudo será: Relatório Técnico Psicológico (padrão CFP 06/2019)"}
                {["crea","cft","crm"].includes(novoUsr.tipo_registro) && "→ Laudo será: Relatório Técnico de Avaliação de Riscos Psicossociais"}
                {novoUsr.tipo_registro==="rh" && "→ Laudo será: Relatório de Diagnóstico de Fatores de Risco Psicossociais"}
                {novoUsr.tipo_registro==="outro" && "→ Laudo será: Diagnóstico de Riscos Psicossociais (DRPS)"}
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <Btn type="submit">Criar usuário</Btn>
              <Btn variant="secondary" onClick={()=>setView("usuarios")}>Cancelar</Btn>
            </div>
          </form>
        </Card>
      )}

      {/* EDITAR USUÁRIO */}
      {view==="editar_usuario" && isAdmin && usuarioEditando && (
        <Card className="p-6 max-w-md">
          <h2 className="font-medium text-gray-900 mb-4">Editar usuário</h2>
          <form onSubmit={salvarEdicaoUsuario} className="space-y-3">
            <Input label="Nome *" required value={novoUsr.nome} onChange={e=>setNovoUsr({...novoUsr,nome:e.target.value})}/>
            <Input label="E-mail *" required type="email" value={novoUsr.email} onChange={e=>setNovoUsr({...novoUsr,email:e.target.value})}/>
            <div>
              <Input label="Nova senha" type="password" placeholder="Deixe em branco para manter a atual" value={novoUsr.senha} onChange={e=>setNovoUsr({...novoUsr,senha:e.target.value})}/>
              <p className="text-xs text-gray-400 mt-1">Preencha apenas se quiser alterar a senha</p>
            </div>
            <Select label="Perfil *" value={novoUsr.papel} onChange={e=>setNovoUsr({...novoUsr,papel:e.target.value})}>
              <option value="psicologo">Psicólogo</option>
              <option value="gestor_matriz">Gestor Matriz</option>
              <option value="gestor_filial">Gestor Filial</option>
            </Select>
            {["gestor_matriz","gestor_filial"].includes(novoUsr.papel) && (
              <Select label="Empresa vinculada" value={novoUsr.empresa_vinculada_id}
                onChange={e=>setNovoUsr({...novoUsr,empresa_vinculada_id:e.target.value})}>
                <option value="">Selecione</option>
                {empresasTodas.filter(e=>e.tipo==="matriz").map(matriz=>(
                  <optgroup key={matriz.id} label={matriz.nome}>
                    <option value={matriz.id}>{matriz.nome} (matriz)</option>
                    {empresasTodas.filter(f=>f.matriz_id===matriz.id).map(filial=>(
                      <option key={filial.id} value={filial.id}>↳ {filial.nome}</option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            )}
            <Input label="CRP (opcional)" placeholder="CRP 00/000000" value={novoUsr.crp} onChange={e=>setNovoUsr({...novoUsr,crp:e.target.value})}/>

            {/* Perfil profissional */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tipo de registro profissional
                <span className="ml-1 text-gray-400 font-normal">(define o tipo de laudo automaticamente)</span>
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {[
                  { value:"crp",   label:"🧠 Psicólogo — CRP" },
                  { value:"crea",  label:"⚙️ Eng. Segurança — CREA" },
                  { value:"cft",   label:"🦺 Técnico SST — CFT" },
                  { value:"crm",   label:"🏥 Médico do Trabalho — CRM" },
                  { value:"rh",    label:"👥 Profissional de RH" },
                  { value:"outro", label:"📋 Outro habilitado" },
                ].map(op => (
                  <label key={op.value} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs transition-colors ${novoUsr.tipo_registro===op.value ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                    <input type="radio" name="tipo_registro_edit" value={op.value}
                      checked={novoUsr.tipo_registro===op.value}
                      onChange={() => setNovoUsr({...novoUsr, tipo_registro:op.value})}
                      className="hidden" />
                    {op.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {novoUsr.tipo_registro==="crp" && "→ Laudo: Relatório Técnico Psicológico (padrão CFP 06/2019)"}
                {["crea","cft","crm"].includes(novoUsr.tipo_registro) && "→ Laudo: Relatório Técnico de Avaliação de Riscos Psicossociais"}
                {novoUsr.tipo_registro==="rh" && "→ Laudo: Relatório de Diagnóstico de Fatores de Risco Psicossociais"}
                {novoUsr.tipo_registro==="outro" && "→ Laudo: Diagnóstico de Riscos Psicossociais (DRPS)"}
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <Btn type="submit">Salvar alterações</Btn>
              <Btn variant="secondary" onClick={()=>{ setUsuarioEditando(null); setNovoUsr({nome:"",email:"",senha:"",papel:"gestor_matriz",crp:"",tipo_registro:"crp",numero_registro:"",empresa_vinculada_id:""}); setView("usuarios"); }}>Cancelar</Btn>
            </div>
          </form>
        </Card>
      )}

      {/* FINANCEIRO */}
      {view==="financeiro" && isAdmin && (
        <Financeiro token={token} />
      )}

      {/* MODAL COLABORADORES WHATSAPP */}
      {modalColaboradores && (
        <ColaboradoresModal
          avaliacao={modalColaboradores}
          token={token}
          onFechar={() => setModalColaboradores(null)}
        />
      )}

      {/* MODAL IMPORTAR COLABORADORES */}
      {modalImportar && (
        <ImportarColaboradoresModal
          empresas={empresasTodas}
          token={token}
          onFechar={() => setModalImportar(false)}
          onConcluido={() => { setModalImportar(false); carregarTudo(); }}
        />
      )}
    </Layout>
  );
}
