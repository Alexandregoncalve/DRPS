// INSTRUÇÕES DE INTEGRAÇÃO — Sprint 3 no Painel.jsx
// ============================================================
// Substituir a view "resultados" existente pelo novo componente Resultados.jsx
// São apenas 3 alterações no Painel.jsx

// ────────────────────────────────────────────────────────────
// 1. ADICIONAR import no topo (substitui o bloco de imports de recharts):
// ────────────────────────────────────────────────────────────

import Resultados from "./Resultados";

// REMOVER (ou manter se quiser — o Resultados.jsx tem o radar próprio):
// import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";

// ────────────────────────────────────────────────────────────
// 2. SUBSTITUIR a função verResultados():
// ────────────────────────────────────────────────────────────

// ANTES (apagar):
async function verResultados(aval) {
  setAvalSelecionada(aval);
  // ... todo o bloco existente
}

// DEPOIS (colocar no lugar):
function verResultados(aval) {
  setAvalSelecionada(aval);
  setView("resultados");
}

// ────────────────────────────────────────────────────────────
// 3. SUBSTITUIR o bloco "if (view === 'resultados')" inteiro:
// ────────────────────────────────────────────────────────────

// ANTES (apagar todo o bloco que começa com):
// if (view==="resultados" && avalSelecionada && resultados) {
//   ...
//   return ( <Layout ...> ... </Layout> );
// }

// DEPOIS (colocar no lugar — ANTES do return principal):
if (view === "resultados" && avalSelecionada) {
  return (
    <Resultados
      avaliacaoId={avalSelecionada.id}
      token={token}
      onVoltar={() => {
        setView("avaliacoes");
        setAvalSelecionada(null);
      }}
    />
  );
}

// ────────────────────────────────────────────────────────────
// RESULTADO FINAL: o Painel.jsx fica muito mais limpo
// O componente Resultados.jsx cuida de tudo:
//   - Busca dados do laudo via /api/laudo/:id
//   - 7 abas: Resumo, Resultados, Inventário MTE, Fontes, AIHA, Plano, Glossário
//   - Radar, barras, semáforo, top 5
//   - Matriz AIHA 5x5 visual
//   - Plano de ação por zona
//   - Ajuste de probabilidade inline
// ────────────────────────────────────────────────────────────

// TAMBÉM PODE REMOVER do Painel.jsx (estados que não são mais necessários):
// const [resultados, setResultados] = useState(null);
// const [probabilidades, setProbabilidades] = useState({});
// const [processando, setProcessando] = useState(false);
// const [topicoModalAberto, setTopicoModalAberto] = useState(null);
// const [modalIdentificacao, setModalIdentificacao] = useState(false);
// const [dadosIdentificacao, setDadosIdentificacao] = useState({...});
// As funções: salvarProbabilidades, exportarCSV, exportarPDF
// Os imports de CriteriosProbabilidadeModal
