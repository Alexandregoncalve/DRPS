const express = require('express');
const authSuperAdmin = require('../../middleware/authSuperAdmin');

module.exports = function(pool) {
  const router = express.Router();
  const auth   = authSuperAdmin(pool);

  // GET /api/superadmin/dashboard
  router.get('/', auth, async (req, res) => {
    try {
      const [psicologos, empresas, avaliacoes, paradas, recentes] = await Promise.all([

        // Psicólogos
        pool.query(`
          SELECT
            COUNT(*)                              AS total,
            COUNT(*) FILTER (WHERE ativo = TRUE)  AS ativos,
            COUNT(*) FILTER (WHERE ativo = FALSE) AS bloqueados
          FROM usuarios WHERE papel = 'psicologo'
        `),

        // Empresas
        pool.query(`
          SELECT COUNT(*) AS total FROM empresas
        `),

        // Avaliações — usa status em vez de arquivada, e psicologo_id em vez de usuario_id
        pool.query(`
          SELECT
            COUNT(*)                                          AS total,
            COUNT(*) FILTER (WHERE status = 'aberta')         AS ativas,
            COUNT(*) FILTER (WHERE status = 'processada')     AS arquivadas,
            COUNT(*) FILTER (WHERE total_respostas > 0)      AS com_respostas,
            COUNT(*) FILTER (WHERE total_respostas = 0)      AS sem_respostas
          FROM avaliacoes
        `),

        // Avaliações paradas há +7 dias
        pool.query(`
          SELECT
            a.id,
            s.nome        AS setor_nome,
            e.nome        AS empresa_nome,
            a.total_respostas,
            a.criado_em,
            a.ultima_resposta_em,
            u.email       AS psicologo_email,
            u.nome        AS psicologo_nome
          FROM avaliacoes a
          JOIN setores  s ON s.id = a.setor_id
          JOIN empresas e ON e.id = s.empresa_id
          JOIN usuarios u ON u.id = a.psicologo_id
          WHERE a.status = 'aberta'
            AND (
              (a.ultima_resposta_em IS NULL    AND a.criado_em < NOW() - INTERVAL '7 days')
              OR a.ultima_resposta_em           < NOW() - INTERVAL '7 days'
            )
          ORDER BY a.criado_em DESC
          LIMIT 20
        `),

        // Últimas ações de auditoria
        pool.query(`
          SELECT id, usuario_email, acao, entidade, entidade_id, criado_em
          FROM audit_log
          ORDER BY criado_em DESC
          LIMIT 10
        `),
      ]);

      res.json({
        psicologos: psicologos.rows[0],
        empresas:   empresas.rows[0],
        avaliacoes: avaliacoes.rows[0],
        paradas:    paradas.rows,
        auditoria:  recentes.rows,
      });
    } catch (err) {
      console.error('[superadmin/dashboard]', err);
      res.status(500).json({ erro: 'Erro interno' });
    }
  });

  return router;
};
