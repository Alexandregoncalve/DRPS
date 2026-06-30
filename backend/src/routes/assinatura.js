// routes/assinatura.js
// POST /api/assinatura/:avaliacao_id  — assina eletronicamente o laudo
// GET  /api/assinatura/:avaliacao_id  — consulta assinatura existente

const express = require('express');
const crypto = require('crypto');
const { autenticar, exigirPapel } = require('../middleware/autenticar');

module.exports = (pool) => {
  const router = express.Router();

  // GET /api/assinatura/:avaliacao_id
  router.get('/:avaliacao_id', autenticar, async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM assinaturas_laudo WHERE avaliacao_id=$1 ORDER BY data DESC LIMIT 1',
        [req.params.avaliacao_id]
      );
      res.json(rows[0] || null);
    } catch (e) { res.status(500).json({ erro: e.message }); }
  });

  // POST /api/assinatura/:avaliacao_id
  // Assinatura eletrônica simples: registra autoria com IP, timestamp e hash do conteúdo do laudo
  router.post('/:avaliacao_id', autenticar, exigirPapel('admin', 'psicologo'), async (req, res) => {
    const { avaliacao_id } = req.params;
    try {
      // Busca dados do responsável técnico (usuário logado)
      const { rows: [usuario] } = await pool.query(
        'SELECT nome, crp, email FROM usuarios WHERE id=$1', [req.usuario.id]
      );
      if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });

      // Busca o conteúdo atual dos resultados para gerar o hash do documento assinado
      const { rows: resultados } = await pool.query(
        'SELECT topico_num, media_gravidade, matriz_risco FROM resultados WHERE avaliacao_id=$1 ORDER BY topico_num',
        [avaliacao_id]
      );
      if (!resultados.length) return res.status(400).json({ erro: 'Avaliação sem resultados processados ainda' });

      const conteudoParaHash = JSON.stringify(resultados) + avaliacao_id + new Date().toISOString();
      const hash = crypto.createHash('sha256').update(conteudoParaHash).digest('hex');

      const ip = (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim();

      const { rows: [assinatura] } = await pool.query(
        `INSERT INTO assinaturas_laudo (avaliacao_id, usuario_id, nome, registro, email, ip, hash, data)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
         RETURNING *`,
        [avaliacao_id, req.usuario.id, usuario.nome, usuario.crp || null, usuario.email, ip, hash]
      );

      res.json({ ok: true, assinatura });
    } catch (e) {
      console.error('[assinatura POST]', e);
      res.status(500).json({ erro: e.message });
    }
  });

  return router;
};