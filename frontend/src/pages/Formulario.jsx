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
];
const ESCALA = [{valor:1,label:"Nunca"},{valor:2,label:"Raramente"},{valor:3,label:"Às vezes"},{valor:4,label:"Frequentemente"},{valor:5,label:"Sempre"}];

export default function Formulario({ token }) {
  const [avaliacao, setAvaliacao] = useState(null);
  const [respostas, setRespostas] = useState({});
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [consentido, setConsentido] = useState(false);

  useEffect(() => {
    fetch(`${API}/responder/${token}`).then(r=>r.json()).then(d=>{
      if (d.erro) setErro(d.erro); else setAvaliacao(d);
    });
  }, [token]);

  async function enviar(e) {
    e.preventDefault();
    if (Object.keys(respostas).length < 47) {
      setErro("Por favor, responda todas as perguntas.");
      const naoResp = PERGUNTAS.filter(p=>!respostas[p.num]);
      if (naoResp.length>0) { const el=document.getElementById(`p-${naoResp[0].num}`); if(el) el.scrollIntoView({behavior:'smooth',block:'center'}); }
      return;
    }
    setErro(""); setLoading(true);
    const lista = Object.entries(respostas).map(([pn,vo])=>({pergunta_num:parseInt(pn),valor_original:parseInt(vo)}));
    const r = await fetch(`${API}/responder/${token}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({respostas:lista})});
    const d = await r.json();
    if (d.ok) setEnviado(true); else setErro(d.erro);
    setLoading(false);
  }

  if (erro && !avaliacao) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="p-8 max-w-sm text-center"><p className="text-red-600 text-sm">{erro}</p></Card>
    </div>
  );
  if (!avaliacao) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400 text-sm">Carregando...</p></div>;
  if (enviado) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="p-8 max-w-sm text-center">
        <div className="text-4xl mb-4">✅</div>
        <h2 className="font-medium text-gray-900 mb-2">Respostas enviadas!</h2>
        <p className="text-sm text-gray-500">Obrigado pela participação. Suas respostas são anônimas.</p>
      </Card>
    </div>
  );
  if (!consentido) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="p-8 max-w-md">
        <h2 className="font-semibold text-gray-900 mb-1">Avaliação de Riscos Psicossociais</h2>
        <p className="text-sm text-gray-500 mb-4">{avaliacao.empresa_nome} · {avaliacao.setor_nome}</p>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800 mb-4 space-y-2">
          <p><strong>Antes de começar:</strong></p>
          <p>• Suas respostas são <strong>completamente anônimas</strong></p>
          <p>• Resultados analisados de forma <strong>agregada por setor</strong></p>
          <p>• Pesquisa voluntária conforme <strong>NR-01 e LGPD</strong></p>
          <p>• Dados usados exclusivamente para <strong>diagnóstico organizacional</strong></p>
        </div>
        <Btn onClick={()=>setConsentido(true)} className="w-full justify-center">Entendi e desejo participar</Btn>
      </Card>
    </div>
  );

  const respondidas = Object.keys(respostas).length;
  const vagasRestantes = avaliacao.total_funcionarios ? avaliacao.vagas_restantes : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-sm font-medium text-gray-900">{avaliacao.empresa_nome}</p>
              <p className="text-xs text-gray-400">{avaliacao.setor_nome} · Anônimo · {respondidas}/47</p>
            </div>
            {vagasRestantes!==null && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${vagasRestantes>0?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`}>
                {vagasRestantes>0?`${vagasRestantes} vagas`:"Esgotado"}
              </span>
            )}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1">
            <div className="bg-blue-500 h-1 rounded-full transition-all" style={{width:`${(respondidas/47)*100}%`}}/>
          </div>
        </div>
      </header>
      <form onSubmit={enviar} className="max-w-2xl mx-auto p-4 space-y-3">
        {erro && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">⚠️ {erro}</div>}
        {PERGUNTAS.map((p,i)=>{
          const naoResp = erro && !respostas[p.num];
          return (
            <div id={`p-${p.num}`} key={p.num}
              className={`bg-white rounded-xl border p-4 transition-all ${naoResp?"border-red-400 bg-red-50":"border-gray-200"}`}>
              <p className="text-sm text-gray-700 mb-3">
                <span className="text-xs text-gray-400 mr-2">{i+1}.</span>{p.texto}
                {naoResp && <span className="ml-1 text-xs text-red-500">*</span>}
              </p>
              <div className="flex gap-2">
                {ESCALA.map(op=>(
                  <label key={op.valor} className={`flex-1 cursor-pointer rounded-lg border text-center py-2 px-1 text-xs transition-all
                    ${respostas[p.num]==op.valor?"border-blue-500 bg-blue-50 text-blue-800 font-medium":"border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                    <input type="radio" name={`p${p.num}`} value={op.valor}
                      onChange={()=>{ setRespostas({...respostas,[p.num]:op.valor}); if(erro) setErro(""); }} className="sr-only"/>
                    <span className="block font-medium">{op.valor}</span>
                    <span className="text-xs">{op.label}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white rounded-xl py-3 font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading?"Enviando...":respondidas<47?`Enviar (${respondidas}/47)`:"Enviar respostas"}
        </button>
      </form>
    </div>
  );
}
