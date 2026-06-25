const express = require('express');
const authSuperAdmin = require('../../middleware/authSuperAdmin');

module.exports = function(pool) {
  const router = express.Router();
  const auth   = authSuperAdmin(pool);

  // GET /api/superadmin/empresas?page=1&busca=
  router.get('/', auth, async (req, res) => {
    try {
      const page   = Math.max(1, parseInt(req.query.page) || 1);
      const limit  = 20;
      const offset = (page - 1) * limit;
      const busca  = req.query.busca ? `%${req.query.busca}%` : '%';

      const [lista, total] = await Promise.all([
        pool.query(`
          SELECT
            e.id,
            e.nome,
            e.cnpj,
            e.criado_em,
            COUNT(DISTINCT s.id)                                    AS total_setores,
            COUNT(DISTINCT a.id)                                    AS total_avaliacoes,
            COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'aberta') AS avaliacoes_ativas,
            COALESCE(SUM(a.total_respostas), 0)                    AS total_respostas,
            MAX(a.criado_em)                                        AS ultima_avaliacao_em
          FROM empresas e
          LEFT JOIN setores   s ON s.empresa_id = e.id
          LEFT JOIN avaliacoes a ON a.setor_id  = s.id
          WHERE e.nome ILIKE $1 OR e.cnpj ILIKE $1
          GROUP BY e.id
          ORDER BY e.criado_em DESC
          LIMIT $2 OFFSET $3
        `, [busca, limit, offset]),

        pool.query(`
          SELECT COUNT(*) AS total FROM empresas
          WHERE nome ILIKE $1 OR cnpj ILIKE $1
        `, [busca]),
      ]);

      res.json({
        empresas: lista.rows,
        total:    parseInt(total.rows[0].total),
        page,
        pages:    Math.ceil(total.rows[0].total / limit),
      });
    } catch (err) {
      console.error('[superadmin/empresas GET]', err);
      res.status(500).json({ erro: 'Erro interno' });
    }
  });

  // GET /api/superadmin/empresas/:id/avaliacoes
  router.get('/:id/avaliacoes', auth, async (req, res) => {
    try {
      const r = await pool.query(`
        SELECT
          a.id,
          s.nome        AS setor_nome,
          e.nome        AS empresa_nome,
          a.total_respostas,
          a.status,
          a.criado_em,
          a.ultima_resposta_em,
          u.nome        AS psicologo_nome,
          u.email       AS psicologo_email
        FROM avaliacoes a
        JOIN setores  s ON s.id  = a.setor_id
        JOIN empresas e ON e.id  = s.empresa_id
        JOIN usuarios u ON u.id  = a.psicologo_id
        WHERE e.id = $1
        ORDER BY a.criado_em DESC
      `, [req.params.id]);
      res.json(r.rows);
    } catch (err) {
      console.error('[superadmin/empresas/avaliacoes]', err);
      res.status(500).json({ erro: 'Erro interno' });
    }
  });

  return router;
};
