// pages/psicologo/Financeiro.jsx
// Painel financeiro com visibilidade diferenciada:
// - Superadmin: vê tudo (receita, despesa, os 3 saldos, fecha o mês)
// - Sócio (admin): vê receita/despesa total, mas só o PRÓPRIO saldo e retiradas

import { useState, useEffect } from "react";
import { API } from "../../contexts/AuthContext";
import { Card, Btn } from "../../components/ui";

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const CATEGORIAS = [
  ['servidor', '🖥️ Servidor'],
  ['dominio', '🌐 Domínio'],
  ['ferramenta', '🔧 Ferramenta/SaaS'],
  ['taxa', '💳 Taxa (Stripe, etc)'],
  ['outro', '📦 Outro'],
];

export default function Financeiro({ token }) {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [dados, setDados] = useState(null);
  const [retiradas, setRetiradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const [formDespesa, setFormDespesa] = useState({ descricao:'', categoria:'servidor', valor:'' });
  const [formReceita, setFormReceita] = useState({ descricao:'', valor:'' });
  const [valorRetirada, setValorRetirada] = useState('');
  const [salvando, setSalvando] = useState(false);

  const headers = { 'Content-Type':'application/json', Authorization:`Bearer ${token}` };

  useEffect(() => { carregar(); }, [ano, mes]);

  async function carregar() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/financeiro/resumo/${ano}/${mes}`, { headers });
      const d = await r.json();
      setDados(d);
      const r2 = await fetch(`${API}/financeiro/retiradas`, { headers });
      setRetiradas(await r2.json());
    } catch(e) {}
    setLoading(false);
  }

  function avisar(texto) { setMsg(texto); setTimeout(()=>setMsg(''), 4000); }

  async function adicionarDespesa() {
    if (!formDespesa.descricao || !formDespesa.valor) return;
    setSalvando(true);
    try {
      const mesRef = `${ano}-${String(mes).padStart(2,'0')}-01`;
      await fetch(`${API}/financeiro/despesas`, { method:'POST', headers,
        body: JSON.stringify({ ...formDespesa, mes_referencia: mesRef }) });
      setFormDespesa({ descricao:'', categoria:'servidor', valor:'' });
      carregar();
    } catch(e) {}
    setSalvando(false);
  }

  async function adicionarReceita() {
    if (!formReceita.descricao || !formReceita.valor) return;
    setSalvando(true);
    try {
      const mesRef = `${ano}-${String(mes).padStart(2,'0')}-01`;
      const r = await fetch(`${API}/financeiro/receitas`, { method:'POST', headers,
        body: JSON.stringify({ ...formReceita, mes_referencia: mesRef }) });
      const d = await r.json();
      if (d.erro) avisar('❌ ' + d.erro);
      setFormReceita({ descricao:'', valor:'' });
      carregar();
    } catch(e) {}
    setSalvando(false);
  }

  async function removerDespesa(id) {
    if (!confirm('Remover esta despesa?')) return;
    const r = await fetch(`${API}/financeiro/despesas/${id}`, { method:'DELETE', headers });
    const d = await r.json();
    if (d.erro) avisar('❌ ' + d.erro);
    carregar();
  }

  async function removerReceita(id) {
    if (!confirm('Remover esta receita?')) return;
    await fetch(`${API}/financeiro/receitas/${id}`, { method:'DELETE', headers });
    carregar();
  }

  async function solicitarRetirada() {
    if (!valorRetirada) return;
    setSalvando(true);
    try {
      const r = await fetch(`${API}/financeiro/retiradas`, { method:'POST', headers,
        body: JSON.stringify({ valor: valorRetirada }) });
      const d = await r.json();
      if (d.erro) avisar('❌ ' + d.erro);
      else avisar('✅ Retirada solicitada!');
      setValorRetirada('');
      carregar();
    } catch(e) {}
    setSalvando(false);
  }

  async function fecharMes() {
    if (!confirm(`Fechar ${MESES[mes-1]}/${ano}? Isso vai distribuir o lucro do mês para o saldo de cada sócio. Esta ação não pode ser desfeita.`)) return;
    setSalvando(true);
    try {
      const r = await fetch(`${API}/financeiro/fechar-mes/${ano}/${mes}`, { method:'POST', headers });
      const d = await r.json();
      if (d.erro) avisar('❌ ' + d.erro);
      else avisar('✅ Mês fechado e distribuído com sucesso!');
      carregar();
    } catch(e) {}
    setSalvando(false);
  }

  async function marcarPago(id) {
    await fetch(`${API}/financeiro/retiradas/${id}/pagar`, { method:'PUT', headers });
    carregar();
  }

  const fmt = (v) => `R$ ${parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`;

  if (loading && !dados) return <div className="p-8 text-center text-gray-400">Carregando...</div>;
  if (dados && !dados.sou_socio) return (
    <div className="p-8 text-center text-gray-400">
      Seu usuário não está vinculado a nenhuma sociedade.<br/>Entre em contato com o administrador da plataforma.
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">💰 {dados?.eh_superadmin ? 'Painel Financeiro — Geral' : 'Meu Financeiro'}</h2>
        <div className="flex gap-2">
          <select value={mes} onChange={e=>setMes(parseInt(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
            {MESES.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={ano} onChange={e=>setAno(parseInt(e.target.value))} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
            {[hoje.getFullYear()-1, hoje.getFullYear(), hoje.getFullYear()+1].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {msg && <div className="mb-4 text-sm text-center py-2 rounded-lg bg-gray-50">{msg}</div>}

      {dados && (
        <>
          {/* Resumo geral — todos veem receita/despesa/lucro total */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Card className="p-4 text-center bg-green-50 border-green-100">
              <p className="text-xs text-green-700 font-medium mb-1">RECEITA TOTAL</p>
              <p className="text-2xl font-bold text-green-700">{fmt(dados.totais.receitas)}</p>
            </Card>
            <Card className="p-4 text-center bg-red-50 border-red-100">
              <p className="text-xs text-red-700 font-medium mb-1">DESPESAS TOTAL</p>
              <p className="text-2xl font-bold text-red-700">{fmt(dados.totais.despesas)}</p>
            </Card>
            <Card className="p-4 text-center bg-blue-50 border-blue-100">
              <p className="text-xs text-blue-700 font-medium mb-1">LUCRO LÍQUIDO</p>
              <p className="text-2xl font-bold text-blue-700">{fmt(dados.totais.lucro_liquido)}</p>
            </Card>
          </div>

          {/* SUPERADMIN: vê os 3 saldos + botão fechar mês */}
          {dados.eh_superadmin && (
            <Card className="p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Saldo de cada sócio</p>
                <Btn onClick={fecharMes} disabled={salvando} className="text-xs py-1.5">
                  🔒 Fechar {MESES[mes-1]}/{ano}
                </Btn>
              </div>
              <div className="space-y-2">
                {dados.divisao.map(s => (
                  <div key={s.socio_id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{s.nome}</p>
                      <p className="text-xs text-gray-400">{s.percentual}% · este mês: {fmt(s.valor_mes)}</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{fmt(s.saldo_acumulado)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* SÓCIO (não superadmin): vê só o próprio saldo + botão retirar */}
          {!dados.eh_superadmin && dados.divisao && dados.divisao[0] && (
            <Card className="p-5 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Seu saldo disponível</p>
              <p className="text-3xl font-bold text-blue-900 mb-3">{fmt(dados.divisao[0].saldo_acumulado)}</p>
              <p className="text-xs text-blue-600 mb-4">Sua cota: {dados.divisao[0].percentual}% · este mês: {fmt(dados.divisao[0].valor_mes)} (ainda não distribuído até o fechamento)</p>
              <div className="flex gap-2">
                <input value={valorRetirada} onChange={e=>setValorRetirada(e.target.value)}
                  type="number" step="0.01" placeholder="Valor a retirar"
                  className="flex-1 border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white" />
                <Btn onClick={solicitarRetirada} disabled={salvando} className="text-sm">Solicitar retirada</Btn>
              </div>
            </Card>
          )}

          {/* Histórico de retiradas */}
          {retiradas.length > 0 && (
            <Card className="p-4 mb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                {dados.eh_superadmin ? 'Retiradas de todos os sócios' : 'Suas retiradas'}
              </p>
              <div className="space-y-1.5">
                {retiradas.map(r => (
                  <div key={r.id} className="flex items-center justify-between text-sm border-b border-gray-50 py-2">
                    <div>
                      {dados.eh_superadmin && <span className="font-medium text-gray-700">{r.socio_nome} · </span>}
                      <span className="text-gray-500">{new Date(r.solicitado_em).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{fmt(r.valor)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.status==='pago'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>
                        {r.status==='pago'?'Pago':'Pendente'}
                      </span>
                      {dados.eh_superadmin && r.status==='pendente' && (
                        <button onClick={()=>marcarPago(r.id)} className="text-xs text-blue-600 hover:underline">Marcar pago</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Receitas — só superadmin lança */}
            <Card className="p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Receitas</p>
              {dados.eh_superadmin && (
                <div className="space-y-2 mb-3">
                  <input value={formReceita.descricao} onChange={e=>setFormReceita(f=>({...f,descricao:e.target.value}))}
                    placeholder="Descrição (ex: Assinaturas Starter)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <input value={formReceita.valor} onChange={e=>setFormReceita(f=>({...f,valor:e.target.value}))}
                    type="number" step="0.01" placeholder="Valor (R$)"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <Btn onClick={adicionarReceita} disabled={salvando} className="w-full text-sm">+ Adicionar receita</Btn>
                </div>
              )}
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {dados.receitas.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Nenhuma receita lançada</p>
                ) : dados.receitas.map(r => (
                  <div key={r.id} className="flex items-center justify-between text-sm border-b border-gray-50 py-2">
                    <span className="text-gray-700">{r.descricao}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-700">{fmt(r.valor)}</span>
                      {dados.eh_superadmin && (
                        <button onClick={()=>removerReceita(r.id)} className="text-gray-300 hover:text-red-500 text-xs">✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Despesas — qualquer sócio lança, todos veem com nome de quem lançou */}
            <Card className="p-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Despesas (compartilhadas)</p>
              <div className="space-y-2 mb-3">
                <input value={formDespesa.descricao} onChange={e=>setFormDespesa(f=>({...f,descricao:e.target.value}))}
                  placeholder="Descrição (ex: VPS Hostinger)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <select value={formDespesa.categoria} onChange={e=>setFormDespesa(f=>({...f,categoria:e.target.value}))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  {CATEGORIAS.map(([id,label]) => <option key={id} value={id}>{label}</option>)}
                </select>
                <input value={formDespesa.valor} onChange={e=>setFormDespesa(f=>({...f,valor:e.target.value}))}
                  type="number" step="0.01" placeholder="Valor (R$)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <Btn onClick={adicionarDespesa} disabled={salvando} className="w-full text-sm">+ Adicionar despesa</Btn>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {dados.despesas.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">Nenhuma despesa lançada</p>
                ) : dados.despesas.map(d => (
                  <div key={d.id} className="flex items-center justify-between text-sm border-b border-gray-50 py-2">
                    <div>
                      <p className="text-gray-700">{d.descricao}</p>
                      <p className="text-xs text-gray-400">lançado por {d.lancado_por_nome || '—'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-red-700">{fmt(d.valor)}</span>
                      <button onClick={()=>removerDespesa(d.id)} className="text-gray-300 hover:text-red-500 text-xs">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
