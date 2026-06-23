import { useState, useEffect } from "react";
import { API } from "../contexts/AuthContext";
import { Card, Btn } from "../components/ui";

const PERGUNTAS = [
  {num:1,texto:"Você já presenciou ou sofreu comentários ofensivos, piadas ou insinuações inadequadas no trabalho?"},
  {num:2,texto:"Você se sente à vontade para relatar situações de assédio moral ou sexual sem medo de represálias?"},
  {num:3,texto:"Existe um canal seguro e sigiloso para denunciar assédio na empresa?"},
  {num:4,texto:"Há casos conhecidos de assédio que não foram devidamente investigados ou punidos?"},
  {num:5,texto:"O RH e os gestores demonstram comprometimento real com a prevenção do assédio?"},
  {num:6,texto:"Você sente que pode contar com seus colegas em momentos de dificuldade?"},
  {num:7,texto:"Existe apoio da liderança para lidar com desafios do trabalho?"},
  {num:8,texto:"O RH está presente e atuante quando surgem conflitos ou dificuldades?"},
  {num:9,texto:"Os gestores promovem um ambiente saudável e respeitoso?"},
  {num:10,texto:"Você sente que pode expressar suas dificuldades sem ser julgado(a)?"},
  {num:11,texto:"Mudanças organizacionais impactaram negativamente seu sentimento de segurança?"},
  {num:12,texto:"Há comunicação clara sobre mudanças que afetam a empresa ou os trabalhadores?"},
  {num:13,texto:"Você já sentiu que seu emprego estava ameaçado sem explicações claras?"},
  {num:14,texto:"Existe transparência na comunicação durante processos de mudança?"},
  {num:15,texto:"Você recebe instruções claras sobre suas responsabilidades no trabalho?"},
  {num:16,texto:"A comunicação da empresa ajuda você a entender o que é esperado do seu trabalho?"},
  {num:17,texto:"A comunicação entre equipes contribui para a clareza das suas tarefas?"},
  {num:18,texto:"Você se sente confortável para pedir esclarecimentos quando não entende algo?"},
  {num:19,texto:"Você sente que seu esforço e desempenho são reconhecidos pela liderança?"},
  {num:20,texto:"Você recebe feedback construtivo sobre o seu trabalho com regularidade?"},
  {num:21,texto:"Com que frequência você já se sentiu desmotivado(a) por falta de reconhecimento?"},
  {num:22,texto:"Você tem liberdade para tomar decisões sobre como executar suas tarefas?"},
  {num:23,texto:"A empresa confia na sua capacidade de organizar e gerenciar o próprio trabalho?"},
  {num:24,texto:"Existe excesso de controle ou burocracia que interfere no seu desempenho?"},
  {num:25,texto:"Existe excesso de supervisão que impacta negativamente sua produtividade ou bem-estar?"},
  {num:26,texto:"Você acha justas e claras as formas que a empresa usa para avaliar seu trabalho?"},
  {num:27,texto:"Você sente que há igualdade no reconhecimento entre diferentes áreas ou equipes?"},
  {num:28,texto:"Você sente que há transparência nas decisões de desligamento na empresa?"},
  {num:29,texto:"Você já presenciou casos de demissões que considerasse injustas?"},
  {num:30,texto:"Você já vivenciou ou presenciou alguma situação de violência grave no trabalho?"},
  {num:31,texto:"Você já passou por algum evento grave no trabalho (acidente sério, risco extremo)?"},
  {num:32,texto:"Alguma situação vivida no trabalho deixou medo, choque ou forte abalo emocional?"},
  {num:33,texto:"Você sente que, na maior parte do tempo, tem pouco trabalho a realizar?"},
  {num:34,texto:"Você costuma ficar com tempo ocioso por falta de tarefas ou demandas claras?"},
  {num:35,texto:"Você sente que suas habilidades são pouco utilizadas no seu trabalho?"},
  {num:36,texto:"Seu trabalho costuma ser repetitivo a ponto de gerar desânimo?"},
  {num:37,texto:"Você sente que sua carga de trabalho é maior do que consegue realizar no horário normal?"},
  {num:38,texto:"Você frequentemente precisa fazer horas extras ou levar trabalho para casa?"},
  {num:39,texto:"Você já teve sintomas físicos ou emocionais (exaustão, ansiedade, insônia) por excesso de trabalho?"},
  {num:40,texto:"A equipe é dimensionada corretamente para a demanda de trabalho existente?"},
  {num:41,texto:"Você já evitou colegas ou superiores por causa de desentendimentos frequentes?"},
  {num:42,texto:"Você percebe rivalidade excessiva ou desnecessária entre colegas ou setores?"},
  {num:43,texto:"Conflitos no trabalho costumam ser resolvidos de forma justa?"},
  {num:44,texto:"Você trabalha em condições (turnos, distância física) que dificultam a comunicação?"},
  {num:45,texto:"A distância física entre você e sua equipe dificulta a troca de informações?"},
  {num:46,texto:"Você já teve dificuldade para receber informações importantes no momento certo?"},
  {num:47,texto:"Você tem acesso fácil aos meios necessários para se comunicar com colegas e liderança?"},
  {num:48,texto:"Você sente falta de contato presencial com colegas e liderança no seu dia a dia de trabalho?"},
  {num:49,texto:"Você se sente isolado(a) socialmente por trabalhar remotamente ou longe da equipe?"},
  {num:50,texto:"Você sente falta de acompanhamento da liderança por não estar fisicamente presente?"},
  {num:51,texto:"A ausência de convívio presencial já afetou negativamente seu bem-estar emocional?"},
  {num:52,texto:"Você consegue se desconectar do trabalho fora do horário, mesmo trabalhando remotamente?"},
];

const ESCALA = [
  {valor:1,label:"Nunca"},
  {valor:2,label:"Raramente"},
  {valor:3,label:"Às vezes"},
  {valor:4,label:"Frequentemente"},
  {valor:5,label:"Sempre"}
];

export default function Formulario({ token }) {
  const [avaliacao, setAvaliacao] = useState(null);
  const [respostas, setRespostas] = useState({});
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");
  const [jaRespondeu, setJaRespondeu] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");
  const [loading, setLoading] = useState(false);
  const [consentido, setConsentido] = useState(false);

  useEffect(() => {
    fetch(`${API}/responder/${token}`).then(r=>r.json()).then(d=>{
      if (d.erro === 'jaRespondido') { setJaRespondeu(true); setAvaliacao({}); }
      else if (d.erro) setErro(d.mensagem || d.erro);
      else setAvaliacao(d);
    });
  }, [token]);

  async function enviar(e) {
    e.preventDefault();
    if (Object.keys(respostas).length < 52) {
      setErroEnvio("Por favor, responda todas as perguntas antes de enviar.");
      const naoResp = PERGUNTAS.filter(p=>!respostas[p.num]);
      if (naoResp.length>0) {
        const el = document.getElementById(`p-${naoResp[0].num}`);
        if (el) el.scrollIntoView({behavior:'smooth', block:'center'});
      }
      return;
    }
    setErroEnvio(""); setLoading(true);
    try {
      const lista = Object.entries(respostas).map(([pn,vo])=>({pergunta_num:parseInt(pn),valor_original:parseInt(vo)}));
      const r = await fetch(`${API}/responder/${token}`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({respostas:lista})
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        setEnviado(true);
        window.scrollTo({top:0, behavior:'smooth'});
      } else {
        setErroEnvio(d.erro || "Não foi possível enviar suas respostas. Tente novamente.");
        window.scrollTo({top:0, behavior:'smooth'});
      }
    } catch {
      setErroEnvio("Erro de conexão. Verifique sua internet e tente novamente.");
      window.scrollTo({top:0, behavior:'smooth'});
    } finally {
      setLoading(false);
    }
  }

  // ---- JÁ RESPONDEU ----
  if (jaRespondeu) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-900 mb-3">Você já participou!</h2>
        <p className="text-base text-gray-600 mb-4 leading-relaxed">
          Suas respostas já foram registradas com sucesso. Obrigado pela sua participação!
        </p>
        <p className="text-sm text-gray-400 bg-gray-50 rounded-xl py-3 px-4">
          Você pode fechar esta aba agora.
        </p>
      </div>
    </div>
  );

  // ---- ERRO ----
  if (erro && !avaliacao) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-3">Link indisponível</h2>
        <p className="text-base text-gray-500">{erro}</p>
      </div>
    </div>
  );

  // ---- CARREGANDO ----
  if (!avaliacao) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-base">Carregando questionário...</p>
    </div>
  );

  // ---- ENVIADO ----
  if (enviado) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-gray-900 mb-3">Respostas enviadas!</h2>
        <p className="text-base text-gray-600 mb-2 leading-relaxed">
          Obrigado pela sua participação. Suas respostas são completamente anônimas e serão analisadas de forma agregada.
        </p>
        <p className="text-sm text-gray-400 mb-6">
          Sua contribuição é muito importante para melhorar o ambiente de trabalho.
        </p>
        <div className="bg-green-50 border border-green-200 rounded-xl py-4 px-4">
          <p className="text-sm font-semibold text-green-700">✓ Participação concluída!</p>
          <p className="text-xs text-green-600 mt-1">Você já pode fechar esta aba.</p>
        </div>
      </div>
    </div>
  );

  // ---- CONSENTIMENTO ----
  if (!consentido) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Avaliação de Riscos Psicossociais</h2>
          <p className="text-base text-gray-500">{avaliacao.empresa_nome} · {avaliacao.setor_nome}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-6 space-y-3">
          <p className="text-base font-semibold text-blue-900">Antes de começar, saiba que:</p>
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <span className="text-xl">👤</span>
              <p className="text-base text-blue-800">Suas respostas são <strong>completamente anônimas</strong> — não coletamos seu nome, e-mail ou qualquer dado de identificação.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">📊</span>
              <p className="text-base text-blue-800">Os resultados são analisados de forma <strong>agregada por setor</strong>, nunca individualmente.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">📋</span>
              <p className="text-base text-blue-800">Esta pesquisa é <strong>voluntária</strong> e segue as normas da <strong>NR-01 e LGPD</strong>.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">🎯</span>
              <p className="text-base text-blue-800">Os dados são usados exclusivamente para <strong>melhorar o ambiente de trabalho</strong> da sua empresa.</p>
            </div>
          </div>
        </div>
        <button onClick={()=>setConsentido(true)}
          className="w-full bg-blue-600 text-white rounded-xl py-4 text-lg font-bold hover:bg-blue-700 transition-colors">
          Entendi e quero participar →
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">Tempo estimado: 5 a 10 minutos</p>
      </div>
    </div>
  );

  // ---- QUESTIONÁRIO ----
  const respondidas = Object.keys(respostas).length;
  const vagasRestantes = avaliacao.total_funcionarios ? avaliacao.vagas_restantes : null;
  const pct = Math.round((respondidas/52)*100);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER STICKY */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-base font-bold text-gray-900">{avaliacao.empresa_nome}</p>
              <p className="text-sm text-gray-500">{avaliacao.setor_nome} · Anônimo</p>
            </div>
            <div className="text-right">
              <span className={`text-sm font-bold ${respondidas===52?'text-green-600':'text-blue-600'}`}>
                {respondidas}/52
              </span>
              {vagasRestantes!==null && (
                <p className={`text-xs ${vagasRestantes>0?"text-green-600":"text-red-600"}`}>
                  {vagasRestantes>0?`${vagasRestantes} vagas restantes`:"Limite atingido"}
                </p>
              )}
            </div>
          </div>
          {/* BARRA DE PROGRESSO */}
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{width:`${pct}%`}}/>
          </div>
          {pct > 0 && <p className="text-xs text-gray-400 mt-1 text-right">{pct}% concluído</p>}
        </div>
      </header>

      {/* FORMULÁRIO */}
      <form onSubmit={enviar} className="max-w-2xl mx-auto p-4 space-y-4 pb-8">
        {erroEnvio && (
          <div className="bg-red-50 border border-red-300 rounded-xl p-4 text-base text-red-800 font-medium">
            ⚠️ {erroEnvio}
          </div>
        )}

        {PERGUNTAS.map((p,i)=>{
          const naoResp = erroEnvio && !respostas[p.num];
          const respondida = !!respostas[p.num];
          return (
            <div id={`p-${p.num}`} key={p.num}
              className={`bg-white rounded-2xl border-2 p-5 transition-all ${
                naoResp ? "border-red-400 bg-red-50" :
                respondida ? "border-green-200" : "border-gray-200"
              }`}>
              {/* NÚMERO + PERGUNTA */}
              <p className="text-base font-bold text-gray-900 mb-4 leading-snug">
                <span className="text-sm font-normal text-gray-400 mr-2">{i+1}.</span>
                {p.texto}
                {naoResp && <span className="ml-1 text-sm text-red-500 font-normal">* obrigatória</span>}
              </p>
              {/* OPÇÕES — empilhadas no celular */}
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {ESCALA.map(op=>(
                  <label key={op.valor}
                    className={`cursor-pointer rounded-xl border-2 text-center py-3 px-1 transition-all select-none
                      ${respostas[p.num]==op.valor
                        ? "border-blue-500 bg-blue-500 text-white font-bold shadow-sm"
                        : "border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50"
                      }`}>
                    <input type="radio" name={`p${p.num}`} value={op.valor}
                      onChange={()=>{ setRespostas({...respostas,[p.num]:op.valor}); if(erroEnvio) setErroEnvio(""); }}
                      className="sr-only"/>
                    <span className="block text-lg font-bold">{op.valor}</span>
                    <span className="text-xs leading-tight">{op.label}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}

        {/* BOTÃO ENVIAR */}
        <div className="sticky bottom-4">
          <button type="submit" disabled={loading}
            className={`w-full rounded-xl py-5 text-lg font-bold shadow-lg transition-all
              ${respondidas===52
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
              } disabled:opacity-50`}>
            {loading ? "Enviando suas respostas..." :
              respondidas===52 ? "✓ Enviar todas as respostas" :
              `Responder (${respondidas}/52 — faltam ${52-respondidas})`}
          </button>
        </div>
      </form>
    </div>
  );
}
