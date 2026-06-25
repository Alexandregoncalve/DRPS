const jwt = require('jsonwebtoken');

module.exports = function authJwt(pool) {
  return async (req, res, next) => {
    try {
      const header = req.headers.authorization || '';
      if (!header.startsWith('Bearer '))
        return res.status(401).json({ erro: 'Token não informado' });

      const token = header.slice(7);
      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        return res.status(401).json({ erro: 'Token inválido ou expirado' });
      }

      if (payload.jti) {
        const bl = await pool.query(
          'SELECT 1 FROM jwt_blacklist WHERE jti = $1', [payload.jti]
        );
        if (bl.rows.length > 0)
          return res.status(401).json({ erro: 'Token revogado' });
      }

      const u = await pool.query(
        'SELECT id, email, papel, ativo, precisa_trocar_senha FROM usuarios WHERE id = $1',
        [payload.sub]
      );
      if (!u.rows.length || !u.rows[0].ativo)
        return res.status(401).json({ erro: 'Usuário inativo' });

      req.usuario = u.rows[0];
      next();
    } catch (err) {
      console.error('[authJwt]', err);
      res.status(500).json({ erro: 'Erro interno de autenticação' });
    }
  };
};
