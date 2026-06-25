// routes/superadmin/psicologos.js
// Super Admin pode criar: admin, psicologo, gestor_matriz, gestor_filial
// (superadmin só pode ser criado diretamente no banco)

const express = require('express');
const bcrypt  = require('bcrypt');
const authSuperAdmin = require('../../middleware/authSuperAdmin');
const { registrarAuditoria } = require('../../middleware/audit');

const PAPEIS_CRIACAO = [
  { value: 'admin',         label: 'Admin NeXa (acesso total à organização)' },
  { value: 'psicologo',     label: 'Psicólogo / Profissional SST' },
  { value: 'gestor_matriz', label: 'Gestor Matriz (somente leitura)' },
  { value: 'gestor_filial', label: 'Gestor Filial (somente leitura)' },
];

module.exports = function(pool) {
  const router = express.Router();
  const auth   = authSuperAdmin(pool);

  // GET /api/superadmin/psicologos?page=1&busca=
  router.get('/', auth, async (req, res) => {
    try {
      const page   = Math.max(1, parseInt(req.query.page) || 1);
      const limit  = 20;
      const offset = (page - 1) * limit;
      const busca  = req.query.busca ? `%${req.query.busca}%` : '%';

      const [lista, total] = await Promise.all([
        pool.query(`
          SELECT
            u.id, u.email, u.nome, u.papel, u.ativo, u.criado_em, u.bloqueado_em,
            COUNT(DISTINCT a.id)                                    AS total_avaliacoes,
            COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'aberta') AS avaliacoes_ativas
          FROM usuarios u
          LEFT JOIN avaliacoes a ON a.psicologo_id = u.id
          WHERE u.papel != 'superadmin'
            AND (u.email ILIKE $1 OR u.nome ILIKE $1)
          GROUP BY u.id
          ORDER BY u.criado_em DESC
          LIMIT $2 OFFSET $3
        `, [busca, limit, offset]),

        pool.query(`
          SELECT COUNT(*) AS total FROM usuarios
          WHERE papel != 'superadmin'
            AND (email ILIKE $1 OR nome ILIKE $1)
        `, [busca]),
      ]);

      res.json({
        psicologos: lista.rows,
        total:      parseInt(total.rows[0].total),
        page,
        pages:      Math.ceil(total.rows[0].total / limit),
      });
    } catch (err) {
      console.error('[superadmin/psicologos GET]', err);
      res.status(500).json({ erro: 'Erro interno' });
    }
  });

  // GET /api/superadmin/psicologos/papeis — lista papéis disponíveis
  router.get('/papeis', auth, (req, res) => {
    res.json(PAPEIS_CRIACAO);
  });

  // POST /api/superadmin/psicologos — criar usuário
  router.post('/', auth, async (req, res) => {
    try {
      const { nome, email, senha, papel = 'psicologo' } = req.body;
      if (!nome || !email || !senha)
        return res.status(400).json({ erro: 'nome, email e senha são obrigatórios' });
      if (senha.length < 8)
        return res.status(400).json({ erro: 'Senha deve ter ao menos 8 caracteres' });

      // Superadmin não pode ser criado por aqui
      if (papel === 'superadmin')
        return res.status(403).json({ erro: 'Superadmin só pode ser criado diretamente no banco' });

      // Valida papel
      const papeisValidos = PAPEIS_CRIACAO.map(p => p.value);
      if (!papeisValidos.includes(papel))
        return res.status(400).json({ erro: `Papel inválido: ${papel}` });

      const existe = await pool.query(
        'SELECT id FROM usuarios WHERE email = $1', [email.toLowerCase().trim()]
      );
      if (existe.rows.length)
        return res.status(409).json({ erro: 'E-mail já cadastrado' });

      const hash = await bcrypt.hash(senha, 12);
      const r = await pool.query(
        `INSERT INTO usuarios (nome, email, senha_hash, papel, precisa_trocar_senha, ativo)
         VALUES ($1, $2, $3, $4, TRUE, TRUE)
         RETURNING id, nome, email, papel, criado_em`,
        [nome.trim(), email.toLowerCase().trim(), hash, papel]
      );

      await registrarAuditoria(pool, {
        usuarioId: req.usuario.id, usuarioEmail: req.usuario.email,
        acao: `criar_usuario_${papel}`, entidade: 'usuario', entidadeId: r.rows[0].id,
        detalhes: { nome, email, papel }, ip: req.ip,
      });

      res.status(201).json(r.rows[0]);
    } catch (err) {
      console.error('[superadmin/psicologos POST]', err);
      res.status(500).json({ erro: 'Erro interno' });
    }
  });

  // PATCH /api/superadmin/psicologos/:id — editar nome/email/papel
  router.patch('/:id', auth, async (req, res) => {
    try {
      const { id } = req.params;
      const { nome, email, papel } = req.body;

      // Não pode promover para superadmin
      if (papel === 'superadmin')
        return res.status(403).json({ erro: 'Não é permitido promover para superadmin por aqui' });

      const updates = [], vals = [];
      let i = 1;
      if (nome)  { updates.push(`nome = $${i++}`);  vals.push(nome.trim()); }
      if (email) { updates.push(`email = $${i++}`); vals.push(email.toLowerCase().trim()); }
      if (papel) { updates.push(`papel = $${i++}`); vals.push(papel); }
      if (!updates.length) return res.status(400).json({ erro: 'Nada para atualizar' });

      vals.push(id);
      const r = await pool.query(
        `UPDATE usuarios SET ${updates.join(', ')}
         WHERE id = $${i} AND papel != 'superadmin'
         RETURNING id, nome, email, papel, ativo`,
        vals
      );
      if (!r.rows.length)
        return res.status(404).json({ erro: 'Usuário não encontrado' });

      await registrarAuditoria(pool, {
        usuarioId: req.usuario.id, usuarioEmail: req.usuario.email,
        acao: 'editar_usuario', entidade: 'usuario', entidadeId: id,
        detalhes: { nome, email, papel }, ip: req.ip,
      });

      res.json(r.rows[0]);
    } catch (err) {
      console.error('[superadmin/psicologos PATCH]', err);
      res.status(500).json({ erro: 'Erro interno' });
    }
  });

  // PATCH /api/superadmin/psicologos/:id/bloquear
  router.patch('/:id/bloquear', auth, async (req, res) => {
    try {
      const { id } = req.params;
      const r = await pool.query(
        `UPDATE usuarios
         SET ativo = FALSE, bloqueado_em = NOW(), bloqueado_por = $1::uuid
         WHERE id = $2 AND papel != 'superadmin'
         RETURNING id, email, ativo`,
        [req.usuario.id, id]
      );
      if (!r.rows.length)
        return res.status(404).json({ erro: 'Usuário não encontrado' });

      await registrarAuditoria(pool, {
        usuarioId: req.usuario.id, usuarioEmail: req.usuario.email,
        acao: 'bloquear_usuario', entidade: 'usuario', entidadeId: id, ip: req.ip,
      });

      res.json(r.rows[0]);
    } catch (err) {
      console.error('[superadmin/bloquear]', err);
      res.status(500).json({ erro: 'Erro interno' });
    }
  });

  // PATCH /api/superadmin/psicologos/:id/desbloquear
  router.patch('/:id/desbloquear', auth, async (req, res) => {
    try {
      const { id } = req.params;
      const r = await pool.query(
        `UPDATE usuarios
         SET ativo = TRUE, bloqueado_em = NULL, bloqueado_por = NULL
         WHERE id = $1 AND papel != 'superadmin'
         RETURNING id, email, ativo`,
        [id]
      );
      if (!r.rows.length)
        return res.status(404).json({ erro: 'Usuário não encontrado' });

      await registrarAuditoria(pool, {
        usuarioId: req.usuario.id, usuarioEmail: req.usuario.email,
        acao: 'desbloquear_usuario', entidade: 'usuario', entidadeId: id, ip: req.ip,
      });

      res.json(r.rows[0]);
    } catch (err) {
      console.error('[superadmin/desbloquear]', err);
      res.status(500).json({ erro: 'Erro interno' });
    }
  });

  // PATCH /api/superadmin/psicologos/:id/redefinir-senha
  router.patch('/:id/redefinir-senha', auth, async (req, res) => {
    try {
      const { id } = req.params;
      const { nova_senha } = req.body;
      if (!nova_senha || nova_senha.length < 8)
        return res.status(400).json({ erro: 'Senha deve ter ao menos 8 caracteres' });

      const hash = await bcrypt.hash(nova_senha, 12);
      const r = await pool.query(
        `UPDATE usuarios SET senha_hash = $1, precisa_trocar_senha = TRUE
         WHERE id = $2 AND papel != 'superadmin'
         RETURNING id, email`,
        [hash, id]
      );
      if (!r.rows.length)
        return res.status(404).json({ erro: 'Usuário não encontrado' });

      await registrarAuditoria(pool, {
        usuarioId: req.usuario.id, usuarioEmail: req.usuario.email,
        acao: 'redefinir_senha', entidade: 'usuario', entidadeId: id, ip: req.ip,
      });

      res.json({ ok: true, mensagem: 'Senha redefinida. Usuário deve trocar no próximo login.' });
    } catch (err) {
      console.error('[superadmin/redefinir-senha]', err);
      res.status(500).json({ erro: 'Erro interno' });
    }
  });

  // GET /api/superadmin/psicologos/:id/avaliacoes
  router.get('/:id/avaliacoes', auth, async (req, res) => {
    try {
      const r = await pool.query(`
        SELECT a.id, s.nome AS setor_nome, e.nome AS empresa_nome,
               a.total_respostas, a.status, a.criado_em, a.ultima_resposta_em
        FROM avaliacoes a
        JOIN setores  s ON s.id = a.setor_id
        JOIN empresas e ON e.id = s.empresa_id
        WHERE a.psicologo_id = $1
        ORDER BY a.criado_em DESC
      `, [req.params.id]);
      res.json(r.rows);
    } catch (err) {
      console.error('[superadmin/psicologos/avaliacoes]', err);
      res.status(500).json({ erro: 'Erro interno' });
    }
  });

  return router;
};
