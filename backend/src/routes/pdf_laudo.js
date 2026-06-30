// routes/pdf_laudo.js
// GET /api/pdf/laudo/:avaliacao_id  — gera PDF do laudo completo
// Busca os dados reaproveitando a rota JSON /api/laudo/:id já existente,
// e renderiza um HTML estilizado convertido para PDF via puppeteer.

const express = require('express');
const { autenticar } = require('../middleware/autenticar');
const puppeteer = require('puppeteer');

const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}`;

module.exports = (pool) => {
  const router = express.Router();

  // Função que monta o HTML do laudo a partir dos dados
  function montarHTML(dados) {
    const { avaliacao, contagem, top5, resultados, periodicidade, assinatura } = dados;

    const COR_ZONA = {
      'Crítico': { bg: '#7f1d1d', text: '#fca5a5' },
      'Alto':    { bg: '#7c2d12', text: '#fdba74' },
      'Médio':   { bg: '#713f12', text: '#fde68a' },
      'Baixo':   { bg: '#14532d', text: '#86efac' },
    };
    const corBadge = z => COR_ZONA[z] || { bg:'#334155', text:'#94a3b8' };

    const linhasResultados = [...resultados]
      .sort((a,b) => ({Crítico:4,Alto:3,Médio:2,Baixo:1}[b.matriz_risco]||0) - ({Crítico:4,Alto:3,Médio:2,Baixo:1}[a.matriz_risco]||0))
      .map(r => `
        <tr>
          <td>${r.topico_num}</td>
          <td>${r.topico_nome}</td>
          <td style="text-align:center;font-weight:700;">${parseFloat(r.media_gravidade).toFixed(2)}</td>
          <td style="text-align:center;">${r.classif_gravidade}</td>
          <td style="text-align:center;">${r.classif_probabilidade}</td>
          <td style="text-align:center;">
            <span style="background:${corBadge(r.matriz_risco).bg};color:${corBadge(r.matriz_risco).text};
              padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;">${r.matriz_risco}</span>
          </td>
        </tr>`).join('');

    const linhasTop5 = top5.map((r,i) => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
        <span style="color:#64748b;font-size:12px;font-weight:700;width:18px;">${i+1}.</span>
        <span style="flex:1;font-size:13px;color:#334155;">${r.topico_nome}</span>
        <span style="font-size:12px;font-weight:700;color:#475569;">${parseFloat(r.media_gravidade).toFixed(2)}</span>
        <span style="background:${corBadge(r.matriz_risco).bg};color:${corBadge(r.matriz_risco).text};
          padding:2px 9px;border-radius:10px;font-size:10px;font-weight:600;">${r.matriz_risco}</span>
      </div>`).join('');

    const assinaturaHTML = assinatura ? `
      <div style="margin-top:30px;padding:18px 22px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;">
        <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#166534;">✅ DOCUMENTO ASSINADO ELETRONICAMENTE</p>
        <p style="margin:0;font-size:11px;color:#475569;line-height:1.6;">
          Assinado por <strong>${assinatura.nome}</strong>${assinatura.registro ? ` (${assinatura.registro})` : ''}<br/>
          Data/Hora: ${new Date(assinatura.data).toLocaleString('pt-BR')}<br/>
          IP de origem: ${assinatura.ip}<br/>
          Hash do documento: ${assinatura.hash}<br/>
          <span style="color:#64748b;">Assinatura eletrônica simples nos termos da MP 2.200-2/2001 e Lei 14.063/2020.</span>
        </p>
      </div>` : '';

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin:0; padding:0; }
  body { font-family: Arial, sans-serif; color:#1e293b; padding: 40px; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  table { width:100%; border-collapse: collapse; margin-top: 12px; }
  th { background:#1e3a5f; color:#fff; font-size:11px; padding:8px 10px; text-align:left; }
  td { font-size:12px; padding:7px 10px; border-bottom:1px solid #e2e8f0; }
  .header { display:flex; justify-content:space-between; align-items:flex-start;
    border-left:4px solid #1e3a5f; padding:16px 20px; background:#f8fafc; border-radius:8px; margin-bottom:20px; }
  .semaforo { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:24px; }
  .semaforo div { border-radius:10px; padding:14px; text-align:center; }
  .semaforo .num { font-size:26px; font-weight:800; margin:0; }
  .semaforo .label { font-size:11px; margin:2px 0 0; opacity:.9; }
  .section-title { font-size:14px; font-weight:700; margin:24px 0 10px; border-bottom:2px solid #334155; padding-bottom:6px; }
</style></head>
<body>

  <div class="header">
    <div>
      <p style="font-size:10px;color:#1e3a5f;font-weight:700;letter-spacing:.08em;">${(avaliacao.empresa_nome||'').toUpperCase()}</p>
      <h1>DRPS — Diagnóstico de Riscos Psicossociais (NR-01)</h1>
      <p style="font-size:11px;color:#64748b;margin-top:4px;">Análise COPSOQ II · ${avaliacao.setor_nome||''}</p>
      <p style="font-size:10px;color:#94a3b8;margin-top:4px;">Responsável: ${avaliacao.psicologo_nome||''} ${avaliacao.psicologo_crp?('· '+avaliacao.psicologo_crp):''}</p>
    </div>
    <div style="text-align:center;background:#fff;border-radius:8px;padding:10px 18px;">
      <p style="font-size:22px;font-weight:800;color:#1e3a5f;margin:0;">${avaliacao.total_respostas||0}</p>
      <p style="font-size:9px;color:#64748b;margin:0;">RESPOSTAS</p>
    </div>
  </div>

  <div class="semaforo">
    <div style="background:#7f1d1d;"><p class="num" style="color:#fca5a5;">${contagem.Crítico}</p><p class="label" style="color:#fca5a5;">Crítico</p></div>
    <div style="background:#7c2d12;"><p class="num" style="color:#fdba74;">${contagem.Alto}</p><p class="label" style="color:#fdba74;">Alto</p></div>
    <div style="background:#713f12;"><p class="num" style="color:#fde68a;">${contagem.Médio}</p><p class="label" style="color:#fde68a;">Médio</p></div>
    <div style="background:#14532d;"><p class="num" style="color:#86efac;">${contagem.Baixo}</p><p class="label" style="color:#86efac;">Baixo</p></div>
  </div>

  <div class="section-title">🔴 Top 5 Riscos Prioritários</div>
  ${linhasTop5}

  <div class="section-title">📋 Resultados por Dimensão</div>
  <table>
    <thead><tr><th>#</th><th>Dimensão</th><th>Score</th><th>Gravidade</th><th>Probabilidade</th><th>Zona</th></tr></thead>
    <tbody>${linhasResultados}</tbody>
  </table>

  <div class="section-title">📅 Periodicidade de Reavaliação</div>
  <p style="font-size:12px;color:#475569;">
    Reavaliação recomendada em <strong>${periodicidade.meses} meses</strong> —
    próxima avaliação prevista para <strong>${new Date(periodicidade.proxima_avaliacao).toLocaleDateString('pt-BR')}</strong>.
  </p>
  <p style="font-size:11px;color:#94a3b8;margin-top:6px;">${periodicidade.justificativa}</p>

  ${assinaturaHTML}

  <p style="margin-top:30px;font-size:9px;color:#94a3b8;text-align:center;">
    Documento gerado pelo sistema NeXa DRPS · ${new Date().toLocaleDateString('pt-BR')}
  </p>

</body></html>`;
  }

  // GET /api/pdf/laudo/:avaliacao_id
  router.get('/laudo/:avaliacao_id', autenticar, async (req, res) => {
    let browser;
    try {
      // Reaproveita a rota JSON já existente e testada, passando o mesmo token de autenticação
      const url = req.params.avaliacao_id === 'consolidado'
        ? `${BASE_URL}/api/laudo/consolidado`
        : `${BASE_URL}/api/laudo/${req.params.avaliacao_id}`;
      const resp = await fetch(url, { headers: { Authorization: req.headers.authorization } });
      if (!resp.ok) {
        const erroBody = await resp.json().catch(() => ({}));
        return res.status(resp.status).json({ erro: erroBody.erro || 'Não foi possível carregar o laudo' });
      }
      const dados = await resp.json();

      // Busca assinatura, se já existir para esta avaliação
      let assinatura = null;
      if (req.params.avaliacao_id !== 'consolidado') {
        try {
          const { rows: assinRows } = await pool.query(
            'SELECT nome, registro, data, ip, hash FROM assinaturas_laudo WHERE avaliacao_id=$1 ORDER BY data DESC LIMIT 1',
            [req.params.avaliacao_id]
          );
          assinatura = assinRows[0] || null;
        } catch (e) { /* tabela pode não existir ainda em ambientes antigos */ }
      }

      const html = montarHTML({ ...dados, assinatura });

      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
      });
      await browser.close();

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="laudo-${req.params.avaliacao_id}.pdf"`,
      });
      res.send(pdfBuffer);
    } catch (e) {
      if (browser) await browser.close();
      console.error('[pdf laudo]', e);
      res.status(500).json({ erro: 'Erro ao gerar PDF: ' + e.message });
    }
  });

  return router;
};