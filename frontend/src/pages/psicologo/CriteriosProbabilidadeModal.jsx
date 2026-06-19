import { useState, useEffect } from "react";
import { useAuth, API } from "../../contexts/AuthContext";
import { Card, Btn } from "../../components/ui";

const CATEGORIAS_ORDEM = ['Frequência', 'Histórico do Risco no Setor', 'Recursos Disponíveis'];

export default function CriteriosProbabilidadeModal({ avaliacaoId, topicoNum, topicoNome, onFechar, onAplicar }) {
  const { token } = useAuth();
  const [criterios, setCriterios] = useState([]);
  const [respostas, setRespostas] = useState({});
  const [sugestao, setSugestao] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/avaliacoes/criterios-probabilidade`, { headers }).then(r => r.json()).then(setCriterios);
    fetch(`${API}/avaliacoes/${avaliacaoId}/criterios`, { headers }).then(r => r.json()).then(d => {
      if (d[topicoNum]) setRespostas(d[topicoNum]);
    });
  }, []);

  async function salvar() {
    setSalvando(true);
    try {
      const r = await fetch(`${API}/avaliacoes/${avaliacaoId}/criterios`, {
        method: "POST", headers,
        body: JSON.stringify({ topico_num: topicoNum, respostas }),
      });
      const d = await r.json();
      setSugestao(d.sugestao);
      if (d.sugestao) onAplicar(d.sugestao);
    } finally {
      setSalvando(false);
    }
  }

  const totalRespondido = Object.keys(respostas).length;
  const totalCriterios = criterios.length;

  const porCategoria = CATEGORIAS_ORDEM.map(cat => ({
    categoria: cat,
    itens: criterios.filter(c => c.categoria === cat),
  }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onFechar}>
      <Card className="max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="font-semibold text-gray-900">Critérios de Probabilidade</h2>
            <p className="text-xs text-gray-400">{topicoNome}</p>
          </div>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 my-4">
          Responda com base na sua observação clínica e no histórico do setor. O sistema vai sugerir uma probabilidade (1-Baixa, 2-Média, 3-Alta) — você pode ajustar manualmente depois.
        </div>

        {criterios.length === 0 ? (
          <p className="text-sm text-gray-400 py-8 text-center">Carregando critérios...</p>
        ) : (
          <div className="space-y-6">
            {porCategoria.map(({ categoria, itens }) => (
              <div key={categoria}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{categoria}</p>
                <div className="space-y-3">
                  {itens.map(c => (
                    <div key={c.codigo}>
                      <p className="text-sm text-gray-700 mb-2">{c.pergunta}</p>
                      <div className="flex flex-wrap gap-2">
                        {c.opcoes.map(op => (
                          <button key={op.valor} type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRespostas({ ...respostas, [c.codigo]: op.valor }); }}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${respostas[c.codigo] === op.valor ? "border-blue-500 bg-blue-50 text-blue-800 font-medium" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>
                            {op.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-gray-100 mt-6 pt-4 flex items-center justify-between">
          <p className="text-xs text-gray-400">{totalRespondido}/{totalCriterios} respondidos</p>
          {sugestao && (
            <p className="text-sm font-medium text-green-700">
              Sugestão calculada: {sugestao === 1 ? "1 - Baixa" : sugestao === 2 ? "2 - Média" : "3 - Alta"}
            </p>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Btn onClick={salvar} disabled={salvando || totalRespondido === 0}>
            {salvando ? "Calculando..." : "Calcular sugestão"}
          </Btn>
          <Btn variant="secondary" onClick={onFechar}>Fechar</Btn>
        </div>
      </Card>
    </div>
  );
}
