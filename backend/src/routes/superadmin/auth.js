const express = require('express');
const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { registrarAuditoria } = require('../../middleware/audit');
const authSuperAdmin = require('../../middleware/authSuperAdmin');

module.exports = function(pool) {
  const router = express.Router();

  // POST /api/superadmin/auth/login
  router.post('/login', async (req, res) => {
    try {
      const { email, senha } = req.body;
      if (!email || !senha)
        return res.status(400).json({ erro: 'Email e senha obrigatórios' });

      const r = await pool.query(
        `SELECT id, email, senha_hash, papel, ativo, nome
         FROM usuarios WHERE email = $1`,
        [email.toLowerCase().trim()]
      );

      const u = r.rows[0];
      if (!u || u.papel !== 'superadmin')
        return res.status(401).json({ erro: 'Credenciais inválidas' });

      if (!u.ativo)
        return res.status(401).json({ erro: 'Conta inativa' });

      const ok = await bcrypt.compare(senha, u.senha_hash);
      if (!ok) {
        await registrarAuditoria(pool, {
          usuarioId: u.id, usuarioEmail: u.email,
          acao: 'login_falhou', entidade: 'usuario', entidadeId: u.id,
          ip: req.ip, userAgent: req.headers['user-agent'],
        });
        return res.status(401).json({ erro: 'Credenciais inválidas' });
      }

      const jti   = uuidv4();
      const token = jwt.sign(
        { sub: u.id, email: u.email, papel: u.papel, jti },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      await registrarAuditoria(pool, {
        usuarioId: u.id, usuarioEmail: u.email,
        acao: 'login_superadmin', entidade: 'usuario', entidadeId: u.id,
        ip: req.ip, userAgent: req.headers['user-agent'],
      });

      res.json({
        token,
        usuario: { id: u.id, email: u.email, nome: u.nome, papel: u.papel },
      });
    } catch (err) {
      console.error('[superadmin/login]', err);
      res.status(500).json({ erro: 'Erro interno' });
    }
  });

  // POST /api/superadmin/auth/logout
  router.post('/logout', authSuperAdmin(pool), async (req, res) => {
    try {
      const token   = req.headers.authorization.slice(7);
      const payload = jwt.decode(token);

      if (payload?.jti && payload?.exp) {
        await pool.query(
          `INSERT INTO jwt_blacklist (jti, expira_em)
           VALUES ($1, to_timestamp($2))
           ON CONFLICT (jti) DO NOTHING`,
          [payload.jti, payload.exp]
        );
      }

      await registrarAuditoria(pool, {
        usuarioId: req.usuario.id, usuarioEmail: req.usuario.email,
        acao: 'logout_superadmin', ip: req.ip,
      });

      res.json({ ok: true });
    } catch (err) {
      console.error('[superadmin/logout]', err);
      res.status(500).json({ erro: 'Erro interno' });
    }
  });

  return router;
};
