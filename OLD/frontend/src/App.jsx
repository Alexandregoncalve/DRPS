import { useState, useEffect, createContext, useContext } from "react";

const AuthContext = createContext(null);
const API = "/api";
function useAuth() { return useContext(AuthContext); }

function BadgeRisco({ valor }) {
  const cores = {
    Baixo: "bg-green-100 text-green-800", Médio: "bg-yellow-100 text-yellow-800",
    Alto: "bg-orange-100 text-orange-800", Crítico: "bg-red-100 text-red-800",
    Pendente: "bg-gray-100 text-gray-600", "Não avaliado": "bg-gray-100 text-gray-500",
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cores[valor] || "bg-gray-100 text-gray-600"}`}>{valor}</span>;
}

function BarraProgresso({ coletadas, total }) {
  const pct = total > 0 ? Math.min(100, (coletadas / total) * 100) : 0;
  const cor = pct >= 100 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : "bg-yellow-400";
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{coletadas} responderam</span>
        <span>{total > 0 ? `${total - coletadas} restantes` : "sem limite"}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div className={`${cor} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Login({ onLogin }) {
  const [form, setForm] = useState({ email: "", senha: "" });
  const [erro, setErro] = useState(""); const [loading, setLoading] = useState(false);
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setErro("");
    try {
      const r = await fetch(`${API}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.erro);
      localStorage.setItem("drps_token", data.token);
      localStorage.setItem("drps_usuario", JSON.stringify(data.usuario));
      onLogin(data.token, data.usuario);
    } catch (e) { setErro(e.message); } finally { setLoading(false); }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl border border-gray-200 p-8 w-full max-w-sm shadow-sm">
        <h1 className="text-xl font-medium text-gray-900 mb-1">DRPS</h1>
        <p className="text-sm text-gray-500 mb-6">Diagnóstico de Riscos Psicossociais</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="text-xs text-gray-500 block mb-1">E-mail</label>
            <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="psi@drps.com" /></div>
          <div><label className="text-xs text-gray-500 block mb-1">Senha</label>
            <input type="password" required value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="••••••••" /></div>
          {erro && <p className="text-xs text-red-600">{erro}</p>}
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? "Entrando..." : "Entrar"}</button>
        </form>
      </div>
    </div>
  );
}

function Dashboard() {
  const { token, usuario, logout } = useAuth();
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [setores, setSetores] = useState([]);
  const [view, setView] = useState("avaliacoes");
  const [novaEmp, setNovaEmp] = useState({ nome: "", cnpj: "", total_funcionarios: "" });
  const [novaAval, setNovaAval] = useState({ empresa_id: "", setor_id: "", data_fim: "" });
  const [novoSetor, setNovoSetor] = useState({ nome: "", total_funcionarios: "" });
  const [adicionandoSetor, setAdicionandoSetor] = useState(false);
  const [avalSelecionada, setAvalSelecionada] = useState(null);
  const [resultados, setResultados] = useState(null);
  const [probabilidades, setProbabilidades] = useState({});
  const [msg, setMsg] = useState("");

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  useEffect(() => { carregarAvaliacoes(); carregarEmpresas(); }, []);

  async function carregarAvaliacoes() {
    const r = await fetch(`${API}/avaliacoes`, { headers });
    setAvaliacoes(await r.json());
  }
  async function carregarEmpresas() {
    const r = await fetch(`${API}/empresas`, { headers });
    setEmpresas(await r.json());
  }
  async function carregarSetores(empresaId) {
    if (!empresaId) return setSetores([]);
    const r = await fetch(`${API}/empresas/${empresaId}/setores`, { headers });
    setSetores(await r.json());
  }

  function formatarCNPJ(v) {
    v = v.replace(/\D/g, '');
    if (v.length <= 14) {
      v = v.replace(/^(\d{2})(\d)/, '$1.$2')
           .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
           .replace(/\.(\d{3})(\d)/, '.$1/$2')
           .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return v;
  }

  async function criarEmpresa(e) {
    e.preventDefault();
    await fetch(`${API}/empresas`, { method: "POST", headers, body: JSON.stringify(novaEmp) });
    setMsg("✅ Empresa criada!");
    setNovaEmp({ nome: "", cnpj: "", total_funcionarios: "" });
    carregarEmpresas();
    setView("avaliacoes");
  }

  async function adicionarSetor(e) {
    e.preventDefault();
    if (!novaAval.empresa_id) return;
    await fetch(`${API}/setores`, { method: "POST", headers, body: JSON.stringify({ ...novoSetor, empresa_id: novaAval.empresa_id }) });
    setNovoSetor({ nome: "", total_funcionarios: "" });
    setAdicionandoSetor(false);
    carregarSetores(novaAval.empresa_id);
  }

  async function criarAvaliacao(e) {
    e.preventDefault();
    const r = await fetch(`${API}/avaliacoes`, { method: "POST", headers, body: JSON.stringify(novaAval) });
    const data = await r.json();
    setMsg(`✅ Avaliação criada! Link: ${data.link_anonimo}`);
    setNovaAval({ empresa_id: "", setor_id: "", data_fim: "" });
    carregarAvaliacoes();
    setView("avaliacoes");
  }

  async function verResultados(aval) {
    setAvalSelecionada(aval);
    const r = await fetch(`${API}/avaliacoes/${aval.id}/resultados`, { headers });
    const data = await r.json();
    setResultados(data);
    const initProb = {};
    data.resultados.forEach(res => { initProb[res.topico_num] = res.media_probabilidade || 2; });
    setProbabilidades(initProb);
    setView("resultados");
  }

  async function salvarProbabilidades() {
    const probs = Object.entries(probabilidades).map(([topico_num, valor]) => ({ topico_num: parseInt(topico_num), valor: parseInt(valor) }));
    await fetch(`${API}/avaliacoes/${avalSelecionada.id}/probabilidades`, { method: "POST", headers, body: JSON.stringify({ probabilidades: probs }) });
    await fetch(`${API}/avaliacoes/${avalSelecionada.id}/processar`, { method: "POST", headers });
    const r = await fetch(`${API}/avaliacoes/${avalSelecionada.id}/resultados`, { headers });
    setResultados(await r.json());
    setMsg("✅ Resultados processados!");
  }

  if (view === "resultados" && avalSelecionada && resultados) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-medium text-gray-900">DRPS — Resultados</h1>
            <p className="text-xs text-gray-500">{avalSelecionada.setor_nome} · {avalSelecionada.empresa_nome}</p>
          </div>
          <button onClick={() => setView("avaliacoes")} className="text-sm text-blue-600 hover:underline">← Voltar</button>
        </header>
        <div className="max-w-4xl mx-auto p-6">
          {msg && <div className="bg-green-50 text-green-800 rounded-lg p-3 text-sm mb-4">{msg}</div>}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {Object.entries(resultados.contagem).map(([k, v]) => (
              <div key={k} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-2xl font-medium text-gray-900">{v}</p>
                <p className="text-xs text-gray-500 mt-1">{k}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Tópico</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Gravidade</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Probabilidade</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium">Matriz</th>
                <th className="px-4 py-3 text-xs text-gray-500 font-medium w-28">Prob. (1-3)</th>
              </tr></thead>
              <tbody>
                {resultados.resultados.map(r => (
                  <tr key={r.topico_num} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 text-xs">{r.topico_nome}</td>
                    <td className="px-4 py-3 text-center"><BadgeRisco valor={r.classif_gravidade} /></td>
                    <td className="px-4 py-3 text-center"><BadgeRisco valor={r.classif_probabilidade} /></td>
                    <td className="px-4 py-3 text-center"><BadgeRisco valor={r.matriz_risco} /></td>
                    <td className="px-4 py-3 text-center">
                      <select value={probabilidades[r.topico_num] || 2}
                        onChange={ev => setProbabilidades({ ...probabilidades, [r.topico_num]: ev.target.value })}
                        className="border border-gray-200 rounded px-2 py-1 text-xs">
                        <option value={1}>1 - Baixa</option>
                        <option value={2}>2 - Média</option>
                        <option value={3}>3 - Alta</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={salvarProbabilidades} className="bg-blue-600 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-blue-700">
            Salvar probabilidades e processar matriz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div><h1 className="font-medium text-gray-900">DRPS</h1>
          <p className="text-xs text-gray-500">{usuario.nome} · {usuario.crp}</p></div>
        <div className="flex gap-3">
          <button onClick={() => setView("empresa")} className="text-sm text-gray-600 hover:text-gray-900">+ Empresa</button>
          <button onClick={() => setView("nova")} className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm hover:bg-blue-700">+ Nova avaliação</button>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-600">Sair</button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6">
        {msg && <div className="bg-blue-50 text-blue-800 rounded-lg p-3 text-sm mb-4 break-all">{msg}</div>}

        {/* FORMULÁRIO NOVA EMPRESA */}
        {view === "empresa" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 max-w-md">
            <h2 className="font-medium text-gray-900 mb-4">Nova empresa</h2>
            <form onSubmit={criarEmpresa} className="space-y-3">
              <div><label className="text-xs text-gray-500 block mb-1">Nome da empresa *</label>
                <input required placeholder="Ex: Empresa Ltda" value={novaEmp.nome}
                  onChange={e => setNovaEmp({ ...novaEmp, nome: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="text-xs text-gray-500 block mb-1">CNPJ</label>
                <input placeholder="00.000.000/0001-00" value={novaEmp.cnpj}
                  onChange={e => setNovaEmp({ ...novaEmp, cnpj: formatarCNPJ(e.target.value) })} maxLength={18}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="text-xs text-gray-500 block mb-1">Total de funcionários</label>
                <input type="number" min="1" placeholder="Ex: 50" value={novaEmp.total_funcionarios}
                  onChange={e => setNovaEmp({ ...novaEmp, total_funcionarios: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-700">Criar empresa</button>
                <button type="button" onClick={() => setView("avaliacoes")} className="border border-gray-200 text-gray-600 rounded-lg px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
              </div>
            </form>
          </div>
        )}

        {/* FORMULÁRIO NOVA AVALIAÇÃO */}
        {view === "nova" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6 max-w-md">
            <h2 className="font-medium text-gray-900 mb-4">Nova avaliação</h2>
            <div className="space-y-3">
              <div><label className="text-xs text-gray-500 block mb-1">Empresa *</label>
                <select required value={novaAval.empresa_id}
                  onChange={e => { setNovaAval({ ...novaAval, empresa_id: e.target.value, setor_id: "" }); carregarSetores(e.target.value); setAdicionandoSetor(false); }}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="">Selecione a empresa</option>
                  {empresas.map(emp => <option key={emp.id} value={emp.id}>{emp.nome}</option>)}
                </select></div>

              {/* SETORES REATIVOS */}
              {novaAval.empresa_id && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-500">Setor *</label>
                    <button type="button" onClick={() => setAdicionandoSetor(!adicionandoSetor)}
                      className="text-xs text-blue-600 hover:underline">
                      {adicionandoSetor ? "Cancelar" : "+ Novo setor"}
                    </button>
                  </div>

                  {/* Formulário inline de novo setor */}
                  {adicionandoSetor && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-2">
                      <form onSubmit={adicionarSetor} className="space-y-2">
                        <input required placeholder="Nome do setor" value={novoSetor.nome}
                          onChange={e => setNovoSetor({ ...novoSetor, nome: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <input type="number" min="1" placeholder="Nº de funcionários neste setor"
                          value={novoSetor.total_funcionarios}
                          onChange={e => setNovoSetor({ ...novoSetor, total_funcionarios: e.target.value })}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <button type="submit" className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-xs hover:bg-blue-700">
                          Adicionar setor
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Lista de setores com contadores */}
                  {setores.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">Nenhum setor cadastrado. Adicione um acima.</p>
                  ) : (
                    <div className="space-y-2">
                      {setores.map(s => (
                        <label key={s.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                          ${novaAval.setor_id === s.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                          <input type="radio" name="setor" value={s.id}
                            checked={novaAval.setor_id === s.id}
                            onChange={() => setNovaAval({ ...novaAval, setor_id: s.id })}
                            className="text-blue-600" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">{s.nome}</p>
                            <BarraProgresso coletadas={parseInt(s.respostas_coletadas) || 0} total={parseInt(s.total_funcionarios) || 0} />
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div><label className="text-xs text-gray-500 block mb-1">Data de encerramento</label>
                <input type="date" value={novaAval.data_fim}
                  onChange={e => setNovaAval({ ...novaAval, data_fim: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" /></div>

              <div className="flex gap-2 pt-1">
                <button onClick={criarAvaliacao} disabled={!novaAval.empresa_id || !novaAval.setor_id}
                  className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm hover:bg-blue-700 disabled:opacity-40">
                  Criar e gerar link
                </button>
                <button type="button" onClick={() => setView("avaliacoes")}
                  className="border border-gray-200 text-gray-600 rounded-lg px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* LISTA DE AVALIAÇÕES */}
        <h2 className="font-medium text-gray-900 mb-3">Avaliações</h2>
        <div className="space-y-3">
          {avaliacoes.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-400">Nenhuma avaliação criada ainda.</div>
          ) : avaliacoes.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{a.empresa_nome} <span className="text-gray-400">·</span> {a.setor_nome}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(a.criado_em).toLocaleDateString("pt-BR")} · <BadgeRisco valor={a.status === "processada" ? "Baixo" : "Pendente"} /></p>
                </div>
                <button onClick={() => verResultados(a)} className="text-xs text-blue-600 hover:underline ml-4 flex-shrink-0">Ver resultados</button>
              </div>
              <BarraProgresso coletadas={parseInt(a.respostas_coletadas) || 0} total={parseInt(a.setor_total_funcionarios) || 0} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const PERGUNTAS = [
  { num:1,  texto:"Você já presenciou ou sofreu comentários ofensivos, piadas ou insinuações inadequadas no trabalho?" },
  { num:2,  texto:"Você se sente à vontade para relatar situações de assédio moral ou sexual sem medo de represálias?" },
  { num:3,  texto:"Existe um canal seguro e sigiloso para denunciar assédio na empresa?" },
  { num:4,  texto:"Há casos conhecidos de assédio que não foram devidamente investigados ou punidos?" },
  { num:5,  texto:"O RH e os gestores demonstram comprometimento real com a prevenção do assédio?" },
  { num:6,  texto:"Você sente que pode contar com seus colegas em momentos de dificuldade?" },
  { num:7,  texto:"Existe apoio da liderança para lidar com desafios do trabalho?" },
  { num:8,  texto:"O RH está presente e atuante quando surgem conflitos ou dificuldades?" },
  { num:9,  texto:"Os gestores promovem um ambiente saudável e respeitoso?" },
  { num:10, texto:"Você sente que pode expressar suas dificuldades sem ser julgado(a)?" },
  { num:11, texto:"Mudanças organizacionais impactaram negativamente seu sentimento de segurança?" },
  { num:12, texto:"Há comunicação clara sobre mudanças que afetam a empresa ou os trabalhadores?" },
  { num:13, texto:"Você já sentiu que seu emprego estava ameaçado sem explicações claras?" },
  { num:14, texto:"Existe transparência na comunicação durante processos de mudança?" },
  { num:15, texto:"Você recebe instruções claras sobre suas responsabilidades no trabalho?" },
  { num:16, texto:"A comunicação da empresa ajuda você a entender o que é esperado do seu trabalho?" },
  { num:17, texto:"A comunicação entre equipes contribui para a clareza das suas tarefas?" },
  { num:18, texto:"Você se sente confortável para pedir esclarecimentos quando não entende algo?" },
  { num:19, texto:"Você sente que seu esforço e desempenho são reconhecidos pela liderança?" },
  { num:20, texto:"Você recebe feedback construtivo sobre o seu trabalho com regularidade?" },
  { num:21, texto:"Com que frequência você já se sentiu desmotivado(a) por falta de reconhecimento?" },
  { num:22, texto:"Você tem liberdade para tomar decisões sobre como executar suas tarefas?" },
  { num:23, texto:"A empresa confia na sua capacidade de organizar e gerenciar o próprio trabalho?" },
  { num:24, texto:"Existe excesso de controle ou burocracia que interfere no seu desempenho?" },
  { num:25, texto:"Existe excesso de supervisão que impacta negativamente sua produtividade ou bem-estar?" },
  { num:26, texto:"Você acha justas e claras as formas que a empresa usa para avaliar seu trabalho?" },
  { num:27, texto:"Você sente que há igualdade no reconhecimento entre diferentes áreas ou equipes?" },
  { num:28, texto:"Você sente que há transparência nas decisões de desligamento na empresa?" },
  { num:29, texto:"Você já presenciou casos de demissões que considerasse injustas?" },
  { num:30, texto:"Você já vivenciou ou presenciou alguma situação de violência grave no trabalho?" },
  { num:31, texto:"Você já passou por algum evento grave no trabalho (acidente sério, risco extremo)?" },
  { num:32, texto:"Alguma situação vivida no trabalho deixou medo, choque ou forte abalo emocional?" },
  { num:33, texto:"Você sente que, na maior parte do tempo, tem pouco trabalho a realizar?" },
  { num:34, texto:"Você costuma ficar com tempo ocioso por falta de tarefas ou demandas claras?" },
  { num:35, texto:"Você sente que suas habilidades são pouco utilizadas no seu trabalho?" },
  { num:36, texto:"Seu trabalho costuma ser repetitivo a ponto de gerar desânimo?" },
  { num:37, texto:"Você sente que sua carga de trabalho é maior do que consegue realizar no horário normal?" },
  { num:38, texto:"Você frequentemente precisa fazer horas extras ou levar trabalho para casa?" },
  { num:39, texto:"Você já teve sintomas físicos ou emocionais (exaustão, ansiedade, insônia) por excesso de trabalho?" },
  { num:40, texto:"A equipe é dimensionada corretamente para a demanda de trabalho existente?" },
  { num:41, texto:"Você já evitou colegas ou superiores por causa de desentendimentos frequentes?" },
  { num:42, texto:"Você percebe rivalidade excessiva ou desnecessária entre colegas ou setores?" },
  { num:43, texto:"Conflitos no trabalho costumam ser resolvidos de forma justa?" },
  { num:44, texto:"Você trabalha em condições (turnos, distância física) que dificultam a comunicação?" },
  { num:45, texto:"A distância física entre você e sua equipe dificulta a troca de informações?" },
  { num:46, texto:"Você já teve dificuldade para receber informações importantes no momento certo?" },
  { num:47, texto:"Você tem acesso fácil aos meios necessários para se comunicar com colegas e liderança?" },
];

const ESCALA = [
  { valor: 1, label: "Nunca" }, { valor: 2, label: "Raramente" },
  { valor: 3, label: "Às vezes" }, { valor: 4, label: "Frequentemente" }, { valor: 5, label: "Sempre" },
];

function Formulario({ token }) {
  const [avaliacao, setAvaliacao] = useState(null);
  const [respostas, setRespostas] = useState({});
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/responder/${token}`).then(r => r.json()).then(data => {
      if (data.erro) setErro(data.erro); else setAvaliacao(data);
    });
  }, [token]);

  async function enviar(e) {
    e.preventDefault();
    if (Object.keys(respostas).length < 47) { setErro("Por favor, responda todas as perguntas antes de enviar."); return; }
    setLoading(true);
    const lista = Object.entries(respostas).map(([pergunta_num, valor_original]) => ({ pergunta_num: parseInt(pergunta_num), valor_original: parseInt(valor_original) }));
    const r = await fetch(`${API}/responder/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ respostas: lista }) });
    const data = await r.json();
    if (data.ok) setEnviado(true); else setErro(data.erro);
    setLoading(false);
  }

  if (erro) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-sm text-center">
        <p className="text-red-600 text-sm">{erro}</p>
      </div>
    </div>
  );

  if (!avaliacao) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400 text-sm">Carregando...</p></div>;

  if (enviado) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-sm text-center">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="font-medium text-gray-900 mb-2">Respostas enviadas!</h2>
        <p className="text-sm text-gray-500">Obrigado pela participação. Suas respostas são anônimas.</p>
      </div>
    </div>
  );

  const respondidas = Object.keys(respostas).length;
  const vagasRestantes = avaliacao.total_funcionarios ? avaliacao.vagas_restantes : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-medium text-gray-900 text-sm">Avaliação de Riscos Psicossociais</h1>
          {vagasRestantes !== null && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${vagasRestantes > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {vagasRestantes > 0 ? `${vagasRestantes} vagas restantes` : "Vagas esgotadas"}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400">{avaliacao.empresa_nome} · {avaliacao.setor_nome} · Anônimo · {respondidas}/47 respondidas</p>
        <div className="w-full bg-gray-100 rounded-full h-1 mt-2">
          <div className="bg-blue-500 h-1 rounded-full transition-all" style={{ width: `${(respondidas/47)*100}%` }} />
        </div>
      </header>

      <form onSubmit={enviar} className="max-w-2xl mx-auto p-6 space-y-4">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
          Suas respostas são completamente anônimas. Responda com sinceridade considerando sua experiência nos últimos 6 meses.
        </div>
        {PERGUNTAS.map((p, i) => (
          <div key={p.num} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-700 mb-4"><span className="text-xs text-gray-400 mr-2">{i+1}.</span>{p.texto}</p>
            <div className="flex gap-2 flex-wrap">
              {ESCALA.map(op => (
                <label key={op.valor} className={`flex-1 min-w-16 cursor-pointer rounded-lg border text-center py-2 px-1 text-xs transition-all
                  ${respostas[p.num] == op.valor ? "border-blue-500 bg-blue-50 text-blue-800 font-medium" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                  <input type="radio" name={`p${p.num}`} value={op.valor} onChange={() => setRespostas({ ...respostas, [p.num]: op.valor })} className="sr-only" />
                  <span className="block font-medium">{op.valor}</span><span>{op.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white rounded-xl py-3 font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? "Enviando..." : "Enviar respostas"}
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("drps_token"));
  const [usuario, setUsuario] = useState(() => { try { return JSON.parse(localStorage.getItem("drps_usuario")); } catch { return null; } });

  const path = window.location.pathname;
  const match = path.match(/^\/responder\/([a-f0-9]+)$/);
  if (match) return <Formulario token={match[1]} />;

  function onLogin(t, u) { setToken(t); setUsuario(u); }
  function logout() { localStorage.removeItem("drps_token"); localStorage.removeItem("drps_usuario"); setToken(null); setUsuario(null); }

  if (!token) return <Login onLogin={onLogin} />;
  return <AuthContext.Provider value={{ token, usuario, logout }}><Dashboard /></AuthContext.Provider>;
}