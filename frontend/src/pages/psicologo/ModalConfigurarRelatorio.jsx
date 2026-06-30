// pages/psicologo/ModalConfigurarRelatorio.jsx
// Modal completo de configuração do laudo conforme NR-01 e imagens Fig_09 a Fig_06

import { useState, useEffect, useRef } from "react";
import { API } from "../../contexts/AuthContext";

const CORES_PADRAO = [
  { label: "Laranja Psise",     hex: "#FF8317" },
  { label: "Azul corporativo",  hex: "#1E4B8F" },
  { label: "Verde",             hex: "#1A7A4A" },
  { label: "Vinho",             hex: "#7B1C3A" },
  { label: "Cinza grafite",     hex: "#3D3D3D" },
];

const TITULOS = [
  { value: "DRPS",  label: "Diagnóstico de Riscos Psicossociais (DRPS)" },
  { value: "AEP",   label: "Avaliação Ergonômica Preliminar — Fatores de Riscos Psicossociais (AEP-FRP)" },
  { value: "IRP",   label: "Inventário de Riscos Psicossociais" },
  { value: "AFR",   label: "Avaliação dos Fatores de Riscos Psicossociais" },
  { value: "CUSTOM",label: "Personalizado..." },
];

const LIMIARES_AIHA = [
  { value: "padrao",       label: "Padrão — P×S ≥ 3 (inclui Tolerável)" },
  { value: "ps4",          label: "P×S ≥ 4" },
  { value: "ps6",          label: "P×S ≥ 6" },
  { value: "aiha_classico",label: "AIHA clássico — P×S ≥ 8 (só Moderado+)" },
  { value: "ps10",         label: "P×S ≥ 10 (apenas riscos altos)" },
];

const CONTROLES_CATALOGO = [
  // GOVERNANÇA
  { cat: "GOVERNANCA", label: "Governança e Políticas", itens: [
    { codigo: "canal_denuncias",  nome: "Canal de denúncias / ouvidoria",       desc: "Canal formal, confidencial e com tratamento estruturado para denúncias de assédio, discriminação e violações éticas." },
    { codigo: "politica_assedio", nome: "Política antiassédio formalizada",      desc: "Documento formal com regras, procedimentos de apuração e sanções para assédio moral e sexual." },
    { codigo: "codigo_etica",     nome: "Código de ética / conduta",             desc: "Documento com princípios éticos, comportamentos esperados e sanções, amplamente divulgado." },
    { codigo: "comite_diversidade",nome:"Comitê de diversidade e inclusão",      desc: "Grupo formal dedicado a promover inclusão, combater vieses e garantir equidade." },
    { codigo: "cipa_psicossocial",nome: "CIPA com pauta psicossocial ativa",     desc: "CIPA ou comissão similar que discute regularmente riscos psicossociais, não apenas físicos." },
  ]},
  // COMUNICAÇÃO
  { cat: "COMUNICACAO", label: "Comunicação e Relacionamento", itens: [
    { codigo: "pesquisa_clima",         nome: "Pesquisa de clima organizacional periódica", desc: "Aplicação regular (anual ou semestral) de pesquisa de clima com plano de ação consequente." },
    { codigo: "reunioes_estruturadas",  nome: "Reuniões de equipe estruturadas",            desc: "Rotina formal de reuniões de equipe com pauta, feedback e alinhamento de expectativas." },
    { codigo: "comunicacao_transparente",nome:"Política de comunicação transparente",       desc: "Comunicação aberta da diretoria sobre decisões estratégicas, saúde financeira e mudanças." },
    { codigo: "endomarketing",          nome: "Programa de endomarketing",                  desc: "Ações estruturadas para engajamento interno, divulgação de conquistas e cultura organizacional." },
    { codigo: "mediacao_conflitos",     nome: "Processo formal de mediação de conflitos",   desc: "Procedimento estruturado para mediação de conflitos interpessoais e entre equipes." },
  ]},
  // SAÚDE
  { cat: "SAUDE", label: "Saúde e Bem-estar", itens: [
    { codigo: "eap",         nome: "EAP — Programa de Apoio ao Empregado",    desc: "Programa de apoio psicológico confidencial com profissionais externos." },
    { codigo: "promocao_saude",nome:"Programa de promoção à saúde e bem-estar",desc: "Campanhas regulares de saúde, check-ups, ginástica laboral, nutrição, atividade física." },
  ]},
  // DESENVOLVIMENTO
  { cat: "DESENVOLVIMENTO", label: "Desenvolvimento e Carreira", itens: [
    { codigo: "pccs",             nome: "Plano de cargos, carreiras e salários (PCCS)", desc: "Estrutura formal com critérios transparentes de progressão e remuneração." },
    { codigo: "pdi",              nome: "Plano de Desenvolvimento Individual (PDI)",    desc: "Acompanhamento individual de metas de desenvolvimento com revisão periódica." },
    { codigo: "capacitacao",      nome: "Programa de capacitação técnica contínua",     desc: "Acesso regular a treinamentos técnicos, cursos e certificações." },
    { codigo: "reconhecimento",   nome: "Programa estruturado de reconhecimento",       desc: "Sistema formal de reconhecimento por desempenho, bonificação e premiações." },
  ]},
  // ORGANIZAÇÃO
  { cat: "ORGANIZACAO", label: "Organização do Trabalho", itens: [
    { codigo: "descricao_cargos",   nome: "Descrição formal de cargos e responsabilidades", desc: "Documento formal e atualizado descrevendo atribuições, competências e entregas esperadas." },
    { codigo: "flexibilidade",      nome: "Flexibilidade de jornada / home office formal",   desc: "Política formal de home office, banco de horas, horário flexível ou jornada híbrida." },
    { codigo: "rodizio_tarefas",    nome: "Rodízio formal de tarefas / funções",             desc: "Sistema estruturado de rotação de atividades para evitar monotonia e sobrecarga." },
    { codigo: "gestao_participativa",nome:"Gestão participativa / comitês de melhoria",      desc: "Mecanismos formais de participação dos colaboradores em decisões e melhorias." },
    { codigo: "mapeamento_processos",nome:"Programa de simplificação/mapeamento de processos",desc:"Iniciativas regulares de revisão e simplificação de processos de trabalho." },
  ]},
];

export default function ModalConfigurarRelatorio({ avaliacao, token, onFechar, onSalvo }) {
  const [aba, setAba] = useState("empresa");
  const [form, setForm] = useState(null);
  const [controles, setControles] = useState({});       // { codigo: true/false }
  const [personalizados, setPersonalizados] = useState([]); // [{ nome, descricao }]
  const [novoPersonalizado, setNovoPersonalizado] = useState("");
  const [corCustom, setCorCustom] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  const logoRef = useRef();

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  useEffect(() => { carregar(); }, [avaliacao?.id]);

  async function carregar() {
    if (!avaliacao?.id) return;
    try {
      const [rConfig, rControles] = await Promise.all([
        fetch(`${API}/relatorio/${avaliacao.id}`, { headers }),
        fetch(`${API}/relatorio/${avaliacao.id}/controles`, { headers }),
      ]);
      const config = await rConfig.json();
      const ctrlList = await rControles.json();

      setForm({
        logo_empresa:          config.logo_empresa || "",
        nome_empresa:          config.nome_empresa || avaliacao.empresa_nome || "",
        cnpj:                  config.cnpj || "",
        setor_economico:       config.setor_economico || "",
        descricao_atividades:  config.descricao_atividades || "",
        responsavel_nome:      config.responsavel_nome || "",
        responsavel_cargo:     config.responsavel_cargo || "Psicólogo(a)",
        responsavel_registro:  config.responsavel_registro || "",
        periodo_avaliacao:     config.periodo_avaliacao || "",
        total_colaboradores:   config.total_colaboradores || "",
        taxa_adesao_minima:    config.taxa_adesao_minima ?? 60,
        aplicar_meta_adesao:   config.aplicar_meta_adesao ?? true,
        absenteismo_pct:       config.absenteismo_pct || "",
        afastamentos_cidf_pct: config.afastamentos_cidf_pct || "",
        turnover_pct:          config.turnover_pct || "",
        horas_perdidas:        config.horas_perdidas || "",
        limiar_aiha:           config.limiar_aiha || "padrao",
        cor_laudo:             config.cor_laudo || "#FF8317",
        titulo_tecnico:        config.titulo_tecnico || "DRPS",
        titulo_personalizado:  config.titulo_personalizado || "",
        incluir_plano_acao:    config.incluir_plano_acao ?? true,
        // Conformidade NR-01
        pgr_referencia:        config.pgr_referencia || "",
        aep_referencia:        config.aep_referencia || "",
        fontes_complementares: config.fontes_complementares || [],
        fontes_obs:            config.fontes_complementares_obs || "",
        tipo_documento:        config.tipo_documento || "auto",
      });

      // Monta mapa de controles marcados
      const mapa = {};
      const pers = [];
      ctrlList.forEach(c => {
        if (c.personalizado) pers.push({ nome: c.nome, descricao: c.descricao });
        else mapa[c.codigo] = true;
      });
      setControles(mapa);
      setPersonalizados(pers);

      // Se cor não está nos padrões, é custom
      const isPadrao = CORES_PADRAO.some(c => c.hex === config.cor_laudo);
      if (!isPadrao && config.cor_laudo) setCorCustom(config.cor_laudo);
    } catch (e) {
      console.error(e);
    }
  }

  function upd(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }));
  }

  function toggleControle(codigo) {
    setControles(c => ({ ...c, [codigo]: !c[codigo] }));
  }

  function handleLogo(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) { alert("Logo muito grande. Máximo 500KB."); return; }
    const reader = new FileReader();
    reader.onload = ev => upd("logo_empresa", ev.target.result);
    reader.readAsDataURL(file);
  }

  function adicionarPersonalizado() {
    if (!novoPersonalizado.trim()) return;
    setPersonalizados(p => [...p, { nome: novoPersonalizado.trim(), descricao: "" }]);
    setNovoPersonalizado("");
  }

  async function salvar() {
    setSalvando(true); setMsg("");
    try {
      // Salva configuração
      const r1 = await fetch(`${API}/relatorio/${avaliacao.id}`, {
        method: "POST", headers,
        body: JSON.stringify(form),
      });
      if (!r1.ok) throw new Error((await r1.json()).erro);

      // Monta lista de controles
      const listaControles = [];
      CONTROLES_CATALOGO.forEach(grupo => {
        grupo.itens.forEach(item => {
          if (controles[item.codigo]) {
            listaControles.push({
              categoria: grupo.cat, codigo: item.codigo,
              nome: item.nome, descricao: item.desc, personalizado: false,
            });
          }
        });
      });
      personalizados.forEach((p, i) => {
        listaControles.push({
          categoria: "PERSONALIZADO", codigo: `custom_${i}`,
          nome: p.nome, descricao: p.descricao || "", personalizado: true,
        });
      });

      const r2 = await fetch(`${API}/relatorio/${avaliacao.id}/controles`, {
        method: "POST", headers,
        body: JSON.stringify({ controles: listaControles }),
      });
      if (!r2.ok) throw new Error((await r2.json()).erro);

      setMsg("✅ Configurações salvas!");
      setTimeout(() => { onSalvo?.(); onFechar(); }, 800);
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    } finally {
      setSalvando(false);
    }
  }

  if (!form) return (
    <div style={estilos.overlay}>
      <div style={{ ...estilos.modal, display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
        <p style={{ color: "#94a3b8" }}>Carregando...</p>
      </div>
    </div>
  );

  const ABAS = [
    { id: "empresa",       label: "📋 Empresa" },
    { id: "responsavel",   label: "👤 Responsável" },
    { id: "indicadores",   label: "📊 Indicadores" },
    { id: "layout",        label: "🎨 Layout" },
    { id: "controles",     label: "✅ Controles" },
    { id: "conformidade",  label: "📎 Conformidade NR-01" },
  ];

  return (
    <div style={estilos.overlay} onClick={e => e.target === e.currentTarget && onFechar()}>
      <div style={estilos.modal}>
        {/* Cabeçalho */}
        <div style={estilos.header}>
          <div>
            <h2 style={estilos.titulo}>Configurar Relatório</h2>
            <p style={estilos.subtitulo}>{avaliacao?.empresa_nome} — {avaliacao?.setor_nome}</p>
          </div>
          <button onClick={onFechar} style={estilos.btnClose}>×</button>
        </div>

        {/* Abas */}
        <div style={estilos.abas}>
          {ABAS.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)}
              style={{ ...estilos.aba, ...(aba === a.id ? estilos.abaAtiva : {}) }}>
              {a.label}
            </button>
          ))}
        </div>

        {/* Conteúdo das abas */}
        <div style={estilos.corpo}>

          {/* ABA: EMPRESA */}
          {aba === "empresa" && (
            <div style={estilos.secao}>
              <p style={estilos.hint}>
                Preencha os dados da empresa-cliente. Estas informações aparecem no cabeçalho do laudo
                e atendem ao item 1.5.7.3.2 da NR-01.
              </p>

              {/* Logo */}
              <div style={{ marginBottom: 16 }}>
                <label style={estilos.label}>Logo da empresa (PNG/JPG, máx. 500KB)</label>
                {form.logo_empresa ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img src={form.logo_empresa} alt="Logo" style={{ height: 60, borderRadius: 8, border: "1px solid #334155" }} />
                    <button onClick={() => upd("logo_empresa", "")} style={estilos.btnRemover}>Remover</button>
                  </div>
                ) : (
                  <div style={estilos.uploadBox} onClick={() => logoRef.current?.click()}>
                    <span style={{ fontSize: 28 }}>🖼️</span>
                    <span style={{ color: "#64748b", fontSize: 13 }}>Clique para enviar</span>
                    <input ref={logoRef} type="file" accept="image/png,image/jpeg" style={{ display: "none" }} onChange={handleLogo} />
                  </div>
                )}
              </div>

              <Campo label="Nome da empresa *" placeholder="Ex: Empresa ABC Ltda"
                value={form.nome_empresa} onChange={v => upd("nome_empresa", v)} />
              <Campo label="CNPJ" placeholder="00.000.000/0000-00"
                value={form.cnpj} onChange={v => upd("cnpj", v)} />
              <Campo label="Setor econômico" placeholder="Ex: Construção Civil, Saúde, Educação"
                value={form.setor_economico} onChange={v => upd("setor_economico", v)} />

              <div style={{ marginBottom: 16 }}>
                <label style={estilos.label}>
                  Caracterização das atividades (NR-01 item 1.5.7.3.2 b)
                </label>
                <textarea value={form.descricao_atividades}
                  onChange={e => upd("descricao_atividades", e.target.value)}
                  placeholder="Descreva brevemente as atividades principais realizadas no setor avaliado..."
                  rows={3} style={{ ...estilos.input, resize: "vertical" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Campo label="Período da avaliação" placeholder="Ex: Janeiro a Março 2026"
                  value={form.periodo_avaliacao} onChange={v => upd("periodo_avaliacao", v)} />
                <Campo label="Quadro total de colaboradores" placeholder="Ex: 50" type="number"
                  value={form.total_colaboradores} onChange={v => upd("total_colaboradores", v)} />
              </div>
            </div>
          )}

          {/* ABA: RESPONSÁVEL */}
          {aba === "responsavel" && (
            <div style={estilos.secao}>
              <p style={estilos.hint}>
                Dados do responsável técnico que assina o laudo. Podem ser múltiplos profissionais
                separados por "/".
              </p>
              <Campo label="Nome do responsável técnico *" placeholder="Ex: Dr. João Silva"
                value={form.responsavel_nome} onChange={v => upd("responsavel_nome", v)} />
              <Campo label="Cargo/Profissão" placeholder="Ex: Psicólogo(a), Médico(a) do Trabalho, Eng. de Segurança"
                value={form.responsavel_cargo} onChange={v => upd("responsavel_cargo", v)} />
              <Campo label="Registro Profissional (CRP/CRM/CREA)" placeholder="Ex: CRP 06/123456 / CRM BA 6019"
                value={form.responsavel_registro} onChange={v => upd("responsavel_registro", v)} />
              <p style={{ ...estilos.hint, marginTop: 4 }}>
                Múltiplos registros: separe com " / " (espaço, barra, espaço)
              </p>
            </div>
          )}

          {/* ABA: INDICADORES */}
          {aba === "indicadores" && (
            <div style={estilos.secao}>
              <p style={estilos.hint}>
                Indicadores complementares (opcionais). Quando preenchidos, aparecem como seção
                dedicada no PDF do laudo — a interpretação técnica fica por conta do responsável.
                Atendem NR-01 itens 1.5.4.4.5.3 e 1.5.4.4.6.1.
              </p>

              <div style={estilos.blocoDestaque}>
                <p style={{ color: "#fbbf24", fontSize: 13, fontWeight: 500, marginBottom: 12 }}>
                  📊 Indicadores Complementares da Empresa-Cliente (opcional)
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Campo label="Absenteísmo (%)" placeholder="Ex: 4.5" type="number"
                    value={form.absenteismo_pct} onChange={v => upd("absenteismo_pct", v)} />
                  <Campo label="Afastamentos CID-F (%)" placeholder="Ex: 1.2" type="number"
                    value={form.afastamentos_cidf_pct} onChange={v => upd("afastamentos_cidf_pct", v)} />
                  <Campo label="Turnover anual (%)" placeholder="Ex: 18" type="number"
                    value={form.turnover_pct} onChange={v => upd("turnover_pct", v)} />
                  <Campo label="Horas perdidas (faltas + afastamentos)" placeholder="Ex: 320" type="number"
                    value={form.horas_perdidas} onChange={v => upd("horas_perdidas", v)} />
                </div>
                <p style={{ color: "#64748b", fontSize: 11, marginTop: 8 }}>
                  Referência: absenteísmo &lt; 2% normal · 2-3% atenção · &gt; 3% crítico
                </p>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={estilos.label}>
                  Taxa mínima de adesão (%) — boa prática epidemiológica
                </label>
                <input type="number" min={0} max={100}
                  value={form.taxa_adesao_minima}
                  onChange={e => upd("taxa_adesao_minima", e.target.value)}
                  style={{ ...estilos.input, width: 120 }} />
                <p style={{ color: "#64748b", fontSize: 11, marginTop: 4 }}>
                  Parâmetro técnico: 60% mínimo aceitável, 70% boa qualidade, 80%+ excelente.
                  NR-01, ISO 45001/45003 e Guia MTE 2025 não fixam percentual mínimo.
                </p>
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.aplicar_meta_adesao}
                    onChange={e => upd("aplicar_meta_adesao", e.target.checked)} />
                  <span style={{ color: "#e2e8f0", fontSize: 13 }}>
                    Aplicar meta de adesão neste laudo
                  </span>
                </label>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={estilos.label}>Limiar de tolerabilidade — Matriz AIHA</label>
                <p style={{ color: "#64748b", fontSize: 11, marginBottom: 8 }}>
                  Define a partir de qual P×S uma dimensão amarela do COPSOQ é levada ao
                  Inventário/Plano de Ação. Abaixo do limiar, é tratada como risco aceitável
                  (reclassificada como verde).
                </p>
                <select value={form.limiar_aiha} onChange={e => upd("limiar_aiha", e.target.value)}
                  style={estilos.input}>
                  {LIMIARES_AIHA.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
                {form.limiar_aiha === "padrao" && (
                  <p style={{ color: "#fbbf24", fontSize: 11, marginTop: 4 }}>
                    ⚠️ Mais conservador/protetivo. Toda dimensão amarela com risco não-trivial entra no PGR.
                    Recomendado para evitar subclassificação em auditoria.
                  </p>
                )}
                {(form.limiar_aiha === "aiha_classico" || form.limiar_aiha === "ps10") && (
                  <p style={{ color: "#fb923c", fontSize: 11, marginTop: 4 }}>
                    ⚠️ Limiares mais altos reduzem itens no PGR. Use com critério técnico —
                    excluir fatores identificados pode ser questionado em auditoria.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ABA: LAYOUT */}
          {aba === "layout" && (
            <div style={estilos.secao}>
              <p style={estilos.hint}>
                Personalize a identidade visual do laudo. Aplica-se apenas ao PDF do laudo.
                As zonas de risco (verde/amarelo/vermelho) permanecem fixas — são padrão científico
                do COPSOQ II.
              </p>

              <div style={{ marginBottom: 20 }}>
                <label style={estilos.label}>Cor do laudo (caps, títulos e bordas)</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                  {CORES_PADRAO.map(c => (
                    <button key={c.hex} onClick={() => { upd("cor_laudo", c.hex); setCorCustom(""); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 14px", borderRadius: 8,
                        border: form.cor_laudo === c.hex ? "2px solid #a5b4fc" : "1px solid #334155",
                        background: form.cor_laudo === c.hex ? "#1e293b" : "transparent",
                        cursor: "pointer", color: "#e2e8f0", fontSize: 13,
                      }}>
                      <span style={{ width: 16, height: 16, borderRadius: "50%", background: c.hex, display: "inline-block", flexShrink: 0 }} />
                      {c.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="color" value={corCustom || form.cor_laudo}
                    onChange={e => { setCorCustom(e.target.value); upd("cor_laudo", e.target.value); }}
                    style={{ width: 44, height: 36, borderRadius: 6, border: "1px solid #334155", cursor: "pointer", padding: 2, background: "#1e293b" }} />
                  <span style={{ color: "#94a3b8", fontSize: 13 }}>
                    {corCustom ? corCustom.toUpperCase() : "Ou escolha uma cor personalizada"}
                  </span>
                </div>
                {form.cor_laudo && (
                  <p style={{ color: "#ef4444", fontSize: 11, marginTop: 6 }}>
                    ⚠️ Cor muito clara pode prejudicar a legibilidade dos textos brancos sobre os blocos coloridos do laudo.
                  </p>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={estilos.label}>Título técnico do relatório (aparece no topo e no nome do arquivo)</label>
                <select value={form.titulo_tecnico} onChange={e => upd("titulo_tecnico", e.target.value)}
                  style={estilos.input}>
                  {TITULOS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                {form.titulo_tecnico === "CUSTOM" && (
                  <input type="text" placeholder="Digite o título personalizado"
                    value={form.titulo_personalizado}
                    onChange={e => upd("titulo_personalizado", e.target.value)}
                    style={{ ...estilos.input, marginTop: 8 }} />
                )}
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={form.incluir_plano_acao}
                  onChange={e => upd("incluir_plano_acao", e.target.checked)} />
                <span style={{ color: "#e2e8f0", fontSize: 14 }}>Incluir Plano de Ação no PDF</span>
              </label>
            </div>
          )}

          {/* ABA: CONTROLES IMPLANTADOS */}
          {aba === "controles" && (
            <div style={estilos.secao}>
              <div style={estilos.blocoDestaque}>
                <p style={{ color: "#86efac", fontSize: 13, fontWeight: 500 }}>✅ Como funciona</p>
                <ul style={{ color: "#94a3b8", fontSize: 12, marginTop: 6, paddingLeft: 16, lineHeight: 1.8 }}>
                  <li>Marque os controles <strong style={{ color: "#e2e8f0" }}>já implantados</strong> na organização</li>
                  <li>O sistema evita sugerir essas ações no Plano de Ação</li>
                  <li>Lista os controles declarados no relatório</li>
                  <li>Sinaliza divergências (controle declarado mas risco ainda vermelho → revisar eficácia)</li>
                </ul>
              </div>

              {CONTROLES_CATALOGO.map(grupo => (
                <div key={grupo.cat} style={{ marginBottom: 20 }}>
                  <p style={estilos.labelCategoria}>{grupo.label.toUpperCase()}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {grupo.itens.map(item => (
                      <label key={item.codigo} style={{
                        ...estilos.cardControle,
                        borderColor: controles[item.codigo] ? "#6366f1" : "#334155",
                        background: controles[item.codigo] ? "#1e2d5a" : "#1e293b",
                        cursor: "pointer",
                      }}>
                        <input type="checkbox" checked={!!controles[item.codigo]}
                          onChange={() => toggleControle(item.codigo)}
                          style={{ flexShrink: 0, marginTop: 2 }} />
                        <div>
                          <p style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 500 }}>{item.nome}</p>
                          <p style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{item.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {/* Controles personalizados */}
              <div>
                <p style={estilos.labelCategoria}>CONTROLES PERSONALIZADOS</p>
                <p style={{ color: "#64748b", fontSize: 12, marginBottom: 10 }}>
                  Adicione controles específicos da organização que não estão listados acima.
                </p>
                {personalizados.map((p, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ ...estilos.input, flex: 1, padding: "6px 10px", fontSize: 12 }}>{p.nome}</span>
                    <button onClick={() => setPersonalizados(ps => ps.filter((_, j) => j !== i))}
                      style={{ color: "#f87171", background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>×</button>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <input type="text" placeholder="Ex: Programa de mentoria interna"
                    value={novoPersonalizado}
                    onChange={e => setNovoPersonalizado(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && adicionarPersonalizado()}
                    style={{ ...estilos.input, flex: 1 }} />
                  <button onClick={adicionarPersonalizado} style={estilos.btnAdicionar}>
                    + Adicionar
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* ABA: CONFORMIDADE NR-01 */}
          {aba === "conformidade" && (
            <div style={estilos.secao}>
              <p style={estilos.hint}>
                Campos obrigatórios para conformidade com a NR-01 (Portaria MTE 1.419/2024).
                Conforme orientação do MTE (maio/2026), o diagnóstico deve ser integrado ao PGR/AEP
                da empresa e complementado por outras fontes além do questionário.
              </p>

              {/* Tipo de documento */}
              <div style={{ marginBottom: 20 }}>
                <label style={estilos.label}>Tipo de documento (adapta título e linguagem do laudo)</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                  {[
                    { value: "auto",       label: "🤖 Automático — definido pelo perfil do usuário logado" },
                    { value: "psicologo",  label: "🧠 Relatório Técnico Psicológico (Psicólogo — CRP) — padrão CFP 06/2019" },
                    { value: "sst",        label: "⚙️ Relatório Técnico de Avaliação de Riscos Psicossociais (Técnico SST / Eng.)" },
                    { value: "rh",         label: "👥 Relatório de Diagnóstico de Fatores de Risco Psicossociais (RH / Gestor)" },
                    { value: "aep",        label: "📐 Avaliação Ergonômica Preliminar — Fatores Psicossociais (AEP-FRP)" },
                  ].map(op => (
                    <label key={op.value} style={{ display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                      border: `1px solid ${form.tipo_documento === op.value ? "#4f46e5" : "#334155"}`,
                      background: form.tipo_documento === op.value ? "#4f46e522" : "#0f172a" }}>
                      <input type="radio" name="tipo_documento" value={op.value}
                        checked={form.tipo_documento === op.value}
                        onChange={() => upd("tipo_documento", op.value)} />
                      <span style={{ color: form.tipo_documento === op.value ? "#a5b4fc" : "#94a3b8", fontSize: 13 }}>
                        {op.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Vínculo PGR/AEP */}
              <div style={{ ...estilos.blocoDestaque, borderColor: "#1e3a5f" }}>
                <p style={{ color: "#93c5fd", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                  📁 Vínculo com PGR/AEP da Empresa
                </p>
                <p style={{ color: "#64748b", fontSize: 12, marginBottom: 14, lineHeight: 1.6 }}>
                  Conforme NR-01 item 1.5.4.4.6.1, os resultados devem ser integrados ao Programa de
                  Gerenciamento de Riscos (PGR) ou à Avaliação Ergonômica Preliminar (AEP) da empresa.
                  Informe a referência do documento mestre onde este diagnóstico será integrado.
                </p>
                <Campo label="Referência do PGR (número, data ou identificador)"
                  placeholder="Ex: PGR-2026-001 / Revisão 02 / Março 2026"
                  value={form.pgr_referencia} onChange={v => upd("pgr_referencia", v)} />
                <Campo label="Referência da AEP (se aplicável)"
                  placeholder="Ex: AEP-Setor-Administrativo-2026"
                  value={form.aep_referencia} onChange={v => upd("aep_referencia", v)} />
                {!form.pgr_referencia && !form.aep_referencia && (
                  <p style={{ color: "#f87171", fontSize: 12, marginTop: 4 }}>
                    ⚠️ Recomendado preencher ao menos um — aumenta a validade do documento perante o MTE.
                  </p>
                )}
              </div>

              {/* Fontes complementares */}
              <div style={{ ...estilos.blocoDestaque, borderColor: "#1e3a5f" }}>
                <p style={{ color: "#93c5fd", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                  🔍 Fontes Complementares de Evidência
                </p>
                <p style={{ color: "#64748b", fontSize: 12, marginBottom: 14, lineHeight: 1.6 }}>
                  O MTE orienta que o diagnóstico não se baseie apenas no questionário. Marque as
                  demais fontes utilizadas nesta avaliação.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                  {[
                    { value: "entrevistas",      label: "🎤 Entrevistas com colaboradores" },
                    { value: "grupos_focais",    label: "👥 Grupos focais / dinâmicas" },
                    { value: "observacao_local", label: "👁️ Observação in loco" },
                    { value: "dados_absenteismo",label: "📉 Dados de absenteísmo" },
                    { value: "dados_afastamento",label: "🏥 Dados de afastamentos (CID F)" },
                    { value: "dados_turnover",   label: "🔄 Dados de turnover" },
                    { value: "pcmso",            label: "📋 Relatório do PCMSO" },
                    { value: "nr17_aet",         label: "⚖️ AET — Análise Ergonômica do Trabalho" },
                    { value: "cipa",             label: "🦺 Registros da CIPA" },
                    { value: "esocial",          label: "💻 Dados do eSocial" },
                  ].map(fonte => {
                    const marcado = (form.fontes_complementares || []).includes(fonte.value);
                    return (
                      <label key={fonte.value} style={{ display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                        border: `1px solid ${marcado ? "#1d4ed8" : "#334155"}`,
                        background: marcado ? "#1d4ed822" : "#0f172a" }}>
                        <input type="checkbox" checked={marcado}
                          onChange={() => {
                            const atual = form.fontes_complementares || [];
                            upd("fontes_complementares", marcado
                              ? atual.filter(f => f !== fonte.value)
                              : [...atual, fonte.value]);
                          }} />
                        <span style={{ color: marcado ? "#93c5fd" : "#94a3b8", fontSize: 12 }}>
                          {fonte.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div style={{ marginBottom: 0 }}>
                  <label style={estilos.label}>Outras fontes / observações adicionais</label>
                  <textarea value={form.fontes_obs}
                    onChange={e => upd("fontes_obs", e.target.value)}
                    placeholder="Ex: Análise de registros de ocorrências de RH do último semestre, entrevistas com lideranças..."
                    rows={3} style={{ ...estilos.input, resize: "vertical" }} />
                </div>
              </div>

              {/* Aviso final */}
              <div style={{ background: "#14532d22", border: "1px solid #14532d66",
                borderRadius: 10, padding: "12px 16px" }}>
                <p style={{ color: "#86efac", fontSize: 12, margin: 0, lineHeight: 1.7 }}>
                  ✅ Com PGR/AEP referenciado e ao menos uma fonte complementar marcada, este laudo
                  atende plenamente às exigências do item 1.5.4.4.6.1 da NR-01 e à orientação do MTE
                  publicada em maio/2026 sobre gestão de riscos psicossociais.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Rodapé */}
        <div style={estilos.rodape}>
          {msg && (
            <span style={{ fontSize: 13, color: msg.startsWith("✅") ? "#86efac" : "#f87171" }}>
              {msg}
            </span>
          )}
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button onClick={onFechar} style={estilos.btnCancelar}>Cancelar</button>
            <button onClick={salvar} disabled={salvando} style={estilos.btnSalvar}>
              {salvando ? "Salvando..." : "💾 Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-componente Campo ────────────────────────────────────────────────────
function Campo({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={estilos.label}>{label}</label>
      <input type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)} style={estilos.input} />
    </div>
  );
}

// ── Estilos ─────────────────────────────────────────────────────────────────
const estilos = {
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,.75)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: 16,
  },
  modal: {
    background: "#1e293b", border: "1px solid #334155", borderRadius: 16,
    width: "100%", maxWidth: 680, maxHeight: "92vh",
    display: "flex", flexDirection: "column", overflow: "hidden",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    padding: "20px 24px 16px", borderBottom: "1px solid #334155", flexShrink: 0,
  },
  titulo:    { color: "#f1f5f9", fontSize: 18, fontWeight: 700, margin: 0 },
  subtitulo: { color: "#64748b", fontSize: 13, marginTop: 3 },
  btnClose:  { background: "none", border: "none", color: "#64748b", fontSize: 24, cursor: "pointer", lineHeight: 1 },
  abas: {
    display: "flex", gap: 2, padding: "0 24px",
    borderBottom: "1px solid #334155", flexShrink: 0, overflowX: "auto",
  },
  aba: {
    padding: "10px 14px", background: "none", border: "none",
    color: "#64748b", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
    borderBottom: "2px solid transparent",
  },
  abaAtiva: { color: "#a5b4fc", borderBottom: "2px solid #6366f1" },
  corpo: { flex: 1, overflowY: "auto", padding: "20px 24px" },
  secao: {},
  hint: { color: "#94a3b8", fontSize: 12, lineHeight: 1.6, marginBottom: 16, padding: "10px 12px", background: "#0f172a", borderRadius: 8, border: "1px solid #334155" },
  label: { display: "block", color: "#94a3b8", fontSize: 12, fontWeight: 500, marginBottom: 5 },
  input: {
    width: "100%", padding: "8px 12px",
    background: "#0f172a", border: "1px solid #334155",
    borderRadius: 8, color: "#f1f5f9", fontSize: 13,
    outline: "none", boxSizing: "border-box",
  },
  uploadBox: {
    border: "2px dashed #334155", borderRadius: 10,
    padding: "20px", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 6, cursor: "pointer",
    background: "#0f172a",
  },
  btnRemover: {
    padding: "4px 12px", borderRadius: 6,
    background: "transparent", border: "1px solid #ef4444",
    color: "#f87171", fontSize: 12, cursor: "pointer",
  },
  blocoDestaque: {
    background: "#0f172a", border: "1px solid #334155",
    borderRadius: 10, padding: 16, marginBottom: 20,
  },
  labelCategoria: {
    color: "#64748b", fontSize: 11, fontWeight: 600,
    letterSpacing: "0.08em", marginBottom: 8,
  },
  cardControle: {
    display: "flex", alignItems: "flex-start", gap: 10,
    padding: "10px 12px", borderRadius: 8,
    border: "1px solid #334155", background: "#1e293b",
    transition: "all .15s",
  },
  btnAdicionar: {
    padding: "8px 14px", borderRadius: 8,
    background: "#4f46e5", color: "#fff",
    border: "none", fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
  },
  rodape: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "14px 24px", borderTop: "1px solid #334155", flexShrink: 0,
  },
  btnCancelar: {
    padding: "8px 18px", borderRadius: 8,
    background: "transparent", border: "1px solid #334155",
    color: "#94a3b8", fontSize: 13, cursor: "pointer",
  },
  btnSalvar: {
    padding: "8px 22px", borderRadius: 8,
    background: "#4f46e5", color: "#fff",
    border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
};
