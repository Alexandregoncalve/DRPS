// routes/envio_laudo.js
// POST /api/envio-laudo/:avaliacao_id  — envia o PDF do laudo por WhatsApp e/ou e-mail
// GET  /api/envio-laudo/:empresa_id/ultimo — busca último destinatário usado para essa empresa

const express = require('express');
const { autenticar, exigirPapel } = require('../middleware/autenticar');
const nodemailer = require('nodemailer');

const EVOLUTION_URL      = process.env.EVOLUTION_URL      || 'http://localhost:8081';
const EVOLUTION_KEY      = process.env.EVOLUTION_KEY      || 'drps2025';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'drps-whatsapp';
const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}`;

// Transportador de e-mail (Gmail SMTP — gratuito, requer "senha de app" do Google)
function criarTransporter() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function enviarWhatsAppDocumento(telefone, pdfBuffer, nomeArquivo, legenda) {
  const numero = telefone.replace(/\D/g, '');
  const numeroFull = (numero.startsWith('55') && numero.length >= 12) ? numero : `55${numero}`;
  const base64 = pdfBuffer.toString('base64');

  const resp = await fetch(`${EVOLUTION_URL}/message/sendMedia/${EVOLUTION_INSTANCE}`, {
    method: 'POST',
    headers: { 'apikey': EVOLUTION_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      number: numeroFull,
      mediatype: 'document',
      mimetype: 'application/pdf',
      media: base64,
      fileName: nomeArquivo,
      caption: legenda,
    }),
  });
  if (!resp.ok) {
    const erro = await resp.text();
    throw new Error('Falha ao enviar WhatsApp: ' + erro);
  }
  return true;
}

async function enviarEmailDocumento(destinatario, pdfBuffer, nomeArquivo, assunto, corpo) {
  const transporter = criarTransporter();
  if (!transporter) throw new Error('E-mail não configurado no servidor (SMTP_USER/SMTP_PASS ausentes no .env)');

  await transporter.sendMail({
    from: `"NeXa DRPS" <${process.env.SMTP_USER}>`,
    to: destinatario,
    subject: assunto,
    text: corpo,
    attachments: [{ filename: nomeArquivo, content: pdfBuffer }],
  });
  return true;
}

module.exports = (pool) => {
  const router = express.Router();

  // GET /api/envio-laudo/:empresa_id/ultimo — sugere o último destinatário usado
  router.get('/:empresa_id/ultimo', autenticar, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT canal, destinatario_email, destinatario_telefone
         FROM envios_laudo WHERE empresa_id=$1
         ORDER BY criado_em DESC LIMIT 1`,
        [req.params.empresa_id]
      );
      res.json(rows[0] || null);
    } catch (e) { res.status(500).json({ erro: e.message }); }
  });

  // GET /api/envio-laudo/historico/:avaliacao_id — histórico de envios desta avaliação
  router.get('/historico/:avaliacao_id', autenticar, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT * FROM envios_laudo WHERE avaliacao_id=$1 ORDER BY criado_em DESC`,
        [req.params.avaliacao_id]
      );
      res.json(rows);
    } catch (e) { res.status(500).json({ erro: e.message }); }
  });

  // POST /api/envio-laudo/:avaliacao_id
  // Body: { canal: 'whatsapp'|'email'|'ambos', email, telefone }
  router.post('/:avaliacao_id', autenticar, exigirPapel('admin', 'psicologo'), async (req, res) => {
    const { avaliacao_id } = req.params;
    const { canal, email, telefone } = req.body;

    if (!canal) return res.status(400).json({ erro: 'Canal de envio obrigatório' });
    if ((canal === 'email' || canal === 'ambos') && !email)
      return res.status(400).json({ erro: 'E-mail do destinatário obrigatório' });
    if ((canal === 'whatsapp' || canal === 'ambos') && !telefone)
      return res.status(400).json({ erro: 'Telefone do destinatário obrigatório' });

    try {
      // Busca empresa_id e nome para registro e mensagem
      const { rows: [info] } = await pool.query(`
        SELECT e.id as empresa_id, e.nome as empresa_nome, s.nome as setor_nome
        FROM avaliacoes a
        JOIN setores s ON s.id = a.setor_id
        JOIN empresas e ON e.id = s.empresa_id
        WHERE a.id = $1
      `, [avaliacao_id]);
      if (!info) return res.status(404).json({ erro: 'Avaliação não encontrada' });

      // Gera o PDF chamando a rota interna já existente
      const pdfResp = await fetch(`${BASE_URL}/api/pdf/laudo/${avaliacao_id}`, {
        headers: { Authorization: req.headers.authorization },
      });
      if (!pdfResp.ok) {
        const erroBody = await pdfResp.json().catch(() => ({}));
        throw new Error(erroBody.erro || 'Falha ao gerar PDF do laudo');
      }
      const pdfBuffer = Buffer.from(await pdfResp.arrayBuffer());
      const nomeArquivo = `laudo-drps-${info.empresa_nome}-${info.setor_nome}.pdf`.replace(/\s+/g, '-');

      const resultados = { whatsapp: null, email: null };

      if (canal === 'whatsapp' || canal === 'ambos') {
        try {
          await enviarWhatsAppDocumento(
            telefone, pdfBuffer, nomeArquivo,
            `📄 Laudo DRPS — ${info.empresa_nome} · ${info.setor_nome}\n\nSegue em anexo o laudo técnico de Diagnóstico de Riscos Psicossociais, assinado eletronicamente pelo responsável técnico.`
          );
          resultados.whatsapp = 'ok';
        } catch (e) { resultados.whatsapp = 'erro: ' + e.message; }
      }

      if (canal === 'email' || canal === 'ambos') {
        try {
          await enviarEmailDocumento(
            email, pdfBuffer, nomeArquivo,
            `Laudo DRPS — ${info.empresa_nome} · ${info.setor_nome}`,
            `Olá,\n\nSegue em anexo o laudo técnico de Diagnóstico de Riscos Psicossociais (NR-01) referente a ${info.empresa_nome} - ${info.setor_nome}, assinado eletronicamente pelo responsável técnico.\n\nAtenciosamente,\nNeXa DRPS`
          );
          resultados.email = 'ok';
        } catch (e) { resultados.email = 'erro: ' + e.message; }
      }

      const houveErro = (resultados.whatsapp && resultados.whatsapp !== 'ok') || (resultados.email && resultados.email !== 'ok');

      // Registra o envio (mesmo com erro parcial, para histórico)
      await pool.query(
        `INSERT INTO envios_laudo (avaliacao_id, empresa_id, canal, destinatario_email, destinatario_telefone, status, detalhe_erro, enviado_por)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [avaliacao_id, info.empresa_id, canal, email || null, telefone || null,
         houveErro ? 'erro' : 'enviado',
         houveErro ? JSON.stringify(resultados) : null,
         req.usuario.id]
      );

      if (houveErro) {
        return res.status(207).json({ ok: false, parcial: true, resultados });
      }
      res.json({ ok: true, resultados });

    } catch (e) {
      console.error('[envio-laudo]', e);
      res.status(500).json({ erro: e.message });
    }
  });

  return router;
};