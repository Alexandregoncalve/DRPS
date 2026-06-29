// routes/plano_acao.js
// GET  /api/plano-acao/:avaliacao_id          — busca todas as fichas
// POST /api/plano-acao/:avaliacao_id/:topico  — salva/atualiza uma ficha

const express = require('express');
const { autenticar, exigirPapel } = require('../middleware/autenticar');

module.exports = (pool) => {
  const router = express.Router();

  // GET /api/plano-acao/:avaliacao_id
  router.get('/:avaliacao_id', autenticar, async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM plano_acao WHERE avaliacao_id=$1 ORDER BY topico_num',
        [req.params.avaliacao_id]
      );
      res.json(rows);
    } catch(e) { res.status(500).json({ erro: e.message }); }
  });

  // POST /api/plano-acao/:avaliacao_id/:topico_num
  router.post('/:avaliacao_id/:topico_num', autenticar, exigirPapel('admin','psicologo'), async (req, res) => {
    const { avaliacao_id, topico_num } = req.params;
    const { topico_nome, responsavel, prazo, forma_acompanhamento, recurso_necessario, data_verificacao, status, observacoes } = req.body;
    try {
      const { rows: [row] } = await pool.query(`
        INSERT INTO plano_acao
          (avaliacao_id, topico_num, topico_nome, responsavel, prazo, forma_acompanhamento,
           recurso_necessario, data_verificacao, status, observacoes, atualizado_em)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
        ON CONFLICT (avaliacao_id, topico_num) DO UPDATE SET
          topico_nome=$3, responsavel=$4, prazo=$5, forma_acompanhamento=$6,
          recurso_necessario=$7, data_verificacao=$8, status=$9, observacoes=$10,
          atualizado_em=NOW()
        RETURNING *
      `, [avaliacao_id, topico_num, topico_nome||null, responsavel||null, prazo||null,
          forma_acompanhamento||null, recurso_necessario||null, data_verificacao||null,
          status||'Pendente', observacoes||null]);
      res.json(row);
    } catch(e) { res.status(500).json({ erro: e.message }); }
  });

  return router;
};