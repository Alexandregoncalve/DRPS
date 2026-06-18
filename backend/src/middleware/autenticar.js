const jwt = require('jsonwebtoken');
const tokenBlacklist = require('./blacklist');

function autenticar(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ erro: 'Token não fornecido' });
  try {
    const token = auth.split(' ')[1];
    if (tokenBlacklist.has(token)) return res.status(401).json({ erro: 'Sessão encerrada' });
    req.usuario = jwt.verify(token, process.env.JWT_SECRET || 'drps_secret_2025');
    req._token = token;
    next();
  } catch {
    res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

function exigirPapel(...papeis) {
  return (req, res, next) => {
    if (!papeis.includes(req.usuario.papel))
      return res.status(403).json({ erro: 'Acesso não autorizado' });
    next();
  };
}

module.exports = { autenticar, exigirPapel };
