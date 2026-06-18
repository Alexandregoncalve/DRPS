const express = require('express');
const bcrypt = require('bcrypt');
const { autenticar, exigirPapel } = require('../middleware/autenticar');
const { audit } = require('../middleware/auditoria');
const { sanitize } = require('../middleware/crypto');

module.exports = (pool) => {
  const router = express.Router();

  // GET /api/usuarios
  router.get('/', autenticar, exigirPapel('admin', 'psicologo'), async (req, res) => {
    try {
      let rows;
      if (req.usuario.papel === 'admin') {
        ({ rows } = await pool.query(
          `SELECT u.id, u.nome, u.email, u.papel, u.crp, u.criado_em, e.nome as empresa_nome
           FROM usuarios u LEFT JOIN empresas e ON e.id = u.empresa_vinculada_id
           ORDER BY u.criado_em DESC`
        ));
      } else {
        ({ rows } = await pool.query(
          `SELECT DISTINCT u.id, u.nome, u.email, u.papel, u.crp, u.criado_em, e.nome as empresa_nome
           FROM usuarios u
           JOIN empresas e ON e.id = u.empresa_vinculada_id
           JOIN psicologo_empresa pe ON pe.empresa_id = e.id AND pe.psicologo_id = $1
           WHERE u.papel IN ('gestor_matriz','gestor_filial')
           ORDER BY u.criado_em DESC`,
          [req.usuario.id]
        ));
      }
      res.json(rows);
    } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
  });

  // POST /api/usuarios
  router.post('/', autenticar, exigirPapel('admin', 'psicologo'), async (req, res) => {
    const { nome, email, senha, papel, crp, empresa_vinculada_id } = req.body;
    if (!nome || !email || !senha || !papel) return res.status(400).json({ erro: 'Campos obrigatórios incompletos' });
    const papeisPermitidos = req.usuario.papel === 'admin'
      ? ['admin', 'psicologo', 'gestor_matriz', 'gestor_filial']
      : ['gestor_matriz', 'gestor_filial'];
    if (!papeisPermitidos.includes(papel)) return res.status(403).json({ erro: 'Sem permissão para este perfil' });
    try {
      const hash = await bcrypt.hash(senha, 10);
      const { rows } = await pool.query(
        'INSERT INTO usuarios (nome, email, senha_hash, papel, crp, empresa_vinculada_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,nome,email,papel,crp',
        [sanitize(nome), sanitize(email), hash, papel, sanitize(crp) || null, empresa_vinculada_id || null]
      );
      await audit(pool, 'USUARIO_CRIADO', req.usuario.id, { email, papel }, req);
      res.json(rows[0]);
    } catch (e) {
      if (e.code === '23505') return res.status(400).json({ erro: 'E-mail já cadastrado' });
      res.status(500).json({ erro: 'Erro interno' });
    }
  });

  // GET /api/usuarios/dashboard
  router.get('/dashboard', autenticar, async (req, res) => {
    const { papel, empresa_vinculada_id } = req.usuario;
    try {
      let empresaIds = [];
      if (papel === 'gestor_matriz') {
        const { rows } = await pool.query('SELECT id FROM empresas WHERE id=$1 OR matriz_id=$1', [empresa_vinculada_id]);
        empresaIds = rows.map(r => r.id);
      } else if (papel === 'gestor_filial') {
        empresaIds = [empresa_vinculada_id];
      } else {
        return res.status(403).json({ erro: 'Use as rotas específicas' });
      }
      const { rows } = await pool.query(`
        SELECT
          COUNT(DISTINCT a.id) as total_avaliacoes,
          SUM(a.total_respostas) as total_respostas,
          COUNT(DISTINCT s.id) as total_setores,
          COUNT(DISTINCT CASE WHEN r.matriz_risco='Crítico' THEN r.avaliacao_id END) as alertas_criticos,
          COUNT(DISTINCT CASE WHEN r.matriz_risco='Alto' THEN r.avaliacao_id END) as alertas_altos,
          COUNT(DISTINCT CASE WHEN a.status='processada' THEN a.id END) as avaliacoes_concluidas
        FROM avaliacoes a
        JOIN setores s ON a.setor_id = s.id
        LEFT JOIN resultados r ON r.avaliacao_id = a.id
        WHERE s.empresa_id = ANY($1)
      `, [empresaIds]);
      res.json(rows[0]);
    } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
  });

  return router;
};
