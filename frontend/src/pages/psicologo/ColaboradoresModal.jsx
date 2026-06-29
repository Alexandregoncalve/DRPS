// pages/psicologo/ColaboradoresModal.jsx
// Modal para importar colaboradores via Excel/CSV e disparar WhatsApp

import { useState, useRef } from "react";
import { API } from "../../contexts/AuthContext";
import * as XLSX from "xlsx";

export default function ColaboradoresModal({ avaliacao, token, onFechar }) {
  const [aba, setAba] = useState("importar"); // importar | status
  const [linhas, setLinhas] = useState([]); // [{telefone, setor}]
  const [diasExp, setDiasExp] = useState(10);
  const [msgCustom, setMsgCustom] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [colaboradores, setColaboradores] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [reenviando, setReenviando] = useState(null);
  const fileRef = useRef();

  const [reenviandoTodos, setReenviandoTodos] = useState(false);
  const [msgReenvio, setMsgReenvio] = useState("");

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  // Carrega status dos colaboradores
  async function carregarStatus() {
    setCarregando(true);
    try {
      const r = await fetch(`${API}/colaboradores/${avaliacao.id}`, { headers });
      const d = await r.json();
      setColaboradores(d.colaboradores || []);
    } catch (e) {}
    setCarregando(false);
  }

  // Reenviar para todos os pendentes
  async function reenviarTodos() {
    const pendentes = colaboradores.filter(c => !c.respondeu);
    if (pendentes.length === 0) return;
    setReenviandoTodos(true); setMsgReenvio(`⏳ Reenviando para ${pendentes.length} pendentes...`);
    let ok = 0; let erro = 0;
    for (const c of pendentes) {
      try {
        const r = await fetch(`${API}/colaboradores/${avaliacao.id}/reenviar/${c.id}`, { method: "POST", headers });
        const d = await r.json();
        if (d.ok) ok++; else erro++;
      } catch(e) { erro++; }
      await new Promise(r => setTimeout(r, 800));
    }
    setMsgReenvio(`✅ ${ok} enviados · ${erro} erros`);
    setReenviandoTodos(false);
    carregarStatus();
  }

  // Lê o arquivo Excel/CSV
  function handleArquivo(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const dados = XLSX.utils.sheet_to_json(ws, { header: 1 });

      // Detecta colunas automaticamente
      const linhasValidas = [];
      dados.forEach((row, i) => {
        if (i === 0) return; // pula cabeçalho
        const telefone = String(row[0] || "").replace(/\D/g, "");
        const setor = String(row[1] || "").trim();
        if (telefone.length >= 10) linhasValidas.push({ telefone, setor });
      });
      setLinhas(linhasValidas);
    };
    reader.readAsBinaryString(file);
  }

  // Envia para o backend
  async function importar() {
    if (linhas.length === 0) return;
    setEnviando(true); setResultado(null);
    try {
      const r = await fetch(`${API}/colaboradores/${avaliacao.id}/importar`, {
        method: "POST", headers,
        body: JSON.stringify({
          colaboradores: linhas,
          dias_expiracao: diasExp,
          mensagem_custom: msgCustom || undefined,
        }),
      });
      const d = await r.json();
      setResultado(d);
      if (d.ok) { setAba("status"); carregarStatus(); }
    } catch (e) { setResultado({ erro: e.message }); }
    setEnviando(false);
  }

  // Reenvia para um colaborador
  async function reenviar(id) {
    setReenviando(id);
    try {
      await fetch(`${API}/colaboradores/${avaliacao.id}/reenviar/${id}`, { method: "POST", headers });
      carregarStatus();
    } catch (e) {}
    setReenviando(null);
  }

  const COR = { enviado: "bg-green-100 text-green-700", erro: "bg-red-100 text-red-700", duplicado: "bg-yellow-100 text-yellow-700" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:16, width:"100%", maxWidth:680, maxHeight:"90vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid #334155", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <h2 style={{ color:"#f1f5f9", fontSize:18, fontWeight:700, margin:0 }}>📱 Colaboradores — WhatsApp</h2>
            <p style={{ color:"#64748b", fontSize:13, marginTop:3 }}>{avaliacao.empresa_nome} · {avaliacao.setor_nome}</p>
          </div>
          <button onClick={onFechar} style={{ background:"none", border:"none", color:"#64748b", fontSize:24, cursor:"pointer" }}>×</button>
        </div>

        {/* Abas */}
        <div style={{ display:"flex", borderBottom:"1px solid #334155", padding:"0 24px" }}>
          {[["importar","📥 Importar"],["status","📊 Status"]].map(([id, label]) => (
            <button key={id} onClick={() => { setAba(id); if (id==="status") carregarStatus(); }}
              style={{ padding:"10px 14px", background:"none", border:"none", color: aba===id ? "#6366f1" : "#64748b",
                borderBottom: aba===id ? "2px solid #6366f1" : "2px solid transparent", fontSize:13, cursor:"pointer" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>

          {/* ABA: IMPORTAR */}
          {aba === "importar" && (
            <div>
              <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:8, padding:"12px 16px", marginBottom:20 }}>
                <p style={{ color:"#94a3b8", fontSize:12, margin:0, lineHeight:1.6 }}>
                  📋 O arquivo Excel/CSV deve ter <strong style={{color:"#e2e8f0"}}>2 colunas</strong>:<br/>
                  <strong style={{color:"#6366f1"}}>Coluna A:</strong> Telefone (com DDD, ex: 51999999999)<br/>
                  <strong style={{color:"#6366f1"}}>Coluna B:</strong> Setor/Departamento (opcional)
                </p>
              </div>

              {/* Upload */}
              <div style={{ border:"2px dashed #334155", borderRadius:10, padding:24, textAlign:"center", marginBottom:16, cursor:"pointer" }}
                onClick={() => fileRef.current?.click()}>
                <p style={{ fontSize:28, margin:"0 0 8px" }}>📂</p>
                <p style={{ color:"#94a3b8", fontSize:13, margin:0 }}>Clique para selecionar o arquivo Excel ou CSV</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }} onChange={handleArquivo} />
              </div>

              {/* Preview */}
              {linhas.length > 0 && (
                <div style={{ marginBottom:16 }}>
                  <p style={{ color:"#86efac", fontSize:13, marginBottom:8 }}>✅ {linhas.length} colaborador(es) encontrado(s)</p>
                  <div style={{ background:"#0f172a", borderRadius:8, padding:12, maxHeight:160, overflowY:"auto" }}>
                    {linhas.slice(0,10).map((l, i) => (
                      <div key={i} style={{ display:"flex", gap:12, padding:"4px 0", borderBottom:"1px solid #1e293b" }}>
                        <span style={{ color:"#94a3b8", fontSize:12, width:20 }}>{i+1}.</span>
                        <span style={{ color:"#e2e8f0", fontSize:12, flex:1 }}>{l.telefone}</span>
                        <span style={{ color:"#64748b", fontSize:12 }}>{l.setor || "—"}</span>
                      </div>
                    ))}
                    {linhas.length > 10 && <p style={{ color:"#475569", fontSize:11, marginTop:6, textAlign:"center" }}>+ {linhas.length-10} mais...</p>}
                  </div>
                </div>
              )}

              {/* Configurações */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
                <div>
                  <label style={{ color:"#94a3b8", fontSize:12, display:"block", marginBottom:5 }}>Dias para expirar o link</label>
                  <input type="number" min={1} max={30} value={diasExp} onChange={e => setDiasExp(e.target.value)}
                    style={{ width:"100%", padding:"8px 12px", background:"#0f172a", border:"1px solid #334155", borderRadius:8, color:"#f1f5f9", fontSize:13 }} />
                </div>
              </div>

              <div style={{ marginBottom:16 }}>
                <label style={{ color:"#94a3b8", fontSize:12, display:"block", marginBottom:5 }}>
                  Mensagem personalizada (opcional) — use {'{link}'} e {'{empresa}'}
                </label>
                <textarea value={msgCustom} onChange={e => setMsgCustom(e.target.value)}
                  placeholder="Deixe em branco para usar a mensagem padrão..."
                  rows={4} style={{ width:"100%", padding:"8px 12px", background:"#0f172a", border:"1px solid #334155",
                    borderRadius:8, color:"#f1f5f9", fontSize:12, resize:"vertical", boxSizing:"border-box" }} />
              </div>

              {/* Mensagem padrão preview */}
              <div style={{ background:"#071c24", border:"1px solid #1e3a2f", borderRadius:8, padding:"12px 16px", marginBottom:20 }}>
                <p style={{ color:"#4ade80", fontSize:11, fontWeight:700, margin:"0 0 6px" }}>PRÉVIA DA MENSAGEM PADRÃO</p>
                <p style={{ color:"#86efac", fontSize:12, margin:0, lineHeight:1.7, whiteSpace:"pre-line" }}>
                  {`Olá! 👋\n\n*${avaliacao.empresa_nome}* convida você a participar de uma avaliação anônima de saúde no trabalho.\n\n⏱️ Leva apenas 5 minutos\n🔒 Suas respostas são totalmente anônimas\n📅 Prazo: ${new Date(Date.now()+diasExp*86400000).toLocaleDateString('pt-BR')}\n\n👉 Acesse aqui:\nhttps://seu-dominio.com/responder/TOKEN_UNICO\n\n_Este link é pessoal e de uso único._`}
                </p>
              </div>

              {/* Resultado */}
              {resultado && (
                <div style={{ background: resultado.ok ? "#14532d22" : "#7f1d1d22", border:`1px solid ${resultado.ok?"#14532d":"#7f1d1d"}`, borderRadius:8, padding:"12px 16px", marginBottom:16 }}>
                  {resultado.ok ? (
                    <p style={{ color:"#86efac", fontSize:13, margin:0 }}>
                      ✅ {resultado.enviados} enviado(s) · {resultado.erros} erro(s) de {resultado.total} total
                    </p>
                  ) : (
                    <p style={{ color:"#f87171", fontSize:13, margin:0 }}>❌ {resultado.erro}</p>
                  )}
                </div>
              )}

              <button onClick={importar} disabled={enviando || linhas.length===0}
                style={{ width:"100%", padding:"12px", background: linhas.length===0?"#334155":"#4f46e5", color:"#fff",
                  border:"none", borderRadius:8, fontSize:14, fontWeight:600, cursor: linhas.length===0?"not-allowed":"pointer" }}>
                {enviando ? `⏳ Enviando... aguarde` : `📱 Importar e enviar WhatsApp (${linhas.length} contatos)`}
              </button>
            </div>
          )}

          {/* ABA: STATUS */}
          {aba === "status" && (
            <div>
              {carregando ? (
                <p style={{ color:"#94a3b8", textAlign:"center", padding:32 }}>Carregando...</p>
              ) : colaboradores.length === 0 ? (
                <p style={{ color:"#64748b", textAlign:"center", padding:32 }}>Nenhum colaborador importado ainda.</p>
              ) : (
                <div>
                  {/* Resumo com barra de progresso */}
                  <div style={{ background:"#0f172a", borderRadius:10, padding:"16px 20px", marginBottom:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                      <p style={{ color:"#f1f5f9", fontSize:14, fontWeight:600, margin:0 }}>
                        Progresso da avaliação
                      </p>
                      <p style={{ color:"#94a3b8", fontSize:13, margin:0 }}>
                        {colaboradores.filter(c=>c.respondeu).length} de {colaboradores.length} responderam
                      </p>
                    </div>
                    <div style={{ height:8, background:"#334155", borderRadius:4, overflow:"hidden", marginBottom:12 }}>
                      <div style={{
                        height:"100%", borderRadius:4, background:"#22c55e",
                        width:`${Math.round((colaboradores.filter(c=>c.respondeu).length/colaboradores.length)*100)}%`,
                        transition:"width .3s"
                      }} />
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
                      {[
                        ["Total", colaboradores.length, "#6366f1"],
                        ["Responderam", colaboradores.filter(c=>c.respondeu).length, "#22c55e"],
                        ["Enviados", colaboradores.filter(c=>c.enviado && !c.respondeu).length, "#f59e0b"],
                        ["Não enviados", colaboradores.filter(c=>!c.enviado && !c.respondeu).length, "#ef4444"],
                      ].map(([label, valor, cor]) => (
                        <div key={label} style={{ background:"#1e293b", borderRadius:8, padding:"10px", textAlign:"center" }}>
                          <p style={{ color:cor, fontSize:22, fontWeight:700, margin:0 }}>{valor}</p>
                          <p style={{ color:"#64748b", fontSize:10, margin:0 }}>{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Botão reenviar para todos pendentes */}
                  {colaboradores.filter(c=>!c.respondeu).length > 0 && (
                    <div style={{ marginBottom:16 }}>
                      <button onClick={reenviarTodos} disabled={reenviandoTodos}
                        style={{ width:"100%", padding:"10px", background:"#0f172a",
                          border:"1px solid #4f46e5", borderRadius:8, color:"#a5b4fc",
                          fontSize:13, fontWeight:600, cursor: reenviandoTodos ? "not-allowed":"pointer" }}>
                        {reenviandoTodos ? msgReenvio : `🔁 Reenviar para todos os pendentes (${colaboradores.filter(c=>!c.respondeu).length})`}
                      </button>
                      {msgReenvio && !reenviandoTodos && (
                        <p style={{ color:"#86efac", fontSize:12, textAlign:"center", margin:"6px 0 0" }}>{msgReenvio}</p>
                      )}
                    </div>
                  )}

                  {/* Lista por status */}
                  {["respondeu", "enviado", "pendente"].map(grupo => {
                    const itens = colaboradores.filter(c =>
                      grupo === "respondeu" ? c.respondeu :
                      grupo === "enviado" ? (c.enviado && !c.respondeu) :
                      (!c.enviado && !c.respondeu)
                    );
                    if (itens.length === 0) return null;
                    const configs = {
                      respondeu: { label: "✅ Responderam", cor: "#22c55e" },
                      enviado:   { label: "📤 Link enviado — aguardando resposta", cor: "#f59e0b" },
                      pendente:  { label: "⏳ Não enviado", cor: "#ef4444" },
                    };
                    return (
                      <div key={grupo} style={{ marginBottom:16 }}>
                        <p style={{ color: configs[grupo].cor, fontSize:12, fontWeight:700,
                          letterSpacing:"0.06em", margin:"0 0 8px" }}>
                          {configs[grupo].label} ({itens.length})
                        </p>
                        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                          {itens.map(c => (
                            <div key={c.id} style={{ background:"#0f172a", border:"1px solid #334155",
                              borderRadius:8, padding:"8px 12px", display:"flex",
                              alignItems:"center", justifyContent:"space-between", gap:12 }}>
                              <div style={{ flex:1 }}>
                                <p style={{ color:"#e2e8f0", fontSize:13, margin:"0 0 2px" }}>
                                  📱 {c.telefone}
                                  {c.setor && <span style={{ color:"#64748b", fontSize:11, marginLeft:8 }}>· {c.setor}</span>}
                                </p>
                                {c.enviado_em && (
                                  <p style={{ color:"#475569", fontSize:10, margin:0 }}>
                                    Enviado: {new Date(c.enviado_em).toLocaleString('pt-BR')}
                                  </p>
                                )}
                              </div>
                              {!c.respondeu && (
                                <button onClick={() => reenviar(c.id)} disabled={reenviando===c.id}
                                  style={{ padding:"4px 10px", background:"transparent",
                                    border:"1px solid #334155", borderRadius:6,
                                    color:"#94a3b8", fontSize:11, cursor:"pointer", flexShrink:0 }}>
                                  {reenviando===c.id ? "..." : "🔁 Reenviar"}
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
