// routes/superadmin/auth.js
const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const { rateLimit }      = require('../../middleware/rateLimit');
const { registrarAuditoria } = require('../../middleware/audit');
const authSuperAdmin     = require('../../middleware/authSuperAdmin');

const JWT_SECRET = process.env.JWT_SECRET || 'drps_secret_2025';
const BCRYPT_ROUNDS = 10;

module.exports = function(pool) {
  const router = express.Router();
  const auth   = authSuperAdmin(pool);

  // POST /api/superadmin/auth/login
  router.post('/login', rateLimit(10, 15 * 60 * 1000), async (req, res) => {
    try {
      const { email, senha } = req.body;
      if (!email || !senha)
        return res.status(400).json({ erro: 'E-mail e senha obrigatórios' });

      const { rows } = await pool.query(
        'SELECT * FROM usuarios WHERE email = $1 AND papel = $2',
        [email.toLowerCase().trim(), 'superadmin']
      );

      if (!rows.length)
        return res.status(401).json({ erro: 'Credenciais inválidas' });

      const usuario = rows[0];
      if (!usuario.ativo)
        return res.status(403).json({ erro: 'Conta desabilitada' });

      const ok = await bcrypt.compare(senha, usuario.senha_hash);
      if (!ok)
        return res.status(401).json({ erro: 'Credenciais inválidas' });

      const token = jwt.sign(
        { id: usuario.id, email: usuario.email, papel: 'superadmin', nome: usuario.nome },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      await registrarAuditoria(pool, {
        usuarioId: usuario.id, usuarioEmail: usuario.email,
        acao: 'superadmin_login', entidade: 'auth', ip: req.ip,
      });

      res.json({
        token,
        usuario: { id: usuario.id, email: usuario.email, nome: usuario.nome, papel: 'superadmin' },
      });
    } catch (err) {
      console.error('[superadmin/login]', err);
      res.status(500).json({ erro: 'Erro interno' });
    }
  });

  // POST /api/superadmin/auth/trocar-senha
  router.post('/trocar-senha', auth, async (req, res) => {
    try {
      const { senhaAtual, novaSenha } = req.body;
      if (!senhaAtual || !novaSenha)
        return res.status(400).json({ erro: 'Senha atual e nova senha são obrigatórias' });
      if (novaSenha.length < 8)
        return res.status(400).json({ erro: 'Nova senha deve ter ao menos 8 caracteres' });

      const { rows } = await pool.query(
        'SELECT senha_hash FROM usuarios WHERE id = $1',
        [req.usuario.id]
      );

      if (!rows.length)
        return res.status(404).json({ erro: 'Usuário não encontrado' });

      const ok = await bcrypt.compare(senhaAtual, rows[0].senha_hash);
      if (!ok)
        return res.status(401).json({ erro: 'Senha atual incorreta' });

      const novoHash = await bcrypt.hash(novaSenha, BCRYPT_ROUNDS);
      await pool.query(
        'UPDATE usuarios SET senha_hash = $1 WHERE id = $2',
        [novoHash, req.usuario.id]
      );

      await registrarAuditoria(pool, {
        usuarioId: req.usuario.id, usuarioEmail: req.usuario.email,
        acao: 'superadmin_trocar_senha', entidade: 'auth', ip: req.ip,
      });

      res.json({ ok: true, mensagem: 'Senha alterada com sucesso!' });
    } catch (err) {
      console.error('[superadmin/trocar-senha]', err);
      res.status(500).json({ erro: 'Erro interno' });
    }
  });

  // POST /api/superadmin/auth/logout
  router.post('/logout', auth, async (req, res) => {
    await registrarAuditoria(pool, {
      usuarioId: req.usuario.id, usuarioEmail: req.usuario.email,
      acao: 'superadmin_logout', entidade: 'auth', ip: req.ip,
    });
    res.json({ ok: true });
  });

  return router;
};
