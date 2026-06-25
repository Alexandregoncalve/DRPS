const jwt = require('jsonwebtoken');

module.exports = function authSuperAdmin(pool) {
  return async (req, res, next) => {
    try {
      const header = req.headers.authorization || '';
      if (!header.startsWith('Bearer '))
        return res.status(401).json({ erro: 'Token não informado' });

      const token = header.slice(7);
      let payload;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET || 'drps_secret_2025');
      } catch {
        return res.status(401).json({ erro: 'Token inválido ou expirado' });
      }

      // Verifica papel antes de qualquer consulta ao banco
      if (payload.papel !== 'superadmin')
        return res.status(403).json({ erro: 'Acesso restrito ao super admin' });

      // CORREÇÃO: token usa "id", não "sub"
      const usuarioId = payload.id || payload.sub;
      if (!usuarioId)
        return res.status(401).json({ erro: 'Token inválido — faça login novamente' });

      // Verifica blacklist
      if (payload.jti) {
        const bl = await pool.query(
          'SELECT 1 FROM jwt_blacklist WHERE jti = $1', [payload.jti]
        );
        if (bl.rows.length > 0)
          return res.status(401).json({ erro: 'Token revogado' });
      }

      // Busca usuário pelo id correto
      const u = await pool.query(
        'SELECT id, email, papel, ativo FROM usuarios WHERE id = $1',
        [usuarioId]
      );

      if (!u.rows.length)
        return res.status(401).json({ erro: 'Usuário não encontrado' });

      // Garante que superadmin nunca fique bloqueado por erro de flag
      if (!u.rows[0].ativo) {
        // Reativa automaticamente se o papel é superadmin
        await pool.query(
          'UPDATE usuarios SET ativo = TRUE WHERE id = $1 AND papel = $2',
          [usuarioId, 'superadmin']
        );
      }

      req.usuario = { ...u.rows[0], ativo: true };
      next();
    } catch (err) {
      console.error('[authSuperAdmin]', err);
      res.status(500).json({ erro: 'Erro interno de autenticação' });
    }
  };
};
