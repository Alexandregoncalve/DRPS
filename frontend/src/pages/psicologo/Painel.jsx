import { useState, useEffect, useRef } from "react";
import { useAuth, API } from "../../contexts/AuthContext";
import { Layout } from "../../components/Layout";
import { Card, Btn, BadgeRisco, BarraProgresso, Alert, Input, Select } from "../../components/ui";
import CriteriosProbabilidadeModal from "./CriteriosProbabilidadeModal";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";

const SETORES_COMUNS = [
  "Administrativo", "Comercial / Vendas", "Financeiro", "Recursos Humanos",
  "Tecnologia da Informação", "Operacional", "Produção", "Logística",
  "Atendimento / SAC", "Marketing", "Jurídico", "Diretoria / Gestão",
  "Qualidade", "Compras", "Manutenção",
];

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
  const [resultados, setResultados] = useState(null);
  const [probabilidades, setProbabilidades] = useState({});
  const [msg, setMsg] = useState(""); const [erro, setErro] = useState("");
  const [processando, setProcessando] = useState(false);
  const [topicoModalAberto, setTopicoModalAberto] = useState(null);
  const [novaEmp, setNovaEmp] = useState({ nome:"", cnpj:"", total_funcionarios:"", tipo:"matriz", matriz_id:"" });
  const [novoSetor, setNovoSetor] = useState({ nome:"", total_funcionarios:"" });
  const [adicionandoSetor, setAdicionandoSetor] = useState(false);
  const [novaAval, setNovaAval] = useState({ empresa_id:"", setor_id:"", data_fim:"" });
  const [novoUsr, setNovoUsr] = useState({ nome:"", email:"", senha:"", papel:"gestor_matriz", crp:"", empresa_vinculada_id:"" });
  const [empresaSel, setEmpresaSel] = useState(null);
  const [usuarioEditando, setUsuarioEditando] = useState(null);

  const headers = { "Content-Type":"application/json", Authorization:`Bearer ${token}` };

  useEffect(() => { carregarTudo(); }, []);

  async function carregarTudo() {
    const [eR, aR, etR] = await Promise.all([fetch(`${API}/empresas`,{headers}), fetch(`${API}/avaliacoes`,{headers}), fetch(`${API}/empresas/todas`,{headers})]);
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

  function sugerirEmail(nomeEmpresa) {
    const slug = nomeEmpresa
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9]+/g,'')
      .slice(0,30);
    return `gestor.${slug}@nexa.com.br`;
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
    setMsg(`✅ Avaliação criada!\n🔗 ${d.link_anonimo}`);
    setNovaAval({empresa_id:"",setor_id:"",data_fim:""}); carregarTudo(); setView("avaliacoes");
  }

  async function criarUsuario(e) {
    e.preventDefault(); setErro("");
    const r = await fetch(`${API}/usuarios`,{method:"POST",headers,body:JSON.stringify(novoUsr)});
    const d = await r.json();
    if (!r.ok) { setErro(d.erro); return; }
    setMsg(`✅ Usuário "${novoUsr.nome}" criado!`);
    setNovoUsr({nome:"",email:"",senha:"",papel:"gestor_matriz",crp:"",empresa_vinculada_id:""});
    carregarTudo(); setView("usuarios");
  }

  async function salvarEdicaoUsuario(e) {
    e.preventDefault(); setErro("");
    const r = await fetch(`${API}/usuarios/${usuarioEditando.id}`,{method:"PUT",headers,body:JSON.stringify(novoUsr)});
    const d = await r.json();
    if (!r.ok) { setErro(d.erro); return; }
    setMsg(`✅ Usuário "${novoUsr.nome}" atualizado!`);
    setNovoUsr({nome:"",email:"",senha:"",papel:"gestor_matriz",crp:"",empresa_vinculada_id:""});
    setUsuarioEditando(null);
    carregarTudo(); setView("usuarios");
  }

  async function verResultados(aval) {
    setAvalSelecionada(aval);
    setProcessando(true);
    setMsg("");
    try {
      // Busca resultados existentes
      const r = await fetch(`${API}/avaliacoes/${aval.id}/resultados`,{headers});
      const d = await r.json();

      // Inicializa probabilidades
      const p = {};
      for (let i = 1; i <= 13; i++) p[i] = 2;
      d.resultados?.forEach(x => { p[x.topico_num] = x.media_probabilidade || 2; });
      setProbabilidades(p);

      // Se já tem respostas, processa automaticamente
      if (aval.total_respostas > 0) {
        const probs = Object.entries(p).map(([t,v])=>({topico_num:parseInt(t),valor:parseInt(v)}));
        await fetch(`${API}/avaliacoes/${aval.id}/probabilidades`,{method:"POST",headers,body:JSON.stringify({probabilidades:probs})});
        await fetch(`${API}/avaliacoes/${aval.id}/processar`,{method:"POST",headers});
        const r2 = await fetch(`${API}/avaliacoes/${aval.id}/resultados`,{headers});
        setResultados(await r2.json());
      } else {
        setResultados(d);
      }
    } catch(e) {
      setErro("Erro ao carregar resultados.");
    } finally {
      setProcessando(false);
    }
    setView("resultados");
  }

  async function salvarProbabilidades() {
    if (processando) return;
    setProcessando(true);
    setErro("");
    try {
      const probs=Object.entries(probabilidades).map(([t,v])=>({topico_num:parseInt(t),valor:parseInt(v)}));
      const r1 = await fetch(`${API}/avaliacoes/${avalSelecionada.id}/probabilidades`,{method:"POST",headers,body:JSON.stringify({probabilidades:probs})});
      if (!r1.ok) { const d1 = await r1.json(); throw new Error(d1.erro || "Erro ao salvar probabilidades"); }

      const r2 = await fetch(`${API}/avaliacoes/${avalSelecionada.id}/processar`,{method:"POST",headers});
      if (!r2.ok) { const d2 = await r2.json(); throw new Error(d2.erro || "Erro ao processar matriz"); }

      const r3 = await fetch(`${API}/avaliacoes/${avalSelecionada.id}/resultados`,{headers});
      setResultados(await r3.json());
      setMsg("✅ Matriz processada!");
    } catch (e) {
      setErro(e.message);
    } finally {
      setProcessando(false);
    }
  }

  // helpers semáforo
  function semaforoMatriz(v) {
    if (v==='Crítico') return {cor:'bg-red-600 text-white', icone:'🔴', label:'Crítico'};
    if (v==='Alto')    return {cor:'bg-orange-500 text-white', icone:'🟠', label:'Alto'};
    if (v==='Médio')   return {cor:'bg-yellow-400 text-gray-900', icone:'🟡', label:'Médio'};
    if (v==='Baixo')   return {cor:'bg-green-500 text-white', icone:'🟢', label:'Baixo'};
    return {cor:'bg-gray-200 text-gray-600', icone:'⚪', label:v||'—'};
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

  function exportarPDF() {
    if (!resultados?.resultados) return;
    const linhas = [];
    const data = new Date().toLocaleDateString('pt-BR');
    linhas.push('DIAGNÓSTICO DE RISCOS PSICOSSOCIAIS — NR-01');
    linhas.push('');
    linhas.push(`Empresa: ${avalSelecionada.empresa_nome}`);
    linhas.push(`Setor: ${avalSelecionada.setor_nome}`);
    linhas.push(`Data: ${data}`);
    linhas.push(`Respostas coletadas: ${avalSelecionada.total_respostas || '—'}`);
    linhas.push('');
    linhas.push('RESUMO DA MATRIZ DE RISCO');
    linhas.push(`Crítico: ${resultados.contagem?.Crítico||0}  |  Alto: ${resultados.contagem?.Alto||0}  |  Médio: ${resultados.contagem?.Médio||0}  |  Baixo: ${resultados.contagem?.Baixo||0}`);
    linhas.push('');
    linhas.push('CLASSIFICAÇÃO POR TÓPICO');
    linhas.push('─'.repeat(80));
    resultados.resultados.forEach(r => {
      linhas.push(`${r.topico_nome}`);
      linhas.push(`  Gravidade: ${r.classif_gravidade}  |  Probabilidade: ${r.classif_probabilidade}  |  Matriz: ${r.matriz_risco}`);
      linhas.push(`  Fonte: ${r.fonte_geradora}`);
      if (r.acoes_sugeridas?.length > 0 && (r.matriz_risco==='Alto'||r.matriz_risco==='Crítico')) {
        linhas.push('  Ações sugeridas:');
        r.acoes_sugeridas.forEach(a => linhas.push(`    • ${a}`));
      }
      linhas.push('');
    });
    linhas.push('─'.repeat(80));
    linhas.push('Documento gerado pelo Sistema DRPS — NeXa Psicossocial');
    linhas.push(`Gerado em: ${data}`);

    const texto = linhas.join('\n');
    const blob = new Blob([texto], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url;
    a.download = `DRPS_${avalSelecionada.empresa_nome}_${avalSelecionada.setor_nome}_${new Date().toISOString().slice(0,10)}.txt`;
    a.click(); URL.revokeObjectURL(url);
    setMsg('📄 Relatório exportado! Abra o .txt e use Ctrl+P para imprimir/salvar como PDF.');
  }

  // ---- VIEW: RESULTADOS ----
  if (view==="resultados" && avalSelecionada && resultados) {
    const topRiscos = [...(resultados.resultados||[])].sort((a,b)=>{
      const ord = {'Crítico':4,'Alto':3,'Médio':2,'Baixo':1};
      return (ord[b.matriz_risco]||0)-(ord[a.matriz_risco]||0);
    }).slice(0,5);
    const topFortes = [...(resultados.resultados||[])].sort((a,b)=>(a.media_gravidade||5)-(b.media_gravidade||5)).slice(0,5);
    const radarData = (resultados.resultados||[]).map(r=>({
      topico: r.topico_nome.replace(/^(Baixa |Baixo |Má |Maus |Excesso de |Falta de |Trabalho |Eventos )/,'').slice(0,22),
      valor: parseFloat(r.media_gravidade)||0,
    }));
    const linkAval = `${window.location.origin.replace('8080','8080')}/responder/${avalSelecionada.token_anonimo}`;

    return (
    <Layout titulo="Resultados" subtitulo={`${avalSelecionada.setor_nome} · ${avalSelecionada.empresa_nome}`}
      acoes={
        <div className="flex gap-2">
          <Btn variant="secondary" onClick={exportarCSV}>⬇ CSV</Btn>
          <Btn variant="secondary" onClick={exportarPDF}>📄 PDF</Btn>
          <Btn variant="secondary" onClick={()=>setView("avaliacoes")}>← Voltar</Btn>
        </div>
      }>
      {msg && <Alert type="success">{msg}</Alert>}

      {/* SEMÁFORO CONTAGEM */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          ['Crítico', 'bg-red-700',    'text-white',     'text-red-200'],
          ['Alto',    'bg-red-400',    'text-white',     'text-red-50'],
          ['Médio',   'bg-yellow-300', 'text-gray-900',  'text-yellow-800'],
          ['Baixo',   'bg-green-500',  'text-white',     'text-green-50'],
        ].map(([k, bg, numCor, labelCor])=>(
          <div key={k} className={`rounded-xl p-5 text-center ${bg} shadow-sm`}>
            <p className={`text-4xl font-bold ${numCor}`}>{resultados.contagem?.[k]||0}</p>
            <p className={`text-sm font-semibold mt-1 ${labelCor}`}>{k}</p>
          </div>
        ))}
      </div>

      {/* TOP RISCOS + TOP PONTOS FORTES */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">🔴 Top 5 Riscos Prioritários</h3>
          <div className="space-y-2">
            {topRiscos.map(r=>{
              const s = semaforoMatriz(r.matriz_risco);
              return (
                <div key={r.topico_num} className="flex items-center justify-between">
                  <span className="text-xs text-gray-700 truncate flex-1 mr-2">{r.topico_nome}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cor}`}>{s.icone} {s.label}</span>
                </div>
              );
            })}
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

      {/* GRÁFICO RADAR */}
      <Card className="p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">📡 Panorama Geral (Radar)</h3>
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="topico" tick={{fontSize:10}}/>
            <Tooltip formatter={(v)=>[v.toFixed(2),'Gravidade média']}/>
            <Radar name="Gravidade" dataKey="valor" stroke="#0A2647" fill="#0A2647" fillOpacity={0.25}/>
          </RadarChart>
        </ResponsiveContainer>
      </Card>

      {/* TABELA DETALHADA */}
      <Card className="overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100">
            <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Tópico</th>
            <th className="px-4 py-3 text-xs text-gray-400 font-medium">Gravidade</th>
            <th className="px-4 py-3 text-xs text-gray-400 font-medium">Prob.</th>
            <th className="px-4 py-3 text-xs text-gray-400 font-medium">Matriz</th>
            <th className="px-4 py-3 text-xs text-gray-400 font-medium w-28">Definir prob.</th>
          </tr></thead>
          <tbody>
            {resultados.resultados.map(r=>{
              const s = semaforoMatriz(r.matriz_risco);
              return (
              <tr key={r.topico_num} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-700">{r.topico_nome}</td>
                <td className="px-4 py-3 text-center"><span className={`text-xs font-medium ${semaforoGrav(r.classif_gravidade)}`}>{r.classif_gravidade}</span></td>
                <td className="px-4 py-3 text-center"><span className="text-xs text-gray-600">{r.classif_probabilidade}</span></td>
                <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cor}`}>{s.icone} {s.label}</span></td>
                <td className="px-4 py-3 text-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <select value={probabilidades[r.topico_num]||2}
                      onChange={ev=>setProbabilidades({...probabilidades,[r.topico_num]:ev.target.value})}
                      className="border border-gray-200 rounded px-2 py-1 text-xs bg-white text-gray-900 w-full">
                      <option value={1}>1 - Baixa</option><option value={2}>2 - Média</option><option value={3}>3 - Alta</option>
                    </select>
                    <button type="button" onClick={()=>setTopicoModalAberto(r)}
                      className="text-xs bg-blue-50 border border-blue-200 text-blue-700 rounded px-2 py-1 hover:bg-blue-100 w-full whitespace-nowrap">
                      📋 Critérios
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* AÇÕES SUGERIDAS */}
      {resultados.resultados.filter(r=>r.matriz_risco==='Alto'||r.matriz_risco==='Crítico').length > 0 && (
        <Card className="p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">⚡ Plano de Ação — Riscos Prioritários</h3>
          <div className="space-y-4">
            {resultados.resultados.filter(r=>r.matriz_risco==='Alto'||r.matriz_risco==='Crítico').map(r=>{
              const s = semaforoMatriz(r.matriz_risco);
              return (
                <div key={r.topico_num} className="border-l-4 border-orange-400 pl-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cor}`}>{s.icone} {s.label}</span>
                    <span className="text-xs font-semibold text-gray-800">{r.topico_nome}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">Fonte: {r.fonte_geradora}</p>
                  {r.acoes_sugeridas?.length > 0 && (
                    <ul className="text-xs text-gray-700 space-y-0.5 list-disc list-inside">
                      {r.acoes_sugeridas.map((a,i)=><li key={i}>{a}</li>)}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* QR CODE + LINK */}
      <Card className="p-4 mb-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">🔗 Link e QR Code da avaliação</h3>
        <p className="text-xs text-gray-500 mb-3">Compartilhe o link ou QR Code com os colaboradores do setor para responderem anonimamente.</p>
        <div className="flex items-start gap-4">
          <div>
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(linkAval)}`}
              alt="QR Code" className="rounded border border-gray-200"/>
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1">Link direto:</p>
            <div className="flex gap-2 items-center">
              <input readOnly value={linkAval} className="text-xs border border-gray-200 rounded px-2 py-1.5 flex-1 bg-gray-50 text-gray-700"/>
              <Btn variant="secondary" onClick={()=>navigator.clipboard.writeText(linkAval).then(()=>setMsg('✅ Link copiado!'))}>Copiar</Btn>
            </div>
          </div>
        </div>
      </Card>

      {topicoModalAberto && (
        <CriteriosProbabilidadeModal
          avaliacaoId={avalSelecionada.id}
          topicoNum={topicoModalAberto.topico_num}
          topicoNome={topicoModalAberto.topico_nome}
          onFechar={()=>setTopicoModalAberto(null)}
          onAplicar={(sugestao)=>{
            setProbabilidades({...probabilidades,[topicoModalAberto.topico_num]:sugestao});
          }}
        />
      )}
      <div>
        <Btn onClick={salvarProbabilidades} disabled={processando}>
          {processando ? "Processando..." : "Salvar e processar matriz"}
        </Btn>
        <p className="text-xs text-gray-400 mt-2">
          Confirme a probabilidade de cada tópico acima antes de processar. O valor padrão é "2 - Média" até você ajustar.
        </p>
      </div>
    </Layout>
    );
  }


  return (
    <Layout titulo={isAdmin?"Admin":"Psicólogo"} subtitulo={usuario.crp||""}
      acoes={
        <div className="flex gap-2">
          <Btn variant={view==="avaliacoes"?"primary":"secondary"} onClick={()=>setView("avaliacoes")}>Avaliações</Btn>
          <Btn variant={view==="empresas"?"primary":"secondary"} onClick={()=>setView("empresas")}>Empresas</Btn>
          {isAdmin && <Btn variant={view==="usuarios"?"primary":"secondary"} onClick={()=>setView("usuarios")}>Usuários</Btn>}
        </div>
      }>

      {msg && <Alert type="success" >{msg}</Alert>}
      {erro && <Alert type="error">{erro}</Alert>}

      {/* AVALIAÇÕES */}
      {view==="avaliacoes" && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium text-gray-900 text-sm">Avaliações</h2>
            <Btn onClick={()=>setView("nova")}>+ Nova avaliação</Btn>
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
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800">{u.nome}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3 text-center"><BadgeRisco valor={u.papel}/></td>
                    <td className="px-4 py-3 text-center text-xs text-gray-400">{u.empresa_nome||"—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Btn variant="ghost" className="text-xs" onClick={()=>{
                        setUsuarioEditando(u);
                        setNovoUsr({nome:u.nome,email:u.email,senha:"",papel:u.papel,crp:u.crp||"",empresa_vinculada_id:u.empresa_vinculada_id||""});
                        setView("editar_usuario");
                      }}>Editar</Btn>
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
            <div>
              <Input label="E-mail *" required type="email" value={novoUsr.email} onChange={e=>setNovoUsr({...novoUsr,email:e.target.value})}/>
              {["gestor_matriz","gestor_filial"].includes(novoUsr.papel) && novoUsr.empresa_vinculada_id && (
                <p className="text-xs text-gray-400 mt-1">💡 Sugerido automaticamente — edite se quiser usar outro e-mail</p>
              )}
            </div>
            <Input label="Senha *" required type="password" value={novoUsr.senha} onChange={e=>setNovoUsr({...novoUsr,senha:e.target.value})}/>
            <Select label="Perfil *" value={novoUsr.papel} onChange={e=>setNovoUsr({...novoUsr,papel:e.target.value})}>
              <option value="psicologo">Psicólogo</option>
              <option value="gestor_matriz">Gestor Matriz</option>
              <option value="gestor_filial">Gestor Filial</option>
              <option value="admin">Admin NeXa</option>
            </Select>
            {["gestor_matriz","gestor_filial"].includes(novoUsr.papel) && (
              <Select label="Empresa vinculada" value={novoUsr.empresa_vinculada_id}
                onChange={e=>{
                  const empSelecionada = empresasTodas.find(emp=>emp.id===e.target.value);
                  setNovoUsr({
                    ...novoUsr,
                    empresa_vinculada_id:e.target.value,
                    email: empSelecionada ? sugerirEmail(empSelecionada.nome) : novoUsr.email
                  });
                }}>
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
            <Input label={novoUsr.papel==="psicologo" ? "CRP *" : "CRP (opcional)"} placeholder="CRP 00/000000" value={novoUsr.crp} onChange={e=>setNovoUsr({...novoUsr,crp:e.target.value})}/>
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
              A senha deve ter: mínimo 8 caracteres, 1 maiúscula, 1 minúscula, 1 número e 1 símbolo (ex: Empresa@2025).
              O usuário será solicitado a trocar a senha no primeiro acesso.
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
              <option value="admin">Admin NeXa</option>
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
            <div className="flex gap-2 pt-1">
              <Btn type="submit">Salvar alterações</Btn>
              <Btn variant="secondary" onClick={()=>{ setUsuarioEditando(null); setNovoUsr({nome:"",email:"",senha:"",papel:"gestor_matriz",crp:"",empresa_vinculada_id:""}); setView("usuarios"); }}>Cancelar</Btn>
            </div>
          </form>
        </Card>
      )}
    </Layout>
  );
}
