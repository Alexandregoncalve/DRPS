// pages/psicologo/ImportarColaboradoresModal.jsx
// Fluxo completo: Excel → setores automáticos → avaliações → WhatsApp

import { useState, useRef } from "react";
import { API } from "../../contexts/AuthContext";
import * as XLSX from "xlsx";

export default function ImportarColaboradoresModal({ empresas, token, onFechar, onConcluido }) {
  const [empresaId, setEmpresaId] = useState("");
  const [linhas, setLinhas] = useState([]);
  const [diasExp, setDiasExp] = useState(10);
  const [dataFim, setDataFim] = useState("");
  const [msgCustom, setMsgCustom] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [progresso, setProgresso] = useState("");
  const fileRef = useRef();

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  // Agrupa por setor para preview
  const porSetor = linhas.reduce((acc, l) => {
    const s = l.setor || "Geral";
    if (!acc[s]) acc[s] = 0;
    acc[s]++;
    return acc;
  }, {});

  function handleArquivo(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const dados = XLSX.utils.sheet_to_json(ws, { header: 1 });
        const validas = [];
        dados.forEach((row, i) => {
          if (i === 0) return;
          const telefone = String(row[0] || "").replace(/\D/g, "");
          const setor = String(row[1] || "Geral").trim();
          if (telefone.length >= 10) validas.push({ telefone, setor });
        });
        setLinhas(validas);
        setResultado(null);
      } catch(e) {
        alert("Erro ao ler arquivo: " + e.message);
      }
    };
    reader.readAsBinaryString(file);
  }

  async function importar() {
    if (!empresaId) return alert("Selecione uma empresa!");
    if (linhas.length === 0) return alert("Nenhum colaborador no arquivo!");
    setEnviando(true); setResultado(null);
    setProgresso(`⏳ Processando ${linhas.length} colaboradores...`);
    try {
      const r = await fetch(`${API}/importar`, {
        method: "POST", headers,
        body: JSON.stringify({
          empresa_id: empresaId,
          colaboradores: linhas,
          dias_expiracao: diasExp,
          data_fim: dataFim || undefined,
          mensagem_custom: msgCustom || undefined,
        }),
      });
      const d = await r.json();
      setResultado(d);
      setProgresso("");
      if (d.ok) onConcluido?.();
    } catch (e) {
      setResultado({ erro: e.message });
      setProgresso("");
    }
    setEnviando(false);
  }

  const expiraPreview = new Date(Date.now() + diasExp * 86400000).toLocaleDateString('pt-BR');

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:16,
        width:"100%", maxWidth:700, maxHeight:"92vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid #334155",
          display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <h2 style={{ color:"#f1f5f9", fontSize:18, fontWeight:700, margin:0 }}>
              📥 Importar Colaboradores
            </h2>
            <p style={{ color:"#64748b", fontSize:12, marginTop:4 }}>
              Excel → Setores automáticos → Avaliações → WhatsApp
            </p>
          </div>
          <button onClick={onFechar} style={{ background:"none", border:"none", color:"#64748b", fontSize:24, cursor:"pointer" }}>×</button>
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>

          {/* Como funciona */}
          <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:8, padding:"12px 16px", marginBottom:20 }}>
            <p style={{ color:"#6366f1", fontSize:12, fontWeight:700, margin:"0 0 8px" }}>COMO FUNCIONA</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
              {[
                ["1️⃣","Seleciona empresa e Excel"],
                ["2️⃣","Setores criados automaticamente"],
                ["3️⃣","Avaliações geradas por setor"],
                ["4️⃣","Links enviados pelo WhatsApp"],
              ].map(([icon, txt]) => (
                <div key={txt} style={{ background:"#1e293b", borderRadius:6, padding:"8px 10px", textAlign:"center" }}>
                  <p style={{ fontSize:18, margin:"0 0 4px" }}>{icon}</p>
                  <p style={{ color:"#94a3b8", fontSize:10, margin:0, lineHeight:1.4 }}>{txt}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Empresa */}
          <div style={{ marginBottom:16 }}>
            <label style={{ color:"#94a3b8", fontSize:12, display:"block", marginBottom:5 }}>
              Empresa *
            </label>
            <select value={empresaId} onChange={e => setEmpresaId(e.target.value)}
              style={{ width:"100%", padding:"8px 12px", background:"#0f172a", border:"1px solid #334155",
                borderRadius:8, color:"#f1f5f9", fontSize:13 }}>
              <option value="">Selecione a empresa</option>
              {empresas.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.nome}</option>
              ))}
            </select>
          </div>

          {/* Upload Excel */}
          <div style={{ marginBottom:16 }}>
            <label style={{ color:"#94a3b8", fontSize:12, display:"block", marginBottom:5 }}>
              Arquivo Excel ou CSV *
            </label>
            <div style={{ border:"2px dashed #334155", borderRadius:10, padding:20, textAlign:"center", cursor:"pointer",
              background: linhas.length > 0 ? "#14532d22" : "transparent" }}
              onClick={() => fileRef.current?.click()}>
              <p style={{ fontSize:24, margin:"0 0 6px" }}>{linhas.length > 0 ? "✅" : "📂"}</p>
              <p style={{ color: linhas.length > 0 ? "#86efac" : "#94a3b8", fontSize:13, margin:0 }}>
                {linhas.length > 0 ? `${linhas.length} colaboradores carregados` : "Clique para selecionar Excel ou CSV"}
              </p>
              <p style={{ color:"#475569", fontSize:11, margin:"4px 0 0" }}>
                Coluna A: Telefone (com DDD) · Coluna B: Setor
              </p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv"
                style={{ display:"none" }} onChange={handleArquivo} />
            </div>
          </div>

          {/* Preview por setor */}
          {Object.keys(porSetor).length > 0 && (
            <div style={{ background:"#0f172a", borderRadius:8, padding:"12px 16px", marginBottom:16 }}>
              <p style={{ color:"#64748b", fontSize:11, fontWeight:700, letterSpacing:"0.08em", margin:"0 0 10px" }}>
                SETORES IDENTIFICADOS
              </p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {Object.entries(porSetor).map(([setor, qtd]) => (
                  <div key={setor} style={{ background:"#1e293b", border:"1px solid #334155",
                    borderRadius:6, padding:"6px 12px" }}>
                    <p style={{ color:"#e2e8f0", fontSize:12, fontWeight:600, margin:0 }}>{setor}</p>
                    <p style={{ color:"#64748b", fontSize:11, margin:0 }}>{qtd} colaborador(es)</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Configurações */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
            <div>
              <label style={{ color:"#94a3b8", fontSize:12, display:"block", marginBottom:5 }}>
                Dias para expirar o link
              </label>
              <input type="number" min={1} max={30} value={diasExp}
                onChange={e => setDiasExp(e.target.value)}
                style={{ width:"100%", padding:"8px 12px", background:"#0f172a", border:"1px solid #334155",
                  borderRadius:8, color:"#f1f5f9", fontSize:13, boxSizing:"border-box" }} />
            </div>
            <div>
              <label style={{ color:"#94a3b8", fontSize:12, display:"block", marginBottom:5 }}>
                Data de encerramento (opcional)
              </label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                style={{ width:"100%", padding:"8px 12px", background:"#0f172a", border:"1px solid #334155",
                  borderRadius:8, color:"#f1f5f9", fontSize:13, boxSizing:"border-box" }} />
            </div>
          </div>

          {/* Mensagem custom */}
          <div style={{ marginBottom:16 }}>
            <label style={{ color:"#94a3b8", fontSize:12, display:"block", marginBottom:5 }}>
              Mensagem personalizada (opcional) — use {'{link}'} e {'{empresa}'}
            </label>
            <textarea value={msgCustom} onChange={e => setMsgCustom(e.target.value)}
              placeholder="Deixe em branco para usar a mensagem padrão..."
              rows={3} style={{ width:"100%", padding:"8px 12px", background:"#0f172a",
                border:"1px solid #334155", borderRadius:8, color:"#f1f5f9",
                fontSize:12, resize:"vertical", boxSizing:"border-box" }} />
          </div>

          {/* Preview mensagem padrão */}
          <div style={{ background:"#071c24", border:"1px solid #1e3a2f", borderRadius:8,
            padding:"12px 16px", marginBottom:20 }}>
            <p style={{ color:"#4ade80", fontSize:11, fontWeight:700, margin:"0 0 6px" }}>PRÉVIA DA MENSAGEM PADRÃO</p>
            <p style={{ color:"#86efac", fontSize:12, margin:0, lineHeight:1.8, whiteSpace:"pre-line" }}>
              {`Olá! 👋\n\n*${empresas.find(e=>e.id===empresaId)?.nome||'[Empresa]'}* convida você a participar de uma avaliação anônima de saúde no trabalho.\n\n⏱️ Leva apenas 5 minutos\n🔒 Suas respostas são totalmente anônimas\n📅 Prazo: ${expiraPreview}\n\n👉 Acesse aqui:\nhttps://seu-dominio.com/responder/TOKEN_UNICO\n\n_Este link é pessoal e de uso único._`}
            </p>
          </div>

          {/* Progresso */}
          {progresso && (
            <div style={{ background:"#1e3a5f22", border:"1px solid #1e3a5f", borderRadius:8,
              padding:"10px 16px", marginBottom:16 }}>
              <p style={{ color:"#93c5fd", fontSize:13, margin:0 }}>{progresso}</p>
            </div>
          )}

          {/* Resultado */}
          {resultado && (
            <div style={{ background: resultado.ok ? "#14532d22" : "#7f1d1d22",
              border:`1px solid ${resultado.ok?"#14532d":"#7f1d1d"}`, borderRadius:8,
              padding:"14px 16px", marginBottom:16 }}>
              {resultado.ok ? (
                <div>
                  <p style={{ color:"#86efac", fontSize:14, fontWeight:700, margin:"0 0 8px" }}>
                    ✅ Importação concluída!
                  </p>
                  <p style={{ color:"#94a3b8", fontSize:13, margin:"0 0 4px" }}>
                    🏢 Empresa: {resultado.empresa}
                  </p>
                  <p style={{ color:"#94a3b8", fontSize:13, margin:"0 0 4px" }}>
                    📂 Setores criados: {resultado.setores_criados}
                  </p>
                  <p style={{ color:"#94a3b8", fontSize:13, margin:"0 0 4px" }}>
                    👥 Total colaboradores: {resultado.total_colaboradores}
                  </p>
                  <p style={{ color:"#86efac", fontSize:13, margin:"0 0 4px" }}>
                    📱 WhatsApp enviados: {resultado.enviados}
                  </p>
                  {resultado.erros > 0 && (
                    <p style={{ color:"#f87171", fontSize:13, margin:0 }}>
                      ❌ Erros: {resultado.erros}
                    </p>
                  )}
                </div>
              ) : (
                <p style={{ color:"#f87171", fontSize:13, margin:0 }}>❌ {resultado.erro}</p>
              )}
            </div>
          )}

          {/* Botão */}
          <button onClick={importar}
            disabled={enviando || linhas.length === 0 || !empresaId}
            style={{ width:"100%", padding:"14px", fontSize:14, fontWeight:600, borderRadius:8,
              border:"none", cursor: (enviando||linhas.length===0||!empresaId) ? "not-allowed":"pointer",
              background: (enviando||linhas.length===0||!empresaId) ? "#334155":"#4f46e5",
              color:"#fff" }}>
            {enviando
              ? "⏳ Processando... aguarde"
              : `🚀 Importar e enviar WhatsApp (${linhas.length} contatos · ${Object.keys(porSetor).length} setor(es))`}
          </button>
        </div>
      </div>
    </div>
  );
}
