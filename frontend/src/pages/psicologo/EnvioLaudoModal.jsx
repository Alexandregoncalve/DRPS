// pages/psicologo/EnvioLaudoModal.jsx
// Modal para enviar o PDF do laudo assinado por WhatsApp e/ou e-mail

import { useState, useEffect } from "react";
import { API } from "../../contexts/AuthContext";

export default function EnvioLaudoModal({ avaliacaoId, empresaId, empresaNome, setorNome, token, onFechar, onEnviado }) {
  const [canal, setCanal] = useState("whatsapp"); // whatsapp | email | ambos
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [carregandoSugestao, setCarregandoSugestao] = useState(true);

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  // Busca o último destinatário usado para esta empresa, para pré-preencher
  useEffect(() => {
    async function buscar() {
      try {
        const r = await fetch(`${API}/envio-laudo/${empresaId}/ultimo`, { headers });
        const d = await r.json();
        if (d) {
          if (d.destinatario_email) setEmail(d.destinatario_email);
          if (d.destinatario_telefone) setTelefone(d.destinatario_telefone);
          if (d.canal) setCanal(d.canal);
        }
      } catch (e) {}
      setCarregandoSugestao(false);
    }
    buscar();
  }, [empresaId]);

  async function enviar() {
    setEnviando(true); setResultado(null);
    try {
      const r = await fetch(`${API}/envio-laudo/${avaliacaoId}`, {
        method: "POST", headers,
        body: JSON.stringify({ canal, email: email || undefined, telefone: telefone || undefined }),
      });
      const d = await r.json();
      setResultado(d);
      if (d.ok) { onEnviado?.(); }
    } catch (e) {
      setResultado({ erro: e.message });
    }
    setEnviando(false);
  }

  const precisaEmail = canal === "email" || canal === "ambos";
  const precisaTelefone = canal === "whatsapp" || canal === "ambos";
  const podeEnviar = (!precisaEmail || email) && (!precisaTelefone || telefone);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex",
      alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div style={{ background:"#1e293b", border:"1px solid #334155", borderRadius:16,
        width:"100%", maxWidth:480, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        <div style={{ padding:"20px 24px 16px", borderBottom:"1px solid #334155",
          display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <h2 style={{ color:"#f1f5f9", fontSize:18, fontWeight:700, margin:0 }}>📤 Enviar Laudo</h2>
            <p style={{ color:"#64748b", fontSize:13, marginTop:3 }}>{empresaNome} · {setorNome}</p>
          </div>
          <button onClick={onFechar} style={{ background:"none", border:"none", color:"#64748b", fontSize:24, cursor:"pointer" }}>×</button>
        </div>

        <div style={{ padding:"20px 24px" }}>

          {/* Canal */}
          <p style={{ color:"#94a3b8", fontSize:12, marginBottom:8 }}>Canal de envio</p>
          <div style={{ display:"flex", gap:8, marginBottom:18 }}>
            {[
              ["whatsapp", "📱 WhatsApp"],
              ["email", "✉️ E-mail"],
              ["ambos", "📤 Ambos"],
            ].map(([id, label]) => (
              <button key={id} onClick={() => setCanal(id)}
                style={{
                  flex:1, padding:"10px 12px", borderRadius:8, fontSize:13, cursor:"pointer",
                  border: canal===id ? "1px solid #4f46e5" : "1px solid #334155",
                  background: canal===id ? "#4f46e522" : "#0f172a",
                  color: canal===id ? "#a5b4fc" : "#94a3b8",
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* Telefone */}
          {precisaTelefone && (
            <div style={{ marginBottom:14 }}>
              <label style={{ color:"#94a3b8", fontSize:12, display:"block", marginBottom:5 }}>
                Telefone do destinatário (WhatsApp)
              </label>
              <input value={telefone} onChange={e => setTelefone(e.target.value)}
                placeholder="Ex: 51999999999"
                style={{ width:"100%", padding:"8px 12px", background:"#0f172a", border:"1px solid #334155",
                  borderRadius:8, color:"#f1f5f9", fontSize:13, boxSizing:"border-box" }} />
            </div>
          )}

          {/* Email */}
          {precisaEmail && (
            <div style={{ marginBottom:14 }}>
              <label style={{ color:"#94a3b8", fontSize:12, display:"block", marginBottom:5 }}>
                E-mail do destinatário
              </label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                placeholder="rh@empresa.com.br"
                style={{ width:"100%", padding:"8px 12px", background:"#0f172a", border:"1px solid #334155",
                  borderRadius:8, color:"#f1f5f9", fontSize:13, boxSizing:"border-box" }} />
            </div>
          )}

          {!carregandoSugestao && (email || telefone) && (
            <p style={{ color:"#475569", fontSize:11, marginBottom:14 }}>
              💡 Preenchido com o último destinatário usado para esta empresa.
            </p>
          )}

          {/* Resultado */}
          {resultado && (
            <div style={{
              background: resultado.ok ? "#14532d22" : "#7f1d1d22",
              border: `1px solid ${resultado.ok ? "#14532d" : "#7f1d1d"}`,
              borderRadius:8, padding:"12px 16px", marginBottom:14 }}>
              {resultado.ok ? (
                <p style={{ color:"#86efac", fontSize:13, margin:0 }}>✅ Laudo enviado com sucesso!</p>
              ) : resultado.parcial ? (
                <div>
                  <p style={{ color:"#fde68a", fontSize:13, margin:"0 0 4px" }}>⚠️ Envio parcial:</p>
                  {resultado.resultados?.whatsapp && (
                    <p style={{ color:"#94a3b8", fontSize:12, margin:0 }}>WhatsApp: {resultado.resultados.whatsapp}</p>
                  )}
                  {resultado.resultados?.email && (
                    <p style={{ color:"#94a3b8", fontSize:12, margin:0 }}>E-mail: {resultado.resultados.email}</p>
                  )}
                </div>
              ) : (
                <p style={{ color:"#f87171", fontSize:13, margin:0 }}>❌ {resultado.erro}</p>
              )}
            </div>
          )}

          <button onClick={enviar} disabled={enviando || !podeEnviar}
            style={{ width:"100%", padding:"12px", fontSize:14, fontWeight:600, borderRadius:8,
              border:"none", cursor: (enviando||!podeEnviar) ? "not-allowed":"pointer",
              background: (enviando||!podeEnviar) ? "#334155":"#4f46e5", color:"#fff" }}>
            {enviando ? "⏳ Enviando..." : "📤 Enviar laudo agora"}
          </button>
        </div>
      </div>
    </div>
  );
}
