const express = require('express');
const authSuperAdmin = require('../../middleware/authSuperAdmin');

module.exports = function(pool) {
  const router = express.Router();
  const auth   = authSuperAdmin(pool);

  // GET /api/superadmin/auditoria?page=1&acao=&email=
  router.get('/', auth, async (req, res) => {
    try {
      const page   = Math.max(1, parseInt(req.query.page) || 1);
      const limit  = 50;
      const offset = (page - 1) * limit;
      const filtros = [], vals = [];
      let i = 1;

      if (req.query.acao) {
        filtros.push(`acao ILIKE $${i++}`);
        vals.push(`%${req.query.acao}%`);
      }
      if (req.query.email) {
        filtros.push(`usuario_email ILIKE $${i++}`);
        vals.push(`%${req.query.email}%`);
      }

      const where = filtros.length ? `WHERE ${filtros.join(' AND ')}` : '';

      const [lista, total] = await Promise.all([
        pool.query(`
          SELECT id, usuario_email, acao, entidade, entidade_id,
                 detalhes, ip, user_agent, criado_em
          FROM audit_log ${where}
          ORDER BY criado_em DESC
          LIMIT $${i++} OFFSET $${i++}
        `, [...vals, limit, offset]),

        pool.query(
          `SELECT COUNT(*) AS total FROM audit_log ${where}`, vals
        ),
      ]);

      res.json({
        logs:  lista.rows,
        total: parseInt(total.rows[0].total),
        page,
        pages: Math.ceil(total.rows[0].total / limit),
      });
    } catch (err) {
      console.error('[superadmin/auditoria]', err);
      res.status(500).json({ erro: 'Erro interno' });
    }
  });

  return router;
};
