const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('../middleware/rateLimit');
const { autenticar } = require('../middleware/autenticar');
const tokenBlacklist = require('../middleware/blacklist');
const { audit } = require('../middleware/auditoria');
const { sanitize } = require('../middleware/crypto');

module.exports = (pool) => {
  const router = express.Router();

  // POST /api/auth/login
  router.post('/login', rateLimit(10, 15 * 60 * 1000), async (req, res) => {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ erro: 'E-mail e senha obrigatórios' });
    try {
      const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1', [sanitize(email)]);
      if (!rows.length) return res.status(401).json({ erro: 'Credenciais inválidas' });
      const usuario = rows[0];
      const ok = await bcrypt.compare(senha, usuario.senha_hash);
      if (!ok) {
        await audit(pool, 'LOGIN_FALHOU', null, { email }, req);
        return res.status(401).json({ erro: 'Credenciais inválidas' });
      }
      const token = jwt.sign(
        { id: usuario.id, papel: usuario.papel, nome: usuario.nome, empresa_vinculada_id: usuario.empresa_vinculada_id },
        process.env.JWT_SECRET || 'drps_secret_2025',
        { expiresIn: '8h' }
      );
      await audit(pool, 'LOGIN_OK', usuario.id, { email }, req);
      res.json({ token, usuario: { nome: usuario.nome, papel: usuario.papel, crp: usuario.crp, empresa_vinculada_id: usuario.empresa_vinculada_id } });
    } catch (e) {
      console.error(e);
      res.status(500).json({ erro: 'Erro interno' });
    }
  });

  // POST /api/auth/logout
  router.post('/logout', autenticar, async (req, res) => {
    tokenBlacklist.add(req._token);
    await audit(pool, 'LOGOUT', req.usuario.id, {}, req);
    res.json({ ok: true });
  });

  return router;
};
