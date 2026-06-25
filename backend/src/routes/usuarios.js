const express = require('express');
const bcrypt = require('bcrypt');
const { autenticar, exigirPapel } = require('../middleware/autenticar');
const { audit } = require('../middleware/auditoria');
const { sanitize } = require('../middleware/crypto');
const { senhaForte } = require('../middleware/senhaForte');

module.exports = (pool) => {
  const router = express.Router();

  // Papéis que cada perfil pode criar/editar
  const PAPEIS_PERMITIDOS = {
    admin:     ['psicologo', 'gestor_matriz', 'gestor_filial'],  // admin NÃO cria outro admin nem superadmin
    psicologo: ['gestor_matriz', 'gestor_filial'],
  };

  // Papéis que NUNCA podem ser vistos/editados por ninguém exceto superadmin
  const PAPEIS_PROTEGIDOS = ['superadmin'];

  // GET /api/usuarios
  router.get('/', autenticar, exigirPapel('admin', 'psicologo'), async (req, res) => {
    try {
      let rows;
      if (req.usuario.papel === 'admin') {
        // Admin vê apenas usuários da sua organização
        // NUNCA vê superadmin nem admins de outras organizações
        ({ rows } = await pool.query(
          `SELECT u.id, u.nome, u.email, u.papel, u.crp, u.criado_em,
                  u.empresa_vinculada_id, u.ativo, e.nome as empresa_nome
           FROM usuarios u
           LEFT JOIN empresas e ON e.id = u.empresa_vinculada_id
           WHERE u.papel NOT IN ('superadmin')
             AND (u.organizacao_id = $1 OR u.id = $2)
           ORDER BY u.ativo DESC, u.criado_em DESC`,
          [req.usuario.organizacao_id, req.usuario.id]
        ));
      } else {
        // Psicólogo vê apenas gestores vinculados às suas empresas
        ({ rows } = await pool.query(
          `SELECT DISTINCT u.id, u.nome, u.email, u.papel, u.crp, u.criado_em,
                  u.empresa_vinculada_id, u.ativo, e.nome as empresa_nome
           FROM usuarios u
           JOIN empresas e ON e.id = u.empresa_vinculada_id
           JOIN psicologo_empresa pe ON pe.empresa_id = e.id AND pe.psicologo_id = $1
           WHERE u.papel IN ('gestor_matriz','gestor_filial')
           ORDER BY u.ativo DESC, u.criado_em DESC`,
          [req.usuario.id]
        ));
      }
      res.json(rows);
    } catch (e) {
      console.error('[usuarios GET]', e);
      res.status(500).json({ erro: 'Erro interno' });
    }
  });

  // POST /api/usuarios
  router.post('/', autenticar, exigirPapel('admin', 'psicologo'), async (req, res) => {
    const { nome, email, papel, crp, empresa_vinculada_id, senha, forcar_troca } = req.body;
    if (!nome || !email || !papel) return res.status(400).json({ erro: 'Campos obrigatórios incompletos' });

    // Verifica se o papel solicitado é permitido para quem está criando
    const papeisPermitidos = PAPEIS_PERMITIDOS[req.usuario.papel] || [];
    if (!papeisPermitidos.includes(papel)) {
      return res.status(403).json({ erro: `Sem permissão para criar usuário com perfil "${papel}"` });
    }

    // Bloqueia criação de superadmin e admin por qualquer rota normal
    if (PAPEIS_PROTEGIDOS.includes(papel) || papel === 'admin') {
      return res.status(403).json({ erro: 'Este perfil só pode ser criado pelo Super Admin' });
    }

    const organizacao_id = req.usuario.organizacao_id || null;
    const senhaFinal = senha && senha.trim() ? senha : 'Senha@010203';
    const precisa_trocar = forcar_troca !== false;

    try {
      const hash = await bcrypt.hash(senhaFinal, 10);
      const { rows } = await pool.query(
        `INSERT INTO usuarios
           (nome, email, senha_hash, papel, crp, empresa_vinculada_id, organizacao_id, precisa_trocar_senha, ativo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)
         RETURNING id, nome, email, papel, crp`,
        [sanitize(nome), sanitize(email), hash, papel, sanitize(crp) || null,
         empresa_vinculada_id || null, organizacao_id, precisa_trocar]
      );
      await audit(pool, 'USUARIO_CRIADO', req.usuario.id, { email, papel }, req);
      res.json(rows[0]);
    } catch (e) {
      if (e.code === '23505') return res.status(400).json({ erro: 'E-mail já cadastrado' });
      console.error('[usuarios POST]', e);
      res.status(500).json({ erro: 'Erro interno' });
    }
  });

  // PUT /api/usuarios/:id
  router.put('/:id', autenticar, exigirPapel('admin', 'psicologo'), async (req, res) => {
    const { nome, email, papel, crp, empresa_vinculada_id, senha, forcar_troca } = req.body;
    if (!nome || !email || !papel) return res.status(400).json({ erro: 'Campos obrigatórios incompletos' });

    // Verifica se o papel solicitado é permitido
    const papeisPermitidos = PAPEIS_PERMITIDOS[req.usuario.papel] || [];
    if (!papeisPermitidos.includes(papel)) {
      return res.status(403).json({ erro: `Sem permissão para definir perfil "${papel}"` });
    }

    // Bloqueia edição de superadmin
    if (PAPEIS_PROTEGIDOS.includes(papel)) {
      return res.status(403).json({ erro: 'Este perfil não pode ser editado por aqui' });
    }

    // Verifica se o usuário alvo é superadmin (não pode editar)
    try {
      const alvo = await pool.query('SELECT papel, organizacao_id FROM usuarios WHERE id = $1', [req.params.id]);
      if (!alvo.rows.length) return res.status(404).json({ erro: 'Usuário não encontrado' });

      if (PAPEIS_PROTEGIDOS.includes(alvo.rows[0].papel)) {
        return res.status(403).json({ erro: 'Não é permitido editar o Super Admin' });
      }

      // Admin só edita usuários da sua organização
      if (req.usuario.papel === 'admin' && alvo.rows[0].organizacao_id !== req.usuario.organizacao_id) {
        return res.status(403).json({ erro: 'Sem permissão para editar este usuário' });
      }

      let query, params;
      if (senha && senha.trim()) {
        const validacao = senhaForte(senha);
        if (!validacao.valido) return res.status(400).json({ erro: validacao.erro });
        const hash = await bcrypt.hash(senha, 10);
        query = `UPDATE usuarios SET nome=$1, email=$2, papel=$3, crp=$4, empresa_vinculada_id=$5,
                   senha_hash=$6, precisa_trocar_senha=$7
                 WHERE id=$8 RETURNING id, nome, email, papel, crp, ativo`;
        params = [sanitize(nome), sanitize(email), papel, sanitize(crp) || null,
                  empresa_vinculada_id || null, hash, forcar_troca ? true : false, req.params.id];
      } else {
        query = `UPDATE usuarios SET nome=$1, email=$2, papel=$3, crp=$4, empresa_vinculada_id=$5
                 WHERE id=$6 RETURNING id, nome, email, papel, crp, ativo`;
        params = [sanitize(nome), sanitize(email), papel, sanitize(crp) || null,
                  empresa_vinculada_id || null, req.params.id];
      }

      const { rows } = await pool.query(query, params);
      if (!rows.length) return res.status(404).json({ erro: 'Usuário não encontrado' });
      await audit(pool, 'USUARIO_EDITADO', req.usuario.id, { id: req.params.id, email }, req);
      res.json(rows[0]);
    } catch (e) {
      if (e.code === '23505') return res.status(400).json({ erro: 'E-mail já cadastrado' });
      console.error('[usuarios PUT]', e);
      res.status(500).json({ erro: 'Erro interno' });
    }
  });

  // PATCH /api/usuarios/:id/ativo — desabilitar/reativar
  router.patch('/:id/ativo', autenticar, exigirPapel('admin'), async (req, res) => {
    const { ativo } = req.body;
    if (typeof ativo !== 'boolean') return res.status(400).json({ erro: 'Campo ativo deve ser true ou false' });
    if (req.params.id === req.usuario.id) return res.status(400).json({ erro: 'Você não pode desabilitar sua própria conta' });

    try {
      // Verifica se o alvo é superadmin — nunca pode ser desabilitado por aqui
      const alvo = await pool.query('SELECT papel FROM usuarios WHERE id = $1', [req.params.id]);
      if (!alvo.rows.length) return res.status(404).json({ erro: 'Usuário não encontrado' });

      if (PAPEIS_PROTEGIDOS.includes(alvo.rows[0].papel)) {
        return res.status(403).json({ erro: 'O Super Admin não pode ser desabilitado por aqui' });
      }

      // Admin não pode desabilitar outros admins
      if (alvo.rows[0].papel === 'admin' && req.usuario.papel === 'admin') {
        return res.status(403).json({ erro: 'Admins não podem desabilitar outros admins' });
      }

      const { rows } = await pool.query(
        'UPDATE usuarios SET ativo=$1 WHERE id=$2 RETURNING id, nome, email, papel, ativo',
        [ativo, req.params.id]
      );
      await audit(pool, ativo ? 'USUARIO_REATIVADO' : 'USUARIO_DESABILITADO', req.usuario.id, { id: req.params.id }, req);
      res.json(rows[0]);
    } catch (e) {
      console.error('[usuarios PATCH ativo]', e);
      res.status(500).json({ erro: 'Erro interno' });
    }
  });

  // GET /api/usuarios/dashboard
  router.get('/dashboard', autenticar, async (req, res) => {
    const { papel, empresa_vinculada_id } = req.usuario;
    try {
      let empresaIds = [];
      if (papel === 'gestor_matriz') {
        const { rows } = await pool.query(
          'SELECT id FROM empresas WHERE id=$1 OR matriz_id=$1', [empresa_vinculada_id]
        );
        empresaIds = rows.map(r => r.id);
      } else if (papel === 'gestor_filial') {
        empresaIds = [empresa_vinculada_id];
      } else {
        return res.status(403).json({ erro: 'Use as rotas específicas' });
      }

      const { rows } = await pool.query(`
        SELECT
          COUNT(DISTINCT a.id)                                                        AS total_avaliacoes,
          SUM(a.total_respostas)                                                      AS total_respostas,
          COUNT(DISTINCT s.id)                                                        AS total_setores,
          COUNT(DISTINCT CASE WHEN r.matriz_risco='Crítico' THEN r.avaliacao_id END) AS alertas_criticos,
          COUNT(DISTINCT CASE WHEN r.matriz_risco='Alto'    THEN r.avaliacao_id END) AS alertas_altos,
          COUNT(DISTINCT CASE WHEN a.status='processada'    THEN a.id           END) AS avaliacoes_concluidas
        FROM avaliacoes a
        JOIN setores s ON a.setor_id = s.id
        LEFT JOIN resultados r ON r.avaliacao_id = a.id
        WHERE s.empresa_id = ANY($1)
      `, [empresaIds]);

      res.json(rows[0]);
    } catch (e) {
      console.error('[usuarios dashboard]', e);
      res.status(500).json({ erro: 'Erro interno' });
    }
  });

  return router;
};
