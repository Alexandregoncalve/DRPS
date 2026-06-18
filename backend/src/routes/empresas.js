const express = require('express');
const { autenticar, exigirPapel } = require('../middleware/autenticar');
const { rateLimit } = require('../middleware/rateLimit');
const { audit } = require('../middleware/auditoria');
const { sanitize } = require('../middleware/crypto');

module.exports = (pool) => {
  const router = express.Router();

  // GET /api/empresas
  router.get('/', autenticar, async (req, res) => {
    const { papel, id: userId, empresa_vinculada_id } = req.usuario;
    try {
      let query, params = [];
      const select = `
        SELECT e.*,
          COUNT(DISTINCT s.id) as total_setores,
          COALESCE(SUM(s.total_funcionarios), 0) as total_funcionarios_setores,
          COALESCE(SUM(a.total_respostas), 0) as total_respostas,
          COUNT(DISTINCT f.id) as total_filiais
        FROM empresas e
        LEFT JOIN empresas f ON f.matriz_id = e.id
        LEFT JOIN setores s ON s.empresa_id = e.id
        LEFT JOIN avaliacoes a ON a.setor_id = s.id`;

      if (papel === 'admin') {
        query = select + ` WHERE e.tipo = 'matriz' GROUP BY e.id ORDER BY e.nome`;
      } else if (papel === 'psicologo') {
        query = select + ` JOIN psicologo_empresa pe ON pe.empresa_id = e.id AND pe.psicologo_id = $1
          WHERE e.tipo = 'matriz' GROUP BY e.id ORDER BY e.nome`;
        params = [userId];
      } else if (papel === 'gestor_matriz') {
        query = select + ` WHERE e.id = $1 AND e.tipo = 'matriz' GROUP BY e.id`;
        params = [empresa_vinculada_id];
      } else if (papel === 'gestor_filial') {
        query = select + ` WHERE e.id = $1 GROUP BY e.id`;
        params = [empresa_vinculada_id];
      }

      const { rows } = await pool.query(query, params);
      res.json(rows);
    } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
  });

  // GET /api/empresas/todas — matrizes + filiais para dropdown de avaliação
  router.get('/todas', autenticar, async (req, res) => {
    const { papel, id: userId } = req.usuario;
    try {
      let query, params = [];
      if (papel === 'admin') {
        query = `SELECT e.*, m.nome as matriz_nome 
                 FROM empresas e 
                 LEFT JOIN empresas m ON m.id = e.matriz_id 
                 ORDER BY e.tipo, e.nome`;
      } else {
        query = `SELECT DISTINCT e.*, m.nome as matriz_nome 
                 FROM empresas e
                 LEFT JOIN empresas m ON m.id = e.matriz_id
                 JOIN psicologo_empresa pe ON (pe.empresa_id = e.id OR pe.empresa_id = e.matriz_id)
                 WHERE pe.psicologo_id = $1
                 ORDER BY e.tipo, e.nome`;
        params = [userId];
      }
      const { rows } = await pool.query(query, params);
      res.json(rows);
    } catch (e) { console.error(e); res.status(500).json({ erro: 'Erro interno' }); }
  });

  // GET /api/empresas/:id/filiais
  router.get('/:id/filiais', autenticar, async (req, res) => {
    if (req.usuario.papel === 'gestor_filial')
      return res.status(403).json({ erro: 'Acesso não autorizado' });
    try {
      const { rows } = await pool.query(`
        SELECT e.*,
          COUNT(DISTINCT s.id) as total_setores,
          COALESCE(SUM(s.total_funcionarios), 0) as total_funcionarios_setores,
          COALESCE(SUM(a.total_respostas), 0) as total_respostas
        FROM empresas e
        LEFT JOIN setores s ON s.empresa_id = e.id
        LEFT JOIN avaliacoes a ON a.setor_id = s.id
        WHERE e.matriz_id = $1
        GROUP BY e.id ORDER BY e.nome
      `, [req.params.id]);
      res.json(rows);
    } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
  });

  // POST /api/empresas
  router.post('/', autenticar, exigirPapel('admin', 'psicologo'), rateLimit(30, 60000), async (req, res) => {
    const { nome, cnpj, total_funcionarios, tipo, matriz_id } = req.body;
    if (!nome) return res.status(400).json({ erro: 'Nome obrigatório' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        'INSERT INTO empresas (nome, cnpj, total_funcionarios, tipo, matriz_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [sanitize(nome), sanitize(cnpj) || null, parseInt(total_funcionarios) || null, tipo || 'matriz', matriz_id || null]
      );
      const empresa = rows[0];
      if (req.usuario.papel === 'psicologo') {
        const empVinc = tipo === 'filial' && matriz_id ? matriz_id : empresa.id;
        await client.query(
          'INSERT INTO psicologo_empresa (psicologo_id, empresa_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [req.usuario.id, empVinc]
        );
      }
      await client.query('COMMIT');
      await audit(pool, 'EMPRESA_CRIADA', req.usuario.id, { nome, tipo }, req);
      res.json(empresa);
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(e);
      res.status(500).json({ erro: 'Erro interno' });
    } finally { client.release(); }
  });

  // GET /api/empresas/:id/setores
  router.get('/:empresaId/setores', autenticar, async (req, res) => {
    const { papel, empresa_vinculada_id } = req.usuario;
    if (papel === 'gestor_filial' && req.params.empresaId !== empresa_vinculada_id)
      return res.status(403).json({ erro: 'Acesso não autorizado' });
    try {
      const { rows } = await pool.query(`
        SELECT s.*,
          COALESCE(SUM(a.total_respostas), 0) as respostas_coletadas,
          COUNT(DISTINCT a.id) as total_avaliacoes
        FROM setores s
        LEFT JOIN avaliacoes a ON a.setor_id = s.id
        WHERE s.empresa_id = $1
        GROUP BY s.id ORDER BY s.nome
      `, [req.params.empresaId]);
      res.json(rows);
    } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
  });

  // POST /api/empresas/setores
  router.post('/setores', autenticar, exigirPapel('admin', 'psicologo'), rateLimit(50, 60000), async (req, res) => {
    const { empresa_id, nome, total_funcionarios } = req.body;
    if (!empresa_id || !nome) return res.status(400).json({ erro: 'Empresa e nome obrigatórios' });
    try {
      const { rows } = await pool.query(
        'INSERT INTO setores (empresa_id, nome, total_trabalhadores, total_funcionarios) VALUES ($1,$2,$3,$3) RETURNING *',
        [empresa_id, sanitize(nome), parseInt(total_funcionarios) || 0]
      );
      res.json(rows[0]);
    } catch (e) { res.status(500).json({ erro: 'Erro interno' }); }
  });

  return router;
};