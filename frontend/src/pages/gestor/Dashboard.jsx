import { useState, useEffect } from "react";
import { useAuth, API } from "../../contexts/AuthContext";
import { Layout } from "../../components/Layout";
import { Card, Btn, BadgeRisco, BarraProgresso } from "../../components/ui";

export default function DashboardGestor() {
  const { token, usuario } = useAuth();
  const [dash, setDash] = useState(null);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [avalSelecionada, setAvalSelecionada] = useState(null);
  const [resultados, setResultados] = useState(null);
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/usuarios/dashboard`, { headers }).then(r => r.json()).then(setDash);
    fetch(`${API}/avaliacoes`, { headers }).then(r => r.json()).then(setAvaliacoes);
  }, []);

  async function verResultados(aval) {
    setAvalSelecionada(aval);
    const r = await fetch(`${API}/avaliacoes/${aval.id}/resultados`, { headers });
    setResultados(await r.json());
  }

  if (avalSelecionada && resultados) return (
    <Layout titulo="Laudo" subtitulo={`${avalSelecionada.setor_nome} · ${avalSelecionada.empresa_nome}`}
      acoes={<Btn variant="secondary" onClick={() => { setAvalSelecionada(null); setResultados(null); }}>← Voltar</Btn>}>
      <div className="grid grid-cols-4 gap-3 mb-6">
        {Object.entries(resultados.contagem).map(([k, v]) => (
          <Card key={k} className="p-4 text-center">
            <p className="text-2xl font-semibold text-gray-900">{v}</p>
            <p className="text-xs text-gray-400 mt-1">{k}</p>
          </Card>
        ))}
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-100">
            <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Tópico</th>
            <th className="px-4 py-3 text-xs text-gray-400 font-medium">Gravidade</th>
            <th className="px-4 py-3 text-xs text-gray-400 font-medium">Probabilidade</th>
            <th className="px-4 py-3 text-xs text-gray-400 font-medium">Risco</th>
          </tr></thead>
          <tbody>
            {resultados.resultados.map(r => (
              <tr key={r.topico_num} className="border-b border-gray-50">
                <td className="px-4 py-3 text-xs text-gray-700">{r.topico_nome}</td>
                <td className="px-4 py-3 text-center"><BadgeRisco valor={r.classif_gravidade} /></td>
                <td className="px-4 py-3 text-center"><BadgeRisco valor={r.classif_probabilidade} /></td>
                <td className="px-4 py-3 text-center"><BadgeRisco valor={r.matriz_risco} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Layout>
  );

  return (
    <Layout titulo={usuario.papel === "gestor_matriz" ? "Painel Matriz" : "Painel Filial"}>
      {dash && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Avaliações concluídas", val: dash.avaliacoes_concluidas || 0 },
            { label: "Total de respostas", val: dash.total_respostas || 0 },
            { label: "Alertas críticos", val: dash.alertas_criticos || 0, alert: true },
          ].map(({ label, val, alert }) => (
            <Card key={label} className="p-4">
              <p className={`text-2xl font-semibold ${alert && val > 0 ? "text-red-600" : "text-gray-900"}`}>{val}</p>
              <p className="text-xs text-gray-400 mt-1">{label}</p>
            </Card>
          ))}
        </div>
      )}
      <h2 className="font-medium text-gray-900 text-sm mb-3">Avaliações</h2>
      <div className="space-y-3">
        {avaliacoes.length === 0
          ? <Card className="p-6 text-sm text-gray-400">Nenhuma avaliação disponível.</Card>
          : avaliacoes.map(a => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{a.empresa_nome} · {a.setor_nome}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(a.criado_em).toLocaleDateString("pt-BR")} · <BadgeRisco valor={a.status} /></p>
                </div>
                {a.status === "processada" && <Btn variant="ghost" onClick={() => verResultados(a)} className="text-xs">Ver laudo</Btn>}
              </div>
              <BarraProgresso coletadas={parseInt(a.respostas_coletadas) || 0} total={parseInt(a.setor_total_funcionarios) || 0} />
            </Card>
          ))
        }
      </div>
    </Layout>
  );
}
