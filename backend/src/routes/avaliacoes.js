const express = require('express');
const crypto = require('crypto');
const { autenticar, exigirPapel } = require('../middleware/autenticar');
const { rateLimit } = require('../middleware/rateLimit');
const { audit } = require('../middleware/auditoria');
const { sanitize } = require('../middleware/crypto');
const { calcularResultados } = require('../calculo');

module.exports = (pool) => {
  const router = express.Router();

  // POST /api/avaliacoes
  router.post('/', autenticar, exigirPapel('admin', 'psicologo'), rateLimit(20, 60000), async (req, res) => {
    const { setor_id, data_fim } = req.body;
    if (!setor_id) return res.status(400).json({ erro: 'Setor obrigatório' });
    try {
      const { rows } = await pool.query(
        'INSERT INTO avaliacoes (setor_id, psicologo_id, data_fim) VALUES ($1,$2,$3) RETURNING *',
        [setor_id, req.usuario.id, data_fim || null]
      );
      const avaliacao = rows[0];
      const link = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/responder/${avaliacao.token_anonimo}`;
      await audit(pool, 'AVALIACAO_CRIADA', req.usuario.id, { setor_id, avaliacao_id: avaliacao.id }, req);
      res.json({ ...avaliacao, link_anonimo: link });
    } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
  });

  // GET /api/avaliacoes
  router.get('/', autenticar, async (req, res) => {
    const { papel, id: userId, empresa_vinculada_id } = req.usuario;
    try {
      const base = `
        SELECT a.*, s.nome as setor_nome, s.total_funcionarios as setor_total_funcionarios,
          e.nome as empresa_nome, e.tipo as empresa_tipo,
          a.total_respostas as respostas_coletadas,
          GREATEST(0, COALESCE(s.total_funcionarios,0) - COALESCE(a.total_respostas,0)) as vagas_restantes
        FROM avaliacoes a
        JOIN setores s ON a.setor_id = s.id
        JOIN empresas e ON s.empresa_id = e.id`;

      let query, params = [];
      if (papel === 'admin') { query = base + ' ORDER BY a.criado_em DESC'; }
      else if (papel === 'psicologo') { query = base + ' WHERE a.psicologo_id = $1 ORDER BY a.criado_em DESC'; params = [userId]; }
      else if (papel === 'gestor_matriz') { query = base + ' WHERE (e.id = $1 OR e.matriz_id = $1) ORDER BY a.criado_em DESC'; params = [empresa_vinculada_id]; }
      else if (papel === 'gestor_filial') { query = base + ' WHERE e.id = $1 ORDER BY a.criado_em DESC'; params = [empresa_vinculada_id]; }

      const { rows } = await pool.query(query, params);
      res.json(rows);
    } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
  });

  // POST /api/avaliacoes/:id/probabilidades
  router.post('/:id/probabilidades', autenticar, exigirPapel('admin', 'psicologo'), async (req, res) => {
    const { probabilidades } = req.body;
    try {
      for (const p of probabilidades) {
        if (p.topico_num < 1 || p.topico_num > 13 || p.valor < 1 || p.valor > 3) continue;
        await pool.query(
          'INSERT INTO probabilidades (avaliacao_id, topico_num, valor) VALUES ($1,$2,$3) ON CONFLICT (avaliacao_id, topico_num) DO UPDATE SET valor=$3',
          [req.params.id, p.topico_num, p.valor]
        );
      }
      res.json({ ok: true });
    } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
  });

  // POST /api/avaliacoes/:id/processar
  router.post('/:id/processar', autenticar, exigirPapel('admin', 'psicologo'), async (req, res) => {
    const id = req.params.id;
    try {
      const { rows: respostas } = await pool.query('SELECT pergunta_num, valor_original FROM respostas WHERE avaliacao_id=$1', [id]);
      const { rows: probabilidades } = await pool.query('SELECT topico_num, valor FROM probabilidades WHERE avaliacao_id=$1', [id]);
      if (!respostas.length) return res.status(400).json({ erro: 'Nenhuma resposta encontrada' });

      const resultados = calcularResultados(respostas, probabilidades);
      for (const r of resultados) {
        await pool.query(
          `INSERT INTO resultados (avaliacao_id, topico_num, topico_nome, media_gravidade, classif_gravidade, media_probabilidade, classif_probabilidade, matriz_risco, fonte_geradora)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (avaliacao_id, topico_num) DO UPDATE SET
             media_gravidade=$4, classif_gravidade=$5, media_probabilidade=$6, classif_probabilidade=$7, matriz_risco=$8`,
          [id, r.topico_num, r.topico_nome, r.media_gravidade, r.classif_gravidade, r.media_probabilidade, r.classif_probabilidade, r.matriz_risco, r.fonte_geradora]
        );
      }
      await pool.query("UPDATE avaliacoes SET status='processada' WHERE id=$1", [id]);
      await audit(pool, 'AVALIACAO_PROCESSADA', req.usuario.id, { avaliacao_id: id }, req);
      res.json(resultados);
    } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
  });

  // GET /api/avaliacoes/:id/resultados
  router.get('/:id/resultados', autenticar, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM resultados WHERE avaliacao_id=$1 ORDER BY topico_num', [req.params.id]);
      const contagem = { Baixo: 0, Médio: 0, Alto: 0, Crítico: 0 };
      rows.forEach(r => { if (contagem[r.matriz_risco] !== undefined) contagem[r.matriz_risco]++; });
      res.json({ resultados: rows, contagem });
    } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
  });

  return router;
};
