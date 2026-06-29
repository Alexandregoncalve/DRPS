// routes/colaboradores.js
// POST /api/colaboradores/:avaliacao_id/importar  — importa lista e envia WhatsApp
// GET  /api/colaboradores/:avaliacao_id           — lista colaboradores da avaliação
// POST /api/colaboradores/:avaliacao_id/reenviar/:id — reenvia para um colaborador

const express = require('express');
const { autenticar, exigirPapel } = require('../middleware/autenticar');
const crypto = require('crypto');

const EVOLUTION_URL = process.env.EVOLUTION_URL || 'http://localhost:8081';
const EVOLUTION_KEY = process.env.EVOLUTION_KEY || 'drps2025';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'drps-whatsapp';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:8080';

async function enviarWhatsApp(telefone, mensagem) {
  try {
    const numero = telefone.replace(/\D/g, '');
    // Remove 55 duplicado: se começar com 55 e tiver mais de 12 dígitos, usa como está
    const numeroFull = (numero.startsWith('55') && numero.length >= 12) ? numero : `55${numero}`;
    const resp = await fetch(`${EVOLUTION_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
      method: 'POST',
      headers: { 'apikey': EVOLUTION_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: numeroFull, text: mensagem }),
    });
    const data = await resp.json();
    return { ok: resp.ok, data };
  } catch (err) {
    console.error('[WhatsApp]', err.message);
    return { ok: false, erro: err.message };
  }
}

module.exports = (pool) => {
  const router = express.Router();

  // GET /api/colaboradores/:avaliacao_id
  router.get('/:avaliacao_id', autenticar, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, telefone, setor, respondeu, enviado, enviado_em, expira_em, criado_em
         FROM colaboradores WHERE avaliacao_id = $1 ORDER BY criado_em DESC`,
        [req.params.avaliacao_id]
      );
      const total = rows.length;
      const responderam = rows.filter(r => r.respondeu).length;
      const enviados = rows.filter(r => r.enviado).length;
      res.json({ colaboradores: rows, total, responderam, enviados });
    } catch (e) { res.status(500).json({ erro: e.message }); }
  });

  // POST /api/colaboradores/:avaliacao_id/importar
  // Body: { colaboradores: [{telefone, setor}], dias_expiracao: 10, mensagem_custom: '' }
  router.post('/:avaliacao_id/importar', autenticar, exigirPapel('admin','psicologo'), async (req, res) => {
    const { avaliacao_id } = req.params;
    const { colaboradores, dias_expiracao = 10, mensagem_custom } = req.body;

    if (!Array.isArray(colaboradores) || colaboradores.length === 0)
      return res.status(400).json({ erro: 'Lista de colaboradores vazia' });

    // Busca dados da avaliação para montar a mensagem
    const { rows: [aval] } = await pool.query(`
      SELECT a.*, s.nome as setor_nome, e.nome as empresa_nome
      FROM avaliacoes a
      JOIN setores s ON s.id = a.setor_id
      JOIN empresas e ON s.empresa_id = e.id
      WHERE a.id = $1
    `, [avaliacao_id]);

    if (!aval) return res.status(404).json({ erro: 'Avaliação não encontrada' });

    const expira = new Date();
    expira.setDate(expira.getDate() + parseInt(dias_expiracao));

    const resultados = [];
    let enviados = 0;
    let erros = 0;

    for (const colab of colaboradores) {
      if (!colab.telefone) continue;
      try {
        // Gera token único
        const token = crypto.randomBytes(32).toString('hex');

        // Salva no banco
        const { rows: [salvo] } = await pool.query(
          `INSERT INTO colaboradores (avaliacao_id, telefone, setor, token_unico, expira_em)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING
           RETURNING id, token_unico`,
          [avaliacao_id, colab.telefone.replace(/\D/g,''), colab.setor || null, token, expira]
        );

        if (!salvo) { resultados.push({ telefone: colab.telefone, status: 'duplicado' }); continue; }

        // Monta link e mensagem
        const link = `${FRONTEND_URL}/responder/${salvo.token_unico}`;
        const msg = mensagem_custom
          ? mensagem_custom.replace('{link}', link).replace('{empresa}', aval.empresa_nome)
          : `Olá! 👋\n\n*${aval.empresa_nome}* convida você a participar de uma avaliação anônima de saúde no trabalho.\n\n⏱️ Leva apenas 5 minutos\n🔒 Suas respostas são totalmente anônimas\n📅 Prazo: ${expira.toLocaleDateString('pt-BR')}\n\n👉 Acesse aqui:\n${link}\n\n_Este link é pessoal e de uso único._`;

        // Envia WhatsApp
        const resultado = await enviarWhatsApp(colab.telefone, msg);

        if (resultado.ok) {
          await pool.query(
            `UPDATE colaboradores SET enviado=true, enviado_em=NOW() WHERE id=$1`,
            [salvo.id]
          );
          enviados++;
          resultados.push({ telefone: colab.telefone, status: 'enviado' });
        } else {
          erros++;
          resultados.push({ telefone: colab.telefone, status: 'erro', detalhe: resultado.erro });
        }

        // Aguarda 1s entre envios para não ser bloqueado
        await new Promise(r => setTimeout(r, 1000));

      } catch (e) {
        erros++;
        resultados.push({ telefone: colab.telefone, status: 'erro', detalhe: e.message });
      }
    }

    res.json({ ok: true, total: colaboradores.length, enviados, erros, resultados });
  });

  // POST /api/colaboradores/:avaliacao_id/reenviar/:id
  router.post('/:avaliacao_id/reenviar/:id', autenticar, exigirPapel('admin','psicologo'), async (req, res) => {
    try {
      const { rows: [colab] } = await pool.query(
        'SELECT * FROM colaboradores WHERE id=$1 AND avaliacao_id=$2',
        [req.params.id, req.params.avaliacao_id]
      );
      if (!colab) return res.status(404).json({ erro: 'Colaborador não encontrado' });
      if (colab.respondeu) return res.status(400).json({ erro: 'Colaborador já respondeu' });

      const { rows: [aval] } = await pool.query(`
        SELECT a.*, e.nome as empresa_nome FROM avaliacoes a
        JOIN setores s ON s.id = a.setor_id
        JOIN empresas e ON s.empresa_id = e.id
        WHERE a.id = $1
      `, [req.params.avaliacao_id]);

      const link = `${FRONTEND_URL}/responder/${colab.token_unico}`;
      const msg = `Lembrete 🔔\n\n*${aval.empresa_nome}* aguarda sua participação na avaliação anônima de saúde no trabalho.\n\n👉 ${link}\n\n_Suas respostas são totalmente anônimas._`;

      const resultado = await enviarWhatsApp(colab.telefone, msg);

      if (resultado.ok) {
        await pool.query('UPDATE colaboradores SET enviado=true, enviado_em=NOW() WHERE id=$1', [colab.id]);
        res.json({ ok: true, mensagem: 'Lembrete enviado!' });
      } else {
        res.status(500).json({ erro: 'Falha ao enviar WhatsApp', detalhe: resultado.erro });
      }
    } catch (e) { res.status(500).json({ erro: e.message }); }
  });

  // DELETE /api/colaboradores/:avaliacao_id/limpar — remove todos que não responderam
  router.delete('/:avaliacao_id/limpar', autenticar, exigirPapel('admin','psicologo'), async (req, res) => {
    try {
      const { rowCount } = await pool.query(
        'DELETE FROM colaboradores WHERE avaliacao_id=$1 AND respondeu=false',
        [req.params.avaliacao_id]
      );
      res.json({ ok: true, removidos: rowCount });
    } catch (e) { res.status(500).json({ erro: e.message }); }
  });

  return router;
};