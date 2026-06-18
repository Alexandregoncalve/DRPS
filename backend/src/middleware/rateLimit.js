const rateLimitMap = new Map();

function rateLimit(maxReqs, windowMs) {
  return (req, res, next) => {
    const key = req.ip + ':' + req.path;
    const now = Date.now();
    const entry = rateLimitMap.get(key) || { count: 0, start: now };
    if (now - entry.start > windowMs) { entry.count = 1; entry.start = now; }
    else entry.count++;
    rateLimitMap.set(key, entry);
    if (entry.count > maxReqs)
      return res.status(429).json({ erro: 'Muitas tentativas. Aguarde alguns minutos.' });
    next();
  };
}

// Limpar mapa a cada 10 minutos
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((v, k) => { if (now - v.start > 600000) rateLimitMap.delete(k); });
}, 600000);

module.exports = { rateLimit };
